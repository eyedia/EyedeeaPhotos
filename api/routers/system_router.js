import express from 'express';
import { get_source_summary } from '../controllers/system_controller.js';
const router = express.Router();

router.get('/', get_source_summary);

export default router;