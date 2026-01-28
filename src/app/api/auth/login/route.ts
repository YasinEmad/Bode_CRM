import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyPassword, generateSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateSessionToken(user._id.toString(), user.role);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
