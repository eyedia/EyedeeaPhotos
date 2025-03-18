import express from 'express';
import { get_source_summary, global_search } from '../controllers/system_controller.js';
const router = express.Router();

router.get('/', get_source_summary);
router.get('/search', global_search);

export default router;