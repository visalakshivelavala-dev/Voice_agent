import React from 'react';
import { Activity, PhoneCall, Calendar, UserCheck, RefreshCw, Database, ShieldCheck } from 'lucide-react';

export function Header({ 
  onNavigate, 
  activeTab, 
  systemHealth, 
  onReseed, 
  isReseeding 
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('voice')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  MedVoice<span className="text-brand-600">.AI</span>
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Voice Agent
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                AI-Powered Doctor Appointment Assistant
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="hidden md:flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onNavigate('voice')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'voice'
                  ? 'bg-white text-brand-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Voice Assistant</span>
            </button>
            <button
              onClick={() => onNavigate('doctors')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'doctors'
                  ? 'bg-white text-brand-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Doctors</span>
            </button>
            <button
              onClick={() => onNavigate('appointments')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'appointments'
                  ? 'bg-white text-brand-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Appointments</span>
            </button>
          </nav>

          {/* System Status Badges */}
          <div className="flex items-center space-x-3">
            {/* Database indicator */}
            <div className="hidden lg:flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-medium">
                {systemHealth?.database?.isSupabase ? 'Supabase Postgres' : 'Postgres/In-Memory'}
              </span>
            </div>

            {/* Timezone badge */}
            <div className="hidden sm:flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700">
              <span className="font-semibold">IST</span>
              <span className="text-[11px] opacity-75">(Asia/Kolkata)</span>
            </div>

            {/* Reseed Button */}
            <button
              onClick={onReseed}
              disabled={isReseeding}
              title="Reset slots and sample data for fresh demo"
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin text-brand-600' : ''}`} />
              <span className="hidden sm:inline">Reset Slots</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
