import { create_or_update as meta_create_or_update,
  get as meta_get,
  list as meta_list
 } from "../../meta/meta_source.mjs";
 import { authenticate as syno_authenticate, create_eyedeea_tags } from "../../sources/synology/syno_client.mjs";
 import { authenticate as fs_authenticate } from "../../sources/fs/fs_client.mjs";
import config_log from "../../config_log.js";

const logger = config_log.logger;

export const create_or_update = async (req, res) => {
  try {
    if (!req.body.hasOwnProperty("config")) {
      req.body["config"] = null;
    }
    meta_create_or_update(req.body, (err, updated_id, status_code) => {      
      if (err) {
        logger.error(err.message);
      } else {        
        if (updated_id) {
          res.status(status_code);
          res.json({"id": updated_id});
          authenticate_source(updated_id);
        }
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
    meta_get(req.params.id, (err, item) => {      
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

function authenticate_source(source_id){
  if(source_id == 1){
    syno_authenticate(result => {
      //for NAS we are going to create special tags.
      create_eyedeea_tags();
    });
  }else if(source_id == 2){
    fs_authenticate();
  }
}