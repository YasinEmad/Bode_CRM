import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
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
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const employees = await User.find({ role: 'sales' }).select('_id name email phone position salary createdAt deviceId');
    
    console.log('Employees from DB:', employees.map(e => ({ name: e.name, salary: e.salary })));
    
    // Get leads and deals data for each employee
    const employeesWithStats = await Promise.all(
      employees.map(async (emp: any) => {
        const leadsCount = await Lead.countDocuments({ assignedTo: emp._id });
        const closedDealsCount = await Lead.countDocuments({ 
          assignedTo: emp._id,
          status: 'closed'
        });
        return {
          ...emp.toObject(),
          leadsCount,
          closedDealsCount,
        };
      })
    );

    return NextResponse.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
