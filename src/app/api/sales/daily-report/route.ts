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

function convertMongoMapToObject(data: any): Record<string, number> {
  if (!data) return {};
  // MongoDB Map fields might come back as plain objects or Maps
  if (data instanceof Map) {
    return Object.fromEntries(data);
  }
  // If it's already a plain object, return it directly
  return typeof data === 'object' ? data : {};
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

    // Find the team the sales belongs to OR the team they lead.  do **not**
    // treat a missing team as an error; unassigned employees are allowed to
    // record activity and will simply have `teamId: null`.
    let team = await Team.findOne({ $or: [{ members: user._id }, { leader: user._id }] });
    if (!team && user.teamId) {
      // some user docs still track membership via user.teamId rather than the
      // Team.members list; check that as a fallback so the UI is more resilient.
      team = await Team.findById(user.teamId);
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let performance: any = null;
    // Always search by userId + month only to handle team transfers
    performance = await TeamPerformance.findOne({ userId: user._id, month });
    if (performance && team) {
      // Update teamId if it has changed
      performance.teamId = team._id;
    }

    // when there's no performance document we return empty objects rather
    // than pre‑filling all days with zeros.  this lets the UI render blanks
    // when the user hasn't entered any numbers yet instead of misleading
    // them with a default "0".
    const response = {
      userId: user._id,
      teamId: team?._id || null,
      month,
      daysInMonth,
      sheets: performance ? convertMongoMapToObject(performance.sheets) : {},
      meetings: performance ? convertMongoMapToObject(performance.meetings) : {},
      requests: performance ? convertMongoMapToObject(performance.requests) : {},
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

    // Determine the team if any, but we won't refuse the request when the
    // user isn't part of a team.  many legacy users are left un‑assigned and
    // still need to track personal numbers.
    let team = await Team.findOne({ $or: [{ members: user._id }, { leader: user._id }] });
    if (!team && user.teamId) {
      team = await Team.findById(user.teamId);
    }

    // Find or create performance for this user/month.  Search by userId + month only
    // to handle team transfers correctly - a user's records should follow them when transferred.
    let perf: any = null;
    perf = await TeamPerformance.findOne({ userId: user._id, month });
    
    if (perf && team) {
      // Update teamId if it has changed due to team transfer
      perf.teamId = team._id;
    }

    if (!perf) {
      perf = new TeamPerformance({ userId: user._id, teamId: team?._id || null, month });
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
