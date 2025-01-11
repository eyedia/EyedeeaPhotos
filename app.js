import express from "express";
import config_log from "./config_log.js";
import { meta_init } from "./meta/metadata.mjs";
import { authenticate, list_dir, list_geo, get_photo } from "./syno/syno_client.mjs";
import {scan} from "./syno/syno_scanner.mjs";

const app = express();
app.use(express.static('public'));
const PORT = process.env.PORT || 3000;
const logger = config_log.logger;

async function init() {
  await meta_init();
  await authenticate();

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });

  app.get('/images', (req, res) => {
    res.json(["40627_1735854357", "40624_1735854353"]);
  });

  app.get('/image', async (req, res) => {
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
      let id = undefined;
      if ((req.query.id) && (req.query.id > -1)) {
        id = req.query.id;
      }

      let folder_id = undefined;
      if ((req.query.folder_id) && (req.query.folder_id > -1)) {
        folder_id = req.query.folder_id;
      }

      let offset = undefined;
      if ((req.query.offset) && (req.query.offset != 0)) {
        offset = req.query.offset;
      }

      let limit = undefined;
      if ((req.query.limit) && (req.query.limit != 0)) {
        limit = req.query.limit;
      }

      const data = await list_dir(id, folder_id, offset, limit);
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
    await scan();
    res.json("data");
  });

  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

init();