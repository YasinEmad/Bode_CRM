import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Automatic recalculation of commissions is disabled.
    // The system must not auto-calculate commission amounts; admin should set values manually.
    return NextResponse.json({ error: 'Automatic recalculation disabled' }, { status: 403 });
  } catch (error) {
    console.error('Error recalculating commissions:', error);
    return NextResponse.json({ error: 'Failed to recalculate commissions' }, { status: 500 });
  }
}
