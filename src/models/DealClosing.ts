import mongoose, { Document, Schema } from 'mongoose';

export interface IDealClosing extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Sales representative who closed the deal
  tcrType: 'Reservation' | 'Contract' | 'EOI';
  clientName: string;
  clientNumber: string;
  developer: string;
  unitCode: number;
  unitArea: number;
  unitType: 'Apartment' | 'Studio' | 'Duplex' | 'Penthouse' | 'Villa' | 'Twin House' | 'Townhouse' | 'Chalet' | 'Loft' | 'Shop' | 'Retail' | 'Showroom' | 'Mall Unit' | 'Office' | 'Administrative Unit' | 'Clinic';
  contractPrice: number;
  contractDate: Date;
  project?: string;
  finishingType: 'Fully finished' | 'Semi-finished' | 'Not finished';
  deliveryDate: number; // Year
  paymentPlan: '0' | '1 year' | '2 years' | '3 years' | '4 years' | '5 years' | '6 years' | '7 years' | '8 years' | '9 years' | '10 years' | '11 years' | '12 years' | '13 years' | '14 years' | '15 years';
  downPaymentPercentage: number;
  downPaymentAmount: number;
  attachments: string[]; // URLs of uploaded images
  info: string;
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
      enum: ['Reservation', 'Contract', 'EOI'],
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
      type: Number,
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    unitArea: {
      type: Number,
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    unitType: {
      type: String,
      enum: [
        'Apartment',
        'Studio',
        'Duplex',
        'Penthouse',
        'Villa',
        'Twin House',
        'Townhouse',
        'Chalet',
        'Loft',
        'Shop',
        'Retail',
        'Showroom',
        'Mall Unit',
        'Office',
        'Administrative Unit',
        'Clinic',
      ],
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    contractPrice: {
      type: Number,
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    project: {
      type: String,
      default: '',
    },
    contractDate: {
      type: Date,
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    finishingType: {
      type: String,
      enum: ['Fully finished', 'Semi-finished', 'Not finished'],
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    deliveryDate: {
      type: Number, // Year
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    paymentPlan: {
      type: String,
      enum: [
        '0',
        '1 year',
        '2 years',
        '3 years',
        '4 years',
        '5 years',
        '6 years',
        '7 years',
        '8 years',
        '9 years',
        '10 years',
        '11 years',
        '12 years',
        '13 years',
        '14 years',
        '15 years',
      ],
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentPercentage: {
      type: Number,
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentAmount: {
      type: Number,
      required: function() {
        return this.tcrType !== 'EOI';
      },
    },
    attachments: [
      {
        type: String,
      },
    ],
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
