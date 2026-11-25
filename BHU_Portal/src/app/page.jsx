'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import NewReferralTab from '@/components/NewReferralTab';
import ReferralsListTab from '@/components/ReferralsListTab';
import ReferralSlipModal from '@/components/ReferralSlipModal';
import { DEFAULT_BHUS, FALLBACK_HOSPITALS } from '@/lib/mockData';
import {
  checkHospitalGridHealth,
  getLiveHospitalResources,
  submitReferralToHospital,
  getReferralsList,
  updateLocalReferralStatus
} from '@/lib/api';

export default function BHUApp() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [selectedBHU, setSelectedBHU] = useState(DEFAULT_BHUS[0]);
  const [isGridOnline, setIsGridOnline] = useState(false);
  const [hospitals, setHospitals] = useState(FALLBACK_HOSPITALS);
  const [referrals, setReferrals] = useState([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);
  const [activeSlipReferral, setActiveSlipReferral] = useState(null);

  // Sync health grid connectivity & hospital bed telemetry
  const syncHospitalTelemetry = useCallback(async () => {
    const health = await checkHospitalGridHealth();
    setIsGridOnline(health.online);

    const resourceData = await getLiveHospitalResources();
    if (resourceData.hospitals && resourceData.hospitals.length > 0) {
      setHospitals(resourceData.hospitals);
    }
  }, []);

  // Sync referrals list
  const syncReferrals = useCallback(async () => {
    setIsLoadingReferrals(true);
    try {
      const list = await getReferralsList();
      setReferrals(list);
    } catch (e) {
      console.error("Failed to sync referrals:", e);
    } finally {
      setIsLoadingReferrals(false);
    }
  }, []);

  // Initial load & periodic polling for real-time status updates
  useEffect(() => {
    syncHospitalTelemetry();
    syncReferrals();

    const interval = setInterval(() => {
      syncHospitalTelemetry();
      syncReferrals();
    }, 15000); // 15s poll

    return () => clearInterval(interval);
  }, [syncHospitalTelemetry, syncReferrals]);

  // Handle new referral submission
  const handleSubmitReferral = async (payload) => {
    const newRef = await submitReferralToHospital(payload);
    setReferrals(prev => [newRef, ...prev.filter(r => r.id !== newRef.id)]);
    return newRef;
  };

  // Re-route a declined referral to another hospital
  const handleReRoute = (ref) => {
    // Switch to new referral tab with prefilled data or re-route directly
    setActiveTab('new');
  };

  const pendingCount = referrals.filter(r => r.status === 'PENDING').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Global Clinical Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedBHU={selectedBHU}
        setSelectedBHU={setSelectedBHU}
        isGridOnline={isGridOnline}
        referralsCount={referrals.length}
        pendingCount={pendingCount}
      />

      {/* Primary Tab Views */}
      <main className="flex-1">
        {activeTab === 'new' ? (
          <NewReferralTab
            selectedBHU={selectedBHU}
            hospitals={hospitals}
            onSubmitReferral={handleSubmitReferral}
            onViewSlip={(ref) => setActiveSlipReferral(ref)}
          />
        ) : (
          <ReferralsListTab
            referrals={referrals}
            onViewSlip={(ref) => setActiveSlipReferral(ref)}
            onReRouteReferral={handleReRoute}
            onRefresh={syncReferrals}
            isLoading={isLoadingReferrals}
          />
        )}
      </main>

      {/* Official Printable Referral Slip Modal */}
      {activeSlipReferral && (
        <ReferralSlipModal
          referral={activeSlipReferral}
          onClose={() => setActiveSlipReferral(null)}
        />
      )}

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Government of Khyber Pakhtunkhwa • Basic Health Unit Clinical Portal (BHU Chamkani Node)
          </span>
          <span className="font-medium text-slate-600">
            Intelligent Triage & Hospital Coordination Grid v1.0
          </span>
        </div>
      </footer>

    </div>
  );
}

