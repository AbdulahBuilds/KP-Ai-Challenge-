import React from 'react';
import {
  Menu,
  Bell,
  RefreshCw,
  Volume2,
  VolumeX,
  Hospital,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';

/**
 * Modern Clinical TopNav:
 * - Clean white background (#FFFFFF)
 * - Spacious layout that never wraps or squishes
 * - Portal & page title with facility indicator
 * - Live sync indicator
 * - Emergency sound toggle
 * - Telemetry refresh with spinner
 * - Notification bell with badge
 * - Staff user profile chip
 */
export default function TopNav({
  activeTabTitle,
  hospital,
  currentUser,
  onRefresh,
  isRefreshing = false,
  onOpenMobileMenu,
  activeAlertsCount = 0,
  pendingReferralsCount = 0,
  soundEnabled = true,
  onToggleSound,
  surgeStatus,
  lastSyncTime,
}) {
  const totalNotifications = activeAlertsCount + pendingReferralsCount;

  // Cleanly parse staff name and title
  const rawName = currentUser?.name || 'Hospital Staff';
  const roleMatch = rawName.match(/\(([^)]+)\)/);
  const staffName = roleMatch ? rawName.replace(/\s*\([^)]*\)/, '').trim() : rawName;
  const staffRole = roleMatch ? roleMatch[1] : (currentUser?.role || 'Staff');
  const hospitalDisplay = hospital?.name || 'KPK Hospital';

  // Compute avatar initials
  const initials = staffName
    ? staffName.replace('Dr. ', '').trim().charAt(0)
    : 'H';

  return (
    <header className="h-16 bg-white border-b border-surface-border sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Page Title / Breadcrumbs */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-typography-secondary hover:text-typography-primary hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-sm min-w-0">
          <span className="text-typography-secondary hidden md:inline font-medium text-xs uppercase tracking-wider">
            KPK HEALTH NETWORK
          </span>
          <span className="text-slate-300 hidden md:inline">/</span>
          <h2 className="font-bold text-typography-primary text-base sm:text-lg truncate">
            {activeTabTitle}
          </h2>
        </div>
      </div>

      {/* Right: Hospital Status, Audio, Refresh, Notifications, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        {/* Hospital Surge Code Status Pill */}
        <div className="hidden sm:flex items-center">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              surgeStatus?.badgeClass || 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                surgeStatus?.dotClass || 'bg-emerald-500 animate-pulse'
              }`}
            ></span>
            <span>{surgeStatus?.label || 'ED: NORMAL (CODE GREEN)'}</span>
          </div>
        </div>

        {/* Live Background Sync Telemetry Pill */}
        <div
          className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200"
          title={`Live telemetry syncing. Last updated ${lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'now'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Sync</span>
        </div>

        {/* Audio Alert Toggle */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Emergency Sirens: Enabled" : "Emergency Sirens: Muted"}
            className={`p-2 rounded-lg transition-colors border ${
              soundEnabled
                ? 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100'
                : 'text-slate-400 bg-white border-slate-200 hover:text-slate-600'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-teal-700" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}

        {/* Telemetry Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Hospital Telemetry & Capacity"
            disabled={isRefreshing}
            className="p-2 rounded-lg text-typography-secondary hover:text-brand-primary hover:bg-slate-50 transition-colors border border-surface-border"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
          </button>
        )}

        {/* Notifications Icon with Badge */}
        <div className="relative">
          <button
            className="p-2 rounded-lg text-typography-secondary hover:text-typography-primary hover:bg-slate-50 transition-colors border border-surface-border relative"
            title={`${totalNotifications} active hospital notices`}
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-emergency-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                {totalNotifications}
              </span>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-surface-border hidden sm:block" />

        {/* User / Doctor Profile Pill */}
        <div className="flex items-center gap-2.5 pl-1.5 sm:px-2.5 py-1 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50/80 transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
            {initials}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-typography-primary leading-tight truncate max-w-[130px]">
              {staffName}
            </div>
            <div className="text-[10px] text-typography-secondary leading-tight font-medium mt-0.5 whitespace-nowrap">
              {staffRole} • {hospitalDisplay.split('(')[0].trim()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
