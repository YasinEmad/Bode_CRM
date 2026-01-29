import mongoose, { Document, Schema } from 'mongoose';

export interface KPIIndicator {
  name: string; // 'attendance' | 'deals' | 'calls' | 'meetings' | 'assessments'
  target: number;
  weight: number;
}

export interface IKPISetting extends Document {
  indicators: KPIIndicator[];
  totalWeight: number;
  createdAt: Date;
  updatedAt: Date;
}

const KPIIndicatorSchema = new Schema<KPIIndicator>({
  name: {
    type: String,
    enum: ['attendance', 'deals', 'calls', 'meetings', 'assessments'],
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.KPISetting || mongoose.model<IKPISetting>('KPISetting', KPISettingSchema);
