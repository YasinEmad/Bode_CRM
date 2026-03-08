import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  month: string; // Format: "2026-01"
  sheets: Record<string, number>; // day1-day31
  assessments: Record<string, number>; // day1-day31
  meetings: Record<string, number>; // day1-day31
  requests: Record<string, number>; // day1-day31
  editedByAdmin?: boolean | Record<string, boolean>; // Flag or per-category flags
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
      required: false, // allow null for un‑assigned employees
      default: null,
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
      type: Map,
      of: Boolean,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Create an index ensuring one record per user/month.  teamId is optional so
// it is not included in the uniqueness constraint.
TeamPerformanceSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.models.TeamPerformance ||
  mongoose.model<ITeamPerformance>('TeamPerformance', TeamPerformanceSchema);
