/**
 * Drive Router
 * Routes for drive scanning and directory listing
 */

import express from 'express';
import {
  list_drives,
  get_directories,
  get_directories_flat,
  validate_drive_path
} from '../controllers/drive_controller.js';

const router = express.Router();

/**
 * GET /api/drives
 * List all available drives on the system
 */
router.get('/', list_drives);

/**
 * GET /api/drives/:drive_id/directories/flat
 * Get directories from a drive (flat/non-hierarchical list)
 * Query params:
 *   - max_depth: Maximum depth to scan (default: 3, max: 5)
 */
router.get('/:drive_id/directories/flat', get_directories_flat);

/**
 * GET /api/drives/:drive_id/directories
 * Get directories from a drive (hierarchical structure)
 * Query params:
 *   - max_depth: Maximum depth to scan (default: 2, max: 5)
 */
router.get('/:drive_id/directories', get_directories);

/**
 * POST /api/drives/validate
 * Validate if a path exists and is accessible
 * Body: { path: "/path/to/check" }
 */
router.post('/validate', validate_drive_path);

export default router;

