import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Lead from '@/models/Lead';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

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

    const employees = await User.find({ role: 'sales' }).select('_id username name email phone position salary createdAt deviceId');
    
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
    ).then(list => list.filter(e => e && e._id)); // Filter out invalid entries

    return NextResponse.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
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

    const body = await req.json();
    const { username, password, name, position, phone } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Username uniqueness
    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // Strong password enforcement
    const pwd = String(password);
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPwdRegex.test(pwd)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number and special character' }, { status: 400 });
    }

    const hashed = await hashPassword(pwd);

    const user = await User.create({
      username: username.trim(),
      password: hashed,
      name,
      role: 'sales',
      position: position || '',
      phone: phone || '',
    });

    return NextResponse.json({ success: true, employee: { id: user._id, username: user.username, name: user.name, role: user.role, position: user.position } }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
