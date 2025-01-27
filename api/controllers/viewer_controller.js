import useragent from "useragent";
import fs from 'fs';
import { get_random_photo as meta_get_random_photo } from "../../meta/meta_view.mjs";
import { list_geo, get_photo as syno_get_photo } from "../../services/scanners/synology/syno_client.mjs";
import config_log from "../../config_log.js";
import { response } from "express";
const logger = config_log.logger;

/*
export const get_random_photo = async (req, res) => {
  try {
    meta_get_random_photo((err, rows) => {
      if (err) {
        logger.error(err.message);
      } else {
        res.json(rows);
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
};
*/

export const set_random_photo = async (req, res) => {
  try {
    meta_set_random_photo((err, rows) => {
      if (err) {
        logger.error(err.message);
      } else {
        res.json(rows);
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const get_random_photo = async (req, res) => {
  try {
    meta_get_random_photo((err, rows) => {
      if (err) {
        logger.error(err.message);
      } else {
        if (rows && rows.length > 0) {
          let photo_data = rows[0];
          photo_data.address = JSON.parse(photo_data.address);
          if (photo_data.cache_key && photo_data.cache_key != "") {
            //syno get photo
            syno_get_photo(photo_data.photo_id, photo_data.cache_key, "xl").then(response => {
              if (response && response.headers) {
                res.writeHead(200, {
                  'Content-Type': response.headers.get('content-type'),
                  'Content-Length': response.data.length,
                  'photo-data': JSON.stringify(photo_data)
                });
                res.end(response.data);
                
              }else{
                fs.readFile('public/eyedeea_player.jpg', (err, data) => {
                  if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error reading image file.');
                    return;
                  }
                  res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                  res.end(data);
                });
              }
            });

          } else {
            //fs get photo
          }
        }
      }
    });


  } catch (err) {
    logger.error(err);
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

/*
export const get_photo_data = async (req, res) => {
  try {
    res.json(photo_data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const get_photo = async (req, res) => {
  try {
    let cache_key = req.params.cache_key;
    let id = cache_key.split("_")[0];
    let size = "sm";
    if (req.query.size) {
      size = req.query.size;
    }

    const response = await syno_get_photo(id = id, cache_key = cache_key, size = size);
    res.writeHead(200, {
      'Content-Type': response.headers.get('content-type'),
      'Content-Length': response.data.length
    });
    res.end(response.data);
  } catch (err) {
    logger.error(err);
    res.status(500).send('Internal Server Error');
  }
};

export const save_view_log = async (req, res) => {
  const agent = useragent.parse(req.headers['user-agent']);
  let view_log = {
    photo_id: req.params.photo_id,
    client_ip_address: req.ip,
    client_user_agent_family: agent.family,
    client_user_agent_os_family: agent.os.family
  }
  await meta_save_view_log(view_log);
  res.status(201).json({ message: 'View log received successfully' });
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