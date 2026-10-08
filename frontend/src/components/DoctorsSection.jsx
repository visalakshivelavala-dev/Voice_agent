import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Clock, 
  MapPin, 
  Award, 
  IndianRupee, 
  Calendar as CalendarIcon, 
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { fetchDoctorAvailability } from '../services/api';

export function DoctorsSection({ doctors, onOpenBookingModal }) {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedDateOffset, setSelectedDateOffset] = useState(1); // Default: Tomorrow (offset 1)
  const [doctorSlots, setDoctorSlots] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  const specialties = ['All', 'Dermatology', 'Cardiology', 'General Medicine', 'Orthopedics'];

  // Calculate target date string YYYY-MM-DD
  const getOffsetDate = (offset) => {
    const d = new Date();
    // Shift to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const target = new Date(d.getTime() + istOffset + offset * 24 * 60 * 60 * 1000);
    return target.toISOString().split('T')[0];
  };

  const currentDateStr = getOffsetDate(selectedDateOffset);

  // Fetch real availability for all visible doctors whenever date or doctors change
  useEffect(() => {
    async function loadAllSlots() {
      if (!doctors || doctors.length === 0) return;
      setLoadingSlots(true);
      const slotMap = {};

      await Promise.all(
        doctors.map(async (doc) => {
          try {
            const avail = await fetchDoctorAvailability(doc.id, currentDateStr);
            slotMap[doc.id] = avail.available_slots || [];
          } catch (e) {
            slotMap[doc.id] = [];
          }
        })
      );

      setDoctorSlots(slotMap);
      setLoadingSlots(false);
    }

    loadAllSlots();
  }, [doctors, currentDateStr]);

  const filteredDoctors = doctors.filter((doc) => {
    if (selectedSpecialty === 'All') return true;
    return doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase();
  });

  // Friendly date labels
  const dateOptions = [
    { offset: 0, label: 'Today' },
    { offset: 1, label: 'Tomorrow' },
    { offset: 2, label: 'Day +2' },
    { offset: 3, label: 'Day +3' },
  ];

  return (
    <section id="doctors" className="py-8">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Verified Clinic Specialists</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Consult Our Medical Doctors
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Live availability synced directly with the clinic database. Book manually or speak with the voice assistant.
          </p>
        </div>

        {/* Date Selector Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-200/70 p-1 rounded-xl self-start md:self-auto border border-slate-300/50">
          <CalendarIcon className="w-4 h-4 text-slate-500 ml-2 mr-1" />
          {dateOptions.map((opt) => (
            <button
              key={opt.offset}
              onClick={() => setSelectedDateOffset(opt.offset)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                selectedDateOffset === opt.offset
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Specialty Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
        {specialties.map((spec) => (
          <button
            key={spec}
            onClick={() => setSelectedSpecialty(spec)}
            className={`text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedSpecialty === spec
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDoctors.map((doc) => {
          const slots = doctorSlots[doc.id] || [];
          return (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group"
            >
              <div>
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                      {doc.specialty}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-brand-600 transition-colors">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{doc.qualification}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Fee</span>
                    <span className="text-base font-extrabold text-slate-900 flex items-center justify-end">
                      ₹{doc.consultation_fee}
                    </span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{doc.experience} Years Experience</span>
                  </div>
                  <div className="flex items-center space-x-1.5 truncate" title={doc.location}>
                    <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span className="truncate">{doc.location.split(',')[1] || doc.location}</span>
                  </div>
                </div>

                {/* Available Slots Preview */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>Available Slots ({currentDateStr}):</span>
                    </span>
                    <span className="text-[11px] font-bold text-teal-600">
                      {loadingSlots ? 'Loading...' : `${slots.length} open`}
                    </span>
                  </div>

                  {slots.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {slots.slice(0, 5).map((time) => (
                        <button
                          key={time}
                          onClick={() => onOpenBookingModal(doc, currentDateStr, time)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-800 font-semibold border border-teal-200 transition-all cursor-pointer"
                          title="Click to book this slot"
                        >
                          {time}
                        </button>
                      ))}
                      {slots.length > 5 && (
                        <span className="text-xs px-2 py-1 text-slate-400 font-medium">
                          +{slots.length - 5} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {loadingSlots ? 'Checking availability...' : 'No available slots on this date.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => onOpenBookingModal(doc, currentDateStr, slots[0] || '17:00')}
                  disabled={slots.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-white shadow-xs"
                >
                  <span>Book Appointment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}
