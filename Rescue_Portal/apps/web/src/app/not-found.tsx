'use client';

import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    if (
      pathname === '/rescue' ||
      pathname.startsWith('/rescue/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname === '/favicon.ico'
    ) {
      return;
    }

    const suffix = pathname === '/' ? '' : pathname;
    window.location.replace(`/rescue${suffix}${search}${hash}`);
  }, []);

  return (
    <main style={{ padding: '3rem', textAlign: 'center' }}>
      <h1>Rescue Portal</h1>
      <p>Redirecting to the Rescue Portal...</p>
      <a href="/rescue">Open Rescue Portal</a>
    </main>
  );
}
