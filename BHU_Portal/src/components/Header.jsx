import React from 'react';
import {
  Building2,
  Stethoscope,
  Activity,
  FilePlus,
  FileText,
  Wifi,
  WifiOff,
  ChevronDown,
  ExternalLink,
  Hospital,
  Siren
} from 'lucide-react';
import { DEFAULT_BHUS } from '@/lib/mockData';

export default function Header({
  activeTab,
  setActiveTab,
  selectedBHU,
  setSelectedBHU,
  isGridOnline,
  referralsCount = 0,
  pendingCount = 0
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner: Facility, Telemetry Status & Cross-Portal Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Branding & Facility Selector */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  KPK Health Department
                </span>
                <span className="text-xs text-slate-400">• Primary Referral Node</span>
              </div>
              <div className="relative mt-0.5">
                <select
                  value={selectedBHU.id}
                  onChange={(e) => {
                    const found = DEFAULT_BHUS.find(b => b.id === e.target.value);
                    if (found) setSelectedBHU(found);
                  }}
                  className="appearance-none font-bold text-slate-900 text-base md:text-lg bg-transparent pr-7 py-0.5 cursor-pointer focus:outline-hidden hover:text-teal-700 transition-colors"
                >
                  {DEFAULT_BHUS.map((bhu) => (
                    <option key={bhu.id} value={bhu.id} className="text-slate-900">
                      {bhu.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right: Cross-Portal Links, Doctor on Duty & Grid Telemetry */}
          <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto flex-wrap">
            
            {/* Quick Cross-Portal Switchers */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5">Network:</span>
              <a
                href="/hospital"
                className="flex items-center gap-1 px-2 py-1 rounded bg-white text-slate-700 hover:text-teal-700 shadow-2xs font-semibold hover:bg-slate-50 transition-colors"
                title="Switch to Government Hospital Portal"
              >
                <span>🏥 Hospital</span>
              </a>
              <a
                href="/rescue"
                className="flex items-center gap-1 px-2 py-1 rounded bg-white text-slate-700 hover:text-red-700 shadow-2xs font-semibold hover:bg-slate-50 transition-colors"
                title="Switch to Rescue 1122 CAD Portal"
              >
                <span>🚑 Rescue 1122</span>
              </a>
            </div>

            {/* Doctor Info */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <div>
                <div className="font-semibold text-slate-800">{selectedBHU.doctorName}</div>
                <div className="text-[10px] text-slate-500">{selectedBHU.unionCouncil}</div>
              </div>
            </div>

            {/* Health Grid Online/Offline Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                isGridOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={isGridOnline ? 'Hospital Portal Connected on Port 3000' : 'Operating in Standby Mode (Local Sync)'}
            >
              {isGridOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden xs:inline">Hospital Grid:</span>
                  <span className="font-semibold">Live Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="hidden xs:inline">Grid:</span>
                  <span className="font-semibold">Local Standby</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary 2-Tab Navigation Bar */}
      <div className="border-t border-slate-100 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-3 -mb-px">
            
            {/* Tab 1: New Patient Referral */}
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'new'
                  ? 'border-teal-600 text-teal-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <FilePlus className="w-4 h-4" />
              <span>+ New Patient Referral</span>
            </button>

            {/* Tab 2: Sent Referrals & Slips */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'history'
                  ? 'border-teal-600 text-teal-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Sent Referrals & Slips</span>
              {referralsCount > 0 && (
                <span
                  className={`ml-1 text-xs px-2 py-0.2 rounded-full font-bold ${
                    pendingCount > 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {referralsCount}
                </span>
              )}
            </button>

          </nav>
        </div>
      </div>
    </header>
  );
}
