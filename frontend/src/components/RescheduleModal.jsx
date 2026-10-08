import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchDoctorAvailability, rescheduleAppointment } from '../services/api';

export function RescheduleModal({ appointment, onClose, onRescheduleSuccess }) {
  const [selectedDate, setSelectedDate] = useState(appointment?.appointment_date || '');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!appointment) return null;

  // Load available slots whenever selectedDate changes
  useEffect(() => {
    async function loadSlots() {
      if (!appointment.doctor_id || !selectedDate) return;
      setLoadingSlots(true);
      setErrorMsg(null);
      try {
        const res = await fetchDoctorAvailability(appointment.doctor_id, selectedDate);
        const slots = res.available_slots || [];
        setAvailableSlots(slots);
        if (slots.length > 0) {
          setSelectedTime(slots[0]);
        } else {
          setSelectedTime('');
        }
      } catch (err) {
        setErrorMsg('Failed to load doctor slots for this date.');
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [appointment.doctor_id, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTime) {
      setErrorMsg('Please select an available time slot.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await rescheduleAppointment(
        appointment.appointment_code || appointment.id,
        selectedDate,
        selectedTime
      );

      if (onRescheduleSuccess) onRescheduleSuccess(res);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reschedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-brand-600 to-teal-500 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Reschedule Appointment</h3>
            <p className="text-xs text-brand-100 font-mono">
              {appointment.appointment_code} • {appointment.doctor_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current appointment info */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold block text-slate-700 mb-0.5">Current Schedule:</span>
            <span>{appointment.appointment_date} at {appointment.appointment_time}</span>
          </div>

          {/* New Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select New Date
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Available Slots */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Select Available Time Slot</span>
              <span className="text-[11px] font-normal text-slate-400">
                {loadingSlots ? 'Checking database...' : `${availableSlots.length} available`}
              </span>
            </label>

            {loadingSlots ? (
              <p className="text-xs text-slate-400 py-3 text-center">Loading verified slots...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                No slots are available on this date. Please pick another date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      selectedTime === slot
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTime}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold shadow-xs transition-colors"
            >
              {submitting ? 'Updating Slot...' : 'Confirm Reschedule'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
