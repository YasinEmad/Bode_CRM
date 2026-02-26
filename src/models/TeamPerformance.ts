import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  month: string; // Format: "2026-01"
  sheets: Record<string, number>; // day1-day31
  assessments: Record<string, number>; // day1-day31
  meetings: Record<string, number>; // day1-day31
  requests: Record<string, number>; // day1-day31
  editedByAdmin?: boolean; // Flag to indicate if data was edited by admin
  createdAt: Date;
  updatedAt: Date;
}

const TeamPerformanceSchema = new Schema<ITeamPerformance>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
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
TeamPerformanceSchema.index({ userId: 1, teamId: 1, month: 1 }, { unique: true });

export default mongoose.models.TeamPerformance ||
  mongoose.model<ITeamPerformance>('TeamPerformance', TeamPerformanceSchema);
