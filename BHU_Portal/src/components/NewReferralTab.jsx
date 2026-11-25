import React, { useState } from 'react';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplet,
  Sparkles,
  Building2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Siren,
  Send,
  CheckCircle2,
  Bed,
  Phone,
  RefreshCw,
  Info,
  Bot,
  Zap,
  Check
} from 'lucide-react';

const QUICK_COMPLAINTS = [
  {
    label: "Chest Pain / STEMI",
    diagnosis: "Acute ST-Elevation Myocardial Infarction (STEMI)",
    symptoms: "Crushing retrosternal chest pain radiating to left arm & jaw. Diaphoresis, nausea.",
    urgency: "CRITICAL",
    vitals: { bp: "85/55", hr: "120", spo2: "92", temp: "98.6" }
  },
  {
    label: "Severe Asthma / COPD",
    diagnosis: "Acute Severe Asthma / Respiratory Failure",
    symptoms: "Severe dyspnea, central cyanosis, audible wheezing, unable to speak complete sentences.",
    urgency: "CRITICAL",
    vitals: { bp: "135/85", hr: "115", spo2: "87", temp: "99.1" }
  },
  {
    label: "Head Trauma / RTA",
    diagnosis: "Severe Traumatic Brain Injury (GCS < 9)",
    symptoms: "Unconscious following high-speed motorcycle accident. Scalp laceration, anisocoria.",
    urgency: "CRITICAL",
    vitals: { bp: "150/95", hr: "62", spo2: "94", temp: "98.4" }
  },
  {
    label: "Obstructed Labor",
    diagnosis: "Obstructed Labor with Impending Uterine Rupture",
    symptoms: "Full term, active second stage > 3 hours. Bandl's physiological ring visible, fetal bradycardia.",
    urgency: "CRITICAL",
    vitals: { bp: "140/90", hr: "110", spo2: "97", temp: "99.5" }
  },
  {
    label: "Pediatric Sepsis",
    diagnosis: "Severe Sepsis / Septic Shock in 3yo Child",
    symptoms: "Lethargic, high fever, capillary refill time > 4 seconds, mottled extremities.",
    urgency: "CRITICAL",
    vitals: { bp: "70/40", hr: "160", spo2: "91", temp: "103.2" }
  }
];

export default function NewReferralTab({
  selectedBHU,
  hospitals = [],
  onSubmitReferral,
  onViewSlip
}) {
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    contactNumber: '',
    attendantName: '',
    bp: '',
    hr: '',
    spo2: '',
    temp: '',
    glucose: '',
    symptoms: '',
    provisionalDiagnosis: '',
    urgency: 'URGENT',
    doctorNotes: '',
    rescueRequested: false,
    selectedHospitalId: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReferral, setSubmittedReferral] = useState(null);

  // Real Gemini AI State (Zero Hardcoded Heuristics)
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Detect if doctor has entered clinical diagnosis or symptoms
  const hasClinicalInput = Boolean(
    formData.provisionalDiagnosis?.trim() || formData.symptoms?.trim()
  );

  /**
   * Run Real Live Google Gemini 3 Flash AI Matching
   */
  const runGeminiMatching = async (formOverride = null) => {
    const dataToUse = formOverride || formData;
    const diag = dataToUse.provisionalDiagnosis?.trim();
    const sym = dataToUse.symptoms?.trim();

    if (!diag && !sym) {
      alert("Please enter a provisional diagnosis or chief symptoms first.");
      return;
    }

    setIsAnalyzingAI(true);
    setAiError(null);

    try {
      const res = await fetch('/bhu/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: diag,
          symptoms: sym,
          vitals: {
            bp: dataToUse.bp,
            hr: dataToUse.hr,
            spo2: dataToUse.spo2,
            temp: dataToUse.temp,
            glucose: dataToUse.glucose
          },
          patient: {
            name: dataToUse.patientName,
            age: dataToUse.age,
            gender: dataToUse.gender
          },
          hospitals
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setGeminiAnalysis(result);

      // Auto-select rank 1 hospital from real Gemini evaluation
      if (result.rankedHospitals && result.rankedHospitals.length > 0) {
        setFormData(prev => ({
          ...prev,
          selectedHospitalId: result.rankedHospitals[0].hospitalId
        }));
      }
    } catch (err) {
      console.error("Gemini live match error:", err);
      setAiError(err.message);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleApplyQuickTag = (tag) => {
    const updated = {
      ...formData,
      provisionalDiagnosis: tag.diagnosis,
      symptoms: tag.symptoms,
      urgency: tag.urgency,
      bp: tag.vitals.bp,
      hr: tag.vitals.hr,
      spo2: tag.vitals.spo2,
      temp: tag.vitals.temp
    };
    setFormData(updated);
    // Immediately run real Gemini AI matching with this emergency case
    runGeminiMatching(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.age || !formData.provisionalDiagnosis) {
      alert("Please fill in Patient Name, Age, and Provisional Diagnosis.");
      return;
    }

    const availableRanked = geminiAnalysis?.rankedHospitals || hospitals;
    const targetHosp = availableRanked.find(h => h.hospitalId === formData.selectedHospitalId) || availableRanked[0];

    setIsSubmitting(true);
    try {
      const payload = {
        patientName: formData.patientName,
        age: formData.age,
        gender: formData.gender,
        contactNumber: formData.contactNumber,
        referringBHU: selectedBHU.name,
        bhuDoctorName: selectedBHU.doctorName,
        targetHospitalId: targetHosp?.hospitalId || 'lrh-peshawar',
        targetHospitalName: targetHosp?.hospitalName || 'Lady Reading Hospital (LRH)',
        symptoms: formData.symptoms || formData.provisionalDiagnosis,
        provisionalDiagnosis: formData.provisionalDiagnosis,
        urgency: formData.urgency,
        vitals: {
          bp: formData.bp || "120/80",
          hr: formData.hr || "80",
          spo2: formData.spo2 ? `${formData.spo2}%` : "98%",
          temp: formData.temp ? `${formData.temp}°F` : "98.6°F",
          glucose: formData.glucose ? `${formData.glucose} mg/dL` : "N/A"
        },
        doctorNotes: formData.doctorNotes,
        rescueRequested: formData.rescueRequested,
        esiLevel: geminiAnalysis?.esiLevel || 2,
        preTransferStabilization: geminiAnalysis?.preTransferStabilization || [],
        closerHospitalsBypassed: geminiAnalysis?.closerHospitalsBypassed || []
      };

      const result = await onSubmitReferral(payload);
      setSubmittedReferral(result);
    } catch (err) {
      alert("Referral submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      patientName: '',
      age: '',
      gender: 'Male',
      contactNumber: '',
      attendantName: '',
      bp: '',
      hr: '',
      spo2: '',
      temp: '',
      glucose: '',
      symptoms: '',
      provisionalDiagnosis: '',
      urgency: 'URGENT',
      doctorNotes: '',
      rescueRequested: false,
      selectedHospitalId: ''
    });
    setGeminiAnalysis(null);
    setSubmittedReferral(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Success Notification Bar after Referral Submission */}
      {submittedReferral && (
        <div className="mb-6 bg-emerald-50 border-2 border-emerald-500 rounded-xl p-5 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-emerald-950 font-bold text-lg">
                  Referral #{submittedReferral.id} Successfully Dispatched!
                </h3>
                <p className="text-emerald-800 text-sm mt-0.5">
                  Forwarded to <strong>{submittedReferral.targetHospitalName}</strong> triage bay. 
                  {submittedReferral.rescueRequested && " • Rescue 1122 dispatch alert transmitted."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onViewSlip(submittedReferral)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>📄 Print Referral Slip (Parchi)</span>
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-semibold px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                New Patient +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Referral Form Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Clinical Data & Patient Info - 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Quick-Preset Chips for Emergent Conditions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                1-Click Clinical Emergency Presets
              </span>
              <span className="text-[11px] text-slate-400">Click to autofill & trigger Gemini AI</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_COMPLAINTS.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleApplyQuickTag(tag)}
                  className="text-xs bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all font-medium cursor-pointer"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card 1: Patient Demographics */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              Patient Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khan Wali"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (Years) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 45"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0300-1234567"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Triage Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CRITICAL', label: 'Critical', color: 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' },
                    { id: 'URGENT', label: 'Urgent', color: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100' },
                    { id: 'STABLE', label: 'Routine', color: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' },
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: level.id })}
                      className={`text-xs font-bold py-2 rounded-lg border text-center transition-all cursor-pointer ${
                        formData.urgency === level.id
                          ? 'ring-2 ring-teal-600 ' + level.color
                          : 'border-slate-200 text-slate-600 bg-white'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Rapid Clinical Vitals Strip */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Rapid Clinical Vitals Strip
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* BP */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>BP (mmHg)</span>
                  <Heart className="w-3 h-3 text-red-500" />
                </label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={formData.bp}
                  onChange={(e) => setFormData({ ...formData, bp: e.target.value })}
                  className="w-full text-sm font-bold text-slate-900 bg-white px-2 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:border-teal-500 text-center"
                />
              </div>

              {/* Heart Rate */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Heart Rate</span>
                  <span className="text-[10px] text-slate-400">bpm</span>
                </label>
                <input
                  type="number"
                  placeholder="85"
                  value={formData.hr}
                  onChange={(e) => setFormData({ ...formData, hr: e.target.value })}
                  className="w-full text-sm font-bold text-slate-900 bg-white px-2 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:border-teal-500 text-center"
                />
              </div>

              {/* SpO2 */}
              <div className={`p-2.5 rounded-lg border ${
                parseInt(formData.spo2 || '100', 10) < 92
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <label className="block text-[11px] font-semibold mb-1 flex items-center justify-between">
                  <span>SpO2 (%)</span>
                  <Wind className="w-3 h-3 text-teal-500" />
                </label>
                <input
                  type="number"
                  placeholder="98"
                  value={formData.spo2}
                  onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                  className="w-full text-sm font-bold text-slate-900 bg-white px-2 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:border-teal-500 text-center"
                />
              </div>

              {/* Temperature */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Temp (°F)</span>
                  <Thermometer className="w-3 h-3 text-amber-500" />
                </label>
                <input
                  type="text"
                  placeholder="98.6"
                  value={formData.temp}
                  onChange={(e) => setFormData({ ...formData, temp: e.target.value })}
                  className="w-full text-sm font-bold text-slate-900 bg-white px-2 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:border-teal-500 text-center"
                />
              </div>

            </div>
          </div>

          {/* Card 3: Diagnosis & Clinical Notes */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Provisional Clinical Diagnosis <span className="text-red-500">*</span>
                </label>
                {hasClinicalInput && (
                  <button
                    type="button"
                    onClick={() => runGeminiMatching()}
                    disabled={isAnalyzingAI}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Run Gemini AI Match</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Acute ST-Elevation Myocardial Infarction"
                value={formData.provisionalDiagnosis}
                onChange={(e) => setFormData({ ...formData, provisionalDiagnosis: e.target.value })}
                className="w-full text-sm font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chief Symptoms & Clinical Presentation
              </label>
              <textarea
                rows={2}
                placeholder="Describe presenting symptoms, onset time, radiation of pain, response to initial medication..."
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Treatment Given & Physician Transfer Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Aspirin 300mg + IV access. Needs emergency Cath Lab & CCU bed."
                value={formData.doctorNotes}
                onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Run Gemini Match Action Button */}
            {hasClinicalInput && (
              <button
                type="button"
                onClick={() => runGeminiMatching()}
                disabled={isAnalyzingAI}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isAnalyzingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Google Gemini 3 Flash is Analyzing Case...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Run Live Google Gemini AI Match</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {/* Right Column (Live Gemini AI Matching & Hospital Selection - 5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  {geminiAnalysis ? 'Live Gemini AI Match' : 'Hospital Bed Telemetry'}
                </h2>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                geminiAnalysis
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  : hasClinicalInput
                  ? 'text-teal-800 bg-teal-50 border-teal-200'
                  : 'text-amber-800 bg-amber-50 border-amber-200'
              }`}>
                {geminiAnalysis ? '🤖 Gemini 3 Flash' : hasClinicalInput ? 'Ready to Evaluate' : 'Awaiting Diagnosis'}
              </span>
            </div>

            {/* AI Loading State */}
            {isAnalyzingAI && (
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-6 text-center my-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
                <h4 className="text-sm font-bold text-teal-950">
                  Google Gemini 3 Flash is Evaluating Case...
                </h4>
                <p className="text-xs text-teal-800 mt-1 max-w-sm mx-auto leading-relaxed">
                  Analyzing patient physiology, identifying critical medical specialties, and checking live KPK hospital bed availability.
                </p>
              </div>
            )}

            {/* AI Error Notice */}
            {aiError && !isAnalyzingAI && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>AI Connection Error: {aiError}. You can still manually pick a hospital below.</span>
              </div>
            )}

            {/* REAL GEMINI AI RESULTS */}
            {geminiAnalysis && !isAnalyzingAI ? (
              <div className="space-y-4">
                
                {/* Gemini Clinical Insight Card */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Gemini Clinical Triage
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold px-2 py-0.5 rounded text-[10px] uppercase bg-indigo-100 text-indigo-900 border border-indigo-200">
                        ESI Level {geminiAnalysis.esiLevel || (geminiAnalysis.clinicalAcuity === 'CRITICAL' ? 1 : 2)}
                      </span>
                      <span className={`font-extrabold px-2 py-0.5 rounded text-[10px] uppercase ${
                        geminiAnalysis.clinicalAcuity === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {geminiAnalysis.clinicalAcuity} ACUITY
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    {geminiAnalysis.clinicalInterpretation}
                  </p>

                  {geminiAnalysis.requiredSpecialties?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Specialties:</span>
                      {geminiAnalysis.requiredSpecialties.map((s, idx) => (
                        <span key={idx} className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Immediate Pre-Transfer Stabilization Orders Card */}
                {geminiAnalysis.preTransferStabilization?.length > 0 && (
                  <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        🚨 Pre-Transfer Stabilization Orders (Bedside Checklist)
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                        Execute Before Ambulance Leaves
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-snug">
                      Mandatory clinical stabilization protocol to perform at BHU while transfer is underway:
                    </p>
                    <ul className="space-y-1.5 mt-1">
                      {geminiAnalysis.preTransferStabilization.map((order, oIdx) => (
                        <li key={oIdx} className="text-xs text-slate-800 bg-white p-2 rounded-lg border border-amber-200/80 flex items-start gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed font-medium">{order}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Counterfactual Explainability: Why Closer Hospital Was Bypassed */}
                {geminiAnalysis.closerHospitalsBypassed?.length > 0 && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Clinical Explainability: Why Closer Facilities Were Bypassed</span>
                    </div>
                    <div className="space-y-1.5">
                      {geminiAnalysis.closerHospitalsBypassed.map((bypassed, bIdx) => (
                        <div key={bIdx} className="text-[11px] bg-white p-2.5 rounded-lg border border-blue-100 text-blue-950">
                          <div className="font-bold text-slate-900 flex items-center justify-between">
                            <span>{bypassed.hospitalName} {bypassed.distanceKm ? `(~${bypassed.distanceKm} km)` : ''}</span>
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                              Bypassed for Destination
                            </span>
                          </div>
                          <p className="mt-1 text-slate-700 text-[11px] leading-relaxed">
                            {bypassed.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* List of Hospitals Ranked by Gemini */}
                <div className="space-y-3">
                  {geminiAnalysis.rankedHospitals.map((hosp, idx) => {
                    const isSelected = formData.selectedHospitalId === hosp.hospitalId;
                    const isRank1 = idx === 0;

                    return (
                      <div
                        key={hosp.hospitalId}
                        onClick={() => setFormData({ ...formData, selectedHospitalId: hosp.hospitalId })}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isRank1
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              #{idx + 1} Match
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {hosp.hospitalName}
                            </h3>
                          </div>
                          <span className="text-xs font-extrabold text-teal-700 shrink-0">
                            {hosp.calculatedScore}%
                          </span>
                        </div>

                        {/* Bed & Telemetry Pill */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={`font-semibold px-2 py-0.5 rounded ${
                            hosp.availableIcuBeds > 0
                              ? 'bg-emerald-100 text-emerald-800 font-bold'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {hosp.availableIcuBeds} ICU Beds
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {hosp.availableBeds} Gen Beds
                          </span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            ~{hosp.etaMinutes || 20}m ({hosp.distanceKm || 15}km)
                          </span>
                        </div>

                        {/* Real Gemini Rationale */}
                        <p className="mt-2 text-[11px] text-slate-700 leading-relaxed italic bg-white/80 p-2 rounded border border-slate-200/80">
                          🤖 <strong>Gemini Rationale:</strong> {hosp.aiExplanation}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {hosp.phone}
                          </span>
                          <span className={`font-semibold ${isSelected ? 'text-teal-700' : 'text-slate-400'}`}>
                            {isSelected ? '✓ Selected Destination' : 'Click to Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ) : !isAnalyzingAI ? (
              /* When AI has not been run yet or form is empty */
              <div>
                <div className="bg-teal-50/60 border border-dashed border-teal-300 rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-2 font-bold shadow-2xs">
                    <Sparkles className="w-5 h-5 text-teal-600" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Google Gemini AI Standing By
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                    {hasClinicalInput
                      ? 'Diagnosis entered! Click "Run Live Google Gemini AI Match" on the left to evaluate hospital beds in real-time.'
                      : 'Enter the provisional diagnosis or click an Emergency Preset to run live Google Gemini AI matching.'}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Connected KPK Hospitals
                    </span>
                    <span className="text-[11px] text-slate-400">Live Bed Status</span>
                  </div>

                  <div className="space-y-2.5">
                    {hospitals.map((hosp) => {
                      const isSelected = formData.selectedHospitalId === hosp.hospitalId;

                      return (
                        <div
                          key={hosp.hospitalId}
                          onClick={() => setFormData({ ...formData, selectedHospitalId: hosp.hospitalId })}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/60 shadow-2xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {hosp.hospitalName}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              ~{hosp.etaMinutes || 20}m ({hosp.distanceKm || 15}km)
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className={`font-semibold px-2 py-0.5 rounded ${
                              hosp.availableIcuBeds > 0
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {hosp.availableIcuBeds} ICU Beds
                            </span>
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {hosp.availableBeds} Gen Beds
                            </span>
                            <span className={`text-[10px] ml-auto font-semibold ${
                              isSelected ? 'text-teal-700' : 'text-slate-400'
                            }`}>
                              {isSelected ? '✓ Selected' : 'Click to select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Rescue 1122 Ambulance Dispatch Toggle */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.rescueRequested}
                  onChange={(e) => setFormData({ ...formData, rescueRequested: e.target.checked })}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300"
                />
                <div className="flex items-center gap-2">
                  <Siren className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-red-900 block">
                      Alert Rescue 1122 for Emergency Ambulance
                    </span>
                    <span className="text-[10px] text-red-700">
                      Transmits pre-arrival telemetry to ambulance CAD and hospital trauma bay.
                    </span>
                  </div>
                </div>
              </label>
            </div>

            {/* Submit Referral Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Transmitting Referral to Hospital...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Referral Slip to Hospital</span>
                </>
              )}
            </button>

          </div>

        </div>

      </form>
    </div>
  );
}
