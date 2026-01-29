import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Note from '@/models/Note';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get notes sent to this user
    const notes = await Note.find({ receiver: payload.userId })
      .populate('sender', 'name username role position')
      .sort({ createdAt: -1 });

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error: any) {
    console.error('[notes] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
