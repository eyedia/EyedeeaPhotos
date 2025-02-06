import { scan as syno_scan, scanner_is_busy } from "../../services/scanners/synology/syno_scanner.mjs";
import config_log from "../../config_log.js";

const logger = config_log.logger;


export const scan = async (req, res) => {
  let folder_id = undefined;
  if (req.params.folder_id) {
    folder_id = req.params.folder_id;
  }

  let folder_name = undefined;
  if (req.query.folder_name) {
    folder_name = req.query.folder_name;
  }

  try {
    if (!scanner_is_busy()) {
      await syno_scan(folder_id, folder_name);
      logger.info("Scanning started...");
      res.json({ "message": "Scanning started..." });
    } else {
      res.status(503).json({ error: "Scanning is already in progress." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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