import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Lead from '@/models/Lead';
import Team from '@/models/Team';
import SystemSettings from '@/models/SystemSettings';
import Commission from '@/models/Commission';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const employee = await User.findById(id);
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Prevent deleting yourself
    const actor = await User.findById(payload.userId);
    if (!actor) return NextResponse.json({ error: 'Actor not found' }, { status: 401 });

    // Prevent a child admin from deleting their creator admin
    // (but allow self-deletion)
    if (employee.role === 'admin' && actor.createdBy && String(actor.createdBy) === String(employee._id)) {
      return NextResponse.json({ error: 'Forbidden: cannot delete your creator admin' }, { status: 403 });
    }

    // For admin deletion: only allow if actor (current admin) created the target admin OR if deleting self
    // Exception: root admins (createdBy = null) cannot be deleted by other admins, but an admin
    // should be allowed to delete their own account even if they're a root admin.
    if (employee.role === 'admin') {
      // Prevent deleting root admins (those with no creator) unless the actor is deleting themselves
      if (!employee.createdBy && String(actor._id) !== String(employee._id)) {
        return NextResponse.json({ error: 'Cannot delete root admin' }, { status: 403 });
      }
      // Allow deletion if actor created the target OR if actor is deleting themselves
      if (String(actor._id) !== String(employee.createdBy) && String(actor._id) !== String(employee._id)) {
        return NextResponse.json({ error: 'You can only delete admins you created or yourself' }, { status: 403 });
      }
    }

    // Remove user from any team members arrays
    await Team.updateMany({}, { $pull: { members: id } });
    // If user is leader of any team, unset leader
    await Team.updateMany({ leader: id }, { $unset: { leader: '' } });

    // Unassign leads assigned to this user
    await Lead.updateMany({ assignedTo: id }, { $set: { assignedTo: null } });

    // Finally delete the user
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const emp = await User.findById(id).select('_id username name email phone position salary createdAt joinDate deviceId deviceIds');
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const leadsCount = await Lead.countDocuments({ assignedTo: id });
    const closedDealsCount = await Lead.countDocuments({ assignedTo: id, status: 'closed' });

    const employeeData = {
      ...emp.toObject(),
      leadsCount,
      closedDealsCount,
    };

    return NextResponse.json({ employee: employeeData });
  } catch (err) {
    console.error('Error fetching employee:', err);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await req.json();
    const { position, name, email, phone, salary, deviceId, joinDate } = body;
    const { id } = await params;

    const updateData: any = {};
    if (position !== undefined) updateData.position = position;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (salary !== undefined) updateData.salary = Number(salary);
    if (joinDate !== undefined) updateData.joinDate = joinDate ? new Date(joinDate) : null;
    if (deviceId !== undefined) updateData.deviceId = deviceId;

    console.log('Update data:', updateData);

    const employee = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('_id username name email phone position salary createdAt joinDate deviceId');

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log('Updated employee:', employee.toObject());

    // Do not automatically update pending commissions when position changes.
    // Admin is the only source of commission values.

    // Get leads and deals stats
    const leadsCount = await Lead.countDocuments({ assignedTo: id });
    const closedDealsCount = await Lead.countDocuments({ 
      assignedTo: id,
      status: 'closed'
    });

    const employeeData = {
      ...employee.toObject(),
      leadsCount,
      closedDealsCount,
    };

    return NextResponse.json({ employee: employeeData });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
