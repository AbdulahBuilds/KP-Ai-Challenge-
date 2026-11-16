import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
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
    return NextResponse.json({ error: "Server error during login" }, { status: 500 });
  }
}

