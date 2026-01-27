import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  checkInTime: Date;
  latitude: number;
  longitude: number;
  withinRadius: boolean;
  isLate: boolean;
  lateMinutes: number; // Number of minutes late
  deviceId: string; // Device ID used for check-in
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      default: () => new Date().setHours(0, 0, 0, 0),
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    withinRadius: {
      type: Boolean,
      default: true,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    deviceId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
