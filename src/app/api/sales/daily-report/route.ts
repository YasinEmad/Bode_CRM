import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
import User from '@/models/User';
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
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role !== 'sales') {
      return NextResponse.json({ error: 'Sales role required' }, { status: 403 });
    }

    // Find the team the sales belongs to OR the team they lead
    const team = await Team.findOne({ $or: [{ members: user._id }, { leader: user._id }] });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let performance = null;
    if (team) {
      performance = await TeamPerformance.findOne({ userId: user._id, teamId: team._id, month });
    }

    const emptyDays: Record<string, number> = {};
    for (let i = 1; i <= daysInMonth; i++) emptyDays[`day${i}`] = 0;

    const response = {
      userId: user._id,
      teamId: team?._id || null,
      month,
      daysInMonth,
      sheets: performance ? Object.fromEntries(performance.sheets || new Map()) : emptyDays,
      meetings: performance ? Object.fromEntries(performance.meetings || new Map()) : emptyDays,
      requests: performance ? Object.fromEntries(performance.requests || new Map()) : emptyDays,
      today: `day${now.getDate()}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/sales/daily-report:', error);
    return NextResponse.json({ error: 'Failed to load daily report' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role !== 'sales') {
      return NextResponse.json({ error: 'Sales role required' }, { status: 403 });
    }

    const body = await req.json();

    // Prevent sales from submitting assessments
    if (body.assessments) {
      return NextResponse.json({ error: 'Sales cannot submit assessments' }, { status: 403 });
    }

    // Only allow numbers for sheets/meetings/requests and only for current day
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = `day${now.getDate()}`;

    const allowedKeys = ['sheets', 'meetings', 'requests'];
    const hasAllowed = allowedKeys.some((k) => typeof body[k] !== 'undefined');
    if (!hasAllowed) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    // Find user's team (either as member or as leader)
    const team = await Team.findOne({ $or: [{ members: user._id }, { leader: user._id }] });
    if (!team) return NextResponse.json({ error: 'User is not assigned to a team' }, { status: 403 });

    // Find or create performance for this user/team/month
    let perf = await TeamPerformance.findOne({ userId: user._id, teamId: team._id, month });
    if (!perf) {
      perf = new TeamPerformance({ userId: user._id, teamId: team._id, month });
    }

    // Only update today's keys. Ignore any provided day keys or month in the request body.
    if (typeof body.sheets !== 'undefined') {
      const value = Number(body.sheets) || 0;
      perf.sheets = perf.sheets || new Map();
      perf.sheets.set(dayKey, value);
    }

    if (typeof body.meetings !== 'undefined') {
      const value = Number(body.meetings) || 0;
      perf.meetings = perf.meetings || new Map();
      perf.meetings.set(dayKey, value);
    }

    if (typeof body.requests !== 'undefined') {
      const value = Number(body.requests) || 0;
      perf.requests = perf.requests || new Map();
      perf.requests.set(dayKey, value);
    }

    await perf.save();

    return NextResponse.json({ performance: perf }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/sales/daily-report:', error);
    return NextResponse.json({ error: 'Failed to save daily report' }, { status: 500 });
  }
}
