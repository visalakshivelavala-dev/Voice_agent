/**
 * MedVoice AI - Date & Time Parsing Service
 * Configured specifically for Asia/Kolkata timezone.
 * Parses natural language ("tomorrow", "Friday", "next Monday", "5 PM", "around 5", "after 6 PM")
 * into normalized YYYY-MM-DD and HH:mm strings.
 */

// Timezone name
export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current Date object shifted to Asia/Kolkata (IST = UTC+5:30)
 */
export function getNowInKolkata() {
  const now = new Date();
  // IST offset is +5:30 hours (330 minutes)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(utc + istOffset);
}

/**
 * Format a Date object to YYYY-MM-DD in Asia/Kolkata
 */
export function formatToKolkataDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow's date string (YYYY-MM-DD) in Asia/Kolkata
 */
export function getTomorrowKolkataDate() {
  const ist = getNowInKolkata();
  ist.setDate(ist.getDate() + 1);
  return formatToKolkataDate(ist);
}

/**
 * Returns today's date string (YYYY-MM-DD) in Asia/Kolkata
 */
export function getTodayKolkataDate() {
  return formatToKolkataDate(getNowInKolkata());
}

/**
 * Parses natural language or formatted date strings into YYYY-MM-DD in Asia/Kolkata.
 * Handles: "today", "tomorrow", "day after tomorrow", "Friday", "this Friday", "next Monday", "2026-10-08", etc.
 */
export function parseNaturalDate(rawDateStr) {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return getTomorrowKolkataDate(); // Sensible default for bookings is tomorrow
  }

  const cleaned = rawDateStr.trim().toLowerCase();

  // Exact standard date match (YYYY-MM-DD)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const istNow = getNowInKolkata();

  if (cleaned === 'today' || cleaned === 'now') {
    return formatToKolkataDate(istNow);
  }

  if (cleaned === 'tomorrow' || cleaned === 'tmrw') {
    const target = new Date(istNow);
    target.setDate(target.getDate() + 1);
    return formatToKolkataDate(target);
  }

  if (cleaned === 'day after tomorrow' || cleaned === 'the day after tomorrow') {
    const target = new Date(istNow);
    target.setDate(target.getDate() + 2);
    return formatToKolkataDate(target);
  }

  // Weekdays handling
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < daysOfWeek.length; i++) {
    const dayName = daysOfWeek[i];
    if (cleaned.includes(dayName)) {
      const currentDay = istNow.getDay();
      let diff = i - currentDay;
      if (cleaned.includes('next') && diff <= 0) {
        diff += 7;
      } else if (diff <= 0) {
        diff += 7; // Upcoming weekday
      }
      const target = new Date(istNow);
      target.setDate(target.getDate() + diff);
      return formatToKolkataDate(target);
    }
  }

  // Attempt to parse standard dates like "Oct 8", "October 8", "8 October 2026"
  const parsedTimestamp = Date.parse(rawDateStr);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    return formatToKolkataDate(d);
  }

  // Fallback: tomorrow
  return getTomorrowKolkataDate();
}

/**
 * Parses natural language time strings into 24-hr HH:mm format.
 * Handles: "5:30", "5:30 PM", "5 PM", "17:30", "around 5", "after 6 PM", "10:00 AM", etc.
 */
export function parseNaturalTime(rawTimeStr) {
  if (!rawTimeStr || typeof rawTimeStr !== 'string') {
    return null;
  }

  const cleaned = rawTimeStr.trim().toLowerCase();

  // Match e.g. "17:30" or "09:00" or "5:30"
  const hhmmMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    let h = parseInt(hhmmMatch[1], 10);
    const m = hhmmMatch[2];
    // In clinic outpatient hours, 1:00 - 7:00 without explicit AM/PM means PM (13:00 - 19:00)
    if (h >= 1 && h <= 7) {
      h += 12;
    }
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }

  // Match e.g. "5:30 pm", "5:30pm", "10:00 am"
  const ampmDetailedMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (ampmDetailedMatch) {
    let h = parseInt(ampmDetailedMatch[1], 10);
    const m = ampmDetailedMatch[2];
    const period = ampmDetailedMatch[3].toLowerCase();
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // Match e.g. "5 pm", "5pm", "around 5 pm", "after 6 pm", "at 5"
  const hourMatch = cleaned.match(/(?:around|at|after|before)?\s*(\d{1,2})\s*(am|pm)?/i);
  if (hourMatch && hourMatch[1]) {
    let h = parseInt(hourMatch[1], 10);
    const period = hourMatch[2] ? hourMatch[2].toLowerCase() : null;

    if (period === 'pm' && h < 12) {
      h += 12;
    } else if (period === 'am' && h === 12) {
      h = 0;
    } else if (!period) {
      // If caller says "around 5" or "at 5" in outpatient context, 5 typically means 5 PM (17:00)
      if (h >= 1 && h <= 7) {
        h += 12;
      }
    }

    return `${String(h).padStart(2, '0')}:00`;
  }

  return null;
}

/**
 * Filter slots based on time period preference like "morning", "afternoon", "evening", "after 6 PM"
 */
export function filterSlotsByPreference(slots, preferenceText) {
  if (!preferenceText || !slots || slots.length === 0) return slots;
  const p = preferenceText.toLowerCase();

  if (p.includes('morning')) {
    return slots.filter((s) => {
      const h = parseInt(s.split(':')[0], 10);
      return h < 12;
    });
  }

  if (p.includes('afternoon')) {
    return slots.filter((s) => {
      const h = parseInt(s.split(':')[0], 10);
      return h >= 12 && h < 16;
    });
  }

  if (p.includes('evening')) {
    return slots.filter((s) => {
      const h = parseInt(s.split(':')[0], 10);
      return h >= 16;
    });
  }

  if (p.includes('after 6')) {
    return slots.filter((s) => {
      const h = parseInt(s.split(':')[0], 10);
      return h >= 18;
    });
  }

  return slots;
}

/**
 * Format a 24-hr time like "17:30" to friendly "5:30 PM"
 */
export function formatTo12Hour(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${min} ${ampm}`;
}

/**
 * Format date to human friendly string, e.g. "Tomorrow (Oct 8)", "Friday, Oct 9"
 */
export function formatHumanDate(dateStr) {
  if (!dateStr) return '';
  const today = getTodayKolkataDate();
  const tomorrow = getTomorrowKolkataDate();

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';

  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
