import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoiceAgentCard } from './components/VoiceAgentCard';
import { DoctorsSection } from './components/DoctorsSection';
import { AppointmentsSection } from './components/AppointmentsSection';
import { BookModal } from './components/BookModal';
import { RescheduleModal } from './components/RescheduleModal';
import { 
  fetchDoctors, 
  fetchAppointments, 
  fetchHealth, 
  cancelAppointment, 
  resetDatabase 
} from './services/api';
import { 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('voice');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modal States
  const [bookModal, setBookModal] = useState({
    isOpen: false,
    doctor: null,
    date: '',
    time: '',
  });

  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    appointment: null,
  });

  // Show temporary toast notification
  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Load core data
  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [docRes, aptRes, healthRes] = await Promise.all([
        fetchDoctors(),
        fetchAppointments(),
        fetchHealth(),
      ]);

      if (docRes?.doctors) setDoctors(docRes.doctors);
      if (aptRes?.appointments) setAppointments(aptRes.appointments);
      if (healthRes) setSystemHealth(healthRes);
    } catch (err) {
      console.error('[App] Failed to load data:', err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  };

  // Initial load + Realtime Polling (every 3.5 seconds to instantly reflect voice agent bookings)
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(false);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Handle Reseed / Reset
  const handleReseed = async () => {
    setIsReseeding(true);
    try {
      const res = await resetDatabase();
      await loadData();
      notify('success', 'Database slots and demo appointments refreshed successfully!');
    } catch (err) {
      notify('error', 'Failed to reset database.');
    } finally {
      setIsReseeding(false);
    }
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (appointmentCode) => {
    if (!window.confirm(`Are you sure you want to cancel appointment ${appointmentCode}?`)) {
      return;
    }

    try {
      const res = await cancelAppointment(appointmentCode);
      await loadData();
      notify('success', `Appointment ${appointmentCode} has been cancelled and its slot freed.`);
    } catch (err) {
      notify('error', err.message || 'Failed to cancel appointment.');
    }
  };

  // Navigation scroll helper
  const handleNavigate = (tab) => {
    setActiveTab(tab);
    if (tab === 'voice') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(tab);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-sm font-semibold max-w-md ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main App Header */}
      <Header
        onNavigate={handleNavigate}
        activeTab={activeTab}
        systemHealth={systemHealth}
        onReseed={handleReseed}
        isReseeding={isReseeding}
      />

      {/* Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto pt-2 pb-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Retell AI + Express.js + Supabase PostgreSQL</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Speak Naturally. Book Doctors with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-teal-500">
              Verified Real Availability.
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            MedVoice AI checks live doctor schedules from Supabase database before offering slots,
            protecting against double bookings with atomic concurrency control.
          </p>
        </div>

        {/* Voice Agent Console Card (Requirement 7, 8, 11) */}
        <div id="voice">
          <VoiceAgentCard
            onAppointmentBooked={loadData}
            isRetellConfigured={systemHealth?.voice?.isRetellConfigured}
          />
        </div>

        {/* Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Zero Hallucination Availability</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              The AI voice assistant queries real-time database slots and will never invent times or doctors.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Atomic Race-Condition Safe</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              If two patients request the same slot at the same millisecond, transactional row locking prevents double-booking.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">IST Timezone & Natural Parsing</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Understands "tomorrow", "Friday", "5 PM", and "around 5" accurately parsed on the server side.
            </p>
          </div>
        </div>

        {/* Doctors Section (Requirement 4 & 11) */}
        <DoctorsSection
          doctors={doctors}
          onOpenBookingModal={(doc, date, time) => {
            setBookModal({
              isOpen: true,
              doctor: doc,
              date,
              time,
            });
          }}
        />

        {/* Scheduled Appointments Section (Requirement 11 & 12) */}
        <AppointmentsSection
          appointments={appointments}
          onCancelAppointment={handleCancelAppointment}
          onOpenRescheduleModal={(apt) => {
            setRescheduleModal({
              isOpen: true,
              appointment: apt,
            });
          }}
          onRefresh={() => loadData(true)}
          isRefreshing={isRefreshing}
        />

      </main>

      {/* Booking Modal */}
      {bookModal.isOpen && (
        <BookModal
          doctor={bookModal.doctor}
          date={bookModal.date}
          initialTime={bookModal.time}
          onClose={() => setBookModal({ isOpen: false, doctor: null, date: '', time: '' })}
          onBookingSuccess={(apt) => {
            loadData();
            notify('success', `Appointment ${apt.appointment_id} confirmed for ${apt.patient_name}!`);
          }}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <RescheduleModal
          appointment={rescheduleModal.appointment}
          onClose={() => setRescheduleModal({ isOpen: false, appointment: null })}
          onRescheduleSuccess={(res) => {
            loadData();
            notify('success', `Appointment ${res.appointment_id} rescheduled to ${res.new_date} at ${res.new_time}.`);
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">MedVoice AI</span>
            <span>—</span>
            <span>AI-Powered Doctor Appointment Assistant</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Retell AI + Node.js + Express.js + Supabase</span>
            <span>•</span>
            <span className="font-mono">Asia/Kolkata</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
