import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export async function POST() {
  try {
    const result = await dataStore.resetDatabase();
    return NextResponse.json({
      success: true,
      message: "Database successfully reset to initial KPK healthcare seed data",
      mode: result.mode
    });
  } catch (error) {
    console.error("Database Reset Error:", error);
    return NextResponse.json({ error: "Failed to reset database" }, { status: 500 });
  }
}

