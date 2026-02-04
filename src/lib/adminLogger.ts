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
    await AdminAction.create({
      admin: adminId,
      action,
      resourceType,
      resourceId: resourceId || null,
      resourceName: resourceName || '',
      description,
      details: details || {},
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw; logging failure should not break the main operation
  }
}
