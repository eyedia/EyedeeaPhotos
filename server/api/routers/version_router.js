/**
 * Eyedeea Photos - Version API Routes
 * Copyright (c) 2024 Eyedia Technologies
 * 
 * This file is part of Eyedeea Photos.
 * Eyedeea Photos is licensed under the GNU General Public License v3.0
 * 
 * SPDX-License-Identifier: GPL-3.0-only
 */

import express from 'express';
const router = express.Router();
import { get_version, check_updates } from '../controllers/version_controller.js';
import logger from '../../config_log.js';

// Log all requests to version endpoints
router.use((req, res, next) => {
  logger.info(`Version API: ${req.method} ${req.originalUrl}`);
  next();
});

// Get current version
router.get('/', get_version);

// Check for updates
router.get('/check-updates', check_updates);

export default router;
