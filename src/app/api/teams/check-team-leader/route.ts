import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Team from '@/models/Team';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ isTeamLeader: false }, { status: 200 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ isTeamLeader: false }, { status: 200 });

    await connectDB();

    // Check if current user is a team leader
    const team = await Team.findOne({ leader: payload.userId }).lean();
    
    return NextResponse.json({ isTeamLeader: !!team });
  } catch (error) {
    console.error('Error checking team leader status:', error);
    return NextResponse.json({ isTeamLeader: false }, { status: 200 });
  }
}
