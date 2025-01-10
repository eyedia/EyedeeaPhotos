import express from "express";
import dotenv from 'dotenv';
import { meta_init } from "./metadata/metadata.mjs"
import { authenticate, photos_teams_get_dir_items, photos_teams_get_photo } from "./synoclient/synoclient.mjs"

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

  app.get('/dir', async (req, res) => {
    try {
      let id = -1;
      if ((req.query.id) && (req.query.id > -1)){
        id = req.query.id;
      }

      let folder_id = -1;
      if ((req.query.folder_id) && (req.query.folder_id > -1)){
        folder_id = req.query.folder_id;
      }

      let offset = 0;
      if ((req.query.offset) && (req.query.offset != 0)){
        offset = req.query.offset;
      }

      let limit = 100;
      if ((req.query.limit) && (req.query.limit != 0)){
        limit = req.query.limit;
      }

      const data = await photos_teams_get_dir_items(id=id, folder_id=folder_id, offset=offset, limit=limit);
      res.json(data); 
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/image', async (req, res) => {
    try {
      let id = "";
      let cache_key = "";
      if (req.query.key){
        cache_key = req.query.key;
        id = cache_key.split("_")[0];
      }

      let size = "sm";
      if (req.query.size){
        size = req.query.size;
      }

      const response = await photos_teams_get_photo(id=id, cache_key=cache_key, size=size);
      res.writeHead(200, {
         'Content-Type': response.headers.get('content-type'),
         'Content-Length': response.data.length
       });
      res.end(response.data);
       

    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/scan', (req, res) => {
    res.json(data);
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

init();