import React, { useState } from 'react';
import { 
  Activity, 
  PhoneCall, 
  Calendar, 
  UserCheck, 
  RefreshCw, 
  Database, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { getCustomBackendUrl, setCustomBackendUrl, fetchHealth } from '../services/api';

export function Header({ 
  onNavigate, 
  activeTab, 
  systemHealth, 
  onReseed, 
  isReseeding 
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrl, setCustomUrl] = useState(getCustomBackendUrl());
  const [testStatus, setTestStatus] = useState(null); // 'testing' | 'success' | 'failed' | null
  const [testMessage, setTestMessage] = useState('');

  const isConnected = Boolean(systemHealth && systemHealth.status === 'online');

  const handleSaveConfig = () => {
    setCustomBackendUrl(customUrl);
    setShowConfigModal(false);
    window.location.reload();
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Pinging health endpoint...');
    try {
      const target = customUrl ? `${customUrl.trim().replace(/\/+$/, '')}/api/health` : '/api/health';
      const res = await fetch(target);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTestStatus('success');
      setTestMessage(`Connected successfully! Server Timezone: ${data.timezone || 'UTC'}`);
    } catch (e) {
      setTestStatus('failed');
      setTestMessage(`Connection failed: ${e.message}. Please check backend status.`);
    }
  };

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
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Backend connection pill */}
            <button
              onClick={() => setShowConfigModal(true)}
              title="Click to view or configure Backend API URL"
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold hidden sm:inline">
                {isConnected ? 'Backend Online' : 'Connecting Backend...'}
              </span>
              <Settings className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Timezone badge */}
            <div className="hidden lg:flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700">
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

      {/* Backend Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-base">Backend Connection Settings</h3>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Connection Status:</p>
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="font-medium text-slate-900">
                    {isConnected 
                      ? 'Connected to Live Express / Database Service' 
                      : 'Backend Not Detected at Current URL'}
                  </span>
                </div>
                {!isConnected && (
                  <p className="text-amber-800 pt-1">
                    If your backend is deployed on Render or Railway, paste its URL below or set VITE_API_URL in your Vercel Project Settings.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom Backend API URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://my-backend.onrender.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Overrides default API endpoint. Saved in your browser's local storage.
                </p>
              </div>

              {testStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  testStatus === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : testStatus === 'failed'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {testStatus === 'failed' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{testMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Test Connection
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUrl('');
                      setCustomBackendUrl('');
                      setShowConfigModal(false);
                      window.location.reload();
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20 transition-all"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
