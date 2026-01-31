import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
import Lead from '@/models/Lead';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
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

    let query: any = {};

    if (payload.role === 'sales') {
      query.employeeId = payload.userId;
    }

    const status = req.nextUrl.searchParams.get('status');
    if (status) {
      query.status = status;
    }

    const commissions = await Commission.find(query)
      .populate('dealId', 'name project phone proofImage info notes')
      .populate('employeeId', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ commissions });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only admin can create commission entries and must provide an amount
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to create commission' }, { status: 403 });
    }

    await connectDB();

    const { dealId, employeeId, amount, percentage: percentageFromBody } = await req.json();

    // Verify the lead exists and belongs to the employee
    const lead = await Lead.findById(dealId);
    if (!lead) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Admin must provide `amount`. Do not auto-calculate from lead/project or position.
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Amount is required and must be numeric' }, { status: 400 });
    }

    const commission = await Commission.create({
      dealId,
      employeeId,
      amount: Number(amount),
      percentage: percentageFromBody !== undefined ? Number(percentageFromBody) : undefined,
      status: 'pending',
    });

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error) {
    console.error('Error creating commission:', error);
    return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 });
  }
}
