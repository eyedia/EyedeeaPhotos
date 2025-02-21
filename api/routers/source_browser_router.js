import express from 'express';
import { get_root_folders, get_folders, get_items, get_stats } from '../controllers/source_browse_controller.js';
const router = express.Router({ mergeParams: true });

router.get('/', get_root_folders);
router.get('/:folder_id', get_folders);
router.get('/:folder_id/items', get_items);
router.get('/stats', get_stats);

export default router;