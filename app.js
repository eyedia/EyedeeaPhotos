import express from "express";
import useragent from "useragent";
import fs from "fs";
import config_log from "./config_log.js";
import { meta_init, get_photos, save_view_log } from "./meta/metadata.mjs";
import { authenticate, list_dir, list_dir_items, list_geo, get_photo } from "./syno/syno_client.mjs";
import { scan } from "./syno/syno_scanner.mjs";

const app = express();
app.use(express.static('public'));
app.use(express.json());

const PORT = process.env.PORT || 8080;
const logger = config_log.logger;

async function init() {
  await meta_init();
  await authenticate();

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });

  app.get('/photos', async (req, res) => {
    get_photos((err, rows) => {
      if (err) {
        logger.error(err.message);
      } else {
        res.json(rows);
      }
    });
  });

  app.get('/photo', async (req, res) => {
    try {
      let id = "";
      let cache_key = "";
      if (req.query.key) {
        cache_key = req.query.key;
        id = cache_key.split("_")[0];
      }

      let size = "sm";
      if (req.query.size) {
        size = req.query.size;
      }

      const response = await get_photo(id = id, cache_key = cache_key, size = size);
      res.writeHead(200, {
        'Content-Type': response.headers.get('content-type'),
        'Content-Length': response.data.length
      });
      res.end(response.data);


    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/dir', async (req, res) => {
    try {
      let folder_id = undefined;
      if (req.query.folder_id) {
        folder_id = req.query.folder_id;
      }

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
  });

  app.get('/list', async (req, res) => {
    try {      

      let folder_id = undefined;
      if (req.query.folder_id) {
        folder_id = req.query.folder_id;
      }

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
  });

  app.get('/geo', async (req, res) => {
    try {
      let offset = undefined;
      if ((req.query.offset) && (req.query.offset != 0)) {
        offset = req.query.offset;
      }

      let limit = undefined;
      if ((req.query.limit) && (req.query.limit != 0)) {
        limit = req.query.limit;
      }

      const data = await list_geo(undefined, undefined, offset, limit);
      res.json(data);
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/scan', async (req, res) => {
    let log_path = "./logs/logs.log";
    let error_only = false;
    if ((req.query.error_only)) {
      error_only = req.query.error_only;
      if (error_only) {
        log_path = "./logs/errors.log";
      }
    }

    let folder_id = undefined;
    if (req.query.folder_id) {
      folder_id = req.query.folder_id;
    }

    let folder_name = undefined;
    if (req.query.folder_name) {
      folder_name = req.query.folder_name;
    }

    await scan(folder_id, folder_name);

    logger.info("Scanning started...");
    const logStream = fs.createReadStream(log_path);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    logStream.pipe(res);

    logStream.on('error', (err) => {
      console.error(err);
      res.status(500).send("Error reading log file. The operation could still be on, please check the server log!");
    });
  });

  app.post('/view', async (req, res) => {
    const agent = useragent.parse(req.headers['user-agent']);
    let view_log = {
      photo_id: req.body.photo_id,
      client_ip_address: req.ip,
      client_user_agent_family: agent.family,
      client_user_agent_os_family: agent.os.family
    }
    await save_view_log(view_log);
    res.status(201).json({ message: 'View log received successfully' });
  });

  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

init();