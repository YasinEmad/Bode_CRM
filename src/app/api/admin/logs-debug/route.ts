import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminAction from '@/models/AdminAction';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req as any);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (payload.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    await connectDB();

    // Check MongoDB connection status
    const mongoose = await import('mongoose');
    const connectionState = mongoose.default.connection.readyState;
    const stateNames: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    // Get total logs count
    const totalLogs = await AdminAction.countDocuments({});
    
    // Get last 5 logs
    const recentLogs = await AdminAction.find({})
      .populate('admin', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      status: 'ok',
      database: {
        connectionState: stateNames[connectionState],
        readyState: connectionState,
        uri: process.env.MONGODB_URI ? '✓ Set' : '✗ Not set',
      },
      logs: {
        total: totalLogs,
        recent: recentLogs,
      },
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
