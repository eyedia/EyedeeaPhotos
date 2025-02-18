import useragent from "useragent";
import fs from 'fs';
import { get_random_photo as meta_get_random_photo, 
  get_photo_history, 
  get_config,
  get_tag as meta_get_tag } from "../../meta/meta_view.mjs";
import { get_photo as fs_get_photo } from "../../sources/fs/fs_client.mjs";

import { list_geo, 
    get_photo as syno_get_photo,
    add_tag as syno_add_tag } from "../../sources/synology/syno_client.mjs";
import config_log from "../../config_log.js";
const logger = config_log.logger;


export const get_viewer_config = async (req, res) => {

  try {
    get_config((err, config) => {
      if (err) {
        logger.error(err.message);
      } else {
        res.json(config);
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const get_random_photo = async (req, res) => {
  if (req.query.photo_index && !isNaN(parseInt(req.query.photo_index))) {
    
    //UI requesting specific photos (max up to 12)
    get_photo_history((err, rows) => {      
      if (err) {
        logger.error(err.message);
        return get_default_photo(res);
      } else {
        if (rows && rows.length > 0) {
          let photo_data = rows[req.query.photo_index];
          photo_data["photo_index"] = parseInt(req.query.photo_index);
          //photo_data.address = JSON.parse(photo_data.address);
          if (photo_data.source_id == 1) {
            get_photo_from_synology(photo_data, req, res);
          }else if (photo_data.source_id == 2){
            fs_get_photo(photo_data, res);
          } else {
            //some issue, return default pic
            return get_default_photo(res);
          }
        }else{
          return get_default_photo(res);
        }
      }
    });

  } else {
    meta_get_random_photo((err, rows) => {
      if (err) {
        logger.error(err);
        return get_default_photo(res);
      } else {
        if (rows && rows.length > 0) {
          let photo_data = rows[0];
          photo_data["photo_index"] = 0;
          photo_data.address = JSON.parse(photo_data.address);
          if (photo_data.source_id == 1) {
            get_photo_from_synology(photo_data, req, res);
          }else if (photo_data.source_id == 2){
            fs_get_photo(photo_data, res);
          } else {
            logger.error(`The source type ${photo_data.source_id} was not configured, returning default photo.`)
            //some issue, return default pic
            return get_default_photo(res);
          }
        }else{
          return get_default_photo(res);
        }
      }
    });
  }
}

function get_photo_from_synology(photo_data, req, res) {
  //syno get photo
  syno_get_photo(photo_data.photo_id, photo_data.cache_key, "xl").then(response => {
    if (response && response.headers) {
      res.writeHead(200, {
        'Content-Type': response.headers.get('content-type'),
        'Content-Length': response.data.length,
        'photo-data': JSON.stringify(photo_data)
      });
      res.end(response.data);

    } else {
      fs.readFile('web/eyedeea_photos.jpg', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error reading image file.');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(data);
      });
    }
  })
    .catch(error => {
      res.status(500).send(error);
    });

}

function get_default_photo(res) {
  fs.readFile('web/eyedeea_photos.jpg', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error reading image file.');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(data);
  });
}

export const add_tag_dns = async (req, res) => {
  meta_get_tag("eyedeea_dns", (err, e_tag) => {
    if (err) {
      logger.error(err.message);
    } else {
      if(e_tag){
        syno_add_tag(req.params.photo_id, e_tag.syno_id).then(response_data => {
          console.log(response_data);
          res.json(response_data);
        });
      }else{
        res.status(500).json({ error: "Something went wrong while adding tag!" });
      }
    }
  });
}

export const add_tag_mark = async (req, res) => {
  meta_get_tag("eyedeea_mark", (err, e_tag) => {
    if (err) {
      logger.error(err.message);
    } else {
      if(e_tag){
        syno_add_tag(req.params.photo_id, e_tag.syno_id).then(response_data => {
          console.log(response_data);
          res.json(response_data);
        });
      }else{
        res.status(500).json({ error: "Something went wrong while adding tag!" });
      }
    }
  });
}
