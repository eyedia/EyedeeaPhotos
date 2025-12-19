import express from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerPath = path.join(__dirname, '../../swagger.json');

// Load swagger document with proper encoding
let swaggerDocument;
try {
  let swaggerJson = fs.readFileSync(swaggerPath, 'utf8');
  // Remove BOM if present
  if (swaggerJson.charCodeAt(0) === 0xFEFF) {
    swaggerJson = swaggerJson.slice(1);
  }
  swaggerDocument = JSON.parse(swaggerJson);
} catch (error) {
  console.error('Error loading swagger.json:', error.message);
  // Fallback to empty spec if file can't be loaded
  swaggerDocument = {
    swagger: '2.0',
    info: { title: 'Eyedeea Photos API', version: '1.0.0' },
    paths: {}
  };
}

const router = express.Router();

// Serve Swagger UI static files
router.use('/', swaggerUi.serve);

// Setup Swagger UI with the documentation
router.get('/', swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Eyedeea Photos API Documentation'
}));

export default router;