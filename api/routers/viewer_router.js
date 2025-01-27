import express from 'express';
import { get_random_photo } from '../controllers/viewer_controller.js';
const router = express.Router();

router.get('/', get_random_photo);
//router.get('/next', get_random_photo);
//router.get('/set', set_random_photo);
//router.get('/:cache_key', get_photo);
//router.post('/:photo_id', save_view_log);

export default router;