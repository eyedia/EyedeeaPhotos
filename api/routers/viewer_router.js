import express from 'express';
import { get_random_photo, get_viewer_config } from '../controllers/viewer_controller.js';
const router = express.Router();

router.get('/', get_random_photo);
router.get('/config', get_viewer_config);
//router.get('/set', set_random_photo);
//router.get('/:cache_key', get_photo);
//router.post('/:photo_id', save_view_log);

export default router;