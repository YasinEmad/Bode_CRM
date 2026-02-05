import mongoose, { Document, Schema, Bucket } from 'mongoose';

/**
 * Alternative Implementation: Storing Images in MongoDB using GridFS
 * This file demonstrates how to store images directly in DB instead of ImageKit
 */

// ============================================
// Option 1: Using GridFS (Recommended for DB Storage)
// ============================================

export interface IAttachment extends Document {
  fileId: mongoose.Types.ObjectId; // GridFS file reference
  originalName: string;
  size: number; // in bytes
  contentType: string; // 'image/jpeg', 'image/png', etc.
  uploadedAt: Date;
}

export interface IDealClosingWithGridFS extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tcrType: 'Reservation' | 'Contract' | 'EOI';
  clientName: string;
  clientNumber: string;
  developer: string;
  unitCode: number;
  unitArea: number;
  unitType: string;
  contractPrice: number;
  contractDate: Date;
  project?: string;
  finishingType: 'Fully finished' | 'Semi-finished' | 'Not finished';
  deliveryDate: number;
  paymentPlan: string;
  downPaymentPercentage: number;
  downPaymentAmount: number;
  paymentByMonth: number;
  attachments: IAttachment[]; // GridFS file references instead of URLs
  info: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  contentType: {
    type: String,
    enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: () => new Date(),
  },
});

const DealClosingGridFSSchema = new Schema<IDealClosingWithGridFS>(
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
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitArea: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitType: {
      type: String,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    contractPrice: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    contractDate: {
      type: Date,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    project: {
      type: String,
      default: '',
    },
    finishingType: {
      type: String,
      enum: ['Fully finished', 'Semi-finished', 'Not finished'],
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    deliveryDate: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentPlan: {
      type: String,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentPercentage: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentAmount: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentByMonth: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    attachments: [AttachmentSchema],
    info: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for GridFS version
DealClosingGridFSSchema.index({ leadId: 1 });
DealClosingGridFSSchema.index({ userId: 1, createdAt: -1 });
DealClosingGridFSSchema.index({ tcrType: 1 });

export default mongoose.models.DealClosingGridFS ||
  mongoose.model<IDealClosingWithGridFS>('DealClosingGridFS', DealClosingGridFSSchema);

// ============================================
// Option 2: Using Compressed Base64 (Less Recommended)
// ============================================

export interface IDealClosingBase64 extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tcrType: 'Reservation' | 'Contract' | 'EOI';
  clientName: string;
  clientNumber: string;
  developer: string;
  unitCode: number;
  unitArea: number;
  unitType: string;
  contractPrice: number;
  contractDate: Date;
  project?: string;
  finishingType: 'Fully finished' | 'Semi-finished' | 'Not finished';
  deliveryDate: number;
  paymentPlan: string;
  downPaymentPercentage: number;
  downPaymentAmount: number;
  paymentByMonth: number;
  attachments: {
    data: string; // Compressed Base64 or Binary
    contentType: string;
    filename: string;
    size: number;
  }[];
  info: string;
  createdAt: Date;
  updatedAt: Date;
}

const DealClosingBase64Schema = new Schema<IDealClosingBase64>(
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
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitArea: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitType: {
      type: String,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    contractPrice: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    contractDate: {
      type: Date,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    project: {
      type: String,
      default: '',
    },
    finishingType: {
      type: String,
      enum: ['Fully finished', 'Semi-finished', 'Not finished'],
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    deliveryDate: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentPlan: {
      type: String,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentPercentage: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentAmount: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentByMonth: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    // Store smaller Base64 data directly
    attachments: [
      {
        data: {
          type: String,
          required: true,
          // Compression could be applied here
        },
        contentType: {
          type: String,
          enum: ['image/jpeg', 'image/png', 'image/webp'],
        },
        filename: String,
        size: Number, // Original file size before Base64
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

DealClosingBase64Schema.index({ leadId: 1 });
DealClosingBase64Schema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.DealClosingBase64 ||
  mongoose.model<IDealClosingBase64>('DealClosingBase64', DealClosingBase64Schema);

// ============================================
// Option 3: Hybrid Approach (RECOMMENDED - BEST OF BOTH WORLDS)
// ============================================

export interface IDealClosingHybrid extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tcrType: 'Reservation' | 'Contract' | 'EOI';
  clientName: string;
  clientNumber: string;
  developer: string;
  unitCode: number;
  unitArea: number;
  unitType: string;
  contractPrice: number;
  contractDate: Date;
  project?: string;
  finishingType: 'Fully finished' | 'Semi-finished' | 'Not finished';
  deliveryDate: number;
  paymentPlan: string;
  downPaymentPercentage: number;
  downPaymentAmount: number;
  paymentByMonth: number;
  attachments: {
    type: 'external' | 'internal'; // 'external' = ImageKit, 'internal' = GridFS
    url?: string; // For external (ImageKit)
    fileId?: mongoose.Types.ObjectId; // For internal (GridFS)
    originalName: string;
    size: number;
    contentType: string;
  }[];
  info: string;
  createdAt: Date;
  updatedAt: Date;
}

const DealClosingHybridSchema = new Schema<IDealClosingHybrid>(
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
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitArea: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    unitType: {
      type: String,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    contractPrice: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    contractDate: {
      type: Date,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    project: {
      type: String,
      default: '',
    },
    finishingType: {
      type: String,
      enum: ['Fully finished', 'Semi-finished', 'Not finished'],
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    deliveryDate: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentPlan: {
      type: String,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentPercentage: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    downPaymentAmount: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    paymentByMonth: {
      type: Number,
      required: function (this: any): boolean {
        return this.tcrType !== 'EOI';
      },
    },
    // Hybrid: Can be either external URL or internal GridFS reference
    attachments: [
      {
        type: {
          type: String,
          enum: ['external', 'internal'],
          default: 'external',
        },
        url: String, // For ImageKit URLs
        fileId: mongoose.Schema.Types.ObjectId, // For GridFS
        originalName: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        contentType: {
          type: String,
          enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          required: true,
        },
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

DealClosingHybridSchema.index({ leadId: 1 });
DealClosingHybridSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.DealClosingHybrid ||
  mongoose.model<IDealClosingHybrid>('DealClosingHybrid', DealClosingHybridSchema);

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate storage size for each option
 */
export const calculateStorageSize = {
  // Current: ImageKit URLs
  imageKitPerDeal: () => {
    const baseSize = 1300; // bytes
    const urlSize = 3 * 120; // 3 URLs × 120 bytes
    return baseSize + urlSize; // ~1.66 KB per deal
  },

  // GridFS: File references only
  gridFSPerDeal: () => {
    const baseSize = 1300; // bytes
    const attachmentSize = 3 * 150; // 3 references × 150 bytes
    return baseSize + attachmentSize; // ~1.75 KB per deal (no image data)
  },

  // Base64: Images in DB
  base64PerDeal: (imageCountPerDeal = 2.5, imageSizeKB = 200) => {
    const baseSize = 1300; // bytes
    const imageData = imageCountPerDeal * imageSizeKB * 1024 * 1.33; // Base64 overhead
    return baseSize + imageData; // ~665 KB per deal
  },

  // Hybrid: Mix of both
  hybridPerDeal: (externalCount = 1.5, internalCount = 1, imageSizeKB = 150) => {
    const baseSize = 1300; // bytes
    const externalSize = externalCount * 120; // URLs
    const internalSize = internalCount * 150; // GridFS refs
    return baseSize + externalSize + internalSize; // ~1.8 KB per deal
  },

  annualCost: {
    imageKit: () => 0, // Free tier
    gridFS: (dealsPerMonth = 15) => {
      const dealSize = 1750; // bytes
      return (dealSize * dealsPerMonth * 12) / (1024 * 1024); // MB per year
    },
    base64: (dealsPerMonth = 15) => {
      const dealSize = 665000; // bytes
      return (dealSize * dealsPerMonth * 12) / (1024 * 1024); // MB per year
    },
  },
};
