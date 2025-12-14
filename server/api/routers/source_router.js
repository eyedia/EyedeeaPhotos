import express from 'express';
import { create_or_update, list_items, get_item, get_dirs, get_photos_from_a_dir, delete_source, purge_source_refs } from '../controllers/source_controller.js';
const router = express.Router();

router.post('/', create_or_update);
router.get('/', list_items);
router.get('/:id', get_item);
router.delete('/:id', delete_source);
router.get('/:id/dirs', get_dirs);
router.get('/:id/dirs/:dir_id', get_photos_from_a_dir);
router.post('/:id/purge', purge_source_refs);

export default router;