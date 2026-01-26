import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  officeLatitude: number;
  officeLongitude: number;
  officeName: string;
  attendanceRadius: number; // in meters
  commissionRules: {
    role: string;
    percentage: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    officeLatitude: {
      type: Number,
      default: 0,
    },
    officeLongitude: {
      type: Number,
      default: 0,
    },
    officeName: {
      type: String,
      default: 'Main Office',
    },
    attendanceRadius: {
      type: Number,
      default: 500, // 500 meters default
    },
    commissionRules: [
      {
        role: String,
        percentage: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
