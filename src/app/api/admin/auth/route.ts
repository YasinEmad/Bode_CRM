import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, hashPassword } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    // Return basic admin info (do not expose password)
    const admin = await User.findOne({ role: 'admin' }).select('username name email');
    if (!admin) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });

    return NextResponse.json({ admin });
  } catch (err) {
    console.error('Error in GET /api/admin/auth', err);
    return NextResponse.json({ error: 'Failed to fetch admin' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const body = await req.json();
    const { username, password } = body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    const update: any = { username: username.trim() };

    if (password) {
      // Validate strong password on server as well
      const pwd = String(password);
      const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!strongPwdRegex.test(pwd)) {
        return NextResponse.json({ error: 'Password strength requirements not met' }, { status: 400 });
      }
      update.password = await hashPassword(pwd);
    }

    // Update the first admin user found
    const admin = await User.findOneAndUpdate({ role: 'admin' }, { $set: update }, { new: true });
    if (!admin) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });

    return NextResponse.json({ admin: { username: admin.username, name: admin.name, email: admin.email } });
  } catch (err: any) {
    console.error('Error in PUT /api/admin/auth', err);
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
  }
}
