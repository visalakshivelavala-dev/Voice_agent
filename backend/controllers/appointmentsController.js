/**
 * MedVoice AI - Appointments Controller
 * Handles booking, cancellation, rescheduling, and listing.
 * Includes atomic concurrency & race-condition protection.
 */
import { db } from '../db/database.js';
import { parseNaturalDate, parseNaturalTime, formatTo12Hour, formatHumanDate } from '../services/dateService.js';

export async function createAppointment(req, res, next) {
  try {
    const {
      doctor_id,
      patient_name,
      patient_phone,
      patient_email,
      appointment_date,
      appointment_time,
      reason,
    } = req.body;

    // Input Validation
    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        reason: 'MISSING_DOCTOR_ID',
        message: 'Doctor ID is required.',
      });
    }

    if (!patient_name || !patient_phone) {
      return res.status(400).json({
        success: false,
        reason: 'MISSING_PATIENT_INFO',
        message: 'Patient name and phone number are required to complete the booking.',
      });
    }

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        reason: 'MISSING_DATETIME',
        message: 'Appointment date and time are required.',
      });
    }

    // Normalize date and time
    const normalizedDate = parseNaturalDate(appointment_date);
    const normalizedTime = parseNaturalTime(appointment_time) || appointment_time.trim();

    // Atomic Booking via DB repository
    const result = await db.bookAppointment({
      doctor_id,
      patient_name: patient_name.trim(),
      patient_phone: patient_phone.trim(),
      patient_email: patient_email ? patient_email.trim() : null,
      appointment_date: normalizedDate,
      appointment_time: normalizedTime,
      reason: reason || 'General medical consultation',
    });

    if (!result.success) {
      // Race condition / slot taken check: Requirement 10
      if (result.reason === 'SLOT_ALREADY_BOOKED') {
        return res.status(409).json({
          success: false,
          reason: 'SLOT_ALREADY_BOOKED',
          message: 'Sorry, that slot was just taken. I can check the other available times for you.',
        });
      }

      if (result.reason === 'DOCTOR_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          reason: 'DOCTOR_NOT_FOUND',
          message: 'The requested doctor does not exist or is currently unavailable.',
        });
      }

      if (result.reason === 'SLOT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          reason: 'SLOT_NOT_FOUND',
          message: `The requested time slot (${normalizedTime}) is not scheduled for this doctor on ${normalizedDate}.`,
        });
      }

      return res.status(400).json(result);
    }

    // Success response: returns appointment ID and clean formatted details
    res.status(201).json({
      success: true,
      appointment_id: result.appointment_id,
      id: result.id,
      doctor_name: result.doctor_name,
      doctor_specialty: result.doctor_specialty,
      patient_name: result.patient_name,
      patient_phone: result.patient_phone,
      appointment_date: result.appointment_date,
      appointment_time: result.appointment_time,
      formatted_date: formatHumanDate(result.appointment_date),
      formatted_time: formatTo12Hour(result.appointment_time),
      status: 'confirmed',
      reason: result.reason,
      message: `Your appointment with ${result.doctor_name} has been successfully confirmed for ${result.appointment_date} at ${formatTo12Hour(result.appointment_time)}. Your Appointment ID is ${result.appointment_id}.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelAppointment(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        reason: 'MISSING_APPOINTMENT_ID',
        message: 'Appointment ID is required to cancel.',
      });
    }

    const result = await db.cancelAppointment(id);
    if (!result.success) {
      const statusCode = result.reason === 'APPOINTMENT_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function rescheduleAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const { new_date, new_time } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        reason: 'MISSING_APPOINTMENT_ID',
        message: 'Appointment ID is required to reschedule.',
      });
    }

    if (!new_date || !new_time) {
      return res.status(400).json({
        success: false,
        reason: 'MISSING_NEW_SLOT',
        message: 'New date and new time are required.',
      });
    }

    const normalizedDate = parseNaturalDate(new_date);
    const normalizedTime = parseNaturalTime(new_time) || new_time.trim();

    const result = await db.rescheduleAppointment(id, normalizedDate, normalizedTime);

    if (!result.success) {
      const statusCode =
        result.reason === 'APPOINTMENT_NOT_FOUND' || result.reason === 'SLOT_NOT_FOUND'
          ? 404
          : result.reason === 'SLOT_ALREADY_BOOKED'
          ? 409
          : 400;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAllAppointments(req, res, next) {
  try {
    const appointments = await db.getAllAppointments();
    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (err) {
    next(err);
  }
}
