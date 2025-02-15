import express from 'express';
import { scan, logs, geo } from '../controllers/source_scan_controller.js';

const router = express.Router({ mergeParams: true });

router.post('/scan', scan);
router.get('/logs', logs);
router.get('/geo', geo);

export default router;