'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Crosshair, Loader2, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getCurrentLocation, isValidCoordinate } from '@/lib/geolocation';
import { useAuth } from '@/lib/auth-context';
import { CAPABILITY_GROUPS, EMERGENCY_TYPES, PERMISSIONS, SEVERITIES } from '@/lib/constants';
import { hasPermission, titleCase } from '@/lib/utils';
import { ErrorBox, Field, PageHeader } from '@/components/ui';
import { VoiceInput } from '@/components/voice-input';

const DEFAULT_CAPABILITIES = ['SERVICE_EMERGENCY_DEPARTMENT', 'BED_EMERGENCY'];

export default function NewIncidentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationCaptured, setLocationCaptured] = useState('');
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    emergencyType: 'MEDICAL',
    severity: 'HIGH',
    latitude: '',
    longitude: '',
    address: '',
    patientName: '',
    age: '',
    gender: '',
  });
  const [symptoms, setSymptoms] = useState('');
  const [injuries, setInjuries] = useState('');
  const [suspectedCondition, setSuspectedCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [resourceNeeds, setResourceNeeds] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>(DEFAULT_CAPABILITIES);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCapability(code: string) {
    setCapabilities((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  async function locate() {
    setLocating(true);
    setLocationError('');
    setLocationCaptured('');
    try {
      const position = await getCurrentLocation();
      update('latitude', position.latitude.toFixed(6));
      update('longitude', position.longitude.toFixed(6));
      setLocationCaptured(
        `Location captured: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}${
          position.accuracyMeters === null ? '' : ` (±${Math.round(position.accuracyMeters)} m)`
        }`,
      );
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Unable to retrieve location. Enter coordinates manually.');
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (
      !form.latitude.trim() ||
      !form.longitude.trim() ||
      !isValidCoordinate(latitude, longitude)
    ) {
      setError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180), or use "Use my location".');
      return;
    }
    setSubmitting(true);
    try {
      const combinedNotes = [notes.trim(), resourceNeeds.trim() ? `Required resources/equipment (notes): ${resourceNeeds.trim()}` : '']
        .filter(Boolean)
        .join('\n');
      const incident = await api<{ id: string }>('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          emergencyType: form.emergencyType,
          severity: form.severity,
          latitude,
          longitude,
          address: form.address || undefined,
          requiredCapabilities: capabilities,
          patient: {
            patientName: form.patientName || undefined,
            age: form.age ? Number(form.age) : undefined,
            gender: form.gender || undefined,
            symptoms: symptoms || undefined,
            injuries: injuries || undefined,
            suspectedCondition: suspectedCondition || undefined,
            notes: combinedNotes || undefined,
          },
        }),
      });
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create the emergency case.');
    } finally {
      setSubmitting(false);
    }
  }

  if (user && !hasPermission(user, PERMISSIONS.INCIDENT_CREATE)) {
    return <ErrorBox message="You do not have permission to create emergency cases." />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Emergency intake"
        title="New emergency case"
        description="Enter emergency details and submit. Voice-to-text and location capture are available. The right hospital is recommended from live Hospital Portal data and a pre-arrival alert is sent automatically."
      />
      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          {locationError ? <ErrorBox message={locationError} /> : null}
          {error ? <ErrorBox message={error} /> : null}

          <section className="card-surface p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Emergency & patient location</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emergency type" required>
                <select className="input-base" required value={form.emergencyType} onChange={(e) => update('emergencyType', e.target.value)}>
                  {EMERGENCY_TYPES.map((type) => (
                    <option key={type} value={type}>{titleCase(type)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Emergency severity / priority" required>
                <select className="input-base" required value={form.severity} onChange={(e) => update('severity', e.target.value)}>
                  {SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>{titleCase(severity)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Patient&apos;s current location is required for nearby hospital search and distance/ETA.</p>
              <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={locate} disabled={locating}>
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
                {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>
            {locationCaptured ? <p className="mt-2 text-xs font-medium text-emerald-700">{locationCaptured}</p> : null}
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" required>
                <input className="input-base font-mono" type="number" step="any" min={-90} max={90} required value={form.latitude} onChange={(e) => update('latitude', e.target.value)} placeholder="e.g. 31.5204" />
              </Field>
              <Field label="Longitude" required>
                <input className="input-base font-mono" type="number" step="any" min={-180} max={180} required value={form.longitude} onChange={(e) => update('longitude', e.target.value)} placeholder="e.g. 74.3587" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Address or landmark">
                <input className="input-base" maxLength={300} value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, area, city or landmark" />
              </Field>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="mb-1 font-semibold text-slate-900">Patient & emergency details</h2>
            <p className="mb-4 text-xs text-muted-foreground">Provide minimum necessary information. Use voice-to-text or type manually for key fields.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Patient name">
                <input className="input-base" maxLength={120} value={form.patientName} onChange={(e) => update('patientName', e.target.value)} placeholder="Leave blank if unidentified" />
              </Field>
              <Field label="Age">
                <input className="input-base" type="number" min={0} max={130} value={form.age} onChange={(e) => update('age', e.target.value)} />
              </Field>
              <Field label="Gender">
                <select className="input-base" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                  <option value="">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <VoiceInput label="Symptoms or injury details" value={symptoms} onChange={setSymptoms} placeholder="Describe symptoms and/or injuries…" rows={4} />
              <VoiceInput label="Injury details (if separate)" value={injuries} onChange={setInjuries} placeholder="Specific injury details, if needed…" rows={3} />
              <VoiceInput label="Patient's current condition" value={suspectedCondition} onChange={setSuspectedCondition} placeholder="Current condition, responsiveness, severity indicators…" rows={3} />
              <VoiceInput label="Additional emergency notes" value={notes} onChange={setNotes} placeholder="Hazards, number of patients, access issues, other notes…" rows={3} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="font-semibold text-slate-900">Required medical facilities / equipment</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Select required capabilities for hospital search, recommendations, and comparison. These are requirements, not diagnoses.
            </p>
            <div className="mb-4">
              <VoiceInput
                label="Required facilities or equipment (voice or type)"
                value={resourceNeeds}
                onChange={setResourceNeeds}
                placeholder="Dictate or type needed facilities/equipment, then confirm matching selections below…"
                rows={3}
              />
            </div>
            <div className="space-y-5">
              {CAPABILITY_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => {
                      const selected = capabilities.includes(item.code);
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => toggleCapability(item.code)}
                          className={
                            selected
                              ? 'rounded-full border border-primary bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground'
                              : 'rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/40'
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{capabilities.length} capability requirement(s) selected.</p>
          </section>

          <section className="card-surface p-5">
            <h2 className="font-semibold text-slate-900">Submit emergency</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Submitting creates the emergency case, recommends the best eligible hospital from live Hospital Portal data, selects it, and sends the pre-arrival alert. You can still review or change the destination on the case page.
            </p>
            <button type="submit" className="btn-primary mt-4 w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? 'Creating case…' : 'Create emergency case'}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}
