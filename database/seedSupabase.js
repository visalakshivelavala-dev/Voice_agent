/**
 * MedVoice AI - Supabase Seeder Script
 * Run with: node database/seedSupabase.js
 * Pushes the doctors and dynamic slots into your Supabase PostgreSQL database.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { doctorsData, generateAvailabilitySlots, samplePatients, generateSampleAppointments } from './seedData.js';

dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
  console.error('\n❌ ERROR: Supabase credentials not set in backend/.env.');
  console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('====================================================');
  console.log(' MedVoice AI - Seeding Supabase Database');
  console.log(` Target: ${supabaseUrl}`);
  console.log('====================================================');

  try {
    // 1. Seed Doctors
    console.log('\n1. Upserting Doctors...');
    const { data: docData, error: docErr } = await supabase
      .from('doctors')
      .upsert(doctorsData, { onConflict: 'id' });

    if (docErr) throw docErr;
    console.log(`✅ Upserted ${doctorsData.length} doctors.`);

    // 2. Seed Patients
    console.log('\n2. Upserting Patients...');
    const { error: patErr } = await supabase
      .from('patients')
      .upsert(samplePatients, { onConflict: 'id' });

    if (patErr) throw patErr;
    console.log(`✅ Upserted ${samplePatients.length} patients.`);

    // 3. Seed Availability Slots
    console.log('\n3. Generating dynamic availability slots (Today to +7 Days in Asia/Kolkata)...');
    const slots = generateAvailabilitySlots();

    // Insert slots in batches
    const batchSize = 50;
    for (let i = 0; i < slots.length; i += batchSize) {
      const batch = slots.slice(i, i + batchSize);
      const { error: slotErr } = await supabase
        .from('doctor_availability')
        .upsert(batch, { onConflict: 'doctor_id,appointment_date,appointment_time' });

      if (slotErr) {
        console.warn('Slot batch note:', slotErr.message);
      }
    }
    console.log(`✅ Synced ${slots.length} availability slots.`);

    // 4. Seed sample appointments
    console.log('\n4. Syncing sample appointments...');
    const sampleApts = generateSampleAppointments();
    const { error: aptErr } = await supabase
      .from('appointments')
      .upsert(sampleApts, { onConflict: 'appointment_code' });

    if (aptErr) console.warn('Sample appointment note:', aptErr.message);
    else console.log(`✅ Synced sample appointments.`);

    console.log('\n🎉 Supabase Database Seeded Successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

seed();
