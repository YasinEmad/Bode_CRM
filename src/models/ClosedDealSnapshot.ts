import mongoose, { Document, Schema } from 'mongoose';

export interface IClosedDealSnapshot extends Document {
  dealId: mongoose.Types.ObjectId; // reference to DealClosing
  leadId?: mongoose.Types.ObjectId | null; // optional reference to original Lead
  userId: mongoose.Types.ObjectId; // sales who created the DealClosing
  assignedTo?: mongoose.Types.ObjectId | null; // employee assigned on Lead
  tcrType: string;
  clientName: string;
  clientNumber: string;
  developer: string;
  project?: string;
  unitCode?: string;
  unitArea?: number;
  unitType?: string;
  contractPrice?: number;
  contractDate?: Date;
  finishingType?: string;
  deliveryDate?: number;
  paymentPlan?: string;
  downPaymentPercentage?: number;
  downPaymentAmount?: number;
  paymentByMonth?: number;
  attachments: string[];
  info?: string;
  shared?: boolean;
  proofImage?: string;
  createdAt: Date; // snapshot creation = deal close time
  updatedAt: Date;
}

const ClosedDealSnapshotSchema = new Schema<IClosedDealSnapshot>(
  {
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'DealClosing', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false, default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null, index: true },
    tcrType: String,
    clientName: String,
    clientNumber: String,
    developer: String,
    project: String,
    unitCode: String,
    unitArea: Number,
    unitType: String,
    contractPrice: Number,
    contractDate: Date,
    finishingType: String,
    deliveryDate: Number,
    paymentPlan: String,
    downPaymentPercentage: Number,
    downPaymentAmount: Number,
    paymentByMonth: Number,
    attachments: { type: [String], default: [] },
    info: String,
    shared: { type: Boolean, default: false },
    proofImage: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ClosedDealSnapshot || mongoose.model<IClosedDealSnapshot>('ClosedDealSnapshot', ClosedDealSnapshotSchema);
