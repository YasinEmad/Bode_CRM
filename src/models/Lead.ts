import mongoose, { Document, Schema } from 'mongoose';

export type LeadStatus = 'new' | 'connected' | 'negotiation' | 'pending_closed' | 'closed_pending_approval' | 'closed' | 'rejected' | 'lost';
export type LeadSource = 'website' | 'referral' | 'phone' | 'email' | 'facebook' | 'instagram' | 'google ads' | 'other';

export interface ILead extends Document {
  name: string;
  project?: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  source: LeadSource;
  sourceText?: string;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy?: string; // username of creator
  notes: string;
  info?: string; // New field for closing-specific information
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
    project: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['new', 'connected', 'negotiation', 'pending_closed', 'closed_pending_approval', 'closed', 'rejected', 'lost'],
      default: 'new',
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'phone', 'email', 'facebook', 'instagram', 'google ads', 'other'],
      default: 'other',
    },
    sourceText: {
      type: String,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
    info: {
      type: String,
      default: '',
    },
    proofImage: {
      type: String,
      default: '',
    },
    createdBy: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
