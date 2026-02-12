import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email?: string;
  password: string;
  name: string;
  role: 'admin' | 'sales';
  createdBy?: mongoose.Types.ObjectId | null;
  phone?: string;
  position?: string; // e.g., 'Sales Junior', 'Sales Senior', 'Team Leader'
  salary?: number; // Monthly salary
  deviceId?: string; // Legacy single Device ID for check-in verification
  deviceIds?: string[]; // Allowed device IDs (multiple devices)
  teamId?: mongoose.Types.ObjectId | null; // Reference to team
  joinDate?: Date; // Date when employee joined
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: false,
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
    deviceIds: {
      type: [String],
      default: [],
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
