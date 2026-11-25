import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Printer,
  Siren,
  ArrowRight,
  Building2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export default function ReferralsListTab({
  referrals = [],
  onViewSlip,
  onReRouteReferral,
  onRefresh,
  isLoading = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredReferrals = referrals.filter((ref) => {
    const matchesSearch =
      ref.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.provisionalDiagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.targetHospitalName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true : ref.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Accepted / Bed Reserved
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Declined (Re-Route Needed)
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider">Critical</span>;
      case 'URGENT':
        return <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-white uppercase tracking-wider">Urgent</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase tracking-wider">Routine</span>;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const diffMins = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Controls: Search, Filters & Refresh */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by patient name, ID, or hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-500 focus:outline-hidden"
          />
        </div>

        {/* Status Filters & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            {['ALL', 'PENDING', 'ACCEPTED', 'DECLINED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Referrals' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-slate-50 transition-colors"
            title="Refresh Referrals Sync"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

      </div>

      {/* Referrals Cards List */}
      {filteredReferrals.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Referrals Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No referrals matched your search filters. Try clearing the search term.'
              : 'You have not submitted any patient referrals today. Click "+ New Patient Referral" above to refer a patient.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReferrals.map((ref) => (
            <div
              key={ref.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-card transition-all p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left Section: Patient & Referral Summary */}
                <div className="space-y-2 flex-1">
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      #{ref.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {ref.patientName}
                    </h3>
                    <span className="text-xs text-slate-500">
                      ({ref.age} yrs • {ref.gender})
                    </span>
                    {getUrgencyBadge(ref.urgency)}
                    <span className="text-xs text-slate-400">
                      • {formatTimeAgo(ref.createdAt)}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="text-slate-500 font-normal">Diagnosis:</span>
                    <span>{ref.provisionalDiagnosis}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Destination: <strong>{ref.targetHospitalName}</strong></span>
                    </div>

                    {ref.vitals?.bp && (
                      <div className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        BP: <strong className="text-slate-700">{ref.vitals.bp}</strong> • SpO2: <strong className="text-slate-700">{ref.vitals.spo2}</strong> • Pulse: <strong className="text-slate-700">{ref.vitals.hr} bpm</strong>
                      </div>
                    )}

                    {ref.rescueRequested && (
                      <div className="flex items-center gap-1 text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px]">
                        <Siren className="w-3 h-3" />
                        <span>Rescue 1122 Dispatched</span>
                      </div>
                    )}
                  </div>

                  {/* Hospital Response Feedback / Notes */}
                  {ref.hospitalResponseNotes && (
                    <div className="mt-2 text-xs bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200">
                      <strong>Hospital Triage Response:</strong> {ref.hospitalResponseNotes}
                    </div>
                  )}

                  {ref.declineReason && (
                    <div className="mt-2 text-xs bg-red-50 text-red-900 p-2 rounded-lg border border-red-200">
                      <strong>Decline Reason:</strong> {ref.declineReason}
                    </div>
                  )}

                </div>

                {/* Right Section: Live Status Badge & Primary Actions */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  
                  <div>
                    {getStatusBadge(ref.status)}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Re-route button if declined */}
                    {ref.status === 'DECLINED' && (
                      <button
                        type="button"
                        onClick={() => onReRouteReferral(ref)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-Route</span>
                      </button>
                    )}

                    {/* Print Slip Action */}
                    <button
                      type="button"
                      onClick={() => onViewSlip(ref)}
                      className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-700" />
                      <span>Print Slip (Parchi)</span>
                    </button>
                  </div>

                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

