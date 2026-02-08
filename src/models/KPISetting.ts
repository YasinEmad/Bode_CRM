import mongoose, { Document, Schema } from 'mongoose';

export interface KPIIndicator {
  name: string; // 'attendance' | 'deals' | 'sheets' | 'meetings' | 'assessments' | 'requests'
  target: number;
  weight: number;
}

export interface IKPISetting extends Document {
  indicators: KPIIndicator[];
  totalWeight: number;
  // scope indicates which role or area this setting applies to.
  // 'global' is default (used by Sales/Admin unless overridden)
  scope?: 'global' | 'team-leader' | 'sales' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const KPIIndicatorSchema = new Schema<KPIIndicator>({
  name: {
    type: String,
    enum: ['attendance', 'deals', 'sheets', 'meetings', 'assessments', 'requests'],
    required: true,
  },
  target: {
    type: Number,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
});

const KPISettingSchema = new Schema<IKPISetting>(
  {
    indicators: [KPIIndicatorSchema],
    totalWeight: {
      type: Number,
      default: 0,
    },
    scope: {
      type: String,
      enum: ['global', 'team-leader', 'sales', 'admin'],
      default: 'global',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.KPISetting || mongoose.model<IKPISetting>('KPISetting', KPISettingSchema);
