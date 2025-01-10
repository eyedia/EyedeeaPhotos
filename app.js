import express from "express";
import dotenv from 'dotenv';
import { meta_init } from "./metadata/metadata.mjs"
import { authenticate, list_dir, list_geo, get_photo } from "./synoclient/synoclient.mjs"
import {scan} from "./synoclient/syno_scanner.mjs"

const app = express();
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

async function init() {
  meta_init();
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

    // let m_offset = 0;
    // let m_limit = 100;
    // let one_record = {};

    // list_dir(undefined, undefined, m_offset, m_limit)
    //   .then(data => {
    //     data.data.list.forEach(function (root_folder) {
    //       one_record.root_folder_id = root_folder.id;
    //       one_record.root_folder_name = root_folder.name;

    //       list_dir(one_record.root_folder_id, undefined, m_offset, m_limit)
    //       .then(data => {
    //         data.data.list.forEach(function (folder) {
    //           one_record.folder_id = folder.id;
    //           one_record.folder_name = folder.name;
    //           console.log(one_record);
    //         });
    //       });
    //     });
    //   });

    await scan();

    res.json("data");
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

init();