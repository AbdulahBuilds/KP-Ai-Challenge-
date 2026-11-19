'use client';

import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { isFinal: boolean; 0: SpeechRecognitionAlternativeLike };
type SpeechRecognitionEventLike = { resultIndex: number; results: { length: number; [index: number]: SpeechRecognitionResultLike } };
type SpeechRecognitionErrorEventLike = { error?: string };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
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
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Keeps the manually-typed portion in sync so voice appends to latest text.
  const baseValueRef = useRef(value);

  // Sync base ref whenever the parent-controlled value changes (manual typing).
  useEffect(() => {
    baseValueRef.current = value;
  }, [value]);

  useEffect(() => {
    const Ctor = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
    setSupported(Boolean(Ctor));
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const status = useMemo(() => {
    if (supported === false) return 'Voice input is not supported in this browser. Please type manually.';
    if (error) return error;
    if (listening) return 'Listening… review the transcribed text before submitting.';
    return 'Use the microphone to dictate, then review/edit manually. Voice input never auto-submits.';
  }, [supported, error, listening]);

  function abortRecognition() {
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }

  function start() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    // Stop any previous recognition cleanly.
    abortRecognition();
    setError('');
    try {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      // Start from current manually-typed value.
      baseValueRef.current = value;
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }
        // Apply final results immediately.
        if (finalTranscript) {
          onChange(`${baseValueRef.current}${finalTranscript}`.trimStart());
          baseValueRef.current = `${baseValueRef.current}${finalTranscript}`.trimStart();
        }
      };
      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access or type manually.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Try again or type manually.');
        } else if (event.error && event.error !== 'aborted') {
          setError(`Voice input error: ${event.error}. Please type manually.`);
        }
        setListening(false);
        recognitionRef.current = null;
      };
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      setError('Unable to start voice input. Please type manually.');
      setListening(false);
    }
  }

  function stop() {
    abortRecognition();
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </label>
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={supported === false}
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
        className="input-base min-h-[96px] py-2"
        rows={rows}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={cn('mt-1.5 flex items-start gap-1.5 text-[11px]', error ? 'text-amber-700' : 'text-muted-foreground')}>
        {(error || supported === false) ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : listening ? <span className="mt-1 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" /> : null}
        <p>{status}</p>
      </div>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      {/* Extensible for future languages (Urdu/Pashto) by passing language code */}
      <p className="sr-only">Voice language: {language}. Extensible for additional languages.</p>
    </div>
  );
}
