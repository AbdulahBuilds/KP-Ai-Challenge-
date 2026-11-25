'use client';

import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { isFinal: boolean; 0: SpeechRecognitionAlternativeLike };
type SpeechRecognitionEventLike = { resultIndex: number; results: { length: number; [index: number]: SpeechRecognitionResultLike } };
type SpeechRecognitionErrorEventLike = { error?: string };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  language?: string;
  hint?: string;
}

const MAX_RESTARTS = 5;

function isTrustedVoiceOrigin(): boolean {
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

function appendTranscript(base: string, transcript: string): string {
  const addition = transcript.trim();
  if (!addition) return base;
  if (!base.trim()) return addition;
  return /\s$/.test(base) ? `${base}${addition}` : `${base} ${addition}`;
}

export function VoiceInput({
  value,
  onChange,
  label,
  placeholder,
  rows = 4,
  required,
  language = 'en-US',
  hint,
}: VoiceInputProps) {
  const inputId = useId();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [secureContext, setSecureContext] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseValueRef = useRef(value);
  const sessionRef = useRef(0);
  const shouldListenRef = useRef(false);
  const restartsRef = useRef(0);
  const hadFinalRef = useRef(false);

  useEffect(() => {
    baseValueRef.current = value;
  }, [value]);

  useEffect(() => {
    const Ctor = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
    setSupported(Boolean(Ctor));
    setSecureContext(isTrustedVoiceOrigin());
    if (navigator.permissions?.query) {
      try {
        navigator.permissions
          .query({ name: 'microphone' as PermissionName })
          .then((permission) => {
            if (permission.state === 'denied') {
              setError((current) => current || 'Microphone access is blocked in this browser. Allow it in site settings or type manually.');
            }
          })
          .catch(() => undefined);
      } catch {
        setError((current) => current || 'Microphone access is blocked in this browser. Allow it in site settings or type manually.');
      }
    }
    return () => {
      shouldListenRef.current = false;
      sessionRef.current += 1;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const status = useMemo(() => {
    if (error) return error;
    if (supported === false) return 'Voice input needs a Chromium browser (Chrome or Edge). Please type manually or switch browsers.';
    if (secureContext === false) return 'Voice input requires HTTPS or localhost. Open this app on localhost/HTTPS or type manually.';
    if (listening) return interim ? `Listening… "${interim}"` : 'Listening… review the transcribed text before submitting.';
    return 'Use the microphone to dictate, then review/edit manually. Voice input never auto-submits.';
  }, [error, interim, listening, secureContext, supported]);

  function stop() {
    shouldListenRef.current = false;
    sessionRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);
    setInterim('');
    try {
      recognition?.abort();
    } catch {
      /* ignore */
    }
  }

  function start() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    if (!isTrustedVoiceOrigin()) {
      setError('Voice input requires HTTPS or localhost. Please type manually.');
      return;
    }

    stop();
    setError('');
    setInterim('');
    shouldListenRef.current = true;
    hadFinalRef.current = false;
    sessionRef.current += 1;
    const session = sessionRef.current;
    restartsRef.current = 0;
    baseValueRef.current = value;

    try {
      const recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        if (sessionRef.current !== session) return;
        setListening(true);
      };

      recognition.onresult = (event) => {
        if (sessionRef.current !== session) return;
        let finalTranscript = '';
        let interimTranscript = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        if (finalTranscript) {
          const next = appendTranscript(baseValueRef.current, finalTranscript);
          baseValueRef.current = next;
          hadFinalRef.current = true;
          shouldListenRef.current = false;
          onChange(next);
          setInterim('');
        } else {
          setInterim(interimTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        if (sessionRef.current !== session || event.error === 'aborted') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission was denied. Allow microphone access or type manually.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone was found. Connect a microphone or type manually.');
        } else if (event.error === 'network') {
          setError('The browser speech service is unavailable (network error). Check your connection or type manually.');
        } else if (event.error === 'no-speech') {
          setInterim('');
        } else if (event.error) {
          setError(`Voice input error: ${event.error}. Please type manually.`);
        }
        shouldListenRef.current = false;
        recognitionRef.current = null;
        setListening(false);
        setInterim('');
      };

      recognition.onend = () => {
        if (sessionRef.current !== session) return;
        if (hadFinalRef.current) {
          shouldListenRef.current = false;
          recognitionRef.current = null;
          setListening(false);
          setInterim('');
          return;
        }
        if (shouldListenRef.current && restartsRef.current < MAX_RESTARTS) {
          restartsRef.current += 1;
          window.setTimeout(() => {
            if (sessionRef.current !== session || !shouldListenRef.current) return;
            try {
              recognition.start();
            } catch {
              shouldListenRef.current = false;
              recognitionRef.current = null;
              setListening(false);
              setError('Voice input stopped unexpectedly. Please type manually.');
            }
          }, 250);
          return;
        }
        setListening(false);
        setInterim('');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      shouldListenRef.current = false;
      recognitionRef.current = null;
      setListening(false);
      setError('Unable to start voice input. Please type manually.');
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </label>
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={supported !== true || secureContext !== true}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
            listening
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary',
          )}
          aria-pressed={listening}
          aria-label={listening ? `Stop voice input for ${label}` : `Start voice input for ${label}`}
        >
          {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {listening ? 'Stop' : 'Voice'}
        </button>
      </div>
      <textarea
        id={inputId}
        className="input-base min-h-[96px] py-2"
        rows={rows}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <div
        aria-live="polite"
        className={cn('mt-1.5 flex items-start gap-1.5 text-[11px]', error ? 'text-amber-700' : 'text-muted-foreground')}
      >
        {error || supported === false || secureContext === false ? (
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : listening ? (
          <span className="mt-1 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
        ) : null}
        <p>{status}</p>
      </div>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      <p className="sr-only">Voice language: {language}. Additional languages can be configured.</p>
    </div>
  );
}
