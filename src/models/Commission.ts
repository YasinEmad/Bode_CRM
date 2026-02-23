import mongoose, { Document, Schema } from 'mongoose';
import './User';
import './Lead';

export interface ICommissionRecipient {
  userId: mongoose.Types.ObjectId;
  role?: string; // 'sales' | 'team_leader' | freeform
  amount: number;
  percentage?: number;
}

export interface ICommission extends Document {
  dealId: mongoose.Types.ObjectId;
  // legacy field kept for compatibility (first/main recipient)
  employeeId?: mongoose.Types.ObjectId | null;
  // multiple recipients support
  recipients: ICommissionRecipient[];
  amount: number; // total amount (sum of recipients.amount)
  percentage?: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  rejectionReason?: string;
  rejectionNote?: string;
  clientName?: string;
  clientNumber?: string;
  developer?: string;
  project?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecipientSchema = new Schema<ICommissionRecipient>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String },
    amount: { type: Number, required: true },
    percentage: { type: Number },
  },
  { _id: false }
);

const CommissionSchema = new Schema<ICommission>(
  {
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DealClosing',
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    recipients: {
      type: [RecipientSchema],
      default: [],
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    clientName: String,
    clientNumber: String,
    developer: String,
    project: String,
    percentage: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    rejectionReason: String,
    rejectionNote: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Commission || mongoose.model<ICommission>('Commission', CommissionSchema);
