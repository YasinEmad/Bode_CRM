import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminAction extends Document {
  admin: mongoose.Types.ObjectId; // Who performed the action
  action: string; // e.g., 'create', 'update', 'delete', 'approve', 'reject', etc.
  resourceType: string; // e.g., 'user', 'employee', 'lead', 'commission', 'team', 'settings'
  resourceId?: mongoose.Types.ObjectId | string; // ID of the affected resource
  resourceName?: string; // Human-readable name (e.g., employee name, setting key)
  description: string; // Human-readable description of what was done
  details?: Record<string, any>; // Optional additional details (old values, new values, etc.)
  createdAt: Date;
}

const AdminActionSchema = new Schema<IAdminAction>(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // 'create', 'update', 'delete', 'approve', 'reject', 'assign', etc.
    resourceType: { type: String, required: true }, // 'user', 'employee', 'lead', 'commission', 'team', 'settings'
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    resourceName: { type: String, default: '' },
    description: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.AdminAction || mongoose.model<IAdminAction>('AdminAction', AdminActionSchema);
