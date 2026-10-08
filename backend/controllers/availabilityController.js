/**
 * MedVoice AI - Doctor Availability Controller
 * Requirement 5:
 * Real availability queried from database.
 * Voice agent must never generate slots itself.
 */
import { db } from '../db/database.js';
import { parseNaturalDate, formatHumanDate } from '../services/dateService.js';

export async function getDoctorAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const rawDate = req.query.date;

    // Resolve date to normalized YYYY-MM-DD
    const resolvedDate = parseNaturalDate(rawDate);

    const availability = await db.getAvailableSlots(id, resolvedDate);

    if (!availability) {
      return res.status(404).json({
        success: false,
        reason: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID ${id} was not found.`,
      });
    }

    // Response strictly matches Requirement 5 format:
    // { "doctor": "Dr. Priya Sharma", "date": "2026-10-08", "available_slots": ["17:00", "17:30", "18:00"] }
    res.json({
      doctor: availability.doctor,
      doctor_id: availability.doctor_id,
      specialty: availability.specialty,
      date: availability.date,
      human_date: formatHumanDate(availability.date),
      available_slots: availability.available_slots,
      count: availability.available_slots.length,
    });
  } catch (err) {
    next(err);
  }
}
