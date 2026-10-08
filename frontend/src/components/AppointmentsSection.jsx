import React from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  XCircle, 
  CalendarRange, 
  Trash2, 
  AlertCircle,
  RefreshCw,
  Building
} from 'lucide-react';

export function AppointmentsSection({ 
  appointments, 
  onCancelAppointment, 
  onOpenRescheduleModal, 
  onRefresh, 
  isRefreshing 
}) {
  return (
    <section id="appointments" className="py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Calendar className="w-4 h-4" />
            <span>Real-Time Database Records</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Scheduled Appointments
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Appointments booked via Retell AI voice agent or dashboard are instantly updated here.
          </p>
        </div>

        {/* Live Sync Status & Refresh */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Auto-Sync Active</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Appointment Cards / Table */}
      {appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Appointments Booked Yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Use the voice assistant above or select a doctor slot to book your first appointment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {appointments.map((apt) => {
            const isCancelled = apt.status === 'cancelled';
            return (
              <div
                key={apt.id || apt.appointment_code}
                className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs ${
                  isCancelled
                    ? 'bg-slate-50/70 border-slate-200 opacity-75'
                    : 'bg-white border-slate-200/90 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Top: Appointment ID & Status */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                      {apt.appointment_code}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isCancelled
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  {/* Doctor & Specialty */}
                  <h4 className="font-bold text-slate-900 text-base">
                    {apt.doctor_name}
                  </h4>
                  <p className="text-xs font-semibold text-brand-600 mb-3">
                    {apt.specialty}
                  </p>

                  {/* Date & Time pill */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 mb-3">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.appointment_date}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-brand-700">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{apt.appointment_time}</span>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">{apt.patient_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.patient_phone}</span>
                    </div>
                    {apt.reason && (
                      <p className="text-[11px] text-slate-500 italic pt-1 truncate">
                        "{apt.reason}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions (Only if not cancelled) */}
                {!isCancelled && (
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
                    <button
                      onClick={() => onOpenRescheduleModal(apt)}
                      className="flex-1 py-1.5 px-3 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <CalendarRange className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>
                    <button
                      onClick={() => onCancelAppointment(apt.appointment_code)}
                      className="py-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center justify-center space-x-1"
                      title="Cancel appointment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}
