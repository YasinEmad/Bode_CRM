import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
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

    const userId = req.nextUrl.searchParams.get('userId');
    const status = req.nextUrl.searchParams.get('status');

    let query: any = {};
    if (userId) {
      try {
        const { Types } = await import('mongoose');
        query.assignedTo = new Types.ObjectId(userId);
      } catch {
        query.assignedTo = userId;
      }
    }
    if (status) query.status = status;

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
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

    await connectDB();

    const { name, budget, phone, status, source, notes, assignedTo } = await req.json();

    if (!name || !budget || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate budget is a number
    const budgetNum = typeof budget === 'string' ? parseInt(budget) : budget;
    if (isNaN(budgetNum)) {
      return NextResponse.json({ error: 'Budget must be a valid number' }, { status: 400 });
    }

    // Convert assignedTo to ObjectId if it's a valid string
    let assignedToId: any = undefined;
    if (assignedTo) {
      try {
        const { Types } = await import('mongoose');
        assignedToId = new Types.ObjectId(assignedTo);
      } catch {
        return NextResponse.json({ error: 'Invalid assignedTo ID' }, { status: 400 });
      }
    }

    const lead = await Lead.create({
      name,
      budget: budgetNum,
      phone,
      status: status || 'new',
      source: source || 'other',
      notes: notes || '',
      assignedTo: assignedToId,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
