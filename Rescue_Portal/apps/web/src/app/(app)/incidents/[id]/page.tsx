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
import { Badge, Card, EmptyState, ErrorBox, Field, Loading, MockNotice, Notice, PageHeader } from '@/components/ui';
import { VoiceInput } from '@/components/voice-input';

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

  const [radiusKm, setRadiusKm] = useState('25');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState({ latitude: '', longitude: '' });
  const [locatingCase, setLocatingCase] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [searchRequirements, setSearchRequirements] = useState('');
  const [searchData, setSearchData] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState<RecommendationSummaryRow | Hospital | null>(null);
  const [selectReason, setSelectReason] = useState('');
  const [etaDrafts, setEtaDrafts] = useState<Record<string, string>>({});

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

  async function captureCaseLocation() {
    setLocatingCase(true);
    try {
      const position = await getCurrentLocation();
      setLocationDraft({
        latitude: position.latitude.toFixed(6),
        longitude: position.longitude.toFixed(6),
      });
      toast.success('Location captured. Save it to update this case.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to retrieve location');
    } finally {
      setLocatingCase(false);
    }
  }

  async function saveLocation() {
    const latitude = Number(locationDraft.latitude);
    const longitude = Number(locationDraft.longitude);
    if (!isValidCoordinate(latitude, longitude)) {
      toast.error('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    setSavingLocation(true);
    try {
      await api(`/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude, longitude }),
      });
      setEditingLocation(false);
      toast.success('Patient location updated. Generate new recommendations to use it.');
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update location');
    } finally {
      setSavingLocation(false);
    }
  }

  async function doSearch() {
    if (!incident) return;
    setSearching(true);
    try {
      const data = await api<SearchResult>(
        `/hospitals/search${queryString({ latitude: incident.latitude, longitude: incident.longitude, radiusKm: Number(radiusKm) || 25, limit: 20 })}`,
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
      body: JSON.stringify({ searchRadiusKm: Number(radiusKm) || 25, notes: searchRequirements.trim() || undefined }),
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
      setSelectReason('');
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

  const etaMutation = useMutation({
    mutationFn: ({ requestId, etaMinutes }: { requestId: string; etaMinutes: number }) =>
      api(`/hospital-requests/${requestId}/eta`, { method: 'POST', body: JSON.stringify({ etaMinutes }) }),
    onSuccess: () => {
      toast.success('ETA sent to hospital portal');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
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
                  {canUpdate && !editingLocation ? (
                    <button type="button" className="btn-ghost h-6 px-2 text-[11px]" onClick={() => { setLocationDraft({ latitude: String(incident.latitude), longitude: String(incident.longitude) }); setEditingLocation(true); }}>
                      Update
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 font-medium text-slate-800"><MapPin className="mr-1 inline h-3.5 w-3.5" />{incident.address || 'Address not provided'}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}</p>
                {editingLocation ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input aria-label="Latitude" className="input-base h-8 px-2 font-mono text-xs" type="number" step="any" min={-90} max={90} value={locationDraft.latitude} onChange={(e) => setLocationDraft((current) => ({ ...current, latitude: e.target.value }))} />
                      <input aria-label="Longitude" className="input-base h-8 px-2 font-mono text-xs" type="number" step="any" min={-180} max={180} value={locationDraft.longitude} onChange={(e) => setLocationDraft((current) => ({ ...current, longitude: e.target.value }))} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="btn-secondary h-7 px-2 text-[11px]" onClick={captureCaseLocation} disabled={locatingCase}>
                        {locatingCase ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <MapPin className="mr-1 inline h-3 w-3" />}
                        Use my location
                      </button>
                      <button type="button" className="btn-primary h-7 px-2 text-[11px]" onClick={saveLocation} disabled={savingLocation}>
                        {savingLocation ? 'Saving…' : 'Save location'}
                      </button>
                      <button type="button" className="btn-ghost h-7 px-2 text-[11px]" onClick={() => setEditingLocation(false)}>Cancel</button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Saved coordinates are used for the next hospital search and recommendation.</p>
                  </div>
                ) : null}
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {incident.patient?.symptoms ? <div><dt className="text-xs font-semibold text-muted-foreground">Symptoms / injury details</dt><dd className="whitespace-pre-wrap">{incident.patient.symptoms}</dd></div> : null}
              {incident.patient?.injuries ? <div><dt className="text-xs font-semibold text-muted-foreground">Injury details</dt><dd className="whitespace-pre-wrap">{incident.patient.injuries}</dd></div> : null}
              {incident.patient?.notes ? <div><dt className="text-xs font-semibold text-muted-foreground">Additional notes</dt><dd className="whitespace-pre-wrap">{incident.patient.notes}</dd></div> : null}
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
            <div className="mb-4">
              <VoiceInput
                label="Hospital search requirements"
                value={searchRequirements}
                onChange={setSearchRequirements}
                rows={2}
                placeholder="Type or dictate special requirements (e.g. trauma center, pediatric ICU, burn unit, ventilator availability)..."
                hint="Use voice or type to capture requirements; they refine the next recommendation. Hospital suitability is still determined from live hospital capability data."
              />
            </div>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="w-40">
                <Field label="Search radius (km)" htmlFor="radius-km">
                  <input id="radius-km" className="input-base h-9" type="number" min={1} max={200} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
                </Field>
              </div>
              <button type="button" className="btn-secondary h-9" onClick={doSearch} disabled={searching || !hasPermission(user, PERMISSIONS.HOSPITAL_READ)}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search nearby hospitals
              </button>
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
                              <button type="button" className="btn-secondary h-7 px-2 text-[11px]" onClick={() => { setSelecting(h); setSelectReason(''); }}>Select</button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="No hospitals found" description="Try increasing the search radius or check hospital data configuration." />
            ) : <p className="text-sm text-muted-foreground">Run a search to find suitable nearby hospitals for this case.</p>}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-primary" /> AI recommendations & comparison</h2>
                <p className="mt-1 text-xs text-muted-foreground">Decision support only. Recommendations do not diagnose or select a hospital.</p>
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
              <EmptyState title="No recommendations generated yet" description="Generate recommendations to compare hospitals by suitability, facilities, distance, and ETA." />
            ) : null}

            {recommendation ? (
              <div className="space-y-4">
                {recommendation.aiSuggestion ? (
                  <div className="rounded-lg border border-primary/30 bg-accent/40 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> AI suggested destination (decision support only)
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

                <div className="space-y-3">
                  {results.map((row) => (
                    <div key={row.hospitalExternalId} className={cn('rounded-lg border p-4', row.eligibility === 'ELIGIBLE' ? 'border-emerald-200' : row.eligibility === 'INELIGIBLE' ? 'border-rose-200 bg-rose-50/20' : 'border-amber-200')}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{row.hospitalName}</p>
                            <Badge value={row.eligibility} />
                            <Badge value={row.freshness.status} />
                            {row.isMock ? <Badge value="MOCK" label="Demo" /> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{row.address || 'Address unavailable'}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Distance: <span className="font-medium text-slate-700">{formatDistanceKm(row.distanceKm, row.travelEstimated)}</span>
                            {' · '}ETA: <span className="font-medium text-slate-700">{formatEtaMinutes(row.etaMinutes, row.travelEstimated)}</span>
                            {' · '}Score {row.score}
                          </p>
                          {row.travelEstimated ? <p className="mt-0.5 text-[11px] text-amber-700">Estimated travel values (not live traffic/routing) unless provider states otherwise.</p> : null}
                        </div>
                        {canSelect ? (
                          <button type="button" className={row.eligibility === 'ELIGIBLE' ? 'btn-primary h-8 px-3 text-xs' : 'btn-secondary h-8 px-3 text-xs'} onClick={() => { setSelecting(row); setSelectReason(''); }}>
                            Select destination
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 rounded-md border bg-white p-3">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Why recommended ({row.explanationMode === 'ai' ? 'AI explanation' : 'Rule-based explanation'})</p>
                        <p className="text-sm text-slate-700">{row.explanation || row.reasons.join(' ') || 'No explanation available.'}</p>
                      </div>
                      {row.warnings?.length ? <ul className="mt-2 space-y-0.5 text-[11px] text-amber-800">{row.warnings.map((w) => <li key={w}>• {w}</li>)}</ul> : null}
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">Data: {row.dataSource}{row.isMock ? ' (demo)' : ''} · {row.travelEstimated ? 'estimated travel' : 'routing provider'} · observed {row.observedAt ? formatDate(row.observedAt) : 'unknown'}</p>
                    </div>
                  ))}
                </div>

                {comparisonCaps.length > 0 && results.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">Hospital comparison (facilities, beds, resources)</h3>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="table-base min-w-[640px] text-xs">
                        <thead>
                          <tr>
                            <th>Hospital</th>
                            {comparisonCaps.map((code) => <th key={code}>{CAPABILITY_LABELS[code] ?? code}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((row) => (
                            <tr key={`cmp-${row.hospitalExternalId}`}>
                              <td className="font-medium text-slate-800">
                                {row.hospitalName}
                                <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">{formatDistanceKm(row.distanceKm, row.travelEstimated)} · {formatEtaMinutes(row.etaMinutes, row.travelEstimated)}</div>
                              </td>
                              {comparisonCaps.map((code) => {
                                const cap = capabilityFor(row, code);
                                const status = comparisonStatus(cap, row.freshness.status);
                                return (
                                  <td key={code}>
                                    <Badge value={status} />
                                    {typeof cap?.quantity === 'number' ? <span className="ml-1 text-[10px] text-muted-foreground">({cap.quantity})</span> : null}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Statuses: Available, Limited, Unavailable, Unknown, Outdated. Unknown/outdated are not shown as available.</p>
                  </div>
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
                      {canAlert && req.sentAt ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={1440}
                            className="input-base h-8 w-24 py-1 text-xs"
                            placeholder="ETA (min)"
                            value={etaDrafts[req.id] ?? ''}
                            onChange={(event) => setEtaDrafts((current) => ({ ...current, [req.id]: event.target.value }))}
                          />
                          <button
                            type="button"
                            className="btn-secondary h-8 px-3 text-xs"
                            disabled={etaMutation.isPending || !etaDrafts[req.id]}
                            onClick={() => etaMutation.mutate({ requestId: req.id, etaMinutes: Number(etaDrafts[req.id]) })}
                          >
                            {etaMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Send ETA
                          </button>
                        </div>
                      ) : null}
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
            <p className="text-xs text-slate-700">Selection records the chosen destination and who made the decision. It does <strong>not</strong> send a pre-arrival alert or imply hospital acceptance.</p>
            <Field label={changingDestination ? 'Reason for change' : 'Reason (recommended; required for changes)'} required={changingDestination}>
              <textarea className="input-base min-h-20 py-2" value={selectReason} onChange={(e) => setSelectReason(e.target.value)} placeholder={changingDestination ? 'Why is the destination being changed?' : 'Optional reason for this selection'} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelecting(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={selectMutation.isPending || (changingDestination && !selectReason.trim())}
                onClick={() => {
                  const isRec = 'eligibility' in selecting;
                  const hospitalExternalId = isRec ? (selecting as RecommendationSummaryRow).hospitalExternalId : (selecting as Hospital).externalId;
                  const hospitalName = isRec ? (selecting as RecommendationSummaryRow).hospitalName : (selecting as Hospital).name;
                  selectMutation.mutate({ hospitalExternalId, hospitalName, recommendationId: recommendation?.id, reason: selectReason.trim() || undefined });
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
