'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ClipboardList, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/incidents', label: 'Emergency Cases', icon: ClipboardList },
  { href: '/incidents/new', label: 'New Emergency', icon: Plus },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <ShieldCheck className="h-5 w-5 text-primary" /> Loading secure session…
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link href="/incidents" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Rescue Portal</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Rescue Admin
              </p>
            </div>
          </Link>
          <nav className="ml-4 flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.href === '/incidents'
                  ? pathname === '/incidents' || (pathname.startsWith('/incidents/') && pathname !== '/incidents/new')
                  : pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                    active ? 'bg-accent text-accent-foreground' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{user.email}</span>
            <button
              type="button"
              onClick={() => logout().then(() => router.replace('/login'))}
              className="btn-secondary h-9 px-3"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">{children}</main>
    </div>
  );
}
