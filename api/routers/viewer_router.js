import express from 'express';
import { get_random_photo, get_viewer_config } from '../controllers/viewer_controller.js';
const router = express.Router();

router.get('/', get_random_photo);
router.get('/config', get_viewer_config);

export default router;