import mongoose, { Document, Schema } from 'mongoose';

export interface IDealClosing extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Sales representative who closed the deal
  tcrType: string;
  clientName: string;
  clientNumber: string;
  developer: string;
  unitCode: string;
  unitArea: number;
  unitType: string;
  contractPrice: number;
  contractDate: Date;
  project?: string;
  finishingType: string;
  deliveryDate: number; // Year
  paymentPlan: string;
  downPaymentPercentage: number;
  downPaymentAmount: number;
  paymentByMonth: number; // Monthly installment amount
  attachments: string[]; // URLs of uploaded images
  info: string;
  shared?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DealClosingSchema = new Schema<IDealClosing>(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tcrType: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    clientNumber: {
      type: String,
      required: true,
    },
    developer: {
      type: String,
      required: true,
    },
    unitCode: {
      type: String,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitArea: {
      type: Number,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitType: {
      type: String,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    contractPrice: {
      type: Number,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    project: {
      type: String,
      default: '',
    },
    contractDate: {
      type: Date,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    finishingType: {
      type: String,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    deliveryDate: {
      type: Number, // Year
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentPlan: {
      type: String,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentPercentage: {
      type: Number,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentAmount: {
      type: Number,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentByMonth: {
      type: Number,
      required: function(this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    attachments: [
      {
        type: String,
      },
    ],
    shared: {
      type: Boolean,
      default: false,
    },
    info: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.DealClosing || mongoose.model<IDealClosing>('DealClosing', DealClosingSchema);
