import {
  get_source_summary as meta_get_source_summary,
  global_search as meta_global_search
} from "../../meta/meta_system.js";
import { list as meta_get_sources } from "../../meta/meta_source.mjs";
import { list_geo, get_photo as syno_get_photo, add_tag as syno_add_tag } from "../../sources/synology/syno_client.mjs";

import config_log from "../../config_log.js";
import constants from "../../constants.js";
import fs from "fs";

const logger = config_log.logger;
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
const get_photo_from_synology = (photo_data) => {
  return new Promise((resolve, reject) => {
    syno_get_photo(photo_data, "sm", (err, response) => {
      if (err || !response || !response.headers) {
        // If Synology fails, return a default image
        return get_default_photo(photo_data);
      } else {
        resolve({
          'Content-Type': response.headers.get('content-type'),
          'Content-Length': response.data.length,
          'photo-meta-data': JSON.stringify(photo_data),
          'photo-data': response.data
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
        } else {
          logger.error(`The source type ${photo.source_id} was not configured, returning default photo.`);
          return await get_default_photo(photo);
        }
      })
    );

    res.json(photoDataArray); // Send the complete array once processing is done

  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: "Internal Server Error" });
  }
}


const get_default_photo = (photo_data) => {
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