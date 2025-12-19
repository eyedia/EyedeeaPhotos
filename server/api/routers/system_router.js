import express from 'express';
import { get_source_summary, global_search, status, logs } from '../controllers/system_controller.js';
const router = express.Router();

// ============ SYSTEM STATUS ENDPOINTS ============
router.get('/status', status);
router.get('/logs', logs);

// ============ SEARCH ENDPOINTS ============
router.get('/search', global_search);

// ============ SUMMARY ENDPOINT (default/catch-all) ============
router.get('/', get_source_summary);

export default router;