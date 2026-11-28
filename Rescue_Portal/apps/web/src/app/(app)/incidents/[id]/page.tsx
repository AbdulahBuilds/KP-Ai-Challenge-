'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { api, ApiError, queryString } from '@/lib/api';
import { getCurrentLocation, isValidCoordinate } from '@/lib/geolocation';
import { useAuth } from '@/lib/auth-context';
import type { Hospital, HospitalRequest, IncidentDetail, Recommendation, RecommendationSummaryRow } from '@/lib/types';
import { CAPABILITY_LABELS, PERMISSIONS } from '@/lib/constants';
import {
  alertStatusLabel,
  capabilityFor,
  cn,
  comparisonStatus,
  formatDate,
  formatDistanceKm,
  formatEtaMinutes,
  hasPermission,
  relativeTime,
  titleCase,
} from '@/lib/utils';
import { Badge, Card, EmptyState, ErrorBox, Loading, MockNotice, Notice, PageHeader } from '@/components/ui';

type SearchResult = { data: Hospital[]; meta?: { searchedAt?: string }; integration?: { isMock?: boolean; notice?: string } };
type RequestsResult = { data: HospitalRequest[]; notice?: string };

function integrationNotices(rec?: Recommendation | null) {
  const notices: string[] = [];
  if (rec?.integration?.hospital?.notice) notices.push(rec.integration.hospital.notice);
  if (rec?.integration?.maps?.isMock) notices.push('Distance and ETA are estimated (live routing not configured). Do not treat as actual travel time.');
  if (rec?.integration?.ai?.mode === 'rule_based') notices.push('Recommendations are rule-based (AI provider not configured).');
  if (rec?.policy?.noPortalDataNearLocation) {
    notices.push('No hospitals are available in the Hospital Portal data source. No hospital can be recommended from portal data.');
  } else if (rec?.policy?.usedNearestFallback) {
    const nearest = rec.policy.nearestAvailableDistanceKm;
    notices.push(
      `No Hospital Portal data was found within ${String(rec.policy.searchRadiusKm ?? 30)} km. Showing the nearest available hospitals from portal data${nearest == null ? '' : ` (nearest ${Number(nearest).toFixed(1)} km away)`}. Confirm transport feasibility before dispatch.`,
    );
  }
  for (const warning of rec?.warnings ?? []) notices.push(warning);
  if (rec?.disclaimer) notices.push(rec.disclaimer);
  return notices;
}

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [locatingCase, setLocatingCase] = useState(false);
  const [searchData, setSearchData] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState<RecommendationSummaryRow | Hospital | null>(null);

  const incidentQuery = useQuery({
    queryKey: ['incident', id],
    queryFn: () => api<IncidentDetail>(`/incidents/${id}`),
  });
  const recommendationQuery = useQuery({
    queryKey: ['recommendation', 'latest', id],
    queryFn: () => api<Recommendation>(`/incidents/${id}/recommendations/latest`),
    retry: false,
  });
  const requestsQuery = useQuery({
    queryKey: ['hospital-requests', id],
    queryFn: () => api<RequestsResult>(`/incidents/${id}/hospital-requests`),
    refetchInterval: 15000,
  });

  const incident = incidentQuery.data;
  const recommendation = recommendationQuery.error instanceof ApiError && recommendationQuery.error.status === 404 ? null : recommendationQuery.data;
  const results = useMemo(() => recommendation?.results ?? [], [recommendation]);
  const recommendedResult = results.find(
    (result) => result.hospitalExternalId === recommendation?.suggestedHospitalId && result.eligibility === 'ELIGIBLE',
  ) ?? null;
  const requiredCaps = useMemo(
    () => (incident?.requiredCapabilities?.length ? incident.requiredCapabilities : (recommendation?.requiredCapabilities ?? [])),
    [incident, recommendation],
  );
  const comparisonCaps = useMemo(() => {
    if (requiredCaps.length) return requiredCaps;
    const codes = new Set<string>();
    results.forEach((r) => r.capabilityEvaluations.forEach((c) => codes.add(c.code)));
    return [...codes].slice(0, 8);
  }, [requiredCaps, results]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['incident', id] });
    queryClient.invalidateQueries({ queryKey: ['recommendation', 'latest', id] });
    queryClient.invalidateQueries({ queryKey: ['hospital-requests', id] });
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  }

  async function refreshCaseLocation() {
    setLocatingCase(true);
    try {
      const position = await getCurrentLocation();
      if (!isValidCoordinate(position.latitude, position.longitude)) {
        throw new Error('The browser returned an invalid location. Try again.');
      }
      await api(`/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude: position.latitude, longitude: position.longitude }),
      });
      toast.success('Patient location updated from this device. Regenerate recommendations to use it.');
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update location');
    } finally {
      setLocatingCase(false);
    }
  }

  async function doSearch() {
    if (!incident) return;
    setSearching(true);
    try {
      const data = await api<SearchResult>(
        `/hospitals/search${queryString({ latitude: incident.latitude, longitude: incident.longitude, radiusKm: 25, limit: 20 })}`,
      );
      setSearchData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hospital search failed');
    } finally {
      setSearching(false);
    }
  }

  const generateMutation = useMutation({
    mutationFn: () => api<Recommendation>(`/incidents/${id}/recommendations`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
    onSuccess: () => {
      toast.success('Recommendations generated');
      queryClient.invalidateQueries({ queryKey: ['recommendation', 'latest', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectMutation = useMutation({
    mutationFn: (payload: { hospitalExternalId: string; hospitalName: string; recommendationId?: string; reason?: string }) =>
      api<{ destination?: { changed?: boolean } }>(`/hospitals/select-destination`, { method: 'POST', body: JSON.stringify({ incidentId: id, ...payload }) }),
    onSuccess: (res) => {
      toast.success(res?.destination?.changed ? 'Destination changed' : 'Destination selected');
      setSelecting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendAlertMutation = useMutation({
    mutationFn: () => {
      if (!incident?.destinationHospitalId || !incident?.destinationHospitalName) throw new Error('Select a destination hospital first');
      return api(`/incidents/${id}/hospital-requests`, {
        method: 'POST',
        body: JSON.stringify({
          hospitalExternalId: incident.destinationHospitalId,
          hospitalName: incident.destinationHospitalName,
          requiredCapabilities: incident.requiredCapabilities,
        }),
      });
    },
    onSuccess: () => {
      toast.success('Pre-arrival alert sent');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: (requestId: string) => api(`/hospital-requests/${requestId}/sync`, { method: 'POST', body: '{}' }),
    onSuccess: () => {
      toast.success('Alert status refreshed');
      invalidate();
    },
  });

  if (incidentQuery.isLoading) return <Loading label="Loading emergency case…" />;
  if (incidentQuery.error) return <ErrorBox message={(incidentQuery.error as Error).message} onRetry={() => incidentQuery.refetch()} />;
  if (!incident) return null;

  const canUpdate = hasPermission(user, PERMISSIONS.INCIDENT_UPDATE);
  const canRecommend = hasPermission(user, PERMISSIONS.RECOMMENDATION_READ);
  const canSelect = hasPermission(user, PERMISSIONS.RECOMMENDATION_SELECT);
  const canAlert = hasPermission(user, PERMISSIONS.HOSPITAL_REQUEST);
  const changingDestination = Boolean(incident.destinationHospitalId);
  const requests = requestsQuery.data?.data ?? [];

  return (
    <div>
      <div className="mb-4">
        <Link href="/incidents" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to cases
        </Link>
      </div>

      <PageHeader
        eyebrow={`Case ${incident.caseNumber}`}
        title={incident.title || `${titleCase(incident.emergencyType)} emergency`}
        description={`Received ${formatDate(incident.receivedAt)} (${relativeTime(incident.receivedAt)}) · ${incident.address ?? `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`}`}
        actions={
          <>
            <Badge value={incident.severity} />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{titleCase(incident.emergencyType)}</span>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Emergency details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Patient</p>
                <p className="mt-1 font-semibold">{incident.patient?.patientName || 'Not identified'}</p>
                <p className="text-xs text-muted-foreground">
                  {incident.patient?.age != null ? `${incident.patient.age} years` : 'Age unknown'}
                  {incident.patient?.gender ? ` · ${titleCase(incident.patient.gender)}` : ''}
                </p>
                {incident.patient?.suspectedCondition ? <p className="mt-2 text-xs"><span className="font-semibold">Condition:</span> {incident.patient.suspectedCondition}</p> : null}
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Location</p>
                  {canUpdate ? (
                    <button type="button" className="btn-ghost h-6 px-2 text-[11px]" onClick={() => { void refreshCaseLocation(); }} disabled={locatingCase}>
                      {locatingCase ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <MapPin className="mr-1 inline h-3 w-3" />}
                      {locatingCase ? 'Updating…' : 'Refresh from device'}
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 font-medium text-slate-800"><MapPin className="mr-1 inline h-3.5 w-3.5" />{incident.address || 'Coordinates captured from device'}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {incident.patient?.suspectedCondition ? <div><dt className="text-xs font-semibold text-muted-foreground">Patient condition</dt><dd className="whitespace-pre-wrap">{incident.patient.suspectedCondition}</dd></div> : null}
              {incident.patient?.symptoms ? <div><dt className="text-xs font-semibold text-muted-foreground">Symptoms</dt><dd className="whitespace-pre-wrap">{incident.patient.symptoms}</dd></div> : null}
              {incident.patient?.injuries ? <div><dt className="text-xs font-semibold text-muted-foreground">Injury details</dt><dd className="whitespace-pre-wrap">{incident.patient.injuries}</dd></div> : null}
              {incident.patient?.treatmentProvided ? <div><dt className="text-xs font-semibold text-muted-foreground">Treatment already provided</dt><dd className="whitespace-pre-wrap">{incident.patient.treatmentProvided}</dd></div> : null}
              {incident.patient?.notes ? <div><dt className="text-xs font-semibold text-muted-foreground">Reported details / AI extraction</dt><dd className="whitespace-pre-wrap">{incident.patient.notes}</dd></div> : null}
            </dl>
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Required medical facilities / equipment</p>
              <div className="flex flex-wrap gap-1.5">
                {incident.requiredCapabilities?.length ? incident.requiredCapabilities.map((code) => (
                  <span key={code} className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{CAPABILITY_LABELS[code] ?? code}</span>
                )) : <span className="text-xs text-muted-foreground">None specified — recommendations require careful human review.</span>}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Search className="h-4 w-4 text-primary" /> Nearby hospital search</h2>
              <p className="mt-1 text-xs text-muted-foreground">Search uses the patient&apos;s current location and configured hospital data source. Review results with actual capability and travel information before deciding.</p>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-secondary h-9" onClick={doSearch} disabled={searching || !hasPermission(user, PERMISSIONS.HOSPITAL_READ)}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search nearby hospitals
              </button>
              <p className="text-xs text-muted-foreground">Searches a 25 km radius using the patient&apos;s captured location.</p>
            </div>
            {searchData?.integration?.isMock ? <div className="mb-3"><MockNotice>{searchData.integration.notice}</MockNotice></div> : null}
            {searchData ? (
              searchData.data.length ? (
                <div className="overflow-x-auto">
                  <table className="table-base min-w-[560px] text-xs">
                    <thead><tr><th>Hospital</th><th>Distance</th><th>Data</th><th></th></tr></thead>
                    <tbody>
                      {searchData.data.map((h) => (
                        <tr key={h.externalId}>
                          <td>
                            <p className="font-semibold text-slate-800">{h.name}</p>
                            <p className="text-[11px] text-muted-foreground">{h.address || 'Address unavailable'}</p>
                          </td>
                          <td>{h.distanceKm != null ? `${h.distanceKm.toFixed(1)} km (straight-line estimate)` : 'Unavailable'}</td>
                          <td><Badge value={h.isMock ? 'MOCK' : 'LIVE'} /></td>
                          <td className="text-right">
                            {canSelect ? (
                              <button type="button" className="btn-secondary h-7 px-2 text-[11px]" onClick={() => { setSelecting(h); }}>Select</button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="No hospitals found" description="Check the patient location and Hospital Portal data source." />
            ) : <p className="text-sm text-muted-foreground">Run a search to find suitable nearby hospitals for this case.</p>}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-primary" /> Hospital recommendation</h2>
                <p className="mt-1 text-xs text-muted-foreground">One primary recommendation is selected by confirmed capability fit and nearest distance. Other candidates remain available for review.</p>
              </div>
              {canRecommend ? (
                <button type="button" className="btn-primary h-9" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate recommendations
                </button>
              ) : null}
            </div>

            {recommendationQuery.error && !(recommendationQuery.error instanceof ApiError && recommendationQuery.error.status === 404) ? (
              <ErrorBox message={(recommendationQuery.error as Error).message} onRetry={() => recommendationQuery.refetch()} />
            ) : null}

            {!recommendation && !generateMutation.isPending ? (
              <EmptyState title="No recommendation generated yet" description="Generate one primary recommendation based on patient needs, confirmed hospital facilities, and distance." />
            ) : null}

            {recommendation ? (
              <div className="space-y-4">
                {recommendation.aiSuggestion ? (
                  <div className="rounded-lg border border-primary/30 bg-accent/40 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> Single recommended hospital
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{recommendation.aiSuggestion.summary}</p>
                    {recommendation.aiSuggestion.rationale ? (
                      <p className="mt-1 text-xs text-slate-700">{recommendation.aiSuggestion.rationale}</p>
                    ) : null}
                  </div>
                ) : null}
                {integrationNotices(recommendation).map((n, i) => (
                  <Notice key={i} tone={/mock|simulated|demo|estimated|rule-based|unconfigured/i.test(n) ? 'warning' : 'info'}>{n}</Notice>
                ))}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-50 p-3 text-center ring-1 ring-emerald-100"><p className="text-xl font-bold text-emerald-700">{recommendation.eligibleCount}</p><p className="text-[10px] font-bold uppercase text-emerald-700">Eligible</p></div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center ring-1 ring-amber-100"><p className="text-xl font-bold text-amber-700">{recommendation.unconfirmedCount}</p><p className="text-[10px] font-bold uppercase text-amber-700">Unconfirmed</p></div>
                  <div className="rounded-lg bg-rose-50 p-3 text-center ring-1 ring-rose-100"><p className="text-xl font-bold text-rose-700">{recommendation.ineligibleCount}</p><p className="text-[10px] font-bold uppercase text-rose-700">Ineligible</p></div>
                </div>

                {recommendedResult ? (
                  <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{recommendedResult.hospitalName}</p>
                          <Badge value="RECOMMENDED" />
                          <Badge value={recommendedResult.freshness.status} />
                          {recommendedResult.isMock ? <Badge value="MOCK" label="Demo" /> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{recommendedResult.address || 'Address unavailable'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Distance: <span className="font-medium text-slate-700">{formatDistanceKm(recommendedResult.distanceKm, recommendedResult.travelEstimated)}</span>
                          {' · '}ETA: <span className="font-medium text-slate-700">{formatEtaMinutes(recommendedResult.etaMinutes, recommendedResult.travelEstimated)}</span>
                        </p>
                      </div>
                      {canSelect ? (
                        <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={() => { setSelecting(recommendedResult); }}>
                          Select recommended destination
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 rounded-md border bg-white p-3">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Why this hospital was recommended</p>
                      <p className="text-sm text-slate-700">
                        {recommendation.aiSuggestion?.rationale || recommendedResult.explanation || recommendedResult.reasons.join(' ') || 'No explanation available.'}
                      </p>
                    </div>
                    {recommendedResult.warnings?.length ? <ul className="mt-2 space-y-0.5 text-[11px] text-amber-800">{recommendedResult.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul> : null}
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
                      Data: {recommendedResult.dataSource}{recommendedResult.isMock ? ' (demo)' : ''} · {recommendedResult.travelEstimated ? 'estimated travel' : 'routing provider'} · observed {recommendedResult.observedAt ? formatDate(recommendedResult.observedAt) : 'unknown'}
                    </p>
                  </div>
                ) : (
                  <Notice tone="warning">
                    No single hospital meets all required capabilities using fresh confirmed data. Do not treat unconfirmed candidates as suitable; contact hospitals and use dispatcher judgment.
                  </Notice>
                )}

                {results.length > (recommendedResult ? 1 : 0) ? (
                  <details className="rounded-lg border p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Review other evaluated hospitals ({results.length - (recommendedResult ? 1 : 0)})
                    </summary>
                    <p className="mb-3 mt-2 text-xs text-muted-foreground">These are alternatives, not additional recommendations. Unknown or stale capabilities must not be assumed available.</p>
                    <div className="space-y-2">
                      {results.filter((row) => row.hospitalExternalId !== recommendedResult?.hospitalExternalId).map((row) => (
                        <div key={row.hospitalExternalId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                          <div>
                            <p className="font-semibold text-slate-800">{row.hospitalName} <Badge value={row.eligibility} /></p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDistanceKm(row.distanceKm, row.travelEstimated)} · {formatEtaMinutes(row.etaMinutes, row.travelEstimated)}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">{row.reasons.join(' ')}</p>
                          </div>
                          {canSelect ? (
                            <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={() => { setSelecting(row); }}>
                              Select alternative
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {comparisonCaps.length > 0 ? (
                      <div className="mt-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-900">Capability comparison</h3>
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="table-base min-w-[640px] text-xs">
                            <thead><tr><th>Hospital</th>{comparisonCaps.map((code) => <th key={code}>{CAPABILITY_LABELS[code] ?? code}</th>)}</tr></thead>
                            <tbody>
                              {results.map((row) => (
                                <tr key={`cmp-${row.hospitalExternalId}`}>
                                  <td className="font-medium text-slate-800">{row.hospitalName}</td>
                                  {comparisonCaps.map((code) => {
                                    const cap = capabilityFor(row, code);
                                    return <td key={code}><Badge value={comparisonStatus(cap, row.freshness.status)} />{typeof cap?.quantity === 'number' ? <span className="ml-1 text-[10px] text-muted-foreground">({cap.quantity})</span> : null}</td>;
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </details>
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><Building2 className="h-4 w-4 text-primary" /> Destination hospital</h2>
            {incident.destinationHospitalName ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                  <div>
                    <p className="font-semibold text-slate-900">{incident.destinationHospitalName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">ID: {incident.destinationHospitalId}</p>
                    <p className="mt-2 text-xs text-slate-700">Selection is recorded by Rescue Admin. Selection does not mean the hospital has accepted.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No destination selected yet. Select a hospital from search results or recommendations.</div>
            )}
            {incident.destinationHospitalId && canSelect ? (
              <p className="mt-3 text-xs text-muted-foreground">To change destination, choose another hospital and provide a reason (recorded).</p>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900"><BellRing className="h-4 w-4 text-primary" /> Pre-arrival alerts</h2>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Send an alert after selecting a destination. Status reflects actual recorded/confirmed state only.</p>
            {canAlert ? (
              <button type="button" className="btn-primary mb-4 w-full" onClick={() => sendAlertMutation.mutate()} disabled={!incident.destinationHospitalId || sendAlertMutation.isPending}>
                {sendAlertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                Send pre-arrival alert
              </button>
            ) : null}
            {!incident.destinationHospitalId ? <p className="mb-3 text-xs text-amber-700">Select a destination hospital before sending an alert.</p> : null}

            {requestsQuery.isLoading ? <Loading label="Loading alerts…" /> : null}
            {requestsQuery.data?.notice && requestsQuery.data.data.some((r) => r.isMock) ? <div className="mb-3"><MockNotice>{requestsQuery.data.notice}</MockNotice></div> : null}
            {requests.length === 0 && !requestsQuery.isLoading ? (
              <EmptyState title="No alerts sent yet" description="Send a pre-arrival alert to notify the selected hospital." />
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const status = alertStatusLabel(req.displayStatus ?? req.status);
                  return (
                    <div key={req.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{req.hospitalName}</p>
                          <p className="text-[11px] text-muted-foreground">Created {formatDate(req.createdAt)}{req.sentAt ? ` · Sent ${formatDate(req.sentAt)}` : ''}</p>
                          {req.respondedAt ? <p className="text-[11px] text-muted-foreground">Response {formatDate(req.respondedAt)}</p> : null}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge value={String(status)} />
                          {canAlert ? (
                            <button type="button" className="btn-ghost h-7 w-7 p-0" title="Refresh status" onClick={() => syncMutation.mutate(req.id)} disabled={syncMutation.isPending}>
                              <RefreshCw className={cn('h-3.5 w-3.5', syncMutation.isPending ? 'animate-spin' : '')} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {req.responseMessage ? <p className="mt-2 text-xs text-slate-700">{req.responseMessage}</p> : null}
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                        {req.isMock ? 'Demo/simulated alert' : 'Live alert'} · raw {req.status}{req.etaMinutes != null ? ` · ETA ${req.etaMinutes} min` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Case timeline</h2>
            {incident.events?.length ? (
              <ol className="relative space-y-4 border-l pl-5">
                {incident.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-clinical-50" />
                    <p className="text-sm font-medium text-slate-800">{event.message}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(event.occurredAt)}{event.actor ? ` · ${event.actor.firstName} ${event.actor.lastName}` : ''} · {titleCase(event.type)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">No events recorded yet.</p>}
          </Card>

          {!canUpdate && !canRecommend && !canSelect && !canAlert ? (
            <Notice tone="warning" title="Limited access"><AlertTriangle className="mr-1 inline h-4 w-4" />Some actions are unavailable for your account.</Notice>
          ) : null}
        </div>
      </div>

      {selecting ? (
        <Modal title={changingDestination ? 'Change destination hospital' : 'Select destination hospital'} onClose={() => setSelecting(null)}>
          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="font-semibold">{'hospitalName' in selecting ? selecting.hospitalName : selecting.name}</p>
              {'eligibility' in selecting ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Badge value={selecting.eligibility} />
                  <span className="text-muted-foreground">Score {selecting.score}</span>
                  <span className="text-muted-foreground">{formatDistanceKm(selecting.distanceKm, selecting.travelEstimated)} · {formatEtaMinutes(selecting.etaMinutes, selecting.travelEstimated)}</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Selected from search results. Review capabilities and recommendations before final decision.</p>
              )}
            </div>
            {'isMock' in selecting && selecting.isMock ? (
              <MockNotice>This hospital entry is based on demo/simulated data.</MockNotice>
            ) : null}
            <p className="text-xs text-slate-700">Selection records the chosen destination and who made the decision. The automatic alert was already sent when the case was submitted; use the alert list below to resend if needed.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelecting(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={selectMutation.isPending}
                onClick={() => {
                  const isRec = 'eligibility' in selecting;
                  const hospitalExternalId = isRec ? (selecting as RecommendationSummaryRow).hospitalExternalId : (selecting as Hospital).externalId;
                  const hospitalName = isRec ? (selecting as RecommendationSummaryRow).hospitalName : (selecting as Hospital).name;
                  selectMutation.mutate({
                    hospitalExternalId,
                    hospitalName,
                    recommendationId: recommendation?.id,
                    reason: changingDestination ? 'Destination changed by dispatcher from the case page.' : undefined,
                  });
                }}
              >
                {selectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                {changingDestination ? 'Confirm change' : 'Confirm selection'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button type="button" className="btn-ghost h-8 px-2" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
