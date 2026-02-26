import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
import TeamLeaderPerformance from '@/models/TeamLeaderPerformance';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const month = req.nextUrl.searchParams.get('month');
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
    }

    const convertToObject = (data: any): Record<string, any> => {
      if (!data) return {};
      if (data instanceof Map) {
        return Object.fromEntries(data);
      }
      return typeof data === 'object' ? data : {};
    };

    // Fetch user's own performance data for the given month
    const performance = await TeamPerformance.findOne({
      userId: payload.userId,
      month,
    });

    if (!performance) {
      // Try falling back to team leader performance (for users who are leaders)
      const leaderPerf = await TeamLeaderPerformance.findOne({ userId: payload.userId, month });
      if (leaderPerf) {
        const sheets = convertToObject(leaderPerf.sheets);
        const meetings = convertToObject(leaderPerf.meetings);
        const assessments = convertToObject(leaderPerf.assessments);
        const requests = convertToObject(leaderPerf.requests);

        const sum = (o: Record<string, any>) => Object.values(o).reduce((s, v) => s + (Number(v) || 0), 0);

        const sheetsCount = sum(sheets);
        const meetingsCount = sum(meetings);
        const assessmentsCount = sum(assessments);
        const requestsCount = sum(requests);

        return NextResponse.json({
          performance: { sheetsCount, meetingsCount, assessmentsCount, requestsCount },
        });
      }

      // Return default performance data if not found anywhere
      return NextResponse.json({
        performance: {
          sheetsCount: 0,
          meetingsCount: 0,
          assessmentsCount: 0,
          requestsCount: 0,
        },
      });
    }

    // Calculate total counts from day-keyed maps
    const sheets = convertToObject(performance.sheets);
    const meetings = convertToObject(performance.meetings);
    const assessments = convertToObject(performance.assessments);
    const requests = convertToObject(performance.requests);

    const sum = (o: Record<string, any>) => Object.values(o).reduce((s, v) => s + (Number(v) || 0), 0);

    const sheetsCount = sum(sheets);
    const meetingsCount = sum(meetings);
    const assessmentsCount = sum(assessments);
    const requestsCount = sum(requests);

    return NextResponse.json({
      performance: {
        sheetsCount,
        meetingsCount,
        assessmentsCount,
        requestsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching performance:', error);
    return NextResponse.json({ error: 'Failed to fetch performance' }, { status: 500 });
  }
}
