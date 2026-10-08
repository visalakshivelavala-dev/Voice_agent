/**
 * MedVoice AI - Frontend API Service
 * Communicates with backend Express REST endpoints.
 * Never exposes secrets or API keys on the client side.
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchDoctors(specialty = '') {
  const url = specialty 
    ? `${API_BASE}/doctors?specialty=${encodeURIComponent(specialty)}`
    : `${API_BASE}/doctors`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchDoctorById(id) {
  const res = await fetch(`${API_BASE}/doctors/${id}`);
  return res.json();
}

export async function fetchDoctorAvailability(doctorId, date = 'tomorrow') {
  const res = await fetch(`${API_BASE}/doctors/${doctorId}/availability?date=${encodeURIComponent(date)}`);
  return res.json();
}

export async function bookAppointment(bookingData) {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.reason || 'Failed to book appointment');
  }
  return data;
}

export async function cancelAppointment(appointmentId) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to cancel appointment');
  }
  return data;
}

export async function rescheduleAppointment(appointmentId, newDate, newTime) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      new_date: newDate,
      new_time: newTime,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to reschedule appointment');
  }
  return data;
}

export async function fetchAppointments() {
  const res = await fetch(`${API_BASE}/appointments`);
  return res.json();
}

export async function createWebCall() {
  const res = await fetch(`${API_BASE}/voice/create-web-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function sendSimulatedVoiceMessage(message, sessionState) {
  const res = await fetch(`${API_BASE}/voice/simulate-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionState }),
  });
  return res.json();
}

export async function resetDatabase() {
  const res = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
  });
  return res.json();
}
