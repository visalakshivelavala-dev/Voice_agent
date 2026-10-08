/**
 * MedVoice AI - Voice Agent Web Call & Simulation Routes
 */
import { Router } from 'express';
import { createWebCall, simulateVoiceAgent } from '../controllers/retellController.js';

const router = Router();

// POST /api/voice/create-web-call - Create Retell Web Call session
router.post('/create-web-call', createWebCall);

// POST /api/voice/simulate-agent - Browser-based voice/text simulation engine
router.post('/simulate-agent', simulateVoiceAgent);

export default router;
