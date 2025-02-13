import express from 'express';
import { get_random_photo, get_viewer_config, 
    add_tag_dns, add_tag_mark } from '../controllers/view_controller.js';
const router = express.Router();

router.get('/', get_random_photo);
router.get('/config', get_viewer_config);
router.post('/:photo_id/dns', add_tag_dns);
router.post('/:photo_id/mark', add_tag_mark);

export default router;