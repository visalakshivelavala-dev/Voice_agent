/**
 * MedVoice AI - Retell AI Tool & Webhook Controller
 * Handles Retell AI tool execution callbacks, web call creation,
 * and conversational voice simulation fallback.
 */
import { db } from '../db/database.js';
import { parseNaturalDate, parseNaturalTime, formatTo12Hour, formatHumanDate, getTomorrowKolkataDate } from '../services/dateService.js';
import { createWebCallSession, isRetellConfigured } from '../../voice-agent/retellAgent.js';

/**
 * Universal Tool Execution Engine
 * Maps Retell tool calls to backend database operations
 */
export async function executeTool(toolName, args = {}) {
  console.log(`[Retell Tool Call] Executing '${toolName}' with arguments:`, args);

  switch (toolName) {
    case 'find_doctors': {
      const specialty = args.specialty || '';
      const doctors = await db.getDoctors(specialty);

      if (!doctors || doctors.length === 0) {
        return {
          found: false,
          message: specialty 
            ? `No doctors found for specialty '${specialty}'. Our available specialties include Dermatology, Cardiology, General Medicine, and Orthopedics.`
            : 'No doctors are currently available.',
          doctors: [],
        };
      }

      return {
        found: true,
        count: doctors.length,
        doctors: doctors.map((d) => ({
          doctor_id: d.id,
          name: d.name,
          specialty: d.specialty,
          qualification: d.qualification,
          experience: `${d.experience} years`,
          fee: `₹${d.consultation_fee}`,
          location: d.location,
        })),
        summary: `Found ${doctors.length} doctor(s): ` + doctors.map((d) => `${d.name} (${d.specialty})`).join(', '),
      };
    }

    case 'get_available_slots': {
      const doctorId = args.doctor_id;
      const rawDate = args.date || 'tomorrow';
      const parsedDate = parseNaturalDate(rawDate);

      if (!doctorId) {
        return {
          error: 'MISSING_DOCTOR_ID',
          message: 'Doctor ID is required to look up available slots.',
        };
      }

      const result = await db.getAvailableSlots(doctorId, parsedDate);

      if (!result) {
        return {
          error: 'DOCTOR_NOT_FOUND',
          message: `Doctor with ID ${doctorId} was not found.`,
        };
      }

      if (result.available_slots.length === 0) {
        return {
          doctor: result.doctor,
          doctor_id: result.doctor_id,
          date: result.date,
          human_date: formatHumanDate(result.date),
          has_slots: false,
          available_slots: [],
          message: `Dr. ${result.doctor} has no remaining available slots on ${formatHumanDate(result.date)}. Would you like to check another date or another doctor?`,
        };
      }

      // Convert slots to 12-hour voice-friendly format
      const readableSlots = result.available_slots.map((t) => formatTo12Hour(t));

      return {
        doctor: result.doctor,
        doctor_id: result.doctor_id,
        specialty: result.specialty,
        date: result.date,
        human_date: formatHumanDate(result.date),
        has_slots: true,
        available_slots: result.available_slots,
        readable_slots: readableSlots,
        summary: `${result.doctor} has ${result.available_slots.length} available slots on ${formatHumanDate(result.date)}: ${readableSlots.join(', ')}.`,
      };
    }

    case 'book_appointment': {
      const {
        doctor_id,
        patient_name,
        patient_phone,
        patient_email,
        appointment_date,
        appointment_time,
        reason,
      } = args;

      if (!doctor_id || !patient_name || !patient_phone || !appointment_date || !appointment_time) {
        return {
          success: false,
          reason: 'MISSING_REQUIRED_FIELDS',
          message: 'Please provide doctor, patient name, phone number, date, and time to complete booking.',
        };
      }

      const parsedDate = parseNaturalDate(appointment_date);
      const parsedTime = parseNaturalTime(appointment_time) || appointment_time;

      const bookingResult = await db.bookAppointment({
        doctor_id,
        patient_name,
        patient_phone,
        patient_email,
        appointment_date: parsedDate,
        appointment_time: parsedTime,
        reason: reason || 'Voice assistant booking',
      });

      if (!bookingResult.success) {
        if (bookingResult.reason === 'SLOT_ALREADY_BOOKED') {
          return {
            success: false,
            reason: 'SLOT_ALREADY_BOOKED',
            message: 'Sorry, that slot was just taken. I can check the other available times for you.',
          };
        }
        return {
          success: false,
          reason: bookingResult.reason,
          message: bookingResult.message || 'Unable to book appointment.',
        };
      }

      return {
        success: true,
        appointment_id: bookingResult.appointment_id,
        doctor_name: bookingResult.doctor_name,
        doctor_specialty: bookingResult.doctor_specialty,
        patient_name: bookingResult.patient_name,
        date: bookingResult.appointment_date,
        time: formatTo12Hour(bookingResult.appointment_time),
        message: `Your appointment has been successfully booked with ${bookingResult.doctor_name} for ${formatHumanDate(bookingResult.appointment_date)} at ${formatTo12Hour(bookingResult.appointment_time)}. Your appointment ID is ${bookingResult.appointment_id}.`,
      };
    }

    case 'cancel_appointment': {
      const appointmentId = args.appointment_id;
      if (!appointmentId) {
        return {
          success: false,
          message: 'Please provide the appointment ID to cancel.',
        };
      }

      const cancelResult = await db.cancelAppointment(appointmentId);
      return cancelResult;
    }

    case 'reschedule_appointment': {
      const { appointment_id, new_date, new_time } = args;
      if (!appointment_id || !new_date || !new_time) {
        return {
          success: false,
          message: 'Appointment ID, new date, and new time are required.',
        };
      }

      const parsedDate = parseNaturalDate(new_date);
      const parsedTime = parseNaturalTime(new_time) || new_time;

      const reschedResult = await db.rescheduleAppointment(appointment_id, parsedDate, parsedTime);
      return reschedResult;
    }

    default:
      return {
        error: 'UNKNOWN_TOOL',
        message: `Unknown tool '${toolName}'.`,
      };
  }
}

/**
 * Retell Webhook Endpoint
 * Handles HTTP callbacks when Retell AI invokes custom functions
 */
export async function handleRetellWebhook(req, res) {
  try {
    const payload = req.body || {};
    // Retell passes tool name in name, tool_name, or function_name
    const toolName = payload.name || payload.tool_name || payload.function_name || req.query.name;
    const args = payload.args || payload.arguments || payload.parameters || payload;

    if (!toolName) {
      return res.status(400).json({ error: 'Missing tool name in webhook payload.' });
    }

    const output = await executeTool(toolName, args);
    // Return standard response format that Retell custom tool expects
    res.json(output);
  } catch (error) {
    console.error('[Retell Webhook Error]', error);
    res.status(500).json({
      error: 'ToolExecutionError',
      message: 'Failed to execute tool.',
      details: error.message,
    });
  }
}

/**
 * Handle individual tool routes (e.g. POST /api/retell/tools/find_doctors)
 */
export async function handleSpecificTool(req, res) {
  try {
    const { toolName } = req.params;
    const args = req.body?.args || req.body || {};
    const result = await executeTool(toolName, args);
    res.json(result);
  } catch (error) {
    console.error(`[Retell Tool ${req.params.toolName} Error]`, error);
    res.status(500).json({
      error: 'ToolExecutionError',
      message: error.message,
    });
  }
}

/**
 * Create a Web Call session for the browser Retell Client SDK
 */
export async function createWebCall(req, res) {
  try {
    const { agent_id } = req.body || {};
    const session = await createWebCallSession(agent_id);

    if (!session.success && !session.isSimulated) {
      return res.status(400).json(session);
    }

    res.json({
      ...session,
      isRetellConfigured,
    });
  } catch (error) {
    console.error('[Web Call Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Interactive Voice Agent Conversation Simulator
 * Provides full end-to-end conversational intelligence in browser even without Retell API key,
 * calling the exact same backend tools and maintaining state!
 */
export async function simulateVoiceAgent(req, res) {
  try {
    const { message, sessionState = {} } = req.body;
    const cleanMsg = (message || '').trim().toLowerCase();

    const state = {
      step: sessionState.step || 'GREETING',
      selectedDoctorId: sessionState.selectedDoctorId || null,
      selectedDoctorName: sessionState.selectedDoctorName || null,
      selectedSpecialty: sessionState.selectedSpecialty || null,
      targetDate: sessionState.targetDate || null,
      selectedTime: sessionState.selectedTime || null,
      patientName: sessionState.patientName || null,
      patientPhone: sessionState.patientPhone || null,
      availableSlots: sessionState.availableSlots || [],
      toolCalls: [],
    };

    let reply = '';

    // 1. Check for cancel/reschedule commands
    if (cleanMsg.includes('cancel appointment') || cleanMsg.startsWith('cancel apt')) {
      const match = cleanMsg.match(/apt-\d+/i);
      if (match) {
        const aptCode = match[0].toUpperCase();
        state.toolCalls.push({ name: 'cancel_appointment', args: { appointment_id: aptCode } });
        const resu = await executeTool('cancel_appointment', { appointment_id: aptCode });
        if (resu.success) {
          reply = `Your appointment ${aptCode} has been successfully cancelled.`;
        } else {
          reply = `I could not cancel that appointment: ${resu.message}`;
        }
      } else {
        reply = 'Please provide the appointment ID (for example, APT-10042) you would like to cancel.';
      }
      return res.json({ reply, sessionState: state, toolCalls: state.toolCalls });
    }

    // 2. Active Step Handlers (State Machine Priority)
    if (state.step === 'AWAITING_CONFIRMATION') {
      if (cleanMsg.includes('yes') || cleanMsg.includes('confirm') || cleanMsg.includes('sure') || cleanMsg.includes('ok') || cleanMsg.includes('please')) {
        const bookArgs = {
          doctor_id: state.selectedDoctorId || 1,
          patient_name: state.patientName || 'Caller',
          patient_phone: state.patientPhone || '9876543210',
          appointment_date: state.targetDate || getTomorrowKolkataDate(),
          appointment_time: state.selectedTime || '17:30',
          reason: `${state.selectedSpecialty || 'General'} consultation`,
        };

        state.toolCalls.push({ name: 'book_appointment', args: bookArgs });
        const bookRes = await executeTool('book_appointment', bookArgs);

        if (bookRes.success) {
          reply = `Your appointment has been successfully booked. Your appointment ID is ${bookRes.appointment_id}. You will receive an SMS confirmation. Is there anything else I can help you with today?`;
          state.step = 'COMPLETED';
        } else if (bookRes.reason === 'SLOT_ALREADY_BOOKED') {
          reply = `Sorry, that slot was just taken. I can check the other available times for you.`;
          // Refresh slots
          const slotResult = await executeTool('get_available_slots', { doctor_id: bookArgs.doctor_id, date: bookArgs.appointment_date });
          state.availableSlots = slotResult.available_slots || [];
          reply += ` Available times: ${slotResult.readable_slots?.join(', ')}. Which would you prefer?`;
          state.step = 'AWAITING_TIME_SELECTION';
        } else {
          reply = `The booking could not be completed: ${bookRes.message}`;
        }
      } else if (cleanMsg.includes('no') || cleanMsg.includes('cancel')) {
        reply = 'No problem, I have cancelled the booking process. Would you like to check another doctor or time?';
        state.step = 'GREETING';
      } else {
        reply = `Should I go ahead and confirm the booking for ${state.patientName}? (Please say yes or no)`;
      }
      return res.json({ reply, sessionState: state, toolCalls: state.toolCalls });
    }

    if (state.step === 'AWAITING_PHONE') {
      const phoneDigits = message.replace(/\D/g, '');
      state.patientPhone = phoneDigits.length >= 10 ? phoneDigits.slice(0, 10) : (phoneDigits || '9876543210');

      const time12 = formatTo12Hour(state.selectedTime || '17:30');
      const dateHuman = formatHumanDate(state.targetDate || getTomorrowKolkataDate());

      reply = `Just to confirm, you're booking an appointment with ${state.selectedDoctorName || 'Dr. Priya Sharma'} ${dateHuman} at ${time12} for ${state.patientName}. Shall I confirm it?`;
      state.step = 'AWAITING_CONFIRMATION';
      return res.json({ reply, sessionState: state, toolCalls: state.toolCalls });
    }

    if (state.step === 'AWAITING_NAME') {
      const name = message.replace(/(my name is|i am|this is)/i, '').trim();
      state.patientName = name || 'John Doe';
      reply = `Thank you, ${state.patientName}. And what is your 10-digit phone number?`;
      state.step = 'AWAITING_PHONE';
      return res.json({ reply, sessionState: state, toolCalls: state.toolCalls });
    }

    if (state.step === 'AWAITING_TIME_SELECTION') {
      const parsedTime = parseNaturalTime(cleanMsg);
      if (parsedTime) {
        state.selectedTime = parsedTime;
        reply = `Great. May I have your full name?`;
        state.step = 'AWAITING_NAME';
        return res.json({ reply, sessionState: state, toolCalls: state.toolCalls });
      }
    }

    // 3. Doctor/Specialty Query Handling
    if (
      cleanMsg.includes('doctor') ||
      cleanMsg.includes('dermatolog') ||
      cleanMsg.includes('cardiolog') ||
      cleanMsg.includes('general medicine') ||
      cleanMsg.includes('orthopedic') ||
      cleanMsg.includes('skin') ||
      cleanMsg.includes('heart') ||
      cleanMsg.includes('bone') ||
      cleanMsg.includes('see a') ||
      cleanMsg.includes('appointment with')
    ) {
      let specialty = '';
      if (cleanMsg.includes('derma') || cleanMsg.includes('skin')) specialty = 'Dermatology';
      else if (cleanMsg.includes('cardio') || cleanMsg.includes('heart')) specialty = 'Cardiology';
      else if (cleanMsg.includes('ortho') || cleanMsg.includes('bone') || cleanMsg.includes('joint')) specialty = 'Orthopedics';
      else if (cleanMsg.includes('general')) specialty = 'General Medicine';

      // Parse date if mentioned (e.g., "tomorrow", "Friday")
      const parsedDate = parseNaturalDate(cleanMsg);
      state.targetDate = parsedDate;

      state.toolCalls.push({ name: 'find_doctors', args: { specialty } });
      const docResult = await executeTool('find_doctors', { specialty });

      if (docResult.found && docResult.doctors.length > 0) {
        const doc = docResult.doctors[0];
        state.selectedDoctorId = doc.doctor_id;
        state.selectedDoctorName = doc.name;
        state.selectedSpecialty = doc.specialty;

        // Fetch real availability
        state.toolCalls.push({ name: 'get_available_slots', args: { doctor_id: doc.doctor_id, date: parsedDate } });
        const slotResult = await executeTool('get_available_slots', { doctor_id: doc.doctor_id, date: parsedDate });

        if (slotResult.has_slots && slotResult.readable_slots.length > 0) {
          state.availableSlots = slotResult.available_slots;
          const slotsText = slotResult.readable_slots.slice(0, 4).join(', ');
          reply = `${doc.name} (${doc.specialty}) is available ${formatHumanDate(parsedDate)} at ${slotsText}. Which time would you prefer?`;
          state.step = 'AWAITING_TIME_SELECTION';
        } else {
          reply = `${doc.name} has no available slots for ${formatHumanDate(parsedDate)}. Would you like to check another date or another doctor?`;
          state.step = 'AWAITING_SPECIALTY';
        }
      } else {
        reply = "I couldn't find a doctor for that specialty. We have specialists in Dermatology, Cardiology, General Medicine, and Orthopedics. Which one would you prefer?";
        state.step = 'AWAITING_SPECIALTY';
      }

      return res.json({ reply, sessionState: state, toolCalls: state.toolCalls });
    }

    // Default Fallback
    reply = "Hello! I am MedVoice, your AI appointment assistant. I can help you find specialists in Dermatology, Cardiology, General Medicine, or Orthopedics, and book your appointment. Which specialty would you like to see?";
    return res.json({ reply, sessionState: state, toolCalls: state.toolCalls });
  } catch (error) {
    console.error('[Simulate Error]', error);
    res.status(500).json({ error: error.message });
  }
}
