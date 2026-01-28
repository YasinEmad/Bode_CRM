import mongoose, { Document, Schema } from 'mongoose';

export type LeadStatus = 'new' | 'connected' | 'negotiation' | 'pending_closed' | 'closed_pending_approval' | 'closed' | 'lost';
export type LeadSource = 'website' | 'referral' | 'phone' | 'email' | 'facebook' | 'instagram' | 'google ads' | 'other';

export interface ILead extends Document {
  name: string;
  budget: number;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  assignedTo?: mongoose.Types.ObjectId;
  notes: string;
  proofImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'connected', 'negotiation', 'pending_closed', 'closed_pending_approval', 'closed', 'lost'],
      default: 'new',
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'phone', 'email', 'facebook', 'instagram', 'google ads', 'other'],
      default: 'other',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
    proofImage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
