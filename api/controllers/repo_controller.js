import {list_dir, list_dir_items, list_geo, get_photo } from "../../services/scanners/synology/syno_client.mjs";
import config_log from "../../config_log.js";

const logger = config_log.logger;

export const get_root_folders = async (req, res) => {
  try {

    let offset = undefined;
    if (req.query.offset) {
      offset = req.query.offset;
    }

    let limit = undefined;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    const data = await list_dir(undefined, offset, limit);
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};

export const get_folders = async (req, res) => {
  try {
    const folder_id = req.params.folder_id;

    let offset = undefined;
    if (req.query.offset) {
      offset = req.query.offset;
    }

    let limit = undefined;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    const data = await list_dir(folder_id, offset, limit);
    res.json(data);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
};

export const get_items = async (req, res) => {
  try {
    const folder_id = req.params.folder_id;

    let offset = undefined;
    if (req.query.offset) {
      offset = req.query.offset;
    }

    let limit = undefined;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    const data = await list_dir_items(folder_id, offset, limit);
    res.json(data);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
};

export const get_stats = async (req, res) => {
  try {
    const photo_id = req.params.photo_id;
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