import express from "express";
import helmet from "helmet";
import cron from "node-cron";
import cors from 'cors';
import logger from "./config_log.js";
import { set_random_photo, get_config } from "./meta/meta_view.mjs";
import { scan as syno_scan } from "./sources/synology/syno_scanner.mjs";
import { scan as fs_scan } from "./sources/fs/fs_scanner.mjs";
import view_filter_router from './api/routers/view_filter_router.js';
import view_router from './api/routers/view_router.js';
import source_router from './api/routers/source_router.js';
import source_scan_router from './api/routers/source_scan_router.js';
import source_browser_router from './api/routers/source_browser_router.js';
import system_router from './api/routers/system_router.js';
import { list as meta_list_sources } from "./meta/meta_source.mjs";
import { encrypt, decrypt } from "./meta/encrypt.js";
import constants from "./constants.js";

//

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error(err);
});

const app = express(helmet());
app.disable('x-powered-by')
app.use(cors());
app.use(express.static('web'));
app.use(express.json());

app.use('/api/system', system_router);
app.use('/api/view', view_router);
app.use('/api/view/filters', view_filter_router);
app.use('/api/sources', source_router);
app.use('/api/sources/:id', source_scan_router);
app.use('/api/sources/:id/browse', source_browser_router);

const PORT = process.env.PORT || 8080;
let random_photo_set_interval = "*/25 * * * * *";
const is_jest_running = process.env.JEST_WORKER_ID !== undefined

if (!is_jest_running) {
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
      meta_list_sources((err, sources) => {
        if (sources) {
          sources.forEach(source => {
            if (source.type == constants.SOURCE_TYPE_NAS) {
              logger.info(`Auto scanning NAS type ${source.name}...`);
              syno_scan((source, undefined, undefined), (err, scan_log_details) => {
                logger.info(scan_log_details);
              },
              (scan_finished => {
                logger.info(scan_finished);
              })
            );
            }
            else {
              logger.info(`Auto scanning FS type ${source.name}...`);              
              fs_scan_service(source, (err, scan_log_details) => {
                if (err) {
                  logger.error(err);
                } else {
                  logger.info(scan_log_details);
                }
              });
            
            }
          });
        }
      });

    });
  });
}

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

//module.exports = server; 
export default { server };