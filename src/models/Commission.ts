import mongoose, { Document, Schema } from 'mongoose';
import './User';
import './Lead';

export interface ICommission extends Document {
  dealId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  amount: number;
  percentage: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  rejectionReason?: string;
  rejectionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
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
