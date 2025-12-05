import {
  get_source_summary as meta_get_source_summary
} from "../../meta/meta_system.js";
import {
  global_search as meta_global_search
} from "../../meta/meta_search.mjs";
import { list as meta_get_sources } from "../../meta/meta_source.mjs";
import { list_geo, get_photo as syno_get_photo, add_tag as syno_add_tag } from "../../sources/synology/syno_client.mjs";
import { get_photo_thumbnail as fs_get_photo_thumbnail } from "../../sources/fs/fs_client.mjs";

import logger from "../../config_log.js";
import constants from "../../constants.js";
import fs from "fs";
import path from 'path';

export let sources = {};


export const get_source_summary = async (req, res) => {
  try {
    meta_get_source_summary((err, rows) => {
      if (err) {
        logger.error(err.message);
      } else {
        res.json(rows);
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};

/**
 * Fetch sources if not already loaded
 */
const fetchSources = () => {
  return new Promise((resolve, reject) => {
    meta_get_sources((err, rows) => {
      if (err) {
        logger.error(`Error fetching sources: ${err.message}`);
        reject(err);
      } else {
        rows.forEach(row => {
          sources[row["id"]] = row;
        });
        logger.info("Sources successfully loaded");
        resolve(sources);
      }
    });
  });
};

/**
 * Fetch photo data from Synology
 */
export const get_photo_from_synology = (photo_data) => {
  return new Promise((resolve, reject) => {
    syno_get_photo(photo_data, "sm", (err, response) => {
      if (err || !response || !response.headers) {        
        reject(err);
      } else {
        resolve({
          'Content-Type': response.headers.get('content-type'),
          'Content-Length': response.data.length,
          'photo-meta-data': photo_data,
          'photo-data': response.data
        });
      }
    });
  });
};

/**
 * Fetch photo data from Synology
 */
export const get_photo_from_fs = (source_root_dir, photo_data) => {
  return new Promise((resolve, reject) => {
    fs_get_photo_thumbnail(source_root_dir, photo_data, (err, data) => {
      if (err) {
        // If FS fails, return a default image
        return get_default_photo(photo_data);
      } else {
        resolve({
          'Content-Type': 'image/jpeg',
          'Content-Length': data.length,
          'photo-meta-data': photo_data,
          'photo-data': data.data
        });
      }
    });
  });
};

export const global_search = async (req, res) => {
  try {
    const { keywords, limit, offset } = req.query;

    if (!keywords || keywords.trim() === "") {
      return res.status(400).json({ message: "Bad request. 'keywords' is a required parameter!" });
    }

    // Load sources if not already loaded
    if (Object.keys(sources).length === 0) {
      await fetchSources();
    }

    // Convert meta_global_search to return a Promise
    const searchPhotos = (keywords, offset, limit) => {
      return new Promise((resolve, reject) => {
        meta_global_search(keywords, offset, limit, (err, photos) => {
          if (err) return reject(err);
          resolve(photos);
        });
      });
    };

    // Perform the search
    const photos = await searchPhotos(keywords, offset, limit);

    if (!photos.records || photos.records.length === 0) {
      return res.json([]); // Return an empty array if no results
    }

    let photoDataArray = await Promise.all(
      photos.records.map(async (photo) => {
        const source = sources[photo.source_id];
        photo["source_type"] = source.type;
        if (photo.source_type === constants.SOURCE_TYPE_NAS) {
          return await get_photo_from_synology(photo);
        }
        else if (photo.source_type === constants.SOURCE_TYPE_FS) {
          return await get_photo_from_fs(source.url, photo);
        } else {
          logger.error(`The source type ${photo.source_id} was not configured, returning default photo.`);
          return await get_default_photo(photo);
        }
      })
    );

    const return_data = {
      "total_records": photos.total_records,
      "total_pages": photos.total_pages,
      "current_offset": photos.current_offset,
      "limit":photos.limit,
      "thumbnails": photoDataArray
    }

    res.json(return_data); // Send the complete array once processing is done

  } catch (error) {
    console.log(error.code)
    //logger.error(`Unexpected error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const get_default_photo = (photo_data) => {
  return new Promise((resolve, reject) => {
    fs.readFile('web/eyedeea_photos.jpg', (fsErr, data) => {
      if (fsErr) {
        logger.error(`Error reading default photo: ${fsErr.message}`);
        return reject(fsErr);
      }
      return resolve({
        'Content-Type': 'image/jpeg',
        'Content-Length': data.length,
        'photo-meta-data': JSON.stringify(photo_data),
        'photo-data': data
      });
    });
  });
}

export const status = async (req, res) => {
  res.json({ status: 'up' });
}

export const logs = async (req, res) => {
  var current_day = new Date();
  const log_file_curr = current_day.toISOString().split('T')[0]
  let log_file = path.join(constants.app_log_dir,`info-${log_file_curr}.log`);

  if (!fs.existsSync(log_file)){
    current_day.setDate(current_day.getDate() - 1);
    const log_file_prev = current_day.toISOString().split('T')[0]
    log_file = path.join(constants.app_log_dir,`info-${log_file_prev}.log`);
  }
  fs.readFile(log_file, 'utf8', (err, data) => {
      if (err) {
          return res.status(500).json({ error: 'Error reading log file', details: err.message });
      }
      res.setHeader('Content-Type', 'text/plain');
      res.send(data);
  });
}
