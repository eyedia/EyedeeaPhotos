import { create_or_update as meta_create_or_update,
  get as meta_get,
  list as meta_list
 } from "../../meta/meta_source.mjs";
 import { authenticate as syno_authenticate, create_eyedeea_tags } from "../../sources/synology/syno_client.mjs";
 import { authenticate as fs_authenticate } from "../../sources/fs/fs_client.mjs";
import config_log from "../../config_log.js";
import constants from "../../constants.js";

const logger = config_log.logger;

export const create_or_update = async (req, res) => {
  try {
    if (req.body.hasOwnProperty("type")) {
      if ((req.body["type"] != constants.SOURCE_TYPE_NAS) && (req.body["type"] != constants.SOURCE_TYPE_FS)){
        res.status(400).send("Invalid type!");
        return;
      }
    }
    if (!req.body.hasOwnProperty("config")) {
      req.body["config"] = null;
    }
    meta_create_or_update(req.body, (err, saved_source, status_code) => {      
      if (err) {
        logger.error(err.message);
      } else {        
        if (saved_source) {
          
          authenticate_source(saved_source, auth_result => {
            saved_source["authenticate"] = auth_result;
            res.status(status_code);
            res.json(saved_source);
          });
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

function authenticate_source(source, callback){  
  if(source.type == constants.SOURCE_TYPE_NAS){
    syno_authenticate(source.id, auth_result => {
      //for NAS we are going to create special tags.
      if(auth_result.auth_status)
        create_eyedeea_tags(source.id);
      callback(auth_result);
    });
  }else if(source_id.type == constants.SOURCE_TYPE_NAS){
    fs_authenticate();
    callback({"auth_status": true, "error": {} });
  }
}