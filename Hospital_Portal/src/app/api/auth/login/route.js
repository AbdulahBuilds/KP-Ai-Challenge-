import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
    const { username, password } = body ?? {};
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const user = await dataStore.authenticateUser(username.trim(), password.trim());
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials. Please check your username and password." }, { status: 401 });
    }

    const hospital = await dataStore.getHospitalById(user.hospitalId);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        hospitalId: user.hospitalId
      },
      hospital
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({
      error: "Server error during login",
      detail: process.env.NODE_ENV !== "production" ? String(error?.message ?? error) : undefined
    }, { status: 500 });
  }
}

