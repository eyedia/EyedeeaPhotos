import express from 'express';
import { get_root_folders, get_folders, get_items, get_persons, get_stats } from '../controllers/source_browse_controller.js';
const router = express.Router({ mergeParams: true });

// ============ LITERAL ROUTES (must come before parameterized /:folder_id) ============
router.get('/', get_root_folders);
router.get('/persons', get_persons);
router.get('/stats', get_stats);

// ============ PARAMETERIZED ROUTES ============
router.get('/:folder_id', get_folders);
router.get('/:folder_id/items', get_items);

export default router;