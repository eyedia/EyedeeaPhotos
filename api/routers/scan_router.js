import express from 'express';
import { scan, logs, geo } from '../controllers/scan_controller.js';

const router = express.Router();

router.post('/', scan);
router.get('/', logs);
router.get('/', geo);

export default router;