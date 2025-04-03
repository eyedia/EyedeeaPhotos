import {
  create_or_update as meta_create_or_update,
  get as meta_get,
  list as meta_list,
  get_dirs as meta_get_dirs,
  get_photos_of_a_dir as meta_get_photos_of_a_dir
} from "../../meta/meta_source.mjs";
import {get_photo_from_synology,
  get_photo_from_fs,
  get_default_photo
} from "./system_controller.js";
import { authenticate as syno_authenticate, create_eyedeea_tags } from "../../sources/synology/syno_client.mjs";
import { authenticate as fs_authenticate } from "../../sources/fs/fs_client.mjs";
import logger from "../../config_log.js";
import constants from "../../constants.js";



export const create_or_update = async (req, res) => {
  try {
    if (req.body.hasOwnProperty("type")) {
      if ((req.body["type"] != constants.SOURCE_TYPE_NAS) && (req.body["type"] != constants.SOURCE_TYPE_FS)) {
        res.status(400).send("Invalid type!");
        return;
      }
    }
    if (!req.body.hasOwnProperty("config")) {
      req.body["config"] = null;
    }
    let plain_password = req.body.password;
    meta_create_or_update(req.body, (err, saved_source, status_code) => {
      if (err) {
        logger.error(err.message);
        res.status(500).send('Internal Server Error');
      } else if (saved_source) {
        if (saved_source.password == 201)
          saved_source.password = plain_password;
        authenticate_source(saved_source, auth_result => {
          saved_source["authenticate"] = auth_result;
          res.status(status_code);
          delete saved_source.password;
          if (saved_source.hasOwnProperty("config"))
            delete saved_source.config;
          res.json(saved_source);
        });
      } else {
        res.status(500).send('Internal Server Error');
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};


export const list_items = async (req, res) => {
  try {
    meta_list((err, rows) => {
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


export const get_item = async (req, res) => {
  try {
    meta_get(req.params.id, undefined, (err, item) => {
      if (err) {
        logger.error(err.message);
      } else {
        res.json(item);
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};

function authenticate_source(source, callback) {
  if (source.type == constants.SOURCE_TYPE_NAS) {
    syno_authenticate(source.id, auth_result => {
      //for NAS we are going to create special tags.
      if (auth_result.auth_status)
        create_eyedeea_tags(source.id);
      callback(auth_result);
    });
  } else if (source.type == constants.SOURCE_TYPE_FS) {
    fs_authenticate(source.id, auth_result => {
      callback(auth_result);
    });
  }
}


export const get_dirs = async (req, res) => {
  meta_get_dirs(req.params.id, req.query.limit, req.query.offset, (err, rows) => {
    if (err) {
      logger.error(err.message);
    } else {
      res.json(rows);
    }
  });
};


export const get_photos_from_a_dir = async (req, res) => {
  try {
    const {limit, offset } = req.query;
    const source_id = req.params.id;
    const dir_id = req.params.dir_id;

    const getPhotosOfaDir = (source_id, dir_id, offset, limit) => {
      return new Promise((resolve, reject) => {
        meta_get_photos_of_a_dir(source_id, dir_id, offset, limit, (err, photos) => {
          if (err) return reject(err);
          resolve(photos);
        });
      });
    };

    const photos = await getPhotosOfaDir(source_id, dir_id, offset, limit);

    if (!photos.records || photos.records.length === 0) {
      return res.json([]); // Return an empty array if no results
    }

    let photoDataArray = await Promise.all(
      photos.records.map(async (photo) => {
        if (photo.source_type === constants.SOURCE_TYPE_NAS) {
          return await get_photo_from_synology(photo);
        }
        else if (photo.source_type === constants.SOURCE_TYPE_FS) {
          return await get_photo_from_fs(photo.url, photo);
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
      "limit": photos.limit,
      "thumbnails": photoDataArray
    }

    res.json(return_data); // Send the complete array once processing is done

  } catch (error) {
    if (error.message && error.message.code) {
      //known error
      res.status(503).json(error);
    }else{
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};