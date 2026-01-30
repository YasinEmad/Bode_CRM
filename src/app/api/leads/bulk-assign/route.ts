import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Commission from '@/models/Commission';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function PUT(req: NextRequest) {
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

    const { leadIds, employeeId } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0 || employeeId === undefined || employeeId === null) {
      return NextResponse.json(
        { error: 'leadIds array and employeeId are required' },
        { status: 400 }
      );
    }

    // Update leads with new assignment
    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { assignedTo: employeeId || null }
    );

    // Do not auto-create commissions when assigning leads. Admin must set commission values manually.

    return NextResponse.json(
      {
        message: `Successfully assigned ${result.modifiedCount} leads`,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning leads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign leads' },
      { status: 500 }
    );
  }
}
