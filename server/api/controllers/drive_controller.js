/**
 * Drive Controller
 * Handles drive scanning and directory listing operations
 */

import {
  get_available_drives,
  get_drive_directories,
  get_drive_directories_flat,
  validate_path,
  normalize_drive_path
} from '../../sources/drive_scanner.mjs';
import logger from '../../config_log.js';

/**
 * Get list of available drives on the system
 * GET /api/drives
 */
export const list_drives = async (req, res) => {
  try {
    logger.debug('Fetching available drives...');
    const drives = await get_available_drives();

    if (!drives || drives.length === 0) {
      return res.json({
        drives: [],
        message: 'No accessible drives found'
      });
    }

    res.json({
      drives: drives,
      count: drives.length,
      platform: drives[0]?.platform || 'unknown'
    });
  } catch (error) {
    logger.error(`Error listing drives: ${error.message}`);
    res.status(500).json({
      error: 'Failed to list drives',
      message: error.message
    });
  }
};

/**
 * Get directories from a specific drive/path (hierarchical)
 * GET /api/drives/directories?path=/path/to/drive
 * Query params:
 *   - path: Drive path to scan (supports both query param and URL param for backward compatibility)
 *   - max_depth: Maximum directory depth to traverse (default: 0 = root only, max: 5)
 */
export const get_directories = async (req, res) => {
  try {
    // Support both query param (new) and path param (legacy)
    const driveId = req.query.path || req.params.drive_id;
    let maxDepth = req.query.max_depth !== undefined ? Number.parseInt(req.query.max_depth) : 0; // Default to 0 (root only)

    logger.info(`GET /api/drives/directories - Request received: path=${driveId}, max_depth=${maxDepth}`);

    // Enforce maximum depth limit to prevent CPU overload
    const MAX_DEPTH_LIMIT = 5;
    if (maxDepth > MAX_DEPTH_LIMIT) {
      logger.warn(`max_depth ${maxDepth} exceeds limit, capping to ${MAX_DEPTH_LIMIT}`);
      maxDepth = MAX_DEPTH_LIMIT;
    }
    if (maxDepth < 0) {
      maxDepth = 0;
    }

    if (driveId === undefined || driveId === null || driveId === '') {
      logger.warn('Drive path is required but not provided');
      return res.status(400).json({
        error: 'Drive path is required',
        details: 'Please provide a drive path using ?path= query parameter or in the URL path'
      });
    }

    logger.debug(`Fetching directories for drive: ${driveId}, maxDepth: ${maxDepth}`);

    const directories = await get_drive_directories(driveId, maxDepth);

    res.json({
      drive: driveId,
      normalized_path: normalize_drive_path(driveId),
      max_depth: maxDepth,
      directories: directories,
      total_directories: countTotalDirs(directories),
      note: maxDepth === 0 ? 'Showing root level directories only. Use max_depth parameter to show subdirectories.' : ''
    });
  } catch (error) {
    logger.error(`Error getting directories for path '${req.query.path || req.params.drive_id}': ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({
      error: 'Failed to get directories',
      message: error.message,
      details: {
        requested_path: req.query.path || req.params.drive_id,
        max_depth: req.query.max_depth,
        suggestion: 'For Windows, use drive letter like "C" or "C:". For Linux, use full path like "/media/deb/109F-FC75". Add ?max_depth=1 to see subdirectories.'
      }
    });
  }
};

/**
 * Get directories from a specific drive/path (flattened/non-hierarchical)
 * GET /api/drives/directories/flat?path=/path/to/drive
 * Query params:
 *   - path: Drive path to scan (supports both query param and URL param for backward compatibility)
 *   - max_depth: Maximum directory depth to traverse (default: 3, max: 5)
 */
export const get_directories_flat = async (req, res) => {
  try {
    // Support both query param (new) and path param (legacy)
    const driveId = req.query.path || req.params.drive_id;
    let maxDepth = Number.parseInt(req.query.max_depth) || 3;

    logger.info(`GET /api/drives/directories/flat - Request received: path=${driveId}, max_depth=${maxDepth}`);

    // Enforce maximum depth limit to prevent CPU overload
    const MAX_DEPTH_LIMIT = 5;
    if (maxDepth > MAX_DEPTH_LIMIT) {
      logger.warn(`max_depth ${maxDepth} exceeds limit, capping to ${MAX_DEPTH_LIMIT}`);
      maxDepth = MAX_DEPTH_LIMIT;
    }
    if (maxDepth < 0) {
      maxDepth = 0;
    }

    if (driveId === undefined || driveId === null || driveId === '') {
      logger.warn('Drive path is required but not provided');
      return res.status(400).json({
        error: 'Drive path is required',
        details: 'Please provide a drive path using ?path= query parameter or in the URL path'
      });
    }

    logger.debug(`Fetching flat directory list for drive: ${driveId}, maxDepth: ${maxDepth}`);

    const directories = await get_drive_directories_flat(driveId, maxDepth);

    res.json({
      drive: driveId,
      normalized_path: normalize_drive_path(driveId),
      max_depth: maxDepth,
      directories: directories,
      total_directories: directories.length
    });
  } catch (error) {
    logger.error(`Error getting flat directories for path '${req.query.path || req.params.drive_id}': ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({
      error: 'Failed to get directories',
      message: error.message,
      details: {
        requested_path: req.query.path || req.params.drive_id,
        max_depth: req.query.max_depth,
        suggestion: 'For Windows, use drive letter like "C" or "C:". For Linux, use full path like "/media/deb/109F-FC75"'
      }
    });
  }
};

/**
 * Validate a path (check if it exists and is a directory)
 * POST /api/drives/validate
 * Body: { path: "/path/to/validate" }
 */
export const validate_drive_path = async (req, res) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({
        error: 'Path is required'
      });
    }

    logger.debug(`Validating path: ${path}`);

    const result = validate_path(path);

    if (!result.valid) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error(`Error validating path: ${error.message}`);
    res.status(500).json({
      error: 'Failed to validate path',
      message: error.message
    });
  }
};

/**
 * Helper function to count total directories recursively
 */
function countTotalDirs(directories) {
  let count = 0;
  
  const traverse = (dirs) => {
    for (const dir of dirs) {
      count++;
      if (dir.subdirs && dir.subdirs.length > 0) {
        traverse(dir.subdirs);
      }
    }
  };

  traverse(directories);
  return count;
}
