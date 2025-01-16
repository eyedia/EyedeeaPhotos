import express from 'express';
import { get_random_photos, get_photo, save_view_log } from '../controllers/viewer_controller.js';
const router = express.Router();

router.get('/', get_random_photos);
router.get('/:cache_key', get_photo);
router.post('/:photo_id', save_view_log);

export default router;