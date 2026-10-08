/**
 * MedVoice AI - Retell AI Tool Definitions
 * Defines the custom function schemas for Retell AI agent.
 */

export const RETELL_TOOLS = [
  {
    type: 'custom',
    name: 'find_doctors',
    description: 'Search for active doctors by medical specialty (e.g., Dermatology, Cardiology, General Medicine, Orthopedics) or keywords.',
    parameters: {
      type: 'object',
      properties: {
        specialty: {
          type: 'string',
          description: 'The medical specialty or health domain (e.g. Dermatology, Cardiology, General Medicine, Orthopedics, skin, heart, joints).',
        },
      },
      required: [],
    },
  },
  {
    type: 'custom',
    name: 'get_available_slots',
    description: 'Check verified available appointment time slots for a specific doctor on a given date. NEVER hallucinate or invent times; only offer the slots returned by this function.',
    parameters: {
      type: 'object',
      properties: {
        doctor_id: {
          type: 'number',
          description: 'The ID of the doctor (e.g. 1 for Dr. Priya Sharma, 2 for Dr. Rahul Mehta).',
        },
        date: {
          type: 'string',
          description: 'The appointment date in YYYY-MM-DD format or natural phrase like "today", "tomorrow", "Friday".',
        },
      },
      required: ['doctor_id', 'date'],
    },
  },
  {
    type: 'custom',
    name: 'book_appointment',
    description: 'Atomically book an appointment once the patient has provided their name, phone number, and explicitly confirmed the doctor, date, and time. Checks real-time availability to prevent race conditions.',
    parameters: {
      type: 'object',
      properties: {
        doctor_id: {
          type: 'number',
          description: 'The ID of the doctor.',
        },
        patient_name: {
          type: 'string',
          description: 'The full name of the patient.',
        },
        patient_phone: {
          type: 'string',
          description: 'The contact phone number of the patient (10 digits).',
        },
        patient_email: {
          type: 'string',
          description: 'Optional email address of the patient.',
        },
        appointment_date: {
          type: 'string',
          description: 'The target date (e.g., "2026-10-08" or "tomorrow").',
        },
        appointment_time: {
          type: 'string',
          description: 'The selected available slot (e.g., "17:30" or "5:30 PM").',
        },
        reason: {
          type: 'string',
          description: 'Brief reason for the visit (e.g., "Skin consultation", "Routine checkup").',
        },
      },
      required: ['doctor_id', 'patient_name', 'patient_phone', 'appointment_date', 'appointment_time'],
    },
  },
  {
    type: 'custom',
    name: 'cancel_appointment',
    description: 'Cancel an existing confirmed appointment using the appointment ID.',
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'The appointment ID code (e.g. "APT-10042").',
        },
      },
      required: ['appointment_id'],
    },
  },
  {
    type: 'custom',
    name: 'reschedule_appointment',
    description: 'Reschedule an existing appointment to a newly selected available date and time slot.',
    parameters: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'string',
          description: 'The appointment ID to reschedule (e.g. "APT-10042").',
        },
        new_date: {
          type: 'string',
          description: 'The new date for the appointment.',
        },
        new_time: {
          type: 'string',
          description: 'The newly selected available time slot (e.g. "18:00").',
        },
      },
      required: ['appointment_id', 'new_date', 'new_time'],
    },
  },
];
