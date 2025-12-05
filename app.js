import express from "express";
import helmet from "helmet";
import cron from "node-cron";
import cors from 'cors';
import logger from "./config_log.js";
import { set_random_photo, get_config } from "./meta/meta_view.mjs";
import { runMigrations } from "./meta/migration_manager.mjs";
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

// Run database migrations before starting server
await runMigrations();

const app = express(helmet());
app.disable('x-powered-by')
app.use(cors({
  credentials: true,
  origin: true
}));

app.use(express.static('web'));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    method: req.method
  });
});

// General error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(`Stack trace: ${err.stack}`);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

const PORT = process.env.PORT || 8080;
let random_photo_set_interval = "*/25 * * * * *";
const is_jest_running = process.env.JEST_WORKER_ID !== undefined

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server listening on all interfaces at port ${PORT}`);
});

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

export default { server };

