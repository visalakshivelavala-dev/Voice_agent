-- ============================================================================
-- MedVoice AI - Database Schema (PostgreSQL / Supabase)
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    qualification VARCHAR(100) NOT NULL,
    experience INT NOT NULL,
    consultation_fee NUMERIC(10, 2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DOCTOR AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS doctor_availability (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, appointment_date, appointment_time)
);

-- 4. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    appointment_code VARCHAR(50) UNIQUE NOT NULL,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE & CONCURRENCY
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_id ON doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_date ON doctor_availability(appointment_date);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_time ON doctor_availability(appointment_time);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_status ON doctor_availability(status);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_lookup ON doctor_availability(doctor_id, appointment_date, status);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_code ON appointments(appointment_code);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- ============================================================================
-- ATOMIC STORED PROCEDURE FOR RACE-CONDITION PROTECTED BOOKING
-- Prevents double booking even if two concurrent requests attempt to book the
-- exact same doctor and slot at the exact same millisecond.
-- ============================================================================
CREATE OR REPLACE FUNCTION book_appointment_atomic(
    p_doctor_id INT,
    p_patient_name VARCHAR,
    p_patient_phone VARCHAR,
    p_patient_email VARCHAR,
    p_appointment_date DATE,
    p_appointment_time VARCHAR,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_slot_id INT;
    v_patient_id INT;
    v_appointment_id INT;
    v_appointment_code VARCHAR;
    v_doctor_name VARCHAR;
    v_doctor_specialty VARCHAR;
BEGIN
    -- 1. Check if doctor exists
    SELECT name, specialty INTO v_doctor_name, v_doctor_specialty
    FROM doctors
    WHERE id = p_doctor_id AND available = true;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'reason', 'DOCTOR_NOT_FOUND',
            'message', 'The requested doctor is not available or does not exist.'
        );
    END IF;

    -- 2. Lock the specific slot for update to avoid race conditions
    SELECT id INTO v_slot_id
    FROM doctor_availability
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_appointment_date
      AND appointment_time = p_appointment_time
      AND status = 'available'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'reason', 'SLOT_ALREADY_BOOKED',
            'message', 'The requested slot is already booked or unavailable.'
        );
    END IF;

    -- 3. Upsert / Get Patient
    SELECT id INTO v_patient_id
    FROM patients
    WHERE phone = p_patient_phone
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO patients (name, phone, email)
        VALUES (p_patient_name, p_patient_phone, p_patient_email)
        RETURNING id INTO v_patient_id;
    ELSE
        UPDATE patients
        SET name = p_patient_name,
            email = COALESCE(p_patient_email, email)
        WHERE id = v_patient_id;
    END IF;

    -- 4. Generate unique appointment code
    v_appointment_code := 'APT-' || LPAD((FLOOR(RANDOM() * 89999 + 10000))::TEXT, 5, '0');

    -- 5. Mark slot as booked
    UPDATE doctor_availability
    SET status = 'booked'
    WHERE id = v_slot_id;

    -- 6. Insert appointment
    INSERT INTO appointments (
        appointment_code,
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        status,
        reason
    )
    VALUES (
        v_appointment_code,
        v_patient_id,
        p_doctor_id,
        p_appointment_date,
        p_appointment_time,
        'confirmed',
        p_reason
    )
    RETURNING id INTO v_appointment_id;

    -- 7. Return success response
    RETURN json_build_object(
        'success', true,
        'appointment_id', v_appointment_code,
        'id', v_appointment_id,
        'doctor_name', v_doctor_name,
        'doctor_specialty', v_doctor_specialty,
        'patient_name', p_patient_name,
        'appointment_date', p_appointment_date,
        'appointment_time', p_appointment_time,
        'status', 'confirmed',
        'reason', p_reason
    );
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) - Permissive public access for API service role / anon keys
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated full read/write for demo/application
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access doctors" ON doctors;
    CREATE POLICY "Public access doctors" ON doctors FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public access patients" ON patients;
    CREATE POLICY "Public access patients" ON patients FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access availability" ON doctor_availability;
    CREATE POLICY "Public access availability" ON doctor_availability FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access appointments" ON appointments;
    CREATE POLICY "Public access appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
