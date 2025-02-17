import express from "express";
import cron from "node-cron";

import config_log from "./config_log.js";
import { meta_init } from "./meta/meta_base.mjs";
import { set_random_photo, get_config } from "./meta/meta_view.mjs";
import { scan as syno_scan } from "./sources/synology/syno_scanner.mjs";
import { scan as fs_scan } from "./sources/fs/fs_scanner.js";
import view_manage_router from './api/routers/view_manage_router.js';
import view_router from './api/routers/view_router.js';
import repo_router from './api/routers/repo_router.js';
import source_router from './api/routers/source_router.js';
import source_scan_router from './api/routers/source_scan_router.js';
import { authenticate as syno_authenticate } from "./sources/synology/syno_client.mjs";
import { authenticate as fs_authenticate, get_address_from_exif } from "./sources/fs/fs_client.js";

const logger = config_log.logger;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error(err);
});

const app = express();
//app.use(express.static('public'));
app.use(express.static('web'));
app.use(express.json());

app.use('/api/view', view_router);
app.use('/api/view/manage', view_manage_router);
app.use('/api/repo', repo_router);
app.use('/api/sources', source_router);
app.use('/api/sources/:id', source_scan_router);

let random_photo_set_interval = "*/25 * * * * *";

get_config((err, config) => {
      if (err) {
        logger.error(err.message);
      } else {
        random_photo_set_interval = config.refresh_server;
      }
      logger.info(`Server side refresh is set to: ${random_photo_set_interval}`);
      cron.schedule(random_photo_set_interval, () => {
        set_random_photo();
      });

      cron.schedule("0 1 * * *", () => {
        logger.info('Auto scanning...');
        syno_scan(undefined, undefined);
      });
    });



const PORT = process.env.PORT || 8080;

async function init() {
  meta_init( result => {
    syno_authenticate();
    fs_authenticate();
  });
  
  app.get('/test', async (req, res) => {
    // get_address_using_geo_reverse(35.08215160456117,-80.72279683813987, (err, data) => {
    //   if(err){
    //     res.status(503).json(err);
    //   }else{
    //   res.json(data);
    // }
    // });
    get_address_from_exif();
    res.json("ok");
  });

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });
  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

init();