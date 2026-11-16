import React from 'react';
import {
  Activity,
  Bed,
  FileText,
  Siren,
  Hospital,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

/**
 * Modern Clinical Sidebar (Light Theme / Clean Background):
 * - White background (#FFFFFF) with subtle border (#E2E8F0)
 * - Crisp slate typography (high readability)
 * - Clear Lucide icons with subtle clinical tints
 * - Connected facility indicator with clean dropdown selector
 * - Categorized navigation links
 * - Telemetry sync status & secure logout
 */
export default function Sidebar({
  activeTab,
  setActiveTab,
  pendingReferralsCount = 0,
  activeAlertsCount = 0,
  hospital,
  onLogout,
  isOpen,
  onClose,
  onSwitchHospital,
}) {
  const navSections = [
    {
      title: 'Clinical Command',
      items: [
        {
          id: 'dashboard',
          label: 'Hospital Dashboard',
          icon: Activity,
        },
        {
          id: 'resources',
          label: 'Resource Management',
          icon: Bed,
        },
      ]
    },
    {
      title: 'Triage & Inbound',
      items: [
        {
          id: 'referrals',
          label: 'BHU Referrals',
          icon: FileText,
          badge: pendingReferralsCount > 0 ? (
            <span className="ml-auto bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {pendingReferralsCount}
            </span>
          ) : null,
        },
        {
          id: 'emergency',
          label: 'Rescue 1122 Alerts',
          icon: Siren,
          badge: activeAlertsCount > 0 ? (
            <span className="ml-auto bg-emergency-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              {activeAlertsCount} Inbound
            </span>
          ) : null,
        },
      ]
    },
    {
      title: 'Facility Administration',
      items: [
        {
          id: 'profile',
          label: 'Hospital Profile',
          icon: Hospital,
        },
        {
          id: 'settings',
          label: 'System & AI Settings',
          icon: Settings,
        },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Panel - Light Clean Background */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-surface-border flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-lg lg:shadow-none`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Top Brand Header */}
          <div className="h-16 px-4 border-b border-surface-border flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold shadow-xs">
                <Hospital className="w-5 h-5 text-teal-300" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] tracking-widest uppercase font-bold text-teal-700 flex items-center gap-1">
                  <span>KPK HEALTHCARE</span>
                </div>
                <div className="text-sm font-bold text-typography-primary flex items-center gap-1.5">
                  Hospital Portal
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categorized Navigation Links */}
          <nav className="px-3.5 py-1 space-y-4">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (onClose) onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left group ${
                        isActive
                          ? 'bg-brand-50 text-brand-primary font-bold shadow-2xs border-l-4 border-brand-primary pl-2'
                          : 'text-slate-600 hover:text-typography-primary hover:bg-slate-100/70'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'text-brand-primary' : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Telemetry status & Logout */}
        <div className="p-3.5 border-t border-surface-border bg-slate-50/50 space-y-2">
          {/* Telemetry live status */}
          <div className="px-2 py-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>AI Triage Active</span>
            </span>
            <span className="text-[10px] bg-slate-200/70 text-slate-700 font-mono px-1.5 py-0.5 rounded font-semibold">
              v1.0 KPK
            </span>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors border border-rose-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
