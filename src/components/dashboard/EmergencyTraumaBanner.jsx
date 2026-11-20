'use client';

import React, { useState } from 'react';
import {
  Siren,
  Clock,
  Ambulance,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Activity,
  HeartPulse,
  Brain,
  Wind,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Building2,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';

/**
 * Modern Clinical Emergency Pre-Arrival Trauma Radar Banner
 * Displays inbound Rescue 1122 alerts with scannable clinical telemetry,
 * dynamic ETA countdown, structured vitals chips, and immediate trauma bay mobilization.
 */
export default function EmergencyTraumaBanner({
  alerts = [],
  onOpenAlert,
  className = ''
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  if (!alerts || alerts.length === 0) return null;

  // Safe index bounds
  const activeAlert = alerts[currentIndex] || alerts[0];
  const totalAlerts = alerts.length;

  // Compute live remaining minutes from dispatch time
  const elapsedMinutes = activeAlert?.createdAt
    ? Math.floor((now - new Date(activeAlert.createdAt).getTime()) / 60000)
    : 0;
  const initialEta = activeAlert?.etaMinutes ?? 7;
  const remainingEta = Math.max(0, initialEta - Math.max(0, elapsedMinutes));

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalAlerts - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < totalAlerts - 1 ? prev + 1 : 0));
  };

  // Helper to intelligently extract clinical tags from raw vitals string
  const parseClinicalTags = (vitalsText = '') => {
    const tags = [];
    const lower = vitalsText.toLowerCase();

    // Glasgow Coma Scale
    const gcsMatch = vitalsText.match(/GCS\s*([0-9]+\s*\/\s*15(?:\s*\([^)]+\))?)/i);
    if (gcsMatch) {
      tags.push({
        id: 'gcs',
        label: `GCS: ${gcsMatch[1]}`,
        urgency: 'critical',
        icon: Brain
      });
    }

    // Blood Pressure
    const bpMatch = vitalsText.match(/BP\s*([0-9]+\s*\/\s*[0-9]+)/i);
    if (bpMatch) {
      tags.push({
        id: 'bp',
        label: `BP: ${bpMatch[1]} mmHg`,
        urgency: 'critical',
        icon: HeartPulse
      });
    }

    // Airway / Respiration
    if (lower.includes('bag-valve') || lower.includes('bvm') || lower.includes('respirations') || lower.includes('intubat')) {
      let airwayLabel = 'Airway: Bag-Valve-Mask Support';
      if (lower.includes('intubat')) airwayLabel = 'Airway: Intubation Needed';
      tags.push({
        id: 'airway',
        label: airwayLabel,
        urgency: 'high',
        icon: Wind
      });
    }

    // Hemorrhage / Fracture / Blast / Burn
    if (lower.includes('femur') || lower.includes('fracture') || lower.includes('blood loss')) {
      tags.push({
        id: 'trauma',
        label: 'Open Femur Fracture • Hemorrhagic',
        urgency: 'critical',
        icon: ShieldAlert
      });
    } else if (lower.includes('burn') || lower.includes('blast')) {
      tags.push({
        id: 'burn',
        label: 'Blast & Severe Inhalation Burn',
        urgency: 'critical',
        icon: ShieldAlert
      });
    }

    return tags;
  };

  const clinicalTags = parseClinicalTags(activeAlert?.vitals || '');

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white border border-rose-200/90 shadow-sm border-l-4 border-l-rose-600 transition-all duration-200 ${className}`}
    >
      {/* Top Telemetry Header Bar */}
      <div className="bg-gradient-to-r from-rose-50/90 via-rose-50/40 to-white px-4 sm:px-6 py-3 border-b border-rose-100 flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Beacon + Title + Vehicle */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
          </span>

          <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200/80">
            Rescue 1122 Pre-Arrival Trauma Radar
          </span>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white/80 border border-rose-200 px-2.5 py-0.5 rounded-full shadow-xs">
            <Ambulance className="w-3.5 h-3.5 text-rose-600" />
            <span>{activeAlert.ambulanceId}</span>
          </div>

          {activeAlert.location && (
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-600">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[200px]" title={activeAlert.location}>
                {activeAlert.location}
              </span>
            </div>
          )}
        </div>

        {/* Right: ETA Countdown + Multi-alert Switcher + Collapse Toggle */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Multi-Alert Navigator */}
          {totalAlerts > 1 && (
            <div className="flex items-center bg-white border border-rose-200 rounded-lg p-0.5 text-xs text-slate-600 shadow-xs">
              <button
                onClick={handlePrev}
                className="p-1 hover:bg-rose-50 rounded text-slate-700 hover:text-rose-700 transition-colors"
                title="Previous Inbound Alert"
                aria-label="Previous alert"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-bold text-[11px] text-rose-900">
                {currentIndex + 1} of {totalAlerts}
              </span>
              <button
                onClick={handleNext}
                className="p-1 hover:bg-rose-50 rounded text-slate-700 hover:text-rose-700 transition-colors"
                title="Next Inbound Alert"
                aria-label="Next alert"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* High-Impact Dynamic Live ETA Badge */}
          {remainingEta <= 1 ? (
            <div className="flex items-center gap-1.5 bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>ARRIVING NOW • PREPARE BAY</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>ETA: ~{remainingEta} MINS</span>
            </div>
          )}

          {/* Expand/Collapse Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-rose-100/50 rounded-lg transition-colors"
            title={isExpanded ? "Collapse alert banner" : "Expand alert details"}
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left Column: Trauma Details & Telemetry (8 cols) */}
            <div className="lg:col-span-8 space-y-3">
              {/* Chief Complaint / Emergency Description */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    {activeAlert.emergencyType}
                  </h3>
                  {activeAlert.patientName && (
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Patient: {activeAlert.patientName}
                    </span>
                  )}
                </div>

                {/* Structured Clinical Badges */}
                {clinicalTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {clinicalTags.map((tag) => {
                      const IconComponent = tag.icon || Activity;
                      return (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200/90 shadow-xs"
                        >
                          <IconComponent className="w-3.5 h-3.5 text-rose-600" />
                          <span>{tag.label}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paramedic Field Notes Strip */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                <Stethoscope className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 font-semibold mr-1">EMT Field Vitals:</strong>
                  <span>{activeAlert.vitals}</span>
                </div>
              </div>

              {/* Required Facilities Chips */}
              {activeAlert.requiredFacilities && activeAlert.requiredFacilities.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Required Facilities:
                  </span>
                  {activeAlert.requiredFacilities.map((fac, idx) => (
                    <span
                      key={idx}
                      className="bg-white text-slate-800 font-semibold px-2.5 py-0.5 rounded-md text-[11px] border border-slate-200 shadow-xs"
                    >
                      {fac}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: High Urgency CTA Suite (4 cols) */}
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col justify-center gap-2.5 lg:border-l lg:border-slate-100 lg:pl-5">
              <Button
                variant="destructive"
                size="lg"
                icon={Siren}
                onClick={() => onOpenAlert(activeAlert)}
                className="w-full shadow-sm hover:shadow-md font-bold text-sm tracking-wide py-3"
              >
                Mobilize Trauma Bay & Transmit
              </Button>

              <div className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Immediate trauma coordinator review required</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

