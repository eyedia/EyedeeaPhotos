import express from 'express';
import { create_or_update, list_items, get_item, make_active } from '../controllers/view_manage_controller.js';
const router = express.Router();

router.post('/', create_or_update);
router.get('/', list_items);
router.get('/:id', get_item);
router.get('/:id/active', make_active);

export default router;