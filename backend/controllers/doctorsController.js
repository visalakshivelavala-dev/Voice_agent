/**
 * MedVoice AI - Doctors Controller
 */
import { db } from '../db/database.js';

export async function getAllDoctors(req, res, next) {
  try {
    const { specialty } = req.query;
    const doctors = await db.getDoctors(specialty);
    res.json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDoctorById(req, res, next) {
  try {
    const { id } = req.params;
    const doctor = await db.getDoctorById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        reason: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID ${id} was not found.`,
      });
    }

    res.json({
      success: true,
      doctor,
    });
  } catch (err) {
    next(err);
  }
}
