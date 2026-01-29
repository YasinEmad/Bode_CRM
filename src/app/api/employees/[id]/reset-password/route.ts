import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken, hashPassword } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(
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
    const { newPassword } = body;
    const { id } = await params;

    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }

    // Strong password enforcement
    const pwd = String(newPassword);
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPwdRegex.test(pwd)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include uppercase, lowercase, number and special character' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await User.findById(id);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Only allow resetting passwords for sales employees
    if (employee.role !== 'sales') {
      return NextResponse.json({ error: 'Can only reset passwords for sales employees' }, { status: 403 });
    }

    // Hash the new password and update
    const hashed = await hashPassword(pwd);
    
    const updatedEmployee = await User.findByIdAndUpdate(
      id,
      { password: hashed },
      { new: true }
    ).select('_id username name email phone position salary createdAt deviceId');

    if (!updatedEmployee) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      employee: {
        _id: updatedEmployee._id,
        username: updatedEmployee.username,
        name: updatedEmployee.name,
      }
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
