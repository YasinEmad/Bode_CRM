import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  checkInTime: Date;
  checkOutTime?: Date;
  latitude: number;
  longitude: number;
  withinRadius: boolean;
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
    checkOutTime: Date,
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
