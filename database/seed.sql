-- ============================================================================
-- MedVoice AI - Database Seed SQL
-- Initial sample data for Doctors, Patients, and dynamic relative dates
-- ============================================================================

-- 1. Insert Doctors
INSERT INTO doctors (id, name, specialty, qualification, experience, consultation_fee, location, available)
VALUES 
    (1, 'Dr. Priya Sharma', 'Dermatology', 'MBBS, MD (Dermatology)', 8, 800.00, 'MedVoice Skin & Laser Clinic, Indiranagar, Bengaluru', true),
    (2, 'Dr. Rahul Mehta', 'Cardiology', 'MBBS, MD, DM (Cardiology)', 14, 1200.00, 'MedVoice Heart Institute, Koramangala, Bengaluru', true),
    (3, 'Dr. Ananya Rao', 'General Medicine', 'MBBS, MD (Internal Medicine)', 10, 600.00, 'MedVoice Primary Care, HSR Layout, Bengaluru', true),
    (4, 'Dr. Arjun Kumar', 'Orthopedics', 'MBBS, MS (Orthopedics)', 12, 1000.00, 'MedVoice Bone & Joint Center, Whitefield, Bengaluru', true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    qualification = EXCLUDED.qualification,
    experience = EXCLUDED.experience,
    consultation_fee = EXCLUDED.consultation_fee,
    location = EXCLUDED.location,
    available = EXCLUDED.available;

-- Reset sequence for doctors
SELECT setval('doctors_id_seq', (SELECT MAX(id) FROM doctors));

-- 2. Insert Sample Patients
INSERT INTO patients (id, name, phone, email)
VALUES
    (1, 'Amit Verma', '9876543210', 'amit.verma@example.com'),
    (2, 'Sneha Patel', '9812345678', 'sneha.patel@example.com')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));

-- 3. Dynamic Slots Generation using PostgreSQL date arithmetic (CURRENT_DATE to CURRENT_DATE + 7)
-- This ensures that whenever this SQL is run, slots are ALWAYS for TODAY, TOMORROW, and NEXT 7 DAYS!
DO $$
DECLARE
    curr_offset INT;
    target_date DATE;
BEGIN
    FOR curr_offset IN 0..7 LOOP
        target_date := CURRENT_DATE + curr_offset;

        -- Dr. Priya Sharma (Dermatology)
        -- Slots: 17:00, 17:30, 18:00, 18:30
        INSERT INTO doctor_availability (doctor_id, appointment_date, appointment_time, status)
        VALUES 
            (1, target_date, '17:00', 'available'),
            (1, target_date, '17:30', 'available'),
            (1, target_date, '18:00', 'available'),
            (1, target_date, '18:30', 'available')
        ON CONFLICT (doctor_id, appointment_date, appointment_time) DO NOTHING;

        -- Dr. Rahul Mehta (Cardiology)
        -- Slots: 10:00, 11:30, 16:00
        INSERT INTO doctor_availability (doctor_id, appointment_date, appointment_time, status)
        VALUES 
            (2, target_date, '10:00', 'available'),
            (2, target_date, '11:30', 'available'),
            (2, target_date, '16:00', 'available')
        ON CONFLICT (doctor_id, appointment_date, appointment_time) DO NOTHING;

        -- Dr. Ananya Rao (General Medicine)
        -- Slots: 09:30, 10:30, 14:00, 15:00
        INSERT INTO doctor_availability (doctor_id, appointment_date, appointment_time, status)
        VALUES 
            (3, target_date, '09:30', 'available'),
            (3, target_date, '10:30', 'available'),
            (3, target_date, '14:00', 'available'),
            (3, target_date, '15:00', 'available')
        ON CONFLICT (doctor_id, appointment_date, appointment_time) DO NOTHING;

        -- Dr. Arjun Kumar (Orthopedics)
        -- Slots: 11:00, 12:00, 15:30, 16:30, 17:30
        INSERT INTO doctor_availability (doctor_id, appointment_date, appointment_time, status)
        VALUES 
            (4, target_date, '11:00', 'available'),
            (4, target_date, '12:00', 'available'),
            (4, target_date, '15:30', 'available'),
            (4, target_date, '16:30', 'available'),
            (4, target_date, '17:30', 'available')
        ON CONFLICT (doctor_id, appointment_date, appointment_time) DO NOTHING;

    END LOOP;
END $$;

-- 4. Mark one sample slot as booked and link an appointment
UPDATE doctor_availability 
SET status = 'booked' 
WHERE doctor_id = 1 AND appointment_date = CURRENT_DATE + 1 AND appointment_time = '18:30';

INSERT INTO appointments (appointment_code, patient_id, doctor_id, appointment_date, appointment_time, status, reason)
VALUES ('APT-10042', 1, 1, CURRENT_DATE + 1, '18:30', 'confirmed', 'Skin rash consultation')
ON CONFLICT (appointment_code) DO NOTHING;
