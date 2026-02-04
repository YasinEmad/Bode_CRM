import AdminAction from '@/models/AdminAction';
import { Types } from 'mongoose';

/**
 * Log an admin action to the database
 */
export async function logAdminAction({
  adminId,
  action,
  resourceType,
  resourceId,
  resourceName,
  description,
  details,
}: {
  adminId: string | Types.ObjectId;
  action: string; // 'create', 'update', 'delete', 'approve', 'reject', 'assign', etc.
  resourceType: string; // 'user', 'employee', 'lead', 'commission', 'team', 'settings', etc.
  resourceId?: string | Types.ObjectId | null;
  resourceName?: string;
  description: string;
  details?: Record<string, any>;
}) {
  try {
    // Ensure database connection before logging
    const mongoose = await import('mongoose');
    if (mongoose.default.connection.readyState !== 1) {
      const { connectDB } = await import('@/lib/mongodb');
      await connectDB();
    }

    const log = await AdminAction.create({
      admin: adminId,
      action,
      resourceType,
      resourceId: resourceId || null,
      resourceName: resourceName || '',
      description,
      details: details || {},
    });

    console.log('✅ Admin action logged:', { logId: log._id, action, resourceType });
    return log;
  } catch (error) {
    console.error('❌ Error logging admin action:', {
      action,
      resourceType,
      error: error instanceof Error ? error.message : error,
    });
    // Don't throw; logging failure should not break the main operation
  }
}
