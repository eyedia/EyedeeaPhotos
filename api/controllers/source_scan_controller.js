import { scanner_is_busy } from "../../sources/scanner.js";
import { list as meta_scan_log_list, get_scan_log_summary as meta_get_scan_log_summary, get as meta_scan_log_get } from "../../meta/meta_scan_log.mjs";
import { scan as syno_scan_service } from "../../sources/synology/syno_scanner.mjs";
import { authenticate as fs_authenticate, fs_config } from "../../sources/fs/fs_client.mjs";
import { scan as fs_scan_service } from "../../sources/fs/fs_scanner.mjs";
import {
  get as meta_get_source
} from "../../meta/meta_source.mjs"
import constants from "../../constants.js";
import config_log from "../../config_log.js";

const logger = config_log.logger;

export const scan = async (req, res) => {
  meta_get_source(req.params.id, true, (err, source) => {
    if (source) {
      if (!scanner_is_busy()) {
        if (source.type == constants.SOURCE_TYPE_NAS)
          syno_scan(source, req, res);
        else
          fs_scan(source, req, res);
      } else {
        res.status(503).json({ error: "Scanning is already in progress." });
      }

    } else {
      res.status(400).json({ "message": `Source id ${req.params.id} does not exist!` });
    }
  });
}

const syno_scan = async (source, req, res) => {
  let folder_id = undefined;
  if (req.query.folder_id) {
    folder_id = req.query.folder_id;
  }

  try {
    await syno_scan_service(source, folder_id, (err, scan_log_details) => {
      if(err){
        res.status(503).json(err);
        return;
      }else{
        res.json(scan_log_details);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const fs_scan = async (source, req, res) => {

  try {
    if (fs_config == null) {
      fs_authenticate(source.id, result => {
        execute_fs_scan(source, res);
      });
    } else {
      execute_fs_scan(source, res);
    }


  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function execute_fs_scan(source, res) {
  fs_scan_service(source, (err, scan_log_details) => {
    if (err) {
      res.status(400).json({ "message": err });
    } else {
      res.json(scan_log_details);
    }
  });
}

export const scan_log_list = async (req, res) => {
  try {
    
    if (req.query.latest && req.query.latest == "true") {      
      meta_get_scan_log_summary(req.params.id, (err, rows) => {
        if (err) {
          logger.error(err.message);
        } else {
          res.json(rows);
        }
      });

    } else {
      meta_scan_log_list(req.params.id, req.query.limit, req.query.offset, (err, rows) => {
        if (err) {
          logger.error(err.message);
        } else {
          res.json(rows);
        }
      });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};


export const scan_log_get = async (req, res) => {
  try {
    meta_scan_log_get(req.params.view_log_id, (err, item) => {
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