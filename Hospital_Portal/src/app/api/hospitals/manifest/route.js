import { NextResponse } from 'next/server';
import { hospitalsManifest } from '@/lib/Hospitals';

export const dynamic = 'force-dynamic';

// GET /api/hospitals/manifest - verified list of every hospital in this portal
export async function GET() {
  return NextResponse.json(hospitalsManifest());
}
