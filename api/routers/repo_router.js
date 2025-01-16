import express from 'express';
import { get_root_folders, get_folders, get_items, get_stats } from '../controllers/repo_controller.js';
const router = express.Router();

router.get('/', get_root_folders);
router.get('/folders/:folder_id', get_folders);
router.get('/items/:folder_id', get_items);
router.get('/stats', get_stats);

export default router;