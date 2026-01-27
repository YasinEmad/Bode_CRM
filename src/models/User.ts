import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'sales';
  phone?: string;
  position?: string; // e.g., 'Sales Junior', 'Sales Senior', 'Team Leader'
  salary?: number; // Monthly salary
  deviceId?: string; // Device ID for check-in verification
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /.+\@.+\..+/,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'sales'],
      default: 'sales',
    },
    phone: String,
    position: {
      type: String,
      default: '',
    },
    salary: {
      type: Number,
      default: 0,
    },
    deviceId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
