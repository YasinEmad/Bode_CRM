import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Fetch all admins with their creator info
    const admins = await User.find({ role: 'admin' })
      .select('_id username name email phone createdAt createdBy')
      .populate('createdBy', '_id name username');

    // Format response with creator info
    const result = admins.map((admin: any) => ({
      _id: String(admin._id),
      username: admin.username,
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      createdAt: admin.createdAt,
      createdBy: admin.createdBy ? {
        _id: String(admin.createdBy._id),
        name: admin.createdBy.name,
        username: admin.createdBy.username,
      } : null,
    }));

    return NextResponse.json({ admins: result });
  } catch (error) {
    console.error('Error fetching admins list:', error);
    return NextResponse.json({ error: 'Failed to fetch admins list' }, { status: 500 });
  }
}
