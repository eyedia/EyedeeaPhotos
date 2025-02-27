import { scanner_is_busy } from "../../sources/scanner.js";
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
  if (req.params.folder_id) {
    folder_id = req.params.folder_id;
  }

  let folder_name = undefined;
  if (req.query.folder_name) {
    folder_name = req.query.folder_name;
  }

  try {
    await syno_scan_service(source, folder_id, folder_name, (err, scan_log_details) => {
      res.json(scan_log_details);
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

export const logs = async (req, res) => {
  try {
    const users = ["u1", "u2"];   //await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const geo = async (req, res) => {
  try {
    const users = ["u1", "u2"];   //await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*
export const createUser = async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
*/