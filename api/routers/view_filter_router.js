import express from 'express';
import { create_or_update, list_items, 
    get_item, 
    set_active_filter, set_active_default } from '../controllers/view_filter_controller.js';
const router = express.Router();

router.post('/', create_or_update);
router.get('/', list_items);
router.get('/:id', get_item);
router.post('/active', set_active_default);
router.post('/:id/active', set_active_filter);

export default router;