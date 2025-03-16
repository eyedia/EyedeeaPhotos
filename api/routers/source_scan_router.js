import express from 'express';
import { scan, scan_log_list, scan_log_get, is_active_scan } from '../controllers/source_scan_controller.js';

const router = express.Router({ mergeParams: true });

router.post('/scan', scan);
router.get('/scan', is_active_scan);
router.get('/scan/logs', scan_log_list);
router.get('/scan/logs/:view_log_id', scan_log_get);

export default router;