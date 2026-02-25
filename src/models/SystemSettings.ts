import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  officeLatitude: number;
  officeLongitude: number;
  officeName: string;
  attendanceRadius: number; // in meters
  attendanceTime: string; // HH:mm format, e.g., "18:00" (shift start time)
  allowedEarlyMinutes: number; // how many minutes before shift start employees may check in
  shiftDuration: number; // in hours, e.g., 9
  minGpsAccuracy: number; // minimum acceptable GPS accuracy in meters (default 50)
  commissionRules: {
    position: string;
    percentage: number;
  }[];
  labels?: {
    sheets?: string;
    meetings?: string;
    assessments?: string;
    requests?: string;
  };
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
      default: '18:00', // Default 6 PM (shift start time)
    },
    allowedEarlyMinutes: {
      type: Number,
      default: 60, // allow 60 minutes early by default
    },
    shiftDuration: {
      type: Number,
      default: 9, // Default 9 hours
    },
    minGpsAccuracy: {
      type: Number,
      default: 100, // Default 100 meters - practical for real-world urban conditions
    },
    commissionRules: [
      {
        position: String,
        percentage: Number,
      },
    ],
    // Dynamic UI labels for KPI indicators (customizable by admin)
    labels: {
      sheets: {
        type: String,
        default: 'Sheets',
      },
      meetings: {
        type: String,
        default: 'Meetings',
      },
      assessments: {
        type: String,
        default: 'Assessments',
      },
      requests: {
        type: String,
        default: 'Requests',
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
