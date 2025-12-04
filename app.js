import express from "express";
import helmet from "helmet";
import cron from "node-cron";
import cors from 'cors';
import logger from "./config_log.js";
import { set_random_photo, get_config } from "./meta/meta_view.mjs";
import view_filter_router from './api/routers/view_filter_router.js';
import view_router from './api/routers/view_router.js';
import source_router from './api/routers/source_router.js';
import source_scan_router from './api/routers/source_scan_router.js';
import source_browser_router from './api/routers/source_browser_router.js';
import system_router from './api/routers/system_router.js';
import api_doc_router from './api/routers/api_doc_router.js';
import drive_router from './api/routers/drive_router.js';


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error(err);
});

const app = express(helmet());
app.disable('x-powered-by')
app.use(cors({
  credentials: true,
  origin: true
}));

app.use(express.static('web'));
app.use(express.json());

const isSafeMode = process.argv.includes('--safe-mode');
if (!isSafeMode) {
app.use('/api/docs', api_doc_router);
app.use('/api/system', system_router);
app.use('/api/view', view_router);
app.use('/api/view/filters', view_filter_router);
}

app.use('/api/sources', source_router);
app.use('/api/sources/:id', source_scan_router);
app.use('/api/sources/:id/browse', source_browser_router);
app.use('/api/drives', drive_router);

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
    cron.schedule(random_photo_set_interval, () => {
      set_random_photo();
    });
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server listening on all interfaces at port ${PORT}`);
});

export default { server };

