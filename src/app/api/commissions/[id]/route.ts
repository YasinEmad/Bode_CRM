import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { status, rejectionReason, rejectionNote } = await req.json();

    const commission = await Commission.findByIdAndUpdate(
      id,
      {
        status,
        approvedBy: status === 'approved' ? payload.userId : undefined,
        approvalDate: status === 'approved' ? new Date() : undefined,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        rejectionNote: status === 'rejected' ? rejectionNote : undefined,
      },
      { new: true }
    )
      .populate('dealId', 'name budget')
      .populate('employeeId', 'name');

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    return NextResponse.json({ commission });
  } catch (error) {
    console.error('Error updating commission:', error);
    return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 });
  }
}
