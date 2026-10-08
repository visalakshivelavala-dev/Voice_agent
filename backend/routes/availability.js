/**
 * MedVoice AI - Availability Direct Routes
 */
import { Router } from 'express';
import { getDoctorAvailability } from '../controllers/availabilityController.js';

const router = Router();

// GET /api/availability/:id?date=...
router.get('/:id', getDoctorAvailability);

export default router;
