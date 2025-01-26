import express from "express";
import config_log from "./config_log.js";
import { meta_init } from "./meta/meta_base.mjs";
import { get_scan_log_detail } from "./meta/meta_scan.mjs";
import { authenticate } from "./services/scanners/synology/syno_client.mjs";
import scanner_router from './api/routers/scanner_router.js';
import viewer_router from './api/routers/viewer_router.js';
import repo_router from './api/routers/repo_router.js';


const app = express();
app.use(express.static('public'));
//app.use(express.static('web'));
app.use(express.json());
app.use('/api/scanner', scanner_router);
app.use('/api/viewer', viewer_router);
app.use('/api/repo', repo_router);


const PORT = process.env.PORT || 8080;
const logger = config_log.logger;

async function init() {
  await meta_init();
  await authenticate();


  // app.get('/test', async (req, res) => {
  //   get_scan_log_detail(1, undefined, (err, rows) => {
  //     if (err) {
  //       logger.error(err);
  //     } else {
  //       console.log(rows);
  //       if (rows) {
  //         let remaining_failed_folders = rows.length;
  //         res.json({"data": remaining_failed_folders});
  //       }else{
  //         res.json({"data": -1});
  //       }
  //     }
  //   });
  // });

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });
  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

init();