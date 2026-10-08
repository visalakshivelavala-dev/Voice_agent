/**
 * MedVoice AI - Database Repository Layer
 * Supports both live Supabase PostgreSQL (when credentials provided)
 * and an in-memory transactional database for zero-config local testing/dev.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { 
  doctorsData, 
  generateAvailabilitySlots, 
  samplePatients, 
  generateSampleAppointments,
  getKolkataDate 
} from '../../database/seedData.js';

// In-Memory store initialized with seed data
class InMemoryDB {
  constructor() {
    this.reset();
  }

  reset() {
    this.doctors = JSON.parse(JSON.stringify(doctorsData));
    this.availability = generateAvailabilitySlots();
    this.patients = JSON.parse(JSON.stringify(samplePatients));
    this.appointments = generateSampleAppointments();
    this.nextPatientId = 10;
    this.nextAppointmentId = 20;
    this.lock = false;
  }

  // Simple atomic lock implementation to serialize critical booking operations
  async acquireLock() {
    while (this.lock) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.lock = true;
  }

  releaseLock() {
    this.lock = false;
  }
}

const memoryDb = new InMemoryDB();

export const db = {
  /**
   * Reset / reseed database
   */
  async reseed() {
    memoryDb.reset();
    return { success: true, message: 'Database reset and dynamic slots re-seeded successfully.' };
  },

  /**
   * Check connection status
   */
  getStatus() {
    return {
      type: isSupabaseConfigured ? 'supabase' : 'in-memory-relational',
      isSupabase: isSupabaseConfigured,
      activeDoctors: memoryDb.doctors.length,
      appointmentsCount: memoryDb.appointments.length,
    };
  },

  /**
   * Get all active doctors with optional specialty filter
   */
  async getDoctors(specialtyFilter = null) {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('doctors').select('*').eq('available', true);
        if (specialtyFilter) {
          query = query.ilike('specialty', `%${specialtyFilter}%`);
        }
        const { data, error } = await query.order('id', { ascending: true });
        if (!error && data) return data;
        console.warn('[Database] Supabase query error, falling back to local store:', error?.message);
      } catch (err) {
        console.warn('[Database] Supabase exception, fallback:', err.message);
      }
    }

    let results = memoryDb.doctors.filter((d) => d.available);
    if (specialtyFilter) {
      const q = specialtyFilter.toLowerCase().trim();
      results = results.filter((d) => 
        d.specialty.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (q === 'skin' && d.specialty.toLowerCase() === 'dermatology') ||
        (q === 'heart' && d.specialty.toLowerCase() === 'cardiology') ||
        (q === 'bone' && d.specialty.toLowerCase() === 'orthopedics') ||
        (q === 'general' && d.specialty.toLowerCase().includes('general'))
      );
    }
    return results;
  },

  /**
   * Get doctor by ID
   */
  async getDoctorById(doctorId) {
    const id = parseInt(doctorId, 10);
    if (isNaN(id)) return null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('doctors').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[Database] Supabase getDoctorById error:', err.message);
      }
    }

    return memoryDb.doctors.find((d) => d.id === id) || null;
  },

  /**
   * Get available slots for a doctor on a specific date
   */
  async getAvailableSlots(doctorId, dateStr) {
    const docId = parseInt(doctorId, 10);
    const doctor = await this.getDoctorById(docId);
    if (!doctor) {
      return null;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('doctor_availability')
          .select('appointment_time')
          .eq('doctor_id', docId)
          .eq('appointment_date', dateStr)
          .eq('status', 'available')
          .order('appointment_time', { ascending: true });

        if (!error && data) {
          return {
            doctor: doctor.name,
            doctor_id: doctor.id,
            specialty: doctor.specialty,
            date: dateStr,
            available_slots: data.map((row) => row.appointment_time),
          };
        }
      } catch (err) {
        console.warn('[Database] Supabase getAvailableSlots error:', err.message);
      }
    }

    // In-memory lookup
    const slots = memoryDb.availability
      .filter((s) => s.doctor_id === docId && s.appointment_date === dateStr && s.status === 'available')
      .map((s) => s.appointment_time)
      .sort();

    return {
      doctor: doctor.name,
      doctor_id: doctor.id,
      specialty: doctor.specialty,
      date: dateStr,
      available_slots: slots,
    };
  },

  /**
   * Atomically book an appointment
   * Checks doctor exists, slot exists and is available, marks slot booked, and creates appointment.
   * Protects against race conditions.
   */
  async bookAppointment({
    doctor_id,
    patient_name,
    patient_phone,
    patient_email,
    appointment_date,
    appointment_time,
    reason,
  }) {
    const docId = parseInt(doctor_id, 10);

    // If Supabase is configured and has atomic stored procedure, call RPC first
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('book_appointment_atomic', {
          p_doctor_id: docId,
          p_patient_name: patient_name,
          p_patient_phone: patient_phone,
          p_patient_email: patient_email || null,
          p_appointment_date: appointment_date,
          p_appointment_time: appointment_time,
          p_reason: reason || 'Consultation',
        });

        if (!error && data) {
          return data;
        }
        console.warn('[Database] Supabase RPC failed or not installed, using fallback logic:', error?.message);
      } catch (err) {
        console.warn('[Database] Supabase rpc exception:', err.message);
      }
    }

    // Atomic in-memory execution using lock
    await memoryDb.acquireLock();
    try {
      // 1. Verify doctor
      const doctor = memoryDb.doctors.find((d) => d.id === docId && d.available);
      if (!doctor) {
        return {
          success: false,
          reason: 'DOCTOR_NOT_FOUND',
          message: 'Doctor not found or not currently available.',
        };
      }

      // 2. Check slot
      const slot = memoryDb.availability.find(
        (s) => s.doctor_id === docId && s.appointment_date === appointment_date && s.appointment_time === appointment_time
      );

      if (!slot) {
        return {
          success: false,
          reason: 'SLOT_NOT_FOUND',
          message: `No appointment slot exists for ${appointment_date} at ${appointment_time}.`,
        };
      }

      if (slot.status !== 'available') {
        return {
          success: false,
          reason: 'SLOT_ALREADY_BOOKED',
          message: 'Sorry, that slot was just taken. I can check the other available times for you.',
        };
      }

      // 3. Mark slot booked atomically
      slot.status = 'booked';

      // 4. Upsert patient
      let patient = memoryDb.patients.find((p) => p.phone === patient_phone);
      if (!patient) {
        patient = {
          id: memoryDb.nextPatientId++,
          name: patient_name,
          phone: patient_phone,
          email: patient_email || `${patient_name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          created_at: new Date().toISOString(),
        };
        memoryDb.patients.push(patient);
      } else {
        patient.name = patient_name;
        if (patient_email) patient.email = patient_email;
      }

      // 5. Create Appointment
      const appointmentCode = `APT-${Math.floor(10000 + Math.random() * 90000)}`;
      const newAppointment = {
        id: memoryDb.nextAppointmentId++,
        appointment_code: appointmentCode,
        patient_id: patient.id,
        doctor_id: doctor.id,
        appointment_date,
        appointment_time,
        status: 'confirmed',
        reason: reason || 'Medical consultation',
        created_at: new Date().toISOString(),
      };
      memoryDb.appointments.push(newAppointment);

      return {
        success: true,
        appointment_id: appointmentCode,
        id: newAppointment.id,
        doctor_name: doctor.name,
        doctor_specialty: doctor.specialty,
        patient_name: patient.name,
        patient_phone: patient.phone,
        appointment_date,
        appointment_time,
        status: 'confirmed',
        reason: newAppointment.reason,
      };
    } finally {
      memoryDb.releaseLock();
    }
  },

  /**
   * Cancel an appointment
   * Reverts availability slot back to 'available'
   */
  async cancelAppointment(appointmentIdOrCode) {
    await memoryDb.acquireLock();
    try {
      const codeOrId = String(appointmentIdOrCode).trim();
      const appointment = memoryDb.appointments.find(
        (a) => a.appointment_code === codeOrId || String(a.id) === codeOrId
      );

      if (!appointment) {
        return {
          success: false,
          reason: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment '${appointmentIdOrCode}' not found.`,
        };
      }

      if (appointment.status === 'cancelled') {
        return {
          success: false,
          reason: 'ALREADY_CANCELLED',
          message: 'Appointment is already cancelled.',
        };
      }

      // Update appointment status
      appointment.status = 'cancelled';

      // Revert slot status back to available
      const slot = memoryDb.availability.find(
        (s) =>
          s.doctor_id === appointment.doctor_id &&
          s.appointment_date === appointment.appointment_date &&
          s.appointment_time === appointment.appointment_time
      );
      if (slot) {
        slot.status = 'available';
      }

      // Also update in Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await supabase.from('appointments').update({ status: 'cancelled' }).eq('appointment_code', appointment.appointment_code);
          await supabase
            .from('doctor_availability')
            .update({ status: 'available' })
            .eq('doctor_id', appointment.doctor_id)
            .eq('appointment_date', appointment.appointment_date)
            .eq('appointment_time', appointment.appointment_time);
        } catch (e) {
          console.warn('[Database] Supabase cancel sync error:', e.message);
        }
      }

      const doctor = memoryDb.doctors.find((d) => d.id === appointment.doctor_id);

      return {
        success: true,
        message: `Appointment ${appointment.appointment_code} has been successfully cancelled.`,
        appointment_id: appointment.appointment_code,
        status: 'cancelled',
        doctor_name: doctor?.name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
      };
    } finally {
      memoryDb.releaseLock();
    }
  },

  /**
   * Reschedule an appointment to a new date and time
   */
  async rescheduleAppointment(appointmentIdOrCode, newDate, newTime) {
    await memoryDb.acquireLock();
    try {
      const codeOrId = String(appointmentIdOrCode).trim();
      const appointment = memoryDb.appointments.find(
        (a) => a.appointment_code === codeOrId || String(a.id) === codeOrId
      );

      if (!appointment) {
        return {
          success: false,
          reason: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment '${appointmentIdOrCode}' not found.`,
        };
      }

      if (appointment.status === 'cancelled') {
        return {
          success: false,
          reason: 'CANNOT_RESCHEDULE_CANCELLED',
          message: 'Cannot reschedule a cancelled appointment.',
        };
      }

      // Check if new slot exists and is available
      const newSlot = memoryDb.availability.find(
        (s) =>
          s.doctor_id === appointment.doctor_id &&
          s.appointment_date === newDate &&
          s.appointment_time === newTime
      );

      if (!newSlot) {
        return {
          success: false,
          reason: 'SLOT_NOT_FOUND',
          message: `Requested slot on ${newDate} at ${newTime} does not exist.`,
        };
      }

      if (newSlot.status !== 'available') {
        return {
          success: false,
          reason: 'SLOT_ALREADY_BOOKED',
          message: `Requested slot on ${newDate} at ${newTime} is not available.`,
        };
      }

      // Release old slot
      const oldSlot = memoryDb.availability.find(
        (s) =>
          s.doctor_id === appointment.doctor_id &&
          s.appointment_date === appointment.appointment_date &&
          s.appointment_time === appointment.appointment_time
      );
      if (oldSlot) {
        oldSlot.status = 'available';
      }

      // Claim new slot
      newSlot.status = 'booked';

      // Update appointment
      const oldDate = appointment.appointment_date;
      const oldTime = appointment.appointment_time;
      appointment.appointment_date = newDate;
      appointment.appointment_time = newTime;

      // Sync Supabase if configured
      if (isSupabaseConfigured) {
        try {
          if (oldSlot) {
            await supabase
              .from('doctor_availability')
              .update({ status: 'available' })
              .eq('doctor_id', appointment.doctor_id)
              .eq('appointment_date', oldDate)
              .eq('appointment_time', oldTime);
          }
          await supabase
            .from('doctor_availability')
            .update({ status: 'booked' })
            .eq('doctor_id', appointment.doctor_id)
            .eq('appointment_date', newDate)
            .eq('appointment_time', newTime);

          await supabase
            .from('appointments')
            .update({ appointment_date: newDate, appointment_time: newTime })
            .eq('appointment_code', appointment.appointment_code);
        } catch (e) {
          console.warn('[Database] Supabase reschedule sync error:', e.message);
        }
      }

      const doctor = memoryDb.doctors.find((d) => d.id === appointment.doctor_id);

      return {
        success: true,
        message: `Appointment ${appointment.appointment_code} rescheduled to ${newDate} at ${newTime}.`,
        appointment_id: appointment.appointment_code,
        doctor_name: doctor?.name,
        new_date: newDate,
        new_time: newTime,
        status: appointment.status,
      };
    } finally {
      memoryDb.releaseLock();
    }
  },

  /**
   * Get all appointments with doctor and patient details (for frontend dashboard)
   */
  async getAllAppointments() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_code,
            appointment_date,
            appointment_time,
            status,
            reason,
            created_at,
            doctors:doctor_id (id, name, specialty, consultation_fee, location),
            patients:patient_id (id, name, phone, email)
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((item) => ({
            id: item.id,
            appointment_code: item.appointment_code,
            appointment_date: item.appointment_date,
            appointment_time: item.appointment_time,
            status: item.status,
            reason: item.reason,
            created_at: item.created_at,
            doctor_id: item.doctors?.id,
            doctor_name: item.doctors?.name,
            specialty: item.doctors?.specialty,
            consultation_fee: item.doctors?.consultation_fee,
            location: item.doctors?.location,
            patient_id: item.patients?.id,
            patient_name: item.patients?.name,
            patient_phone: item.patients?.phone,
            patient_email: item.patients?.email,
          }));
        }
      } catch (err) {
        console.warn('[Database] Supabase getAllAppointments error:', err.message);
      }
    }

    return memoryDb.appointments.map((apt) => {
      const doc = memoryDb.doctors.find((d) => d.id === apt.doctor_id);
      const pat = memoryDb.patients.find((p) => p.id === apt.patient_id);
      return {
        id: apt.id,
        appointment_code: apt.appointment_code,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        reason: apt.reason,
        created_at: apt.created_at,
        doctor_id: doc?.id,
        doctor_name: doc?.name || 'Unknown Doctor',
        specialty: doc?.specialty || 'General',
        consultation_fee: doc?.consultation_fee || 0,
        location: doc?.location || '',
        patient_id: pat?.id,
        patient_name: pat?.name || 'Unknown Patient',
        patient_phone: pat?.phone || '',
        patient_email: pat?.email || '',
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
};
