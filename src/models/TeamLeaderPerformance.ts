import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamLeaderPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  month: string; // Format: "2026-01"
  sheets: Record<string, number>; // day1-day31
  assessments: Record<string, number>; // day1-day31
  meetings: Record<string, number>; // day1-day31
  requests: Record<string, number>; // day1-day31
  editedByAdmin?: boolean; // Flag to indicate if data was edited by admin
  createdAt: Date;
  updatedAt: Date;
}

const TeamLeaderPerformanceSchema = new Schema<ITeamLeaderPerformance>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String,
      required: true, // Format: "2026-01"
    },
    sheets: {
      type: Map,
      of: Number,
      default: () => ({}),
    },
    assessments: {
      type: Map,
      of: Number,
      default: () => ({}),
    },
    meetings: {
      type: Map,
      of: Number,
      default: () => ({}),
    },
    requests: {
      type: Map,
      of: Number,
      default: () => ({}),
    },
    editedByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for faster queries
TeamLeaderPerformanceSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.models.TeamLeaderPerformance ||
  mongoose.model<ITeamLeaderPerformance>('TeamLeaderPerformance', TeamLeaderPerformanceSchema);
