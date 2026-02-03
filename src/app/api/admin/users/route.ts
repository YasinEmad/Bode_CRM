import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, hashPassword } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { username, password, name, email, phone, position } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 400 });

    const pwd = String(password);
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPwdRegex.test(pwd)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number and special character' }, { status: 400 });
    }

    const hashed = await hashPassword(pwd);

    const user = await User.create({
      username: username.trim(),
      password: hashed,
      name,
      email: email || '',
      phone: phone || '',
      position: position || '',
      role: 'admin',
      createdBy: payload.userId,
    });

    return NextResponse.json({ success: true, admin: { id: user._id, username: user.username, name: user.name, role: user.role } }, { status: 201 });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
