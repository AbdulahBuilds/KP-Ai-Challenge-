import React from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  Heart,
  CheckCircle2,
  Clock,
  QrCode
} from 'lucide-react';

export default function ReferralSlipModal({ referral, onClose }) {
  if (!referral) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleString();
    return new Date(dateStr).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-modal overflow-hidden my-4 border border-slate-200">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Official Electronic Referral Slip
            </span>
            <span className="text-xs font-mono bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold">
              #{referral.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip (Parchi)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Printable Slip Body */}
        <div id="printable-referral-slip" className="p-6 sm:p-8 bg-white text-slate-900 font-sans">
          
          {/* Official Government Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-5 text-center relative">
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="text-2xl">🏛️</span>
              <div>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950">
                  Government of Khyber Pakhtunkhwa
                </h1>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Department of Health • Provincial Healthcare Coordination Network
                </p>
              </div>
            </div>
            <div className="mt-2 inline-block bg-slate-900 text-white text-xs font-extrabold uppercase tracking-widest px-4 py-1 rounded">
              Inter-Facility Clinical Referral Slip (Emergency Parchi)
            </div>
          </div>

          {/* Quick Meta: Referral ID, Time, Urgency */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mb-5">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Referral ID</span>
              <span className="font-mono font-extrabold text-slate-900">{referral.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Dispatched At</span>
              <span className="font-semibold text-slate-900">{formatDate(referral.createdAt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Clinical Urgency / ESI</span>
              <span className={`font-black ${referral.urgency === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>
                {referral.urgency || 'CRITICAL'} (ESI Level {referral.esiLevel || (referral.urgency === 'CRITICAL' ? 1 : 2)})
              </span>
            </div>
          </div>

          {/* Referring & Receiving Facilities Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs">
            <div className="border border-slate-200 p-3 rounded-lg bg-teal-50/40">
              <span className="font-bold text-teal-800 block text-[11px] uppercase tracking-wide mb-1">
                Referring Facility (BHU Node)
              </span>
              <div className="font-extrabold text-sm text-slate-900">{referral.referringBHU}</div>
              <div className="text-slate-600 mt-0.5">Doctor: <strong>{referral.bhuDoctorName}</strong></div>
              <div className="text-[11px] text-slate-500 mt-0.5">Role: Primary Triage & Diagnostic Evaluation</div>
            </div>

            <div className="border border-slate-200 p-3 rounded-lg bg-blue-50/40">
              <span className="font-bold text-blue-800 block text-[11px] uppercase tracking-wide mb-1">
                Receiving Hospital (Destination)
              </span>
              <div className="font-extrabold text-sm text-slate-900">{referral.targetHospitalName}</div>
              <div className="text-slate-600 mt-0.5">Triage Admission Status:</div>
              <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{referral.status === 'ACCEPTED' ? 'Verified Bed Reserved' : 'Inbound Alert Forwarded'}</span>
              </div>
            </div>
          </div>

          {/* Patient Demographics */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              Patient Identification & Demographics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px]">Patient Name:</span>
                <span className="font-bold text-slate-900 text-sm">{referral.patientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Age & Gender:</span>
                <span className="font-bold text-slate-900">{referral.age} Years • {referral.gender}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Contact Phone:</span>
                <span className="font-mono text-slate-800">{referral.contactNumber || 'Walk-in / N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Ambulance:</span>
                <span className="font-bold text-red-700">{referral.rescueRequested ? 'Rescue 1122 Called' : 'Self-Arranged'}</span>
              </div>
            </div>
          </div>

          {/* Vitals Snapshot Table */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              Initial Clinical Vitals at BHU Departure
            </h3>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="border border-slate-200 p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 block">Blood Pressure</span>
                <span className="font-bold text-slate-900">{referral.vitals?.bp || '120/80'}</span>
              </div>
              <div className="border border-slate-200 p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 block">Heart Rate</span>
                <span className="font-bold text-slate-900">{referral.vitals?.hr || '80'} bpm</span>
              </div>
              <div className="border border-slate-200 p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 block">SpO2 Oxygen</span>
                <span className="font-bold text-slate-900">{referral.vitals?.spo2 || '98%'}</span>
              </div>
              <div className="border border-slate-200 p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 block">Temperature</span>
                <span className="font-bold text-slate-900">{referral.vitals?.temp || '98.6°F'}</span>
              </div>
              <div className="border border-slate-200 p-2 rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 block">Blood Glucose</span>
                <span className="font-bold text-slate-900">{referral.vitals?.glucose || 'Normal'}</span>
              </div>
            </div>
          </div>

          {/* Clinical Diagnosis & Notes */}
          <div className="mb-5 space-y-3 text-xs">
            <div className="border-l-4 border-teal-600 pl-3 py-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Provisional Clinical Diagnosis</span>
              <span className="text-sm font-extrabold text-slate-950">{referral.provisionalDiagnosis}</span>
            </div>

            {referral.symptoms && (
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">Presenting Symptoms & History</span>
                <p className="text-slate-800 leading-relaxed">{referral.symptoms}</p>
              </div>
            )}

            {referral.doctorNotes && (
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">BHU Treatment Administered & Transfer Directions</span>
                <p className="text-slate-800 leading-relaxed font-medium">{referral.doctorNotes}</p>
              </div>
            )}

            {/* Pre-Transfer Stabilization Orders on Official Slip */}
            {referral.preTransferStabilization?.length > 0 && (
              <div className="bg-amber-50/70 p-3 rounded-lg border-2 border-amber-300 text-xs">
                <div className="flex items-center gap-1.5 text-amber-950 font-black uppercase text-[11px] mb-1.5">
                  <span>🚨 Pre-Transfer Stabilization & En-Route Care Orders:</span>
                </div>
                <ul className="space-y-1">
                  {referral.preTransferStabilization.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-1.5 text-[11px] text-slate-900 font-medium leading-snug">
                      <span className="font-bold text-amber-800">[{sIdx + 1}]</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clinical Justification if Closer Facility Bypassed */}
            {referral.closerHospitalsBypassed?.length > 0 && (
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px] text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-0.5">Referral Justification Note (Closer Facilities Evaluated):</span>
                {referral.closerHospitalsBypassed.map((b, bIdx) => (
                  <p key={bIdx} className="italic text-slate-600">
                    • {b.hospitalName}: {b.reason}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Verification QR Code & Signature Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-300 flex items-center justify-between gap-4">
            
            {/* Verification QR Representation */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 border-2 border-slate-900 p-1 flex items-center justify-center bg-white">
                {/* Clean SVG Mock QR Matrix */}
                <svg viewBox="0 0 24 24" className="w-full h-full text-slate-900" fill="currentColor">
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4 4h4v4h-4v-4zm4-4h4v4h-4v-4z" />
                </svg>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                <span className="font-bold text-slate-800 block">KPK Digital Health Grid ID:</span>
                <span className="font-mono">{referral.id}</span>
                <span className="block mt-0.5 text-slate-400">Scan at Emergency Reception for Instant Patient Intake</span>
              </div>
            </div>

            {/* Stamp & Signature Space */}
            <div className="text-right">
              <div className="h-10 border-b border-dashed border-slate-400 w-44 inline-block mb-1"></div>
              <div className="text-[11px] font-bold text-slate-800">Authorized Medical Officer</div>
              <div className="text-[10px] text-slate-500">{referral.bhuDoctorName} • Stamp</div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

