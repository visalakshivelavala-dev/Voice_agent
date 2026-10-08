/**
 * MedVoice AI - Frontend API Service
 * Communicates with backend Express REST endpoints.
 * Supports configurable VITE_API_URL and localStorage override for deployments.
 * Never exposes secrets or API keys on the client side.
 */

const STORAGE_CUSTOM_BACKEND = 'medvoice_custom_backend_url';

export function getCustomBackendUrl() {
  try {
    return localStorage.getItem(STORAGE_CUSTOM_BACKEND) || '';
  } catch {
    return '';
  }
}

export function setCustomBackendUrl(url) {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_CUSTOM_BACKEND, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_BACKEND);
    }
  } catch {}
}

export function getApiBase() {
  const custom = getCustomBackendUrl();
  if (custom) return `${custom}/api`;

  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`;
  }
  if (import.meta.env.VITE_BACKEND_URL) {
    return `${import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '')}/api`;
  }
  return '/api';
}

async function safeFetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (netErr) {
    throw new Error(`Network error connecting to ${url}: ${netErr.message}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 120)}`);
  }

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || data.reason || `HTTP ${res.status}`;
    const err = new Error(errorMsg);
    err.reason = data.reason;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchHealth() {
  return safeFetchJson(`${getApiBase()}/health`);
}

export async function fetchDoctors(specialty = '') {
  const url = specialty 
    ? `${getApiBase()}/doctors?specialty=${encodeURIComponent(specialty)}`
    : `${getApiBase()}/doctors`;
  return safeFetchJson(url);
}

export async function fetchDoctorById(id) {
  return safeFetchJson(`${getApiBase()}/doctors/${id}`);
}

export async function fetchDoctorAvailability(doctorId, date = 'tomorrow') {
  return safeFetchJson(`${getApiBase()}/doctors/${doctorId}/availability?date=${encodeURIComponent(date)}`);
}

export async function bookAppointment(bookingData) {
  return safeFetchJson(`${getApiBase()}/appointments`, {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

export async function cancelAppointment(appointmentId) {
  return safeFetchJson(`${getApiBase()}/appointments/${appointmentId}`, {
    method: 'DELETE',
  });
}

export async function rescheduleAppointment(appointmentId, newDate, newTime) {
  return safeFetchJson(`${getApiBase()}/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      new_date: newDate,
      new_time: newTime,
    }),
  });
}

export async function fetchAppointments() {
  return safeFetchJson(`${getApiBase()}/appointments`);
}

export async function createWebCall() {
  return safeFetchJson(`${getApiBase()}/voice/create-web-call`, {
    method: 'POST',
  });
}

export async function sendSimulatedVoiceMessage(message, sessionState) {
  return safeFetchJson(`${getApiBase()}/voice/simulate-agent`, {
    method: 'POST',
    body: JSON.stringify({ message, sessionState }),
  });
}

export async function resetDatabase() {
  return safeFetchJson(`${getApiBase()}/reset`, {
    method: 'POST',
  });
}
