/**
 * MedVoice AI - Retell AI Tool Execution & Webhook Routes
 */
import { Router } from 'express';
import { handleRetellWebhook, handleSpecificTool } from '../controllers/retellController.js';

const router = Router();

// POST /api/retell/webhook - Central webhook for Retell custom tool dispatch
router.post('/webhook', handleRetellWebhook);

// POST /api/retell/tools/:toolName - Direct tool endpoint for individual tool configs
router.post('/tools/:toolName', handleSpecificTool);

export default router;
