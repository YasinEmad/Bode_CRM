import mongoose, { Document, Schema } from 'mongoose';

export interface IDealClosing extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Sales representative who closed the deal
  tcrType: 'Reservation' | 'Contract';
  clientName: string;
  clientNumber: string;
  developer: string;
  unitCode: number;
  unitArea: number;
  unitType: 'Apartment' | 'Studio' | 'Duplex' | 'Penthouse' | 'Villa' | 'Twin House' | 'Townhouse' | 'Chalet' | 'Loft' | 'Shop' | 'Retail' | 'Showroom' | 'Mall Unit' | 'Office' | 'Administrative Unit' | 'Clinic';
  contractPrice: number;
  contractDate: Date;
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
      enum: ['Reservation', 'Contract'],
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
      required: true,
    },
    unitArea: {
      type: Number,
      required: true,
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
      required: true,
    },
    contractPrice: {
      type: Number,
      required: true,
    },
    contractDate: {
      type: Date,
      required: true,
    },
    finishingType: {
      type: String,
      enum: ['Fully finished', 'Semi-finished', 'Not finished'],
      required: true,
    },
    deliveryDate: {
      type: Number, // Year
      required: true,
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
      required: true,
    },
    downPaymentPercentage: {
      type: Number,
      required: true,
    },
    downPaymentAmount: {
      type: Number,
      required: true,
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
