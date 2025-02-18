import express from "express";
import cron from "node-cron";
import config_log from "./config_log.js";
import { set_random_photo, get_config } from "./meta/meta_view.mjs";
import { scan as syno_scan } from "./sources/synology/syno_scanner.mjs";
import { scan as fs_scan } from "./sources/fs/fs_scanner.mjs";
import view_manage_router from './api/routers/view_manage_router.js';
import view_router from './api/routers/view_router.js';
import repo_router from './api/routers/repo_router.js';
import source_router from './api/routers/source_router.js';
import source_scan_router from './api/routers/source_scan_router.js';
// import { authenticate as syno_authenticate } from "./sources/synology/syno_client.mjs";
// import { authenticate as fs_authenticate } from "./sources/fs/fs_client.mjs";

const logger = config_log.logger;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error(err);
});

const app = express();
app.use(express.static('web'));
app.use(express.json());

app.use('/api/view', view_router);
app.use('/api/view/manage', view_manage_router);
app.use('/api/repo', repo_router);
app.use('/api/sources', source_router);
app.use('/api/sources/:id', source_scan_router);

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
      syno_scan(undefined, undefined);
    });
  });
}

app.get('/status', async (req, res) => {
  res.json({ status: 'up' });

});

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

module.exports = server; 