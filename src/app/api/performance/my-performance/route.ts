import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TeamPerformance from '@/models/TeamPerformance';
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

    // Fetch user's own performance data for the given month
    const performance = await TeamPerformance.findOne({
      userId: payload.userId,
      month,
    });

    if (!performance) {
      // Return default performance data if not found
      return NextResponse.json({
        performance: {
          callsCount: 0,
          meetingsCount: 0,
          assessmentsCount: 0,
        },
      });
    }

    // Calculate total counts from weekly data
    const callsCount = (
      (performance.calls?.week1 || 0) +
      (performance.calls?.week2 || 0) +
      (performance.calls?.week3 || 0) +
      (performance.calls?.week4 || 0)
    );

    const meetingsCount = (
      (performance.meetings?.week1 || 0) +
      (performance.meetings?.week2 || 0) +
      (performance.meetings?.week3 || 0) +
      (performance.meetings?.week4 || 0)
    );

    const assessmentsCount = (
      (performance.assessments?.week1 || 0) +
      (performance.assessments?.week2 || 0) +
      (performance.assessments?.week3 || 0) +
      (performance.assessments?.week4 || 0)
    );

    return NextResponse.json({
      performance: {
        callsCount,
        meetingsCount,
        assessmentsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching performance:', error);
    return NextResponse.json({ error: 'Failed to fetch performance' }, { status: 500 });
  }
}
