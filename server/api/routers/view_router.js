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

// ============ CONFIG & LITERAL ROUTES ============
// Literal routes must be defined before parameterized routes to prevent mismatching
router.get('/config', get_viewer_config);

// ============ PHOTO SPECIFIC ROUTES (by ID) ============
// More specific routes come before general ones
router.get('/photos/:photo_id', get_photo);
router.delete('/photos/:photo_id', delete_photo);

// ============ PHOTO GENERAL ROUTES ============
// General photo endpoints
router.get('/photos', get_lined_up_photo_data);

// ============ TAG ROUTES (POST) ============
// Tag operations on specific photos
router.post('/:photo_id/dns', add_tag_dns);
router.post('/:photo_id/mark', add_tag_mark);

// ============ DEFAULT/CATCH-ALL ============
// Random photo endpoint (must be last to avoid shadowing other routes)
router.get('/', get_random_photo);

export default router;
