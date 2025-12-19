import express from 'express';
import { scan, scan_log_list, scan_log_get, is_active_scan } from '../controllers/source_scan_controller.js';

const router = express.Router({ mergeParams: true });

// ============ SCAN CONTROL ENDPOINTS ============
// Literal routes must come before parameterized routes
router.post('/scan', scan);
router.get('/scan', is_active_scan);

// ============ SCAN LOG ENDPOINTS ============
// Log list (general) before log get (specific)
router.get('/scan/logs', scan_log_list);
router.get('/scan/logs/:view_log_id', scan_log_get);

export default router;