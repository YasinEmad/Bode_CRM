import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
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
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const { name, budget, phone, status, source, notes, assignedTo } = await req.json();

    // Only admin can edit name, budget, phone, source, assignedTo
    // Sales can only edit status and notes for their assigned leads
    if (payload.role === 'sales') {
      if (name || budget !== undefined || phone || source || assignedTo !== undefined) {
        return NextResponse.json({ error: 'Sales can only update status and notes' }, { status: 403 });
      }
      // Verify lead is assigned to this sales person
      const lead = await Lead.findById(id);
      if (!lead || lead.assignedTo?.toString() !== payload.userId) {
        return NextResponse.json({ error: 'You can only update your assigned leads' }, { status: 403 });
      }
    } else if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin or sales access required' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (budget !== undefined) updateData.budget = budget;
    if (phone) updateData.phone = phone;
    if (status) updateData.status = status;
    if (source) updateData.source = source;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true }).populate(
      'assignedTo',
      'name email'
    );

    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Auto-create commission if status is changed to "closed" and no pending/approved commission exists
    if (status === 'closed' && updatedLead.assignedTo) {
      const existingCommission = await Commission.findOne({
        dealId: id,
        status: { $in: ['pending', 'approved'] },
      });

      if (!existingCommission) {
        // Create commission with default 5% percentage
        const amount = (updatedLead.budget || 0) * 0.05;
        await Commission.create({
          dealId: id,
          employeeId: updatedLead.assignedTo,
          amount,
          percentage: 5,
          status: 'pending',
        });
      }
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function GET(
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
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const lead = await Lead.findById(id).populate('assignedTo', 'name email');
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function DELETE(
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

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Lead deleted successfully', lead });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
