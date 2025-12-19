import fs from 'fs';
import { 
  get_photo as meta_get_photo,
  get_random_photo as meta_get_random_photo, 
  get_photo_history, 
  get_photo_details_for_error,
  get_config,
  get_tag as meta_get_tag 
} from "../../meta/meta_view.mjs";
import { get_photo as fs_get_photo } from "../../sources/fs/fs_client.mjs";
import { 
  list_geo, 
  get_photo as syno_get_photo,
  add_tag as syno_add_tag 
} from "../../sources/synology/syno_client.mjs";
import { delete_photo_file as fs_delete_photo_file } from "../../sources/fs/fs_client.mjs";
import { delete_photo as syno_delete_photo } from "../../sources/synology/syno_client.mjs";
import { delete_photo_records } from "../../meta/meta_view.mjs";
import logger from "../../config_log.js";
import constants from "../../constants.js";
import { generateETag, cleanData } from '../../common.js';

// ============ HELPER FUNCTIONS ============

const DEFAULT_PHOTO_PATH = 'web/eyedeea_photos.jpg';

// Sanitize error message for HTTP headers (remove newlines and invalid characters)
function sanitizeErrorMessage(message) {
  return message
    .replace(/\n/g, ' | ')
    .replace(/\r/g, '')
    .trim();
}

function readDefaultPhoto(res, errorMessage = 'Unable to fetch photo') {
  fs.readFile(DEFAULT_PHOTO_PATH, (err, data) => {
    if (err) {
      logger.error(`Error reading default photo: ${err.message}`);
      res.writeHead(500, { 
        'Content-Type': 'text/plain',
        'X-Image-Status': 'error',
        'X-Error-Message': sanitizeErrorMessage(`Error reading default photo: ${err.message}`)
      });
      res.end('Error reading image file.');
      return;
    }
    res.writeHead(200, { 
      'Content-Type': 'image/jpeg',
      'X-Image-Status': 'error',
      'X-Error-Message': sanitizeErrorMessage(errorMessage)
    });
    res.end(data);
  });
}

function getContentDisposition(filename, isDownload) {
  if (isDownload) {
    return `attachment; filename="${filename}"`;
  }
  return `inline; filename="${filename}"`;
}

function sendPhotoData(res, photo_data, response, isCurrentPhoto = false, isDownload = false, filename = 'photo.jpg') {
  if (!response?.headers) {
    readDefaultPhoto(res, 'Photo data unavailable');
    return;
  }

  const etag = generateETag(photo_data);
  const cleanedPhoto = cleanData(photo_data);
  const maxAge = isCurrentPhoto ? 40 : 1800;
  const contentDisposition = getContentDisposition(filename, isDownload);

  // For the current photo, enforce no-store to avoid any stale caching by proxies/browsers.
  const cacheHeaders = isCurrentPhoto
    ? {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
    : {
      'Cache-Control': `public, max-age=${maxAge}`
    };

  res.writeHead(200, {
    'Content-Type': response.headers.get('content-type'),
    'Content-Length': response.data.length,
    'photo-data': JSON.stringify(cleanedPhoto),
    'ETag': etag,
    'Content-Disposition': contentDisposition,
    'X-Image-Status': 'ok',
    ...cacheHeaders
  });
  res.end(response.data);
}

function getPhotoBySource(photo_data, req, res, isCurrentPhoto = false) {
  const isDownload = req.query.download === 'true';
  const filename = decodeURIComponent(req.query.filename || photo_data.meta_data?.filename || 'photo.jpg');

  if (photo_data.source_type === constants.SOURCE_TYPE_NAS) {
    syno_get_photo(photo_data, "xl", (err, response) => {
      try {
        sendPhotoData(res, photo_data, response, isCurrentPhoto, isDownload, filename);
      } catch (error) {
        logger.error(`Error sending photo from Synology: ${error.message}`);
        const detailedMsg = `Failed to load photo from Synology source.\n\nFilename: ${filename}\nSource: ${photo_data.meta_data?.source_name || 'Unknown'}\nFolder: ${photo_data.meta_data?.folder_name || 'Unknown'}\n\nError: ${error.message}`;
        readDefaultPhoto(res, detailedMsg);
      }
    }).catch(error => {
      logger.error(`Synology fetch error: ${error.message}`);
      const detailedMsg = `Failed to fetch photo from Synology NAS.\n\nFilename: ${filename}\nSource: ${photo_data.meta_data?.source_name || 'Unknown'}\n\nError: ${error.message}\n\nPlease verify the NAS is online and accessible.`;
      readDefaultPhoto(res, detailedMsg);
    });
  } else if (photo_data.source_type === constants.SOURCE_TYPE_FS) {
    fs_get_photo(photo_data, res, isDownload, filename);
  } else {
    logger.error(`Unsupported source type: ${photo_data.source_type}`);
    readDefaultPhoto(res, 'Unsupported source type.\n\nPhoto source configuration is invalid.');
  }
}




function processPhotoData(photo_data) {
  return {
    ...photo_data,
    photo_index: 0,
    address: typeof photo_data.address === 'string' ? JSON.parse(photo_data.address) : photo_data.address
  };
}

// ============ EXPORTED ENDPOINTS ============

export const get_viewer_config = async (req, res) => {
  try {
    get_config((err, config) => {
      if (err) {
        logger.error(`Config error: ${err.message}`);
        res.status(500).json({ error: 'Failed to load config' });
      } else {
        res.json(config);
      }
    });
  } catch (err) {
    logger.error(`Get config error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

export const get_photo = async (req, res) => {
  meta_get_photo(req.params.photo_id, (err, photo) => {
    if (err || !photo) {
      const photoId = req.params.photo_id;
      // Get additional details from view_log for error reporting
      get_photo_details_for_error(photoId, (detailErr, details) => {
        let detailedMsg;
        if (details) {
          const folder = details.folder_name || 'Unknown';
          const filename = details.filename || 'Unknown';
          const source = details.source_name || 'Unknown';
          detailedMsg = `Photo not found.\nPhoto ID: ${photoId}\nFolder: ${folder}\nFilename: ${filename}\nSource: ${source}\n\nThe requested photo may have been deleted or is no longer available in the configured sources.`;
        } else {
          detailedMsg = `Photo not found.\nPhoto ID: ${photoId}\n\nThe requested photo may have been deleted or is no longer available in the configured sources.`;
        }
        const errMsg = `Get photo error: ${err?.message || 'Photo not found'} | photo_id: ${photoId} | details: ${JSON.stringify(details)}`;
        logger.error(errMsg);
        readDefaultPhoto(res, detailedMsg);
      });
      return;
    }

    const processedPhoto = processPhotoData(photo);
    getPhotoBySource(processedPhoto, req, res, false);
  });
};

export const get_random_photo = async (req, res) => {
  const photoIndex = parseInt(req.query.photo_index);
  const limit = req.query.limit || 12;

  // Enforce no-cache for all /api/view responses to avoid stale photos being served by intermediaries.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (!isNaN(photoIndex)) {
    // UI requesting specific photos from history
    get_photo_history(limit, (err, rows) => {
      if (err) {
        logger.error(`Photo history error: ${err.message}`);
        if (req.query.photo_id_only) {
          res.json({ photo_id: 0 });
        } else {
          const detailedMsg = `Failed to load photo history.\n\nError: ${err.message}\n\nPlease verify your photo sources are properly configured and accessible.`;
          readDefaultPhoto(res, detailedMsg);
        }
        return;
      }

      if (req.query.photo_id_only) {
        const photoId = rows?.[photoIndex]?.photo_id || 0;
        res.json({ photo_id: photoId });
      } else if (rows?.length > 0) {
        const selectedPhoto = rows[photoIndex];
        if (selectedPhoto) {
          selectedPhoto.photo_index = photoIndex;
          getPhotoBySource(selectedPhoto, req, res, false);
        } else {
          const detailedMsg = `Photo #${photoIndex} is not available.\n\nRequested index is beyond the number of photos in your collection. This might indicate the photo was deleted.`;
          readDefaultPhoto(res, detailedMsg);
        }
      } else {
        readDefaultPhoto(res, 'No photos available in your collection.\n\nPlease check that your photo sources are properly configured.');
      }
    });
  } else {
    // Random photo
    meta_get_random_photo((err, rows) => {
      if (err || !rows?.length) {
        const errMsg = err?.message || 'No photos found';
        logger.error(`Random photo error: ${errMsg}`);
        const detailedMsg = err ? `Failed to fetch random photo.\n\nError: ${err.message}\n\nPlease verify your sources are configured correctly.` : `No photos found in your collection.\n\nPlease add photo sources and ensure they contain images.`;
        readDefaultPhoto(res, detailedMsg);
        return;
      }

      const processedPhoto = processPhotoData(rows[0]);
      getPhotoBySource(processedPhoto, req, res, true);
    });
  }
};

export const get_lined_up_photo_data = async (req, res) => {
  try {
    const limit = req.query.limit || 12;
    get_photo_history(limit, (err, rows) => {
      if (err) {
        logger.error(`Photo history error: ${err.message}`);
        res.status(500).json({ error: 'Failed to get photo history' });
        return;
      }

      if (req.query.photo_id_only) {
        const photoIds = rows?.map(row => row.photo_id) || [];
        res.json({ total: photoIds.length, photo_ids: photoIds });
      } else {
        res.json(rows || []);
      }
    });
  } catch (error) {
    logger.error(`Get lined up photos error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const add_tag_dns = async (req, res) => {
  meta_get_tag("eyedeea_dns", (err, e_tag) => {
    if (err) {
      logger.error(`Get DNS tag error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch tag' });
      return;
    }

    if (!e_tag?.syno_id) {
      res.status(500).json({ error: 'DNS tag not configured' });
      return;
    }

    syno_add_tag(req.params.photo_id, e_tag.syno_id)
      .then(response_data => res.json(response_data))
      .catch(error => {
        logger.error(`Add DNS tag error: ${error.message}`);
        res.status(500).json({ error: 'Failed to add tag' });
      });
  });
};

export const add_tag_mark = async (req, res) => {
  meta_get_tag("eyedeea_mark", (err, e_tag) => {
    if (err) {
      logger.error(`Get mark tag error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch tag' });
      return;
    }

    if (!e_tag?.syno_id) {
      res.status(500).json({ error: 'Mark tag not configured' });
      return;
    }

    syno_add_tag(req.params.photo_id, e_tag.syno_id)
      .then(response_data => res.json(response_data))
      .catch(error => {
        logger.error(`Add mark tag error: ${error.message}`);
        res.status(500).json({ error: 'Failed to add tag' });
      });
  });
};

export const delete_photo = async (req, res) => {
  const photoId = req.params.photo_id;
  meta_get_photo(photoId, (err, photo) => {
    if (err || !photo) {
      logger.error(`Delete photo error: ${err?.message || 'Photo not found'} | photo_id: ${photoId}`);
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    const proceedDeleteRecords = () => {
      delete_photo_records(photoId, (delErr) => {
        if (delErr) {
          logger.error(`DB cleanup failed for photo_id=${photoId}: ${delErr.message || delErr}`);
          res.status(500).json({ error: 'Failed to delete metadata records' });
        } else {
          res.status(200).json({ status: 'deleted', photo_id: photoId });
        }
      });
    };

    if (photo.source_type === constants.SOURCE_TYPE_FS) {
      fs_delete_photo_file(photo, (fsErr) => {
        if (fsErr) {
          logger.error(`FS delete failed for ${photo.filename}: ${fsErr.message || fsErr}`);
          // Even if file deletion fails, attempt DB cleanup to avoid dangling UI/state
        }
        proceedDeleteRecords();
      });
    } else if (photo.source_type === constants.SOURCE_TYPE_NAS) {
      syno_delete_photo(photo, (nasErr, result) => {
        if (nasErr) {
          logger.error(`NAS delete failed for photo_id=${photo.photo_id}: ${nasErr.message || nasErr}`);
          // Continue with DB cleanup even if NAS delete fails
        }
        proceedDeleteRecords();
      });
    } else {
      logger.error(`Unsupported source type for delete: ${photo.source_type}`);
      res.status(400).json({ error: 'Unsupported source type' });
    }
  });
};
