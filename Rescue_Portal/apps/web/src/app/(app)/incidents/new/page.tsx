'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Crosshair, Loader2, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  getCurrentLocation,
  isValidCoordinate,
  type CapturedLocation,
} from '@/lib/geolocation';
import { useAuth } from '@/lib/auth-context';
import { PERMISSIONS } from '@/lib/constants';
import { hasPermission } from '@/lib/utils';
import { ErrorBox, PageHeader } from '@/components/ui';
import { VoiceInput } from '@/components/voice-input';

export default function NewIncidentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [voiceNotice, setVoiceNotice] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);

  const voiceLanguage = useMemo(
    () => (typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US'),
    [],
  );

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationError('');
    try {
      const position = await getCurrentLocation();
      if (!isValidCoordinate(position.latitude, position.longitude)) {
        throw new Error('The browser returned an invalid location. Please try again.');
      }
      setLocation(position);
    } catch (err) {
      setLocation(null);
      setLocationError(
        err instanceof Error
          ? err.message
          : 'Unable to retrieve location. Check browser permission and try again.',
      );
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    void locate();
  }, [locate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!narrative.trim()) {
      setError('Explain the patient details in the text box or dictate them with the microphone.');
      return;
    }
    if (!location || !isValidCoordinate(location.latitude, location.longitude)) {
      setError('Patient location is required. Allow location access and use the location button.');
      return;
    }
    setSubmitting(true);
    try {
      const incident = await api<{ id: string }>('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          narrative: narrative.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
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
        description="Describe the patient once, in your own words. The backend AI extracts the injury, condition, treatment, required equipment, priority and hospital needs, then recommends the nearest suitable hospital and alerts it automatically."
      />
      <form onSubmit={onSubmit} className="mx-auto grid max-w-4xl gap-6">
        {locationError ? <ErrorBox message={locationError} /> : null}
        {error ? <ErrorBox message={error} /> : null}

        <section className="card-surface p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Patient location</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Captured from this device. Used for distance, ETA and hospital recommendation.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary h-9 px-3"
              onClick={() => { void locate(); }}
              disabled={locating}
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              {locating ? 'Locating…' : location ? 'Update location' : 'Use my location'}
            </button>
          </div>
          {location ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              Location captured: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              {location.accuracyMeters === null ? '' : ` (±${Math.round(location.accuracyMeters)} m)`}
            </p>
          ) : (
            <p className="text-xs text-amber-700">
              Waiting for location access. Allow location permission in your browser, then use the button above.
            </p>
          )}
        </section>

        <section className="card-surface p-5">
          <h2 className="font-semibold text-slate-900">Full patient details</h2>
          <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">
            This is the only patient input. Include the patient&apos;s name, age, symptoms, injury, current condition,
            treatment already given, location/landmark and any equipment or specialist needed. You may type or use the
            microphone; review the exact text before submitting.
          </p>
          <VoiceInput
            label="Patient details"
            value={narrative}
            onChange={setNarrative}
            language={voiceLanguage}
            rows={9}
            required
            placeholder="Example: A 32-year-old male named Ahmed was in a road accident. He has chest pain and a fractured leg, is bleeding and barely conscious. We gave oxygen and bandaged the wound. He needs a ventilator, CT scan and an orthopaedic surgeon. Location: near Peshawar Morris Jirga."
            onCaptureComplete={() =>
              setVoiceNotice('Voice transcript added. Check it word-for-word before submitting; the AI will extract the clinical fields on submit.')
            }
            onListeningChange={setVoiceListening}
            hint="Voice-to-text uses your browser's speech engine while the AI organizes the details on submit. Accuracy depends on the microphone, language and browser service, so always review the text."
          />
          {voiceNotice ? <p className="mt-3 text-xs font-medium text-emerald-700">{voiceNotice}</p> : null}
          {voiceListening ? <p className="mt-2 text-xs text-amber-700">Microphone is live. Press Stop when you finish speaking.</p> : null}
        </section>

        <section className="card-surface p-5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Submitting extracts the clinical details with AI, generates a single nearest eligible hospital recommendation
            from live Hospital Portal capability data, and sends the pre-arrival alert automatically.
          </p>
          <button type="submit" className="btn-primary mt-4 w-full" disabled={submitting || voiceListening}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Creating case…' : 'Create emergency case'}
          </button>
        </section>
      </form>
    </div>
  );
}
