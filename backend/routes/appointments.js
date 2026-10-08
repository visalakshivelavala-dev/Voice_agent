/**
 * MedVoice AI - Appointments API Routes
 */
import { Router } from 'express';
import {
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAllAppointments,
} from '../controllers/appointmentsController.js';

const router = Router();

// GET /api/appointments - List all appointments for dashboard
router.get('/', getAllAppointments);

// POST /api/appointments - Book a new appointment
router.post('/', createAppointment);

// DELETE /api/appointments/:id - Cancel appointment and free slot
router.delete('/:id', cancelAppointment);

// PATCH /api/appointments/:id - Reschedule appointment to new slot
router.patch('/:id', rescheduleAppointment);

export default router;
