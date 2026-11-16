'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Hospital, Activity, Users, Siren, ShieldCheck, Settings,
  LogOut, Bed, Droplets, Stethoscope, AlertTriangle, CheckCircle2,
  XCircle, Clock, Phone, MapPin, RefreshCw, Check, X,
  FileText, Award, Bell, Eye, ArrowUpRight, Sparkles, Brain, ShieldAlert,
  ChevronRight, Building2, Package, HeartPulse, Search, Plus, Minus,
  Filter, ArrowRight, Gauge, CheckSquare, AlertCircle, Volume2, VolumeX,
  Heart, Thermometer, Wind, Ambulance
} from 'lucide-react';

// Reusable Design System Components
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import PageHeader from '../components/ui/PageHeader';

// Layout Components
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';

export default function HospitalPortal() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('staff@lrh.gov.pk');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Navigation Tab & Mobile Sidebar State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, resources, referrals, emergency, profile, settings
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search terms for Referrals and Emergency Alerts
  const [referralSearchTerm, setReferralSearchTerm] = useState('');

  // Resource Management Sub-Tab
  const [resourceSubTab, setResourceSubTab] = useState('beds'); // beds, blood, equipment, specialists, services
  const [resourceData, setResourceData] = useState(null);
  const [isSavingResources, setIsSavingResources] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Referrals State
  const [referrals, setReferrals] = useState([]);
  const [referralFilter, setReferralFilter] = useState('ALL'); // ALL, PENDING, ACCEPTED, DECLINED
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [declineReason, setDeclineReason] = useState('No ICU beds available');
  const [declineNotes, setDeclineNotes] = useState('');
  const [reconfirmCheckboxes, setReconfirmCheckboxes] = useState({
    bed: true,
    specialist: true,
    service: true
  });
  const [isProcessingReferral, setIsProcessingReferral] = useState(false);

  // Emergency Alerts State (Rescue 1122)
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [aiTraumaAdvice, setAiTraumaAdvice] = useState(null);
  const [confirmEmergencyFacilities, setConfirmEmergencyFacilities] = useState({
    traumaBay: true,
    ventilator: true,
    bloodBank: true
  });
  const [assignedBay, setAssignedBay] = useState('Trauma Bay 1 (Resuscitation)');
  const [isProcessingAlert, setIsProcessingAlert] = useState(false);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notification audio toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Auto-login default user on mount (LRH Peshawar) for instant review
  useEffect(() => {
    handleLogin('staff@lrh.gov.pk', 'password123');
  }, []);

  async function handleLogin(email, pass) {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password: pass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setHospital(data.hospital);
        setResourceData(JSON.parse(JSON.stringify(data.hospital.resources)));
        setProfileForm({
          name: data.hospital.name,
          phone: data.hospital.phone,
          emergencyPhone: data.hospital.emergencyPhone,
          address: data.hospital.address,
          adminName: data.hospital.adminName
        });
        loadHospitalData(data.hospital.id);
      } else {
        setLoginError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setLoginError('Network error connecting to hospital API.');
    } finally {
      setIsLoggingIn(false);
      setLoading(false);
    }
  }

  async function loadHospitalData(hospitalId) {
    setIsRefreshing(true);
    try {
      // 1. Fetch Hospital
      const hRes = await fetch(`/api/hospitals/${hospitalId}`);
      const hData = await hRes.json();
      if (hData.success) {
        setHospital(hData.hospital);
        setResourceData(JSON.parse(JSON.stringify(hData.hospital.resources)));
      }

      // 2. Fetch Referrals
      const refRes = await fetch(`/api/referrals?hospitalId=${hospitalId}`);
      const refData = await refRes.json();
      if (refData.success) {
        setReferrals(refData.referrals);
      }

      // 3. Fetch Emergency Alerts
      const emRes = await fetch(`/api/emergency-alerts?hospitalId=${hospitalId}`);
      const emData = await emRes.json();
      if (emData.success) {
        setEmergencyAlerts(emData.alerts);
      }
    } catch (e) {
      console.error('Error refreshing hospital data:', e);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setHospital(null);
    setActiveTab('dashboard');
  }

  // Quick switch facility helper for fast evaluation
  function handleQuickSwitch(email) {
    handleLogin(email, 'password123');
  }

  // Load AI Triage when opening a referral
  async function openReferralDetails(ref) {
    setSelectedReferral(ref);
    setAiAnalysis(null);
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'referral',
          referral: ref,
          hospitalId: hospital.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiAnalysis(data.aiAnalysis);
      }
    } catch (err) {
      console.error("AI analysis error:", err);
    } finally {
      setIsLoadingAI(false);
    }
  }

  // Load AI Trauma advice when opening an emergency alert
  async function openEmergencyAlert(alert) {
    setSelectedAlert(alert);
    setAiTraumaAdvice(null);
    try {
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'emergency',
          alert,
          hospitalId: hospital.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiTraumaAdvice(data.aiAdvice);
      }
    } catch (err) {
      console.error("AI emergency advice error:", err);
    }
  }

  // Save Resources to Database
  async function handleSaveResources(customData = null) {
    if (!hospital) return;
    const toSave = customData || resourceData;
    if (!toSave) return;

    setIsSavingResources(true);
    setSaveSuccessMsg('');
    try {
      const res = await fetch('/api/resources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospital.id,
          resources: toSave
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('All hospital resources and verification timestamps updated successfully!');
        loadHospitalData(hospital.id);
        setTimeout(() => setSaveSuccessMsg(''), 4500);
      }
    } catch (err) {
      alert('Failed to save resources to database.');
    } finally {
      setIsSavingResources(false);
    }
  }

  // One-click Re-verify All Resources (clears outdated status instantly)
  async function handleReverifyAllNow() {
    if (!resourceData || !hospital) return;
    const nowIso = new Date().toISOString();
    const updated = {
      ...resourceData,
      lastOverallUpdate: nowIso,
      beds: { ...resourceData.beds, updatedAt: nowIso },
      bloodStock: { ...resourceData.bloodStock, updatedAt: nowIso },
      equipment: { ...resourceData.equipment, updatedAt: nowIso },
      specialists: { ...resourceData.specialists, updatedAt: nowIso },
      services: { ...resourceData.services, updatedAt: nowIso },
    };
    setResourceData(updated);
    await handleSaveResources(updated);
  }

  // Accept or Decline Referral
  async function handleReferralAction(status) {
    if (!selectedReferral) return;
    setIsProcessingReferral(true);
    try {
      const payload = {
        status,
        declineReason: status === 'DECLINED' ? (declineNotes ? `${declineReason}: ${declineNotes}` : declineReason) : null,
        reconfirmedResources: status === 'ACCEPTED' ? [
          reconfirmCheckboxes.bed ? "Bed / ICU Capacity Re-confirmed" : null,
          reconfirmCheckboxes.specialist ? "Specialist Doctor Availability Re-confirmed" : null,
          reconfirmCheckboxes.service ? "Diagnostic & OT Services Ready" : null
        ].filter(Boolean) : []
      };

      const res = await fetch(`/api/referrals/${selectedReferral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSelectedReferral(null);
        loadHospitalData(hospital.id);
      } else {
        alert(data.error || 'Failed to update referral');
      }
    } catch (err) {
      alert('Error updating referral');
    } finally {
      setIsProcessingReferral(false);
    }
  }

  // Acknowledge Emergency Alert from Rescue 1122
  async function handleAcknowledgeAlert() {
    if (!selectedAlert) return;
    setIsProcessingAlert(true);
    try {
      const confirmed = [];
      if (confirmEmergencyFacilities.traumaBay) confirmed.push(assignedBay);
      if (confirmEmergencyFacilities.ventilator) confirmed.push("Ventilator & Rapid Airway Team Prepared");
      if (confirmEmergencyFacilities.bloodBank) confirmed.push("Emergency Blood Reserved");

      const res = await fetch(`/api/emergency-alerts/${selectedAlert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'FACILITIES_CONFIRMED',
          confirmedFacilities: confirmed
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAlert(null);
        loadHospitalData(hospital.id);
      }
    } catch (err) {
      alert('Error acknowledging emergency alert');
    } finally {
      setIsProcessingAlert(false);
    }
  }

  // Check data staleness (> 12 hours is OUTDATED per design specification)
  const lastUpdateTime = hospital?.resources?.lastOverallUpdate ? new Date(hospital.resources.lastOverallUpdate) : null;
  const hoursSinceUpdate = lastUpdateTime ? Math.round(((Date.now() - lastUpdateTime.getTime()) / (1000 * 60 * 60)) * 10) / 10 : 0;
  const isDataOutdated = hoursSinceUpdate > 12;

  // Key KPI metrics calculations
  const totalGeneralBeds = resourceData?.beds?.total || 1;
  const availableBeds = resourceData?.beds?.available || 0;
  const occupiedBeds = resourceData?.beds?.occupied || 0;
  const bedOccupancyRate = Math.round((occupiedBeds / totalGeneralBeds) * 100);

  const totalIcuBeds = resourceData?.beds?.icuTotal || 1;
  const availableIcuBeds = resourceData?.beds?.icuAvailable || 0;
  const icuOccupied = Math.max(0, totalIcuBeds - availableIcuBeds);
  const icuOccupancyRate = Math.round((icuOccupied / totalIcuBeds) * 100);

  const pendingReferralsCount = referrals.filter(r => r.status === 'PENDING').length;
  const acceptedReferralsCount = referrals.filter(r => r.status === 'ACCEPTED').length;
  const activeAlerts = emergencyAlerts.filter(a => a.status === 'ALERT_RECEIVED');
  const activeAlertsCount = activeAlerts.length;

  // Filtered referrals list with search
  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      const matchesFilter = referralFilter === 'ALL' || r.status === referralFilter;
      const matchesSearch = !referralSearchTerm ||
        r.patientName.toLowerCase().includes(referralSearchTerm.toLowerCase()) ||
        r.referringBHU.toLowerCase().includes(referralSearchTerm.toLowerCase()) ||
        r.symptoms.toLowerCase().includes(referralSearchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(referralSearchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [referrals, referralFilter, referralSearchTerm]);

  // Tab Titles
  const tabTitles = {
    dashboard: 'Hospital Dashboard',
    resources: 'Resource Management',
    referrals: 'Incoming Referrals',
    emergency: 'Rescue 1122 Alerts',
    profile: 'Hospital Profile',
    settings: 'Settings',
  };

  const staffGreeting = currentUser?.name ? currentUser.name.replace(/\s*\([^)]*\)/, '').trim() : 'Staff';

  // -------------------------------------------------------------
  // 1. CLEAN HEALTHCARE LOGIN SCREEN
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-surface-main flex flex-col justify-center items-center px-4 py-12 relative">
        <div className="max-w-md w-full bg-white rounded-xl border border-surface-border p-8 shadow-card">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-brand-primary text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Hospital className="w-7 h-7 text-teal-300" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Government of Khyber Pakhtunkhwa</span>
            </div>
            <h1 className="text-2xl font-bold text-typography-primary tracking-tight">Hospital Portal</h1>
            <p className="text-xs text-typography-secondary mt-1">
              AI-Powered Healthcare Coordination & Intelligent Referral System
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-status-declined/20 text-status-declined text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(loginEmail, loginPassword); }} className="space-y-4">
            <Input
              label="Authorized Staff Email"
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="staff@lrh.gov.pk"
            />
            <Input
              label="Staff Password"
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoggingIn}
              className="w-full"
            >
              Sign In to Hospital Portal
            </Button>
          </form>

          {/* Quick Demo Hospital Switcher */}
          <div className="mt-7 pt-5 border-t border-surface-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-typography-secondary uppercase tracking-wider">
                Instant Facility Demo
              </span>
              <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">1-Click Test</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setLoginEmail('staff@lrh.gov.pk'); setLoginPassword('password123'); handleLogin('staff@lrh.gov.pk', 'password123'); }}
                className="p-2.5 rounded-lg bg-surface-main hover:bg-slate-100 border border-surface-border text-left transition-all"
              >
                <div className="font-semibold text-brand-primary">LRH Peshawar</div>
                <div className="text-[11px] text-typography-secondary">Tertiary Hospital</div>
              </button>
              <button
                type="button"
                onClick={() => { setLoginEmail('staff@hmc.gov.pk'); setLoginPassword('password123'); handleLogin('staff@hmc.gov.pk', 'password123'); }}
                className="p-2.5 rounded-lg bg-surface-main hover:bg-slate-100 border border-surface-border text-left transition-all"
              >
                <div className="font-semibold text-brand-primary">HMC Peshawar</div>
                <div className="text-[11px] text-typography-secondary">Tertiary Hospital</div>
              </button>
              <button
                type="button"
                onClick={() => { setLoginEmail('staff@ath.gov.pk'); setLoginPassword('password123'); handleLogin('staff@ath.gov.pk', 'password123'); }}
                className="p-2.5 rounded-lg bg-amber-50 hover:bg-amber-100/60 border border-amber-200 text-left transition-all"
              >
                <div className="font-semibold text-amber-800">ATH Abbottabad</div>
                <div className="text-[11px] text-amber-700/80 font-medium">Outdated Demo</div>
              </button>
              <button
                type="button"
                onClick={() => { setLoginEmail('staff@dhqmardan.gov.pk'); setLoginPassword('password123'); handleLogin('staff@dhqmardan.gov.pk', 'password123'); }}
                className="p-2.5 rounded-lg bg-surface-main hover:bg-slate-100 border border-surface-border text-left transition-all"
              >
                <div className="font-semibold text-brand-primary">DHQ Mardan</div>
                <div className="text-[11px] text-typography-secondary">District Hospital</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. MAIN LOGGED-IN CLINICAL PORTAL SHELL
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-surface-main flex font-sans">
      {/* Sidebar: Dark Healthcare Blue (#164E78) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingReferralsCount={pendingReferralsCount}
        activeAlertsCount={activeAlertsCount}
        hospital={hospital}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onSwitchHospital={handleQuickSwitch}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navigation */}
        <TopNav
          activeTabTitle={tabTitles[activeTab] || 'Dashboard'}
          hospital={hospital}
          currentUser={currentUser}
          onRefresh={() => hospital && loadHospitalData(hospital.id)}
          isRefreshing={isRefreshing}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          activeAlertsCount={activeAlertsCount}
          pendingReferralsCount={pendingReferralsCount}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
        />

        {/* Staleness / Outdated Warning Notice Banner */}
        {isDataOutdated && (
          <div className="bg-amber-50 border-b border-amber-200 text-typography-primary px-4 sm:px-6 py-2.5 text-xs sm:text-sm">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Outdated Status Notice:</strong> Hospital capacity was last confirmed {hoursSinceUpdate} hours ago. Per safety regulations, unconfirmed resources are flagged as "Unverified" to Rescue 1122 and BHU doctors.
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReverifyAllNow}
                className="self-start sm:self-auto text-xs whitespace-nowrap"
              >
                Re-Verify All Resources Now
              </Button>
            </div>
          </div>
        )}

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">

          {/* =========================================================
              TAB 1: HOSPITAL DASHBOARD
              ========================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Emergency Radar Inbound Alert Banner (Appears when active Rescue 1122 cases exist) */}
              {activeAlertsCount > 0 && (
                <div className="p-4 sm:p-5 rounded-xl bg-rose-50 border border-rose-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-emergency-beacon">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emergency-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                      <Siren className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-emergency-700 bg-rose-100 px-2 py-0.5 rounded">
                          Rescue 1122 Inbound Trauma Alert
                        </span>
                        <span className="text-xs font-bold text-emergency-800">
                          ETA: {activeAlerts[0]?.etaMinutes || 8} mins • Ambulance {activeAlerts[0]?.ambulanceId}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        {activeAlerts[0]?.emergencyType}: {activeAlerts[0]?.vitals}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      icon={Siren}
                      onClick={() => openEmergencyAlert(activeAlerts[0])}
                    >
                      Mobilize Trauma Bay & Transmit
                    </Button>
                  </div>
                </div>
              )}

              {/* Header */}
              <PageHeader
                title="Hospital Operations Dashboard"
                subtitle={`Welcome back, ${staffGreeting}. Real-time ward capacity, incoming BHU referrals, and pre-arrival trauma radar.`}
                badge={
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{hospital?.type || 'Government Hospital'} • {hospital?.district}</span>
                  </span>
                }
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RefreshCw}
                      isLoading={isRefreshing}
                      onClick={() => hospital && loadHospitalData(hospital.id)}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Bed}
                      onClick={() => setActiveTab('resources')}
                    >
                      Update Resources
                    </Button>
                  </div>
                }
              />

              {/* Fluid, Non-Breaking Clinical KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatCard
                  title="Available General Beds"
                  value={availableBeds}
                  subtitle={
                    <span>
                      Occupancy: <strong className="text-typography-primary">{bedOccupancyRate}%</strong> ({occupiedBeds} occ)
                    </span>
                  }
                  progress={bedOccupancyRate}
                  progressColor={bedOccupancyRate > 85 ? "bg-amber-500" : "bg-emerald-500"}
                  icon={Bed}
                  variant="success"
                  onClick={() => { setActiveTab('resources'); setResourceSubTab('beds'); }}
                />

                <StatCard
                  title="Available ICU Beds"
                  value={availableIcuBeds}
                  subtitle={
                    <span>
                      ICU Surge: <strong className={availableIcuBeds <= 2 ? "text-rose-600 font-bold" : "text-typography-primary"}>{icuOccupancyRate}%</strong>
                    </span>
                  }
                  progress={icuOccupancyRate}
                  progressColor={icuOccupancyRate > 80 ? "bg-rose-600" : "bg-emerald-500"}
                  icon={Activity}
                  variant={availableIcuBeds <= 2 ? "critical" : "default"}
                  onClick={() => { setActiveTab('resources'); setResourceSubTab('beds'); }}
                />

                <StatCard
                  title="Pending Referrals"
                  value={pendingReferralsCount}
                  subtitle="Awaiting doctor review"
                  trend={pendingReferralsCount > 0 ? "Action Required" : "Up to date"}
                  icon={Users}
                  variant={pendingReferralsCount > 0 ? "warning" : "default"}
                  onClick={() => setActiveTab('referrals')}
                />

                <StatCard
                  title="Accepted Referrals"
                  value={acceptedReferralsCount}
                  subtitle="En route or admitted"
                  icon={CheckCircle2}
                  variant="success"
                  onClick={() => setActiveTab('referrals')}
                />

                <StatCard
                  title="1122 Pre-Arrivals"
                  value={activeAlertsCount}
                  subtitle={activeAlertsCount > 0 ? "Ambulances inbound" : "Clear radar"}
                  trend={activeAlertsCount > 0 ? "URGENT" : "Ready"}
                  icon={Siren}
                  variant={activeAlertsCount > 0 ? "critical" : "default"}
                  onClick={() => setActiveTab('emergency')}
                />
              </div>

              {/* Resource Verification Guarantee Bar */}
              <div className="bg-white rounded-xl border border-surface-border p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-100 flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-typography-secondary font-semibold uppercase tracking-wider">
                      Resource Verification Guarantee
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-typography-primary flex items-center gap-2">
                      <span>Last Confirmed: {lastUpdateTime ? `${hoursSinceUpdate}h ago (${lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : "Never"}</span>
                      {isDataOutdated ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          OUTDATED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          VERIFIED
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleReverifyAllNow}
                    isLoading={isSavingResources}
                  >
                    Confirm All Verified Now
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('referrals')}
                  >
                    Review Referrals ({pendingReferralsCount})
                  </Button>
                  <Button
                    variant={activeAlertsCount > 0 ? "destructive" : "secondary"}
                    size="sm"
                    onClick={() => setActiveTab('emergency')}
                  >
                    1122 Alerts ({activeAlertsCount})
                  </Button>
                </div>
              </div>

              {/* Recent Feeds: BHU Referrals & Rescue 1122 Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Incoming BHU Referrals Feed */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Users className="w-4 h-4 text-brand-primary" />
                        <span>Incoming BHU Patient Referrals</span>
                      </CardTitle>
                      <CardDescription>Patients dispatched from rural & basic health units</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('referrals')}
                    >
                      View All ({referrals.length})
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-3">
                    {referrals.slice(0, 3).length === 0 ? (
                      <p className="text-xs text-typography-secondary py-6 text-center">No incoming patient referrals received yet.</p>
                    ) : (
                      referrals.slice(0, 3).map(ref => (
                        <div
                          key={ref.id}
                          className="p-3.5 rounded-xl border border-surface-border hover:border-brand-primary/40 bg-white hover:bg-slate-50/50 flex items-center justify-between transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-typography-primary">{ref.patientName}</span>
                              <span className="text-[11px] text-typography-secondary font-mono">({ref.age}y, {ref.gender})</span>
                              <StatusBadge status={ref.status} size="xs" />
                            </div>
                            <div className="text-[11px] text-typography-secondary mt-1">
                              From: <strong className="text-typography-primary">{ref.referringBHU}</strong> • Dr. {ref.bhuDoctorName}
                            </div>
                            <div className="text-[11px] text-typography-secondary truncate max-w-xs sm:max-w-sm mt-0.5">
                              {ref.symptoms}
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Sparkles}
                            onClick={() => openReferralDetails(ref)}
                          >
                            Review
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recent Rescue 1122 Alerts Feed */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Siren className="w-4 h-4 text-emergency-600" />
                        <span>Rescue 1122 Emergency Alerts</span>
                      </CardTitle>
                      <CardDescription>Pre-arrival trauma alerts from inbound 1122 ambulances</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('emergency')}
                    >
                      View All ({emergencyAlerts.length})
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-3">
                    {emergencyAlerts.slice(0, 3).length === 0 ? (
                      <p className="text-xs text-typography-secondary py-6 text-center">No active pre-arrival alerts from Rescue 1122.</p>
                    ) : (
                      emergencyAlerts.slice(0, 3).map(alert => (
                        <div
                          key={alert.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            alert.status === 'ALERT_RECEIVED'
                              ? 'bg-rose-50/40 border-rose-200'
                              : 'bg-white border-surface-border'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-typography-primary">{alert.emergencyType}</span>
                              <StatusBadge
                                status={alert.status === 'ALERT_RECEIVED' ? 'CRITICAL' : 'ACCEPTED'}
                                label={alert.status === 'ALERT_RECEIVED' ? 'Inbound' : 'Bay Ready'}
                                size="xs"
                              />
                            </div>
                            <div className="text-[11px] text-typography-secondary mt-1">
                              Ambulance: <strong className="text-typography-primary">{alert.ambulanceId}</strong> • ETA: <span className="text-emergency-600 font-bold">{alert.etaMinutes} mins</span>
                            </div>
                            <div className="text-[11px] text-typography-secondary mt-0.5 truncate max-w-xs">
                              Required: {alert.requiredFacilities.join(', ')}
                            </div>
                          </div>
                          <Button
                            variant={alert.status === 'ALERT_RECEIVED' ? 'destructive' : 'secondary'}
                            size="sm"
                            onClick={() => openEmergencyAlert(alert)}
                          >
                            Respond
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: RESOURCE MANAGEMENT (CLEAN, SPACIOUS, NEVER-BREAKING)
              ========================================================= */}
          {activeTab === 'resources' && resourceData && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Hospital Resource Management Console</CardTitle>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      LIVE INVENTORY
                    </span>
                  </div>
                  <CardDescription>
                    Update real-time ward capacity, blood stocks, diagnostic units, and clinician rosters.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {saveSuccessMsg && (
                    <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      {saveSuccessMsg}
                    </span>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReverifyAllNow}
                    isLoading={isSavingResources}
                  >
                    Verify All Now
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    isLoading={isSavingResources}
                    onClick={() => handleSaveResources()}
                  >
                    Save All Changes
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Clean Sub-Tabs */}
                <div className="flex space-x-2 border-b border-surface-border pb-3 text-xs font-semibold overflow-x-auto">
                  {[
                    { id: 'beds', label: '1. Beds & Critical Care Wards', icon: Bed },
                    { id: 'blood', label: '2. Blood Bank Matrix', icon: Droplets },
                    { id: 'equipment', label: '3. Medical Equipment', icon: HeartPulse },
                    { id: 'specialists', label: '4. Specialist Clinicians', icon: Stethoscope },
                    { id: 'services', label: '5. Hospital Services & Units', icon: Building2 },
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setResourceSubTab(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
                          resourceSubTab === tab.id
                            ? 'bg-brand-primary text-white shadow-xs font-semibold'
                            : 'text-typography-secondary hover:text-typography-primary hover:bg-slate-100'
                        }`}
                      >
                        <TabIcon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SUB-TAB 1: BEDS MANAGEMENT */}
                {resourceSubTab === 'beds' && (
                  <div className="space-y-6">
                    {/* Capacity Overview Bar */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Gauge className="w-4 h-4 text-brand-primary" />
                          <span>General Inpatient Capacity Gauge</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {availableBeds} Available / {totalGeneralBeds} Total Beds ({bedOccupancyRate}% Occupied)
                        </div>
                      </div>
                      <div className="w-full md:max-w-md">
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              bedOccupancyRate > 90 ? 'bg-rose-600' : bedOccupancyRate > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, bedOccupancyRate))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
                          <span>0 Beds</span>
                          <span>Safe &lt; 85%</span>
                          <span>{totalGeneralBeds} Beds Full</span>
                        </div>
                      </div>
                    </div>

                    {/* Fluid, Non-Breaking Bed Stepper Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {/* Total General Beds */}
                      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-typography-secondary uppercase tracking-wider">Total General Beds</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">CAPACITY</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.max(1, resourceData.beds.total - 1);
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, total: val }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={resourceData.beds.total}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, total: val }
                              });
                            }}
                            className="w-28 h-10 text-center font-bold text-xl text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = resourceData.beds.total + 1;
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, total: val }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.max(1, resourceData.beds.total - 10);
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, total: val }
                              });
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                          >
                            -10
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = resourceData.beds.total + 10;
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, total: val }
                              });
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                          >
                            +10
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 text-center">Total authorized bed capacity for general inpatient wards.</p>
                      </div>

                      {/* Available General Beds */}
                      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Available General Beds</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">AVAILABLE</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.max(0, resourceData.beds.available - 1);
                              setResourceData({
                                ...resourceData,
                                beds: {
                                  ...resourceData.beds,
                                  available: val,
                                  occupied: Math.max(0, resourceData.beds.total - val)
                                }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 flex items-center justify-center font-bold text-emerald-700 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={resourceData.beds.available}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setResourceData({
                                ...resourceData,
                                beds: {
                                  ...resourceData.beds,
                                  available: val,
                                  occupied: Math.max(0, resourceData.beds.total - val)
                                }
                              });
                            }}
                            className="w-28 h-10 text-center font-bold text-xl text-emerald-700 border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.min(resourceData.beds.total, resourceData.beds.available + 1);
                              setResourceData({
                                ...resourceData,
                                beds: {
                                  ...resourceData.beds,
                                  available: val,
                                  occupied: Math.max(0, resourceData.beds.total - val)
                                }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 flex items-center justify-center font-bold text-emerald-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.max(0, resourceData.beds.available - 5);
                              setResourceData({
                                ...resourceData,
                                beds: {
                                  ...resourceData.beds,
                                  available: val,
                                  occupied: Math.max(0, resourceData.beds.total - val)
                                }
                              });
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.min(resourceData.beds.total, resourceData.beds.available + 5);
                              setResourceData({
                                ...resourceData,
                                beds: {
                                  ...resourceData.beds,
                                  available: val,
                                  occupied: Math.max(0, resourceData.beds.total - val)
                                }
                              });
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold"
                          >
                            +5
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-700 text-center">Ready for incoming BHU admissions or elective transfers.</p>
                      </div>

                      {/* Total ICU Beds */}
                      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-typography-secondary uppercase tracking-wider">Total ICU Beds</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">CRITICAL CARE</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.max(1, resourceData.beds.icuTotal - 1);
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, icuTotal: val }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={resourceData.beds.icuTotal}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, icuTotal: val }
                              });
                            }}
                            className="w-28 h-10 text-center font-bold text-xl text-slate-900 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = resourceData.beds.icuTotal + 1;
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, icuTotal: val }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 text-center">Equipped with invasive monitoring and dedicated ventilators.</p>
                      </div>

                      {/* Available ICU Beds */}
                      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Available ICU Beds</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            resourceData.beds.icuAvailable <= 2 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {resourceData.beds.icuAvailable <= 2 ? 'SURGE ALERT' : 'AVAILABLE'}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-3 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.max(0, resourceData.beds.icuAvailable - 1);
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, icuAvailable: val }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 flex items-center justify-center font-bold text-emerald-700 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={resourceData.beds.icuAvailable}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, icuAvailable: val }
                              });
                            }}
                            className="w-28 h-10 text-center font-bold text-xl text-emerald-700 border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = Math.min(resourceData.beds.icuTotal, resourceData.beds.icuAvailable + 1);
                              setResourceData({
                                ...resourceData,
                                beds: { ...resourceData.beds, icuAvailable: val }
                              });
                            }}
                            className="w-10 h-10 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 flex items-center justify-center font-bold text-emerald-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-700 text-center">Critical availability broadcasted live to Rescue 1122 ambulances.</p>
                      </div>

                      {/* Inpatient Occupied Count Summary */}
                      <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-typography-secondary uppercase tracking-wider">Occupied General Beds</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">INPATIENT</span>
                        </div>
                        <div className="flex items-center justify-center py-2">
                          <span className="text-3xl font-bold text-slate-800">{resourceData.beds.occupied}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 text-center">Automatically balanced when total or available beds adjust.</p>
                      </div>

                      {/* Ward Legend & Safety Standards */}
                      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5">
                        <span className="text-xs font-bold text-typography-secondary uppercase tracking-wider block">Clinical Safety Protocols</span>
                        <div className="text-xs space-y-2 text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span>Direct Admission Ready (&lt; 15 min turnover)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            <span>Sanitization & linen exchange in progress</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                            <span>Reserved for Rescue 1122 active pre-arrival</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: BLOOD BANK INVENTORY MATRIX (CLEAN, TABLE-BASED) */}
                {resourceSubTab === 'blood' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <div>
                        <strong className="text-slate-900 font-bold">KPK Regional Blood Bank Inventory Matrix</strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">Real-time stock of Whole Blood, Packed RBCs, Fresh Frozen Plasma, Platelets, and Cryoprecipitate across all 8 groups.</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 text-rose-800 text-[11px] font-bold">
                          O- Universal Donor
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                          AB+ Universal Recipient
                        </span>
                      </div>
                    </div>

                    {/* Professional, Non-Breaking Blood Bank Table */}
                    <div className="overflow-x-auto rounded-xl border border-surface-border bg-white shadow-xs">
                      <table className="w-full text-left text-xs min-w-[760px]">
                        <thead className="bg-slate-50 border-b border-surface-border text-typography-secondary font-bold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="px-4 py-3">Blood Group</th>
                            <th className="px-3 py-3 text-center">Whole Blood</th>
                            <th className="px-3 py-3 text-center">Packed RBCs</th>
                            <th className="px-3 py-3 text-center">FFP</th>
                            <th className="px-3 py-3 text-center">Platelets</th>
                            <th className="px-3 py-3 text-center">Cryoprecipitate</th>
                            <th className="px-4 py-3 text-center">Total Units</th>
                            <th className="px-4 py-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map(group => {
                            const units = resourceData.bloodStock.units[group] || { wholeBlood: 0, prbc: 0, ffp: 0, platelets: 0, cryoprecipitate: 0 };
                            const totalUnits = (units.wholeBlood || 0) + (units.prbc || 0) + (units.ffp || 0) + (units.platelets || 0) + (units.cryoprecipitate || 0);
                            const isLow = totalUnits < 15;
                            const isUniversal = group === 'O-';

                            return (
                              <tr key={group} className={`hover:bg-slate-50/70 transition-colors ${isUniversal ? 'bg-rose-50/30' : ''}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                      isUniversal ? 'bg-emergency-600 text-white shadow-xs' : 'bg-brand-primary text-white'
                                    }`}>
                                      {group}
                                    </span>
                                    <div>
                                      <div className="font-bold text-slate-900">{group}</div>
                                      {isUniversal && <span className="text-[10px] text-rose-700 font-semibold">Universal</span>}
                                    </div>
                                  </div>
                                </td>

                                {["wholeBlood", "prbc", "ffp", "platelets", "cryoprecipitate"].map(prod => (
                                  <td key={prod} className="px-3 py-3 text-center">
                                    <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const curVal = units[prod] || 0;
                                          const updatedUnits = { ...resourceData.bloodStock.units };
                                          updatedUnits[group] = { ...units, [prod]: Math.max(0, curVal - 1) };
                                          setResourceData({
                                            ...resourceData,
                                            bloodStock: { ...resourceData.bloodStock, units: updatedUnits }
                                          });
                                        }}
                                        className="w-6 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 text-xs font-bold border-r border-slate-200"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        value={units[prod] || 0}
                                        onChange={(e) => {
                                          const val = Math.max(0, Number(e.target.value));
                                          const updatedUnits = { ...resourceData.bloodStock.units };
                                          updatedUnits[group] = { ...units, [prod]: val };
                                          setResourceData({
                                            ...resourceData,
                                            bloodStock: { ...resourceData.bloodStock, units: updatedUnits }
                                          });
                                        }}
                                        className="w-10 h-7 text-center font-bold text-xs bg-transparent focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const curVal = units[prod] || 0;
                                          const updatedUnits = { ...resourceData.bloodStock.units };
                                          updatedUnits[group] = { ...units, [prod]: curVal + 1 };
                                          setResourceData({
                                            ...resourceData,
                                            bloodStock: { ...resourceData.bloodStock, units: updatedUnits }
                                          });
                                        }}
                                        className="w-6 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 text-xs font-bold border-l border-slate-200"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>
                                ))}

                                <td className="px-4 py-3 text-center font-bold text-slate-900">
                                  {totalUnits} units
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {isLow ? 'LOW STOCK' : 'OPTIMAL'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: MEDICAL EQUIPMENT */}
                {resourceSubTab === 'equipment' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[
                      { key: 'ventilators', label: 'Mechanical Ventilators', dept: 'ICU / Trauma Bay', icon: Wind },
                      { key: 'oxygenSupply', label: 'Liquid Oxygen Supply Ports', dept: 'Central Hospital Supply', icon: Activity },
                      { key: 'ecg', label: '12-Lead ECG Machines', dept: 'Cardiology / Emergency', icon: Heart },
                      { key: 'xray', label: 'Digital X-Ray Machines', dept: 'Radiology Block A', icon: ShieldAlert },
                      { key: 'ultrasound', label: 'High-Res Ultrasound', dept: 'OBGYN / Triage', icon: Sparkles },
                      { key: 'ctScan', label: 'Multi-Slice CT Scanner', dept: 'Diagnostic Imaging', icon: Package },
                      { key: 'mri', label: '1.5T MRI System', dept: 'Neuro-Radiology', icon: Brain },
                      { key: 'dialysis', label: 'Hemodialysis Stations', dept: 'Nephrology Ward', icon: Droplets },
                    ].map(eq => {
                      const item = resourceData.equipment[eq.key] || { total: 0, available: 0, status: 'Operational' };
                      const EqIcon = eq.icon;

                      return (
                        <div key={eq.key} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-xs text-typography-primary">{eq.label}</div>
                              <div className="text-[10px] text-slate-400">{eq.dept}</div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
                              <EqIcon className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-emerald-700 block uppercase">Available</label>
                              <input
                                type="number"
                                min="0"
                                value={item.available}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  setResourceData({
                                    ...resourceData,
                                    equipment: {
                                      ...resourceData.equipment,
                                      [eq.key]: { ...item, available: val }
                                    }
                                  });
                                }}
                                className="w-full p-2 border border-emerald-200 bg-emerald-50/50 rounded-lg font-bold text-xs text-emerald-800 text-center focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block uppercase">Total Units</label>
                              <input
                                type="number"
                                min="0"
                                value={item.total}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  setResourceData({
                                    ...resourceData,
                                    equipment: {
                                      ...resourceData.equipment,
                                      [eq.key]: { ...item, total: val }
                                    }
                                  });
                                }}
                                className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg font-bold text-xs text-slate-700 text-center focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-typography-secondary block mb-1 uppercase">Operational State</label>
                            <select
                              value={item.status}
                              onChange={(e) => {
                                setResourceData({
                                  ...resourceData,
                                  equipment: {
                                    ...resourceData.equipment,
                                    [eq.key]: { ...item, status: e.target.value }
                                  }
                                });
                              }}
                              className={`w-full p-2 border rounded-lg text-xs font-semibold focus:outline-none ${
                                item.status === 'Operational' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                item.status === 'Maintenance' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              <option value="Operational">Operational</option>
                              <option value="Maintenance">Under Maintenance</option>
                              <option value="Unavailable">Offline / Fault</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SUB-TAB 4: SPECIALIST CLINICIANS */}
                {resourceSubTab === 'specialists' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[
                      { key: 'cardiologist', label: 'Interventional Cardiologist', dept: 'Cardiology' },
                      { key: 'neurologist', label: 'Consultant Neurologist', dept: 'Neurology' },
                      { key: 'orthopedic', label: 'Orthopedic Trauma Surgeon', dept: 'Orthopedics' },
                      { key: 'generalSurgeon', label: 'Consultant General Surgeon', dept: 'General Surgery' },
                      { key: 'neurosurgeon', label: 'Consultant Neurosurgeon', dept: 'Neurosurgery' },
                      { key: 'gynecologist', label: 'Obstetrician & Gynecologist', dept: 'Maternal Care' },
                      { key: 'pediatrician', label: 'Consultant Pediatrician', dept: 'Pediatrics' },
                      { key: 'anesthesiologist', label: 'Head Anesthesiologist', dept: 'Operation Theatre' }
                    ].map(spec => {
                      const item = resourceData.specialists[spec.key] || { name: 'Doctor', onDuty: false, shift: 'Morning' };
                      return (
                        <div key={spec.key} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-xs text-typography-primary">{spec.label}</div>
                              <div className="text-[10px] text-slate-400">{spec.dept}</div>
                            </div>
                            <span className={`w-2.5 h-2.5 rounded-full ${item.onDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-typography-secondary block mb-1 uppercase">Clinician on Duty</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                setResourceData({
                                  ...resourceData,
                                  specialists: {
                                    ...resourceData.specialists,
                                    [spec.key]: { ...item, name: e.target.value }
                                  }
                                });
                              }}
                              className="w-full p-2 border border-slate-200 rounded-lg font-medium text-xs text-typography-primary bg-slate-50 focus:bg-white focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500 font-medium">Shift Status:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setResourceData({
                                  ...resourceData,
                                  specialists: {
                                    ...resourceData.specialists,
                                    [spec.key]: { ...item, onDuty: !item.onDuty }
                                  }
                                });
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                item.onDuty
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {item.onDuty ? "ON DUTY" : "OFF DUTY"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SUB-TAB 5: HOSPITAL SERVICES */}
                {resourceSubTab === 'services' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: 'emergency', label: '24/7 Emergency Department', desc: 'Resuscitation & acute trauma bays' },
                      { key: 'icu', label: 'Intensive Care Unit (ICU)', desc: 'Level 3 adult & pediatric critical care' },
                      { key: 'operationTheatre', label: 'Operation Theatre (OT) Suites', desc: 'Modular emergency & elective surgical suites' },
                      { key: 'laboratory', label: 'Automated Diagnostic Laboratory', desc: '24/7 STAT biochemistry & pathology' },
                      { key: 'bloodBank', label: 'Regional Blood Center', desc: 'Component separation & cross-matching' },
                      { key: 'radiology', label: 'Radiology & Interventional CT', desc: 'Emergency contrast & CT trauma series' },
                      { key: 'dialysis', label: 'Acute Hemodialysis Unit', desc: 'Emergency renal replacement therapy' }
                    ].map(srv => {
                      const status = resourceData.services[srv.key] || 'Available';
                      return (
                        <div key={srv.key} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between gap-3">
                          <div>
                            <div className="font-bold text-xs text-typography-primary">{srv.label}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{srv.desc}</div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500 font-medium">Service State:</span>
                            <select
                              value={status}
                              onChange={(e) => {
                                setResourceData({
                                  ...resourceData,
                                  services: {
                                    ...resourceData.services,
                                    [srv.key]: e.target.value
                                  }
                                });
                              }}
                              className={`text-xs font-semibold p-1.5 rounded-lg border focus:outline-none ${
                                status === 'Available' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                status === 'Unavailable' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <option value="Available">Fully Operational</option>
                              <option value="Temporarily Unavailable">Reduced / Maintenance</option>
                              <option value="Unavailable">Offline</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* =========================================================
              TAB 3: INCOMING REFERRALS (BHU REFERRAL MANAGEMENT)
              ========================================================= */}
          {activeTab === 'referrals' && (
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base sm:text-lg">Incoming BHU Patient Referrals</CardTitle>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      AI CLINICAL TRIAGE
                    </span>
                  </div>
                  <CardDescription>
                    Referrals dispatched by Basic Health Unit doctors across Khyber Pakhtunkhwa.
                  </CardDescription>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={referralSearchTerm}
                      onChange={(e) => setReferralSearchTerm(e.target.value)}
                      placeholder="Search patient or clinic..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="flex space-x-1 text-xs font-semibold">
                    {['ALL', 'PENDING', 'ACCEPTED', 'DECLINED'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setReferralFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg transition-colors ${
                          referralFilter === filter
                            ? 'bg-brand-primary text-white shadow-xs'
                            : 'bg-slate-100 text-typography-secondary hover:text-typography-primary'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredReferrals.length === 0 ? (
                  <div className="text-center py-16 text-typography-secondary text-xs">
                    No referrals found matching the selected criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="border-0 shadow-none rounded-none min-w-[750px]">
                      <TableHeader>
                        <TableRow hover={false}>
                          <TableHead>Referral ID</TableHead>
                          <TableHead>Patient Details</TableHead>
                          <TableHead>Referring BHU</TableHead>
                          <TableHead>Required Services</TableHead>
                          <TableHead>Dispatch Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead align="right">Clinical Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReferrals.map(ref => (
                          <TableRow key={ref.id}>
                            <TableCell className="font-mono font-bold text-xs text-brand-primary">
                              {ref.id}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-typography-primary">{ref.patientName}</div>
                              <div className="text-[11px] text-typography-secondary">{ref.age} yrs • {ref.gender} • MRN: {ref.patientId}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-typography-primary">{ref.referringBHU}</div>
                              <div className="text-[11px] text-typography-secondary">Dr. {ref.bhuDoctorName}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {ref.requiredServices.map((srv, idx) => (
                                  <span key={idx} className="bg-teal-50 text-teal-800 border border-teal-200/60 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    {srv}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-typography-secondary">
                              <div>{new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              <div className="text-[10px] text-slate-400">{new Date(ref.createdAt).toLocaleDateString()}</div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={ref.status} size="xs" />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={Sparkles}
                                onClick={() => openReferralDetails(ref)}
                              >
                                Review & AI Triage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* =========================================================
              TAB 4: RESCUE 1122 PRE-ARRIVAL RADAR
              ========================================================= */}
          {activeTab === 'emergency' && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Siren className="w-5 h-5 text-emergency-600" />
                      <span>Rescue 1122 Pre-Arrival Emergency Radar</span>
                    </CardTitle>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      TRAUMA DISPATCH
                    </span>
                  </div>
                  <CardDescription>
                    Pre-hospital critical telemetry and field alerts sent by Rescue 1122 paramedics.
                  </CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emergency-600 animate-ping"></span>
                  <span className="text-xs font-bold text-emergency-700 uppercase tracking-wide">
                    Live Telemetry Channel
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                {emergencyAlerts.length === 0 ? (
                  <div className="text-center py-16 text-typography-secondary text-xs">
                    No active or historical Rescue 1122 pre-arrival alerts recorded.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emergencyAlerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`rounded-xl p-5 border shadow-xs flex flex-col justify-between transition-all ${
                          alert.status === 'ALERT_RECEIVED'
                            ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-white border-surface-border'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                            <span className="font-mono text-xs font-bold text-typography-secondary">{alert.rescueCaseId}</span>
                            <div className="flex items-center space-x-2">
                              <span className="bg-emergency-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <Clock className="w-3 h-3" />
                                ETA: {alert.etaMinutes} mins
                              </span>
                              <StatusBadge
                                status={alert.status === 'ALERT_RECEIVED' ? 'CRITICAL' : 'ACCEPTED'}
                                label={alert.status === 'ALERT_RECEIVED' ? 'Inbound' : 'Bay Prepared'}
                                size="xs"
                              />
                            </div>
                          </div>

                          <h3 className="font-bold text-sm text-typography-primary mb-1">{alert.emergencyType}</h3>
                          <p className="text-xs text-typography-secondary mb-3">
                            Patient: <strong className="text-typography-primary">{alert.patientName}</strong> • {alert.location}
                          </p>

                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 mb-3">
                            <div className="text-typography-secondary">
                              <strong>Paramedic / Unit:</strong> {alert.paramedicName} ({alert.ambulanceId})
                            </div>
                            <div className="text-typography-primary">
                              <strong>Field Vitals:</strong> {alert.vitals}
                            </div>
                            <div className="text-emergency-700 font-semibold">
                              <strong>Required Facilities:</strong> {alert.requiredFacilities.join(', ')}
                            </div>
                          </div>

                          {alert.status !== 'ALERT_RECEIVED' && alert.confirmedFacilities?.length > 0 && (
                            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg mb-3">
                              <strong>Hospital Response Transmitted:</strong> {alert.confirmedFacilities.join(' • ')}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 flex justify-end">
                          {alert.status === 'ALERT_RECEIVED' ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              icon={Siren}
                              onClick={() => openEmergencyAlert(alert)}
                              className="w-full"
                            >
                              Mobilize Trauma Bay & Transmit
                            </Button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Emergency Bay Prepared & Acknowledged
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* =========================================================
              TAB 5: HOSPITAL INSTITUTIONAL PROFILE
              ========================================================= */}
          {activeTab === 'profile' && profileForm && (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Hospital Institutional Credentials</CardTitle>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    VERIFIED
                  </span>
                </div>
                <CardDescription>Government of Khyber Pakhtunkhwa Registered Healthcare Facility</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSavingProfile(true);
                    try {
                      const res = await fetch(`/api/hospitals/${hospital.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(profileForm)
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert('Hospital profile updated successfully');
                        loadHospitalData(hospital.id);
                      }
                    } catch (err) {
                      alert('Error updating profile');
                    } finally {
                      setIsSavingProfile(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <Input
                    label="Official Healthcare Facility Name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Facility Category"
                      disabled
                      value={hospital.type}
                    />
                    <Input
                      label="District (KPK)"
                      disabled
                      value={hospital.district}
                    />
                  </div>

                  <Input
                    label="Facility Physical Address"
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Hospital General PBX"
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                    <Input
                      label="Emergency Department Hotline"
                      type="text"
                      value={profileForm.emergencyPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyPhone: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Medical Superintendent / Director"
                    type="text"
                    value={profileForm.adminName}
                    onChange={(e) => setProfileForm({ ...profileForm, adminName: e.target.value })}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingProfile}
                    className="w-full mt-2"
                  >
                    Save Hospital Information
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* =========================================================
              TAB 6: SYSTEM & AI SETTINGS
              ========================================================= */}
          {activeTab === 'settings' && (
            <Card className="max-w-xl mx-auto">
              <CardHeader>
                <CardTitle>System & Clinical AI Engine Configuration</CardTitle>
                <CardDescription>Hospital staff session telemetry and AI intelligence settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-1.5">
                  <div className="font-bold text-teal-900 flex items-center gap-1.5 text-sm">
                    <Brain className="w-4 h-4 text-teal-700" />
                    <span>AI Clinical Intelligence Core</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    Status: <strong className="text-emerald-700">Online</strong> • Google Gemini Clinical Acuity & Bed Allocation Engine
                  </div>
                  <div className="text-[11px] text-slate-500 pt-0.5">
                    Evaluates incoming referral acuity levels, validates matching specialty equipment, and prepares pre-arrival bay setups.
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-xs mb-1">Active Staff Session</div>
                  <div className="text-slate-600">Username: <strong className="text-slate-900">{currentUser.username}</strong></div>
                  <div className="text-slate-600">Role: <strong className="text-slate-900">{currentUser.role}</strong></div>
                  <div className="text-slate-600">Facility ID: <strong className="text-slate-900">{currentUser.hospitalId}</strong></div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-xs text-slate-900">Emergency Pre-Arrival Siren Chime</div>
                    <div className="text-[11px] text-slate-500">Play audio chime when Rescue 1122 sends an inbound alert</div>
                  </div>
                  <Button
                    variant={soundEnabled ? "success" : "secondary"}
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? "Audible" : "Muted"}
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="font-bold text-xs text-slate-900 mb-1">Reset Demonstration Dataset</div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Restores KPK hospitals, BHU referrals, and Rescue 1122 alerts back to clean initial presentation state.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Reset database to clean initial demonstration state?")) {
                        const res = await fetch('/api/seed', { method: 'POST' });
                        const d = await res.json();
                        if (d.success) {
                          alert('Database reset successfully!');
                          loadHospitalData(hospital.id);
                        }
                      }
                    }}
                  >
                    Reset Clean Demo Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* =========================================================
          MODAL 1: REFERRAL DETAILS & AI CLINICAL DECISION SUPPORT
          ========================================================= */}
      <Modal
        isOpen={Boolean(selectedReferral)}
        onClose={() => setSelectedReferral(null)}
        title={selectedReferral ? `${selectedReferral.patientName} (${selectedReferral.age} yrs, ${selectedReferral.gender})` : ''}
        description={selectedReferral ? `Referral ID: ${selectedReferral.id} • Dispatched from ${selectedReferral.referringBHU}` : ''}
        maxWidth="max-w-3xl"
      >
        {selectedReferral && (
          <div className="space-y-4">
            {/* AI Clinical Decision Intelligence Card */}
            <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-teal-900 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-teal-700" />
                  AI Clinical Referral Assessment & Capacity Matching
                </span>
                {isLoadingAI ? (
                  <span className="text-xs text-teal-700 animate-pulse font-semibold">Running Google Gemini AI Triage...</span>
                ) : aiAnalysis ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-teal-800 font-bold bg-white border border-teal-200 px-2 py-0.5 rounded">
                      {aiAnalysis.aiModel || "Google Gemini"}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      aiAnalysis.urgencyLevel === 'CRITICAL' ? 'bg-emergency-600 text-white' :
                      aiAnalysis.urgencyLevel === 'HIGH' ? 'bg-amber-500 text-white' :
                      'bg-emerald-600 text-white'
                    }`}>
                      PRIORITY: {aiAnalysis.urgencyLevel}
                    </span>
                  </div>
                ) : null}
              </div>

              {aiAnalysis && (
                <div className="text-xs space-y-2 pt-1">
                  <div>
                    <strong className="text-slate-900">Clinical Assessment:</strong>
                    <p className="text-slate-700 mt-0.5">{aiAnalysis.clinicalImpression}</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-teal-100 text-xs space-y-1.5">
                    <div>
                      <strong className="text-slate-900">Facility Capacity Match:</strong>{' '}
                      <span className={aiAnalysis.resourceMatchStatus === 'MATCHED' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        {aiAnalysis.resourceMatchExplanation}
                      </span>
                    </div>
                    <div>
                      <strong className="text-slate-900">AI Recommendation:</strong>{' '}
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        aiAnalysis.recommendedAction === 'ACCEPT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {aiAnalysis.recommendedAction === 'ACCEPT' ? 'RECOMMENDED TO ACCEPT' : 'REDIRECT ADVISED'}
                      </span>
                      <span className="text-slate-600 ml-1.5">({aiAnalysis.recommendationReason})</span>
                    </div>
                  </div>

                  {aiAnalysis.immediatePreparation?.length > 0 && (
                    <div>
                      <strong className="text-slate-900 text-xs">Pre-Arrival Preparation Checklist:</strong>
                      <ul className="list-disc list-inside text-xs text-slate-700 mt-1 space-y-0.5">
                        {aiAnalysis.immediatePreparation.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Patient Clinical Profile */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div>
                <strong className="text-slate-900">Referring Medical Unit:</strong> {selectedReferral.referringBHU} (Dr. {selectedReferral.bhuDoctorName})
              </div>
              <div>
                <strong className="text-slate-900">Chief Symptoms & Presentation:</strong>
                <p className="text-slate-700 mt-0.5">{selectedReferral.symptoms}</p>
              </div>
              <div>
                <strong className="text-slate-900">Patient Medical History:</strong>
                <p className="text-slate-700 mt-0.5">{selectedReferral.medicalHistory || "None recorded"}</p>
              </div>
              <div>
                <strong className="text-slate-900">Clinical Examination & Vital Signs:</strong>
                <p className="text-slate-700 mt-0.5">{selectedReferral.currentCondition}</p>
              </div>
              <div>
                <strong className="text-slate-900">Doctor's Clinical Notes:</strong>
                <p className="text-slate-700 italic mt-0.5">{selectedReferral.doctorNotes || "None"}</p>
              </div>
              <div>
                <strong className="text-slate-900">Required Medical Services:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedReferral.requiredServices.map((s, i) => (
                    <span key={i} className="bg-teal-50 text-teal-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-teal-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Clinical Decision Action Section */}
            {selectedReferral.status === 'PENDING' ? (
              <div className="space-y-3.5 pt-1">
                {/* Mandatory Re-confirmation Checklist per Design System Rules */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-emerald-800 block">
                    Mandatory Resource Re-Confirmation Checklist
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    Before accepting, hospital staff must re-confirm that the required beds and specialists are currently operational:
                  </p>
                  <label className="flex items-center space-x-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reconfirmCheckboxes.bed}
                      onChange={(e) => setReconfirmCheckboxes({ ...reconfirmCheckboxes, bed: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Re-confirm Bed / ICU availability</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reconfirmCheckboxes.specialist}
                      onChange={(e) => setReconfirmCheckboxes({ ...reconfirmCheckboxes, specialist: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Re-confirm Specialist clinician on duty</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reconfirmCheckboxes.service}
                      onChange={(e) => setReconfirmCheckboxes({ ...reconfirmCheckboxes, service: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Re-confirm Diagnostic & OT service readiness</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-1">
                  <Button
                    variant="success"
                    size="md"
                    isLoading={isProcessingReferral}
                    disabled={!reconfirmCheckboxes.bed}
                    onClick={() => handleReferralAction('ACCEPTED')}
                    className="flex-1"
                  >
                    Accept Patient Referral
                  </Button>

                  <Button
                    variant="destructive"
                    size="md"
                    isLoading={isProcessingReferral}
                    onClick={() => {
                      const reason = prompt("Enter standardized decline reason:", "Required facility unavailable");
                      if (reason) {
                        setDeclineReason(reason);
                        handleReferralAction('DECLINED');
                      }
                    }}
                    className="flex-1"
                  >
                    Decline Referral
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 text-xs space-y-1.5 border border-slate-200">
                <div className="flex items-center gap-2">
                  <strong>Referral Status:</strong>
                  <StatusBadge status={selectedReferral.status} />
                </div>
                {selectedReferral.declineReason && (
                  <div className="text-rose-700 mt-1">
                    <strong>Decline Rationale:</strong> {selectedReferral.declineReason}
                  </div>
                )}
                {selectedReferral.reconfirmedResources?.length > 0 && (
                  <div className="text-emerald-700 mt-1">
                    <strong>Re-confirmed by Staff:</strong> {selectedReferral.reconfirmedResources.join(' • ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* =========================================================
          MODAL 2: RESCUE 1122 TRAUMA BAY PREPARATION
          ========================================================= */}
      <Modal
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title="Rescue 1122 Pre-Arrival Bay Mobilization"
        description={selectedAlert ? `Case ID: ${selectedAlert.rescueCaseId} • Ambulance ${selectedAlert.ambulanceId}` : ''}
        maxWidth="max-w-lg"
      >
        {selectedAlert && (
          <div className="space-y-4">
            {/* AI Trauma Advisory */}
            {aiTraumaAdvice && (
              <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-teal-700" />
                    AI Trauma Clinical Advisory
                  </span>
                  <span className="bg-emergency-600 text-white font-bold text-[10px] px-2 py-0.5 rounded">
                    {aiTraumaAdvice.code}
                  </span>
                </div>
                <div className="text-slate-800">
                  <strong>Anticipated Acuity:</strong> {aiTraumaAdvice.primaryRisk}
                </div>
                <div className="text-slate-600">
                  {aiTraumaAdvice.bedNotice}
                </div>
                <div className="pt-1">
                  <strong className="text-slate-900 text-xs">AI Bay Preparation Checklist:</strong>
                  <ul className="list-disc list-inside text-slate-700 mt-1 space-y-0.5">
                    {aiTraumaAdvice.bayChecklist?.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 text-xs space-y-1.5">
              <div><strong>Emergency Event:</strong> {selectedAlert.emergencyType}</div>
              <div><strong>ETA:</strong> <span className="font-bold text-emergency-600">{selectedAlert.etaMinutes} minutes</span> ({selectedAlert.ambulanceId})</div>
              <div><strong>Paramedic Vitals:</strong> {selectedAlert.vitals}</div>
              <div><strong>Required Facilities:</strong> {selectedAlert.requiredFacilities.join(', ')}</div>
            </div>

            {/* Trauma Bay Assignment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-typography-primary block">Assign Inbound Trauma Bay:</label>
              <select
                value={assignedBay}
                onChange={(e) => setAssignedBay(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="Trauma Bay 1 (Resuscitation)">Trauma Bay 1 (Resuscitation & Airway)</option>
                <option value="Trauma Bay 2 (Shock Room)">Trauma Bay 2 (Shock Room)</option>
                <option value="Emergency OT 1 (Acute Surgical)">Emergency OT 1 (Acute Surgical)</option>
                <option value="Cardiac Cath Bay (STEMI Rapid)">Cardiac Cath Bay (STEMI Rapid)</option>
              </select>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-typography-primary block">Confirm Emergency Readiness:</span>
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmEmergencyFacilities.traumaBay}
                  onChange={(e) => setConfirmEmergencyFacilities({ ...confirmEmergencyFacilities, traumaBay: e.target.checked })}
                  className="rounded text-emergency-600 focus:ring-emergency-500"
                />
                <span>Trauma Bay & Resuscitation stretcher prepared</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmEmergencyFacilities.ventilator}
                  onChange={(e) => setConfirmEmergencyFacilities({ ...confirmEmergencyFacilities, ventilator: e.target.checked })}
                  className="rounded text-emergency-600 focus:ring-emergency-500"
                />
                <span>Ventilator & Rapid Intubation airway team alerted</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmEmergencyFacilities.bloodBank}
                  onChange={(e) => setConfirmEmergencyFacilities({ ...confirmEmergencyFacilities, bloodBank: e.target.checked })}
                  className="rounded text-emergency-600 focus:ring-emergency-500"
                />
                <span>Regional blood bank notified for rapid cross-match</span>
              </label>
            </div>

            <Button
              variant="destructive"
              size="md"
              isLoading={isProcessingAlert}
              onClick={handleAcknowledgeAlert}
              className="w-full"
            >
              Transmit Bay Readiness to Ambulance
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
