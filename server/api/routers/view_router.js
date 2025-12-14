import express from 'express';
import {
  get_photo,
  get_random_photo, 
  get_lined_up_photo_data, 
  get_viewer_config, 
  add_tag_dns, 
  add_tag_mark, 
  delete_photo
} from '../controllers/view_controller.js';

const router = express.Router({ mergeParams: true });

// ============ GET ENDPOINTS ============

// Config endpoint
router.get('/config', get_viewer_config);

// Photo endpoints
router.get('/photos/:photo_id', get_photo);
router.get('/photos', get_lined_up_photo_data);
router.delete('/photos/:photo_id', delete_photo);

// Random photo (default/catch-all)
router.get('/', get_random_photo);

// ============ POST ENDPOINTS ============

router.post('/:photo_id/dns', add_tag_dns);
router.post('/:photo_id/mark', add_tag_mark);

export default router;
