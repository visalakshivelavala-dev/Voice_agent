/**
 * MedVoice AI - Full End-to-End API and Voice Agent Test Suite
 * Covers all requirements in Section 18:
 * - Find doctor
 * - Filter by specialty
 * - Get available slots
 * - Book available slot
 * - Prevent duplicate booking (race condition check)
 * - Cancel appointment & slot release
 * - Reschedule appointment & slot reassignment
 * - Book unavailable slot
 * - Invalid doctor
 * - Invalid appointment
 * - Retell AI tool webhook execution
 * - Complete simulated voice flow
 */

import request from 'supertest';
import app from '../server.js';
import { db } from '../db/database.js';
import { getTomorrowKolkataDate, getTodayKolkataDate } from '../services/dateService.js';

// Supertest helpers with explicit application/json header to avoid superagent mime resolution bug
const postJson = (url, body) => request(app).post(url).set('Content-Type', 'application/json').send(body);
const patchJson = (url, body) => request(app).patch(url).set('Content-Type', 'application/json').send(body);
const deleteJson = (url) => request(app).delete(url).set('Content-Type', 'application/json');

describe('MedVoice AI - Complete API & Voice Agent Test Suite', () => {
  const tomorrowDate = getTomorrowKolkataDate();

  beforeEach(async () => {
    // Reset database to clean dynamic seed state before each test
    await db.reseed();
  });

  // 1. Doctors Endpoint
  describe('GET /api/doctors', () => {
    test('should return all active doctors', async () => {
      const res = await request(app).get('/api/doctors');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.doctors.length).toBeGreaterThanOrEqual(4);

      const names = res.body.doctors.map((d) => d.name);
      expect(names).toContain('Dr. Priya Sharma');
      expect(names).toContain('Dr. Rahul Mehta');
      expect(names).toContain('Dr. Ananya Rao');
      expect(names).toContain('Dr. Arjun Kumar');
    });

    test('should filter doctors by specialty (case-insensitive)', async () => {
      const res = await request(app).get('/api/doctors?specialty=dermatology');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.doctors.length).toBe(1);
      expect(res.body.doctors[0].name).toBe('Dr. Priya Sharma');
      expect(res.body.doctors[0].specialty).toBe('Dermatology');
    });

    test('should return doctor by ID', async () => {
      const res = await request(app).get('/api/doctors/1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.doctor.name).toBe('Dr. Priya Sharma');
      expect(res.body.doctor.consultation_fee).toBe(800);
    });

    test('should return 404 for invalid doctor ID', async () => {
      const res = await request(app).get('/api/doctors/999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.reason).toBe('DOCTOR_NOT_FOUND');
    });
  });

  // 2. Real Availability Endpoint (Requirement 5)
  describe('GET /api/doctors/:id/availability', () => {
    test('should return verified available slots for tomorrow', async () => {
      const res = await request(app).get(`/api/doctors/1/availability?date=${tomorrowDate}`);
      expect(res.status).toBe(200);
      expect(res.body.doctor).toBe('Dr. Priya Sharma');
      expect(res.body.date).toBe(tomorrowDate);
      expect(Array.isArray(res.body.available_slots)).toBe(true);
      expect(res.body.available_slots).toContain('17:00');
      expect(res.body.available_slots).toContain('17:30');
      expect(res.body.available_slots).toContain('18:00');
    });

    test('should support natural language date (e.g. "tomorrow")', async () => {
      const res = await request(app).get('/api/doctors/2/availability?date=tomorrow');
      expect(res.status).toBe(200);
      expect(res.body.doctor).toBe('Dr. Rahul Mehta');
      expect(res.body.date).toBe(tomorrowDate);
      expect(res.body.available_slots).toContain('10:00');
      expect(res.body.available_slots).toContain('11:30');
      expect(res.body.available_slots).toContain('16:00');
    });

    test('should return 404 when querying availability for non-existent doctor', async () => {
      const res = await request(app).get('/api/doctors/999/availability?date=tomorrow');
      expect(res.status).toBe(404);
      expect(res.body.reason).toBe('DOCTOR_NOT_FOUND');
    });
  });

  // 3. Appointment Booking & Concurrency Protection (Requirement 6 & 10)
  describe('POST /api/appointments', () => {
    test('should successfully book an available slot and remove it from available slots', async () => {
      // Step 1: Check availability before booking
      const beforeRes = await request(app).get(`/api/doctors/1/availability?date=${tomorrowDate}`);
      expect(beforeRes.body.available_slots).toContain('17:00');

      // Step 2: Book the slot
      const bookRes = await postJson('/api/appointments', {
        doctor_id: 1,
        patient_name: 'John Doe',
        patient_phone: '9876543210',
        patient_email: 'john@example.com',
        appointment_date: tomorrowDate,
        appointment_time: '17:00',
        reason: 'Skin consultation',
      });

      expect(bookRes.status).toBe(201);
      expect(bookRes.body.success).toBe(true);
      expect(bookRes.body.appointment_id).toMatch(/^APT-\d{5}$/);
      expect(bookRes.body.doctor_name).toBe('Dr. Priya Sharma');
      expect(bookRes.body.status).toBe('confirmed');

      // Step 3: Check availability again -> '17:00' must NOT be in available slots!
      const afterRes = await request(app).get(`/api/doctors/1/availability?date=${tomorrowDate}`);
      expect(afterRes.body.available_slots).not.toContain('17:00');
    });

    test('should PREVENT DUPLICATE BOOKING (Race-condition protection)', async () => {
      const payload = {
        doctor_id: 1,
        patient_name: 'Patient A',
        patient_phone: '9111111111',
        patient_email: 'patienta@example.com',
        appointment_date: tomorrowDate,
        appointment_time: '17:30',
        reason: 'First booking attempt',
      };

      // First booking succeeds
      const firstRes = await postJson('/api/appointments', payload);
      expect(firstRes.status).toBe(201);
      expect(firstRes.body.success).toBe(true);

      // Second booking for the same slot MUST fail with 409 and SLOT_ALREADY_BOOKED
      const secondRes = await postJson('/api/appointments', {
        ...payload,
        patient_name: 'Patient B',
        patient_phone: '9222222222',
        patient_email: 'patientb@example.com',
      });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.reason).toBe('SLOT_ALREADY_BOOKED');
      expect(secondRes.body.message).toContain('Sorry, that slot was just taken');
    });

    test('should reject booking with missing required fields', async () => {
      const res = await postJson('/api/appointments', {
        doctor_id: 1,
        appointment_date: tomorrowDate,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject booking for invalid doctor ID', async () => {
      const res = await postJson('/api/appointments', {
        doctor_id: 9999,
        patient_name: 'Alice',
        patient_phone: '9876543210',
        appointment_date: tomorrowDate,
        appointment_time: '17:00',
      });

      expect(res.status).toBe(404);
      expect(res.body.reason).toBe('DOCTOR_NOT_FOUND');
    });

    test('should reject booking for a time that is not in the schedule', async () => {
      const res = await postJson('/api/appointments', {
        doctor_id: 1,
        patient_name: 'Bob',
        patient_phone: '9876543210',
        appointment_date: tomorrowDate,
        appointment_time: '23:45', // Not scheduled
      });

      expect(res.status).toBe(404);
      expect(res.body.reason).toBe('SLOT_NOT_FOUND');
    });
  });

  // 4. Appointment Rescheduling & Cancellation
  describe('PATCH & DELETE /api/appointments/:id', () => {
    let bookedAptId;

    beforeEach(async () => {
      // Create a test appointment
      const bookRes = await postJson('/api/appointments', {
        doctor_id: 1,
        patient_name: 'Test Patient',
        patient_phone: '9998887776',
        appointment_date: tomorrowDate,
        appointment_time: '17:00',
      });
      bookedAptId = bookRes.body.appointment_id;
    });

    test('should reschedule appointment, release old slot, and reserve new slot', async () => {
      const res = await patchJson(`/api/appointments/${bookedAptId}`, {
        new_date: tomorrowDate,
        new_time: '18:00',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.new_time).toBe('18:00');

      // Check doctor availability: 17:00 should be available again, 18:00 should be booked
      const availRes = await request(app).get(`/api/doctors/1/availability?date=${tomorrowDate}`);
      expect(availRes.body.available_slots).toContain('17:00');
      expect(availRes.body.available_slots).not.toContain('18:00');
    });

    test('should cancel appointment and release slot back to available', async () => {
      const cancelRes = await deleteJson(`/api/appointments/${bookedAptId}`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.status).toBe('cancelled');

      // Check doctor availability: 17:00 should be available again!
      const availRes = await request(app).get(`/api/doctors/1/availability?date=${tomorrowDate}`);
      expect(availRes.body.available_slots).toContain('17:00');
    });

    test('should return 404 when cancelling invalid appointment ID', async () => {
      const res = await deleteJson('/api/appointments/APT-99999');
      expect(res.status).toBe(404);
      expect(res.body.reason).toBe('APPOINTMENT_NOT_FOUND');
    });
  });

  // 5. Retell AI Tool Calls & Webhook (/api/retell/webhook)
  describe('Retell AI Voice Agent Tools & Webhook (/api/retell/webhook)', () => {
    test('Tool: find_doctors', async () => {
      const res = await postJson('/api/retell/webhook', {
        name: 'find_doctors',
        args: { specialty: 'Cardiology' },
      });

      expect(res.status).toBe(200);
      expect(res.body.found).toBe(true);
      expect(res.body.doctors[0].name).toBe('Dr. Rahul Mehta');
    });

    test('Tool: get_available_slots', async () => {
      const res = await postJson('/api/retell/webhook', {
        name: 'get_available_slots',
        args: { doctor_id: 1, date: tomorrowDate },
      });

      expect(res.status).toBe(200);
      expect(res.body.has_slots).toBe(true);
      expect(res.body.available_slots.length).toBeGreaterThan(0);
      expect(res.body.readable_slots).toContain('5:00 PM');
    });

    test('Tool: book_appointment', async () => {
      const res = await postJson('/api/retell/webhook', {
        name: 'book_appointment',
        args: {
          doctor_id: 1,
          patient_name: 'Caller Mike',
          patient_phone: '9888877777',
          appointment_date: tomorrowDate,
          appointment_time: '18:00',
          reason: 'Voice booked consultation',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.appointment_id).toBeDefined();
      expect(res.body.message).toContain('successfully booked');
    });
  });

  // 6. Complete End-to-End Voice Flow Simulation (Requirement 9 & 18)
  describe('End-to-End Voice Flow Simulation', () => {
    test('should simulate full conversation from user request to confirmed booking', async () => {
      let state = {};

      // Step 1: Patient asks to see a dermatologist tomorrow
      const turn1 = await postJson('/api/voice/simulate-agent', {
        message: 'I want to see a dermatologist tomorrow.',
        sessionState: state,
      });

      expect(turn1.status).toBe(200);
      expect(turn1.body.reply).toContain('Dr. Priya Sharma');
      expect(turn1.body.reply).toContain('Which time would you prefer?');
      state = turn1.body.sessionState;

      // Step 2: Patient picks 5:30
      const turn2 = await postJson('/api/voice/simulate-agent', {
        message: '5:30',
        sessionState: state,
      });

      expect(turn2.status).toBe(200);
      expect(turn2.body.reply).toContain('May I have your full name?');
      state = turn2.body.sessionState;

      // Step 3: Patient gives name
      const turn3 = await postJson('/api/voice/simulate-agent', {
        message: 'John Doe',
        sessionState: state,
      });

      expect(turn3.status).toBe(200);
      expect(turn3.body.reply).toContain('phone number');
      state = turn3.body.sessionState;

      // Step 4: Patient provides phone number
      const turn4 = await postJson('/api/voice/simulate-agent', {
        message: '9876543210',
        sessionState: state,
      });

      expect(turn4.status).toBe(200);
      expect(turn4.body.reply).toContain('Just to confirm, you\'re booking an appointment with Dr. Priya Sharma');
      expect(turn4.body.reply).toContain('5:30 PM');
      expect(turn4.body.reply).toContain('Shall I confirm it?');
      state = turn4.body.sessionState;

      // Step 5: Patient confirms "Yes"
      const turn5 = await postJson('/api/voice/simulate-agent', {
        message: 'Yes',
        sessionState: state,
      });

      expect(turn5.status).toBe(200);
      expect(turn5.body.reply).toContain('Your appointment has been successfully booked');
      expect(turn5.body.reply).toContain('APT-');
      expect(turn5.body.sessionState.step).toBe('COMPLETED');
    });
  });
});
