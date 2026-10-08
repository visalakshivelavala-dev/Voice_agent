/**
 * MedVoice AI - Dynamic Seed Data Generator
 * Generates realistic doctors, patients, and dynamically dated availability slots
 * for Today, Tomorrow, and subsequent days based on Asia/Kolkata timezone.
 */

// Doctors list matching specification
export const doctorsData = [
  {
    id: 1,
    name: 'Dr. Priya Sharma',
    specialty: 'Dermatology',
    qualification: 'MBBS, MD (Dermatology)',
    experience: 8,
    consultation_fee: 800,
    location: 'MedVoice Skin & Laser Clinic, Indiranagar, Bengaluru',
    available: true,
  },
  {
    id: 2,
    name: 'Dr. Rahul Mehta',
    specialty: 'Cardiology',
    qualification: 'MBBS, MD, DM (Cardiology)',
    experience: 14,
    consultation_fee: 1200,
    location: 'MedVoice Heart Institute, Koramangala, Bengaluru',
    available: true,
  },
  {
    id: 3,
    name: 'Dr. Ananya Rao',
    specialty: 'General Medicine',
    qualification: 'MBBS, MD (Internal Medicine)',
    experience: 10,
    consultation_fee: 600,
    location: 'MedVoice Primary Care, HSR Layout, Bengaluru',
    available: true,
  },
  {
    id: 4,
    name: 'Dr. Arjun Kumar',
    specialty: 'Orthopedics',
    qualification: 'MBBS, MS (Orthopedics)',
    experience: 12,
    consultation_fee: 1000,
    location: 'MedVoice Bone & Joint Center, Whitefield, Bengaluru',
    available: true,
  },
];

// Helper to format date in YYYY-MM-DD for Asia/Kolkata
export function getKolkataDate(offsetDays = 0) {
  const date = new Date();
  // Get time in IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset + (offsetDays * 24 * 60 * 60 * 1000));
  return istDate.toISOString().split('T')[0];
}

/**
 * Generates dynamic slot records for doctors across multiple days
 */
export function generateAvailabilitySlots() {
  const slots = [];
  let slotId = 1;

  // Generate for Today (0) through Next 7 days (7)
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const appointment_date = getKolkataDate(dayOffset);

    // Dr. Priya Sharma (Dermatology)
    // Specific requirement: Tomorrow at 5:00 PM, 5:30 PM, 6:00 PM available
    const priyaTimes = dayOffset === 1 
      ? ['17:00', '17:30', '18:00', '18:30'] 
      : ['15:00', '15:30', '16:00', '17:00', '17:30', '18:00'];
    
    priyaTimes.forEach((time, idx) => {
      // Mark slot as booked if Today early afternoon
      const status = (dayOffset === 0 && idx === 0) ? 'booked' : 'available';
      slots.push({
        id: slotId++,
        doctor_id: 1,
        appointment_date,
        appointment_time: time,
        status,
      });
    });

    // Dr. Rahul Mehta (Cardiology)
    // Specific requirement: Tomorrow at 10:00 AM, 11:30 AM, 4:00 PM available
    const rahulTimes = dayOffset === 1
      ? ['10:00', '11:30', '16:00']
      : ['10:00', '10:30', '11:30', '14:30', '16:00', '16:30'];

    rahulTimes.forEach((time) => {
      slots.push({
        id: slotId++,
        doctor_id: 2,
        appointment_date,
        appointment_time: time,
        status: 'available',
      });
    });

    // Dr. Ananya Rao (General Medicine)
    const ananyaTimes = ['09:30', '10:00', '11:00', '14:00', '15:00', '16:00'];
    ananyaTimes.forEach((time, idx) => {
      // Book 1 slot on day 2 for realistic view
      const status = (dayOffset === 2 && idx === 1) ? 'booked' : 'available';
      slots.push({
        id: slotId++,
        doctor_id: 3,
        appointment_date,
        appointment_time: time,
        status,
      });
    });

    // Dr. Arjun Kumar (Orthopedics)
    const arjunTimes = ['11:00', '12:00', '15:30', '16:30', '17:30'];
    arjunTimes.forEach((time) => {
      slots.push({
        id: slotId++,
        doctor_id: 4,
        appointment_date,
        appointment_time: time,
        status: 'available',
      });
    });
  }

  return slots;
}

export const samplePatients = [
  {
    id: 1,
    name: 'Amit Verma',
    phone: '9876543210',
    email: 'amit.verma@example.com',
  },
  {
    id: 2,
    name: 'Sneha Patel',
    phone: '9812345678',
    email: 'sneha.patel@example.com',
  },
];

export function generateSampleAppointments() {
  const today = getKolkataDate(0);
  const tomorrow = getKolkataDate(1);
  return [
    {
      id: 1,
      appointment_code: 'APT-10042',
      patient_id: 1,
      doctor_id: 1,
      appointment_date: today,
      appointment_time: '15:00',
      status: 'confirmed',
      reason: 'Routine skin rash checkup',
    },
    {
      id: 2,
      appointment_code: 'APT-10088',
      patient_id: 2,
      doctor_id: 3,
      appointment_date: getKolkataDate(2),
      appointment_time: '10:00',
      status: 'confirmed',
      reason: 'Annual health checkup and blood pressure monitoring',
    },
  ];
}
