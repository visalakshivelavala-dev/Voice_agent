/**
 * MedVoice AI - Doctors API Routes
 */
import { Router } from 'express';
import { getAllDoctors, getDoctorById } from '../controllers/doctorsController.js';
import { getDoctorAvailability } from '../controllers/availabilityController.js';

const router = Router();

// GET /api/doctors - Return all active doctors (supports ?specialty=...)
router.get('/', getAllDoctors);

// GET /api/doctors/:id - Return doctor details
router.get('/:id', getDoctorById);

// GET /api/doctors/:id/availability - Return verified available slots
router.get('/:id/availability', getDoctorAvailability);

export default router;
