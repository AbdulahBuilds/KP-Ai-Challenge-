'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { ErrorBox, Field } from '@/components/ui';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isFormValid = email.trim().length > 0 && password.length > 0;

  useEffect(() => {
    if (!loading && user) router.replace('/incidents');
  }, [loading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!isFormValid) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/incidents');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Rescue Portal</p>
            <p className="text-xs text-muted-foreground">Rescue Admin access</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage emergency cases, hospital selection, and pre-arrival alerts.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error ? <ErrorBox message={error} /> : null}
          <Field label="Email address" required>
            <input
              className="input-base"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
            />
          </Field>
          <Field label="Password" required>
            <input
              className="input-base"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={submitting || !isFormValid}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
