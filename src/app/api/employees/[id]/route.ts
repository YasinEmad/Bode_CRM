import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Lead from '@/models/Lead';
import SystemSettings from '@/models/SystemSettings';
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
    const { position, name, email, phone, salary, deviceId } = body;
    const { id } = await params;

    const updateData: any = {};
    if (position !== undefined) updateData.position = position;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (salary !== undefined) updateData.salary = Number(salary);
    if (deviceId !== undefined) updateData.deviceId = deviceId;

    console.log('Update data:', updateData);

    const employee = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('_id username name email phone position salary createdAt deviceId');

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
