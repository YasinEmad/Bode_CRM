import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  officeLatitude: number;
  officeLongitude: number;
  officeName: string;
  attendanceRadius: number; // in meters
  attendanceTime: string; // HH:mm format, e.g., "09:00"
  commissionRules: {
    position: string;
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
    attendanceTime: {
      type: String,
      default: '09:00', // Default 9 AM
    },
    commissionRules: [
      {
        position: String,
        percentage: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
