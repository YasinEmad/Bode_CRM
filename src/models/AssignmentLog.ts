import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignmentLog extends Document {
  lead: mongoose.Types.ObjectId;
  from?: mongoose.Types.ObjectId | null;
  to?: mongoose.Types.ObjectId | null;
  changedBy: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const AssignmentLogSchema = new Schema<IAssignmentLog>(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.AssignmentLog || mongoose.model<IAssignmentLog>('AssignmentLog', AssignmentLogSchema);
