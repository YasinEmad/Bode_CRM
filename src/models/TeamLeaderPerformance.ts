import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamLeaderPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  month: string; // Format: "2026-01"
  sheets: Record<string, number>; // day1-day31
  assessments: Record<string, number>; // day1-day31
  meetings: Record<string, number>; // day1-day31
  requests: Record<string, number>; // day1-day31
  editedByAdmin?: boolean | Record<string, boolean>; // Flag or per-category flags (legacy)
  adminLocks?: {
    sheets: Record<string, boolean>;
    assessments: Record<string, boolean>;
    meetings: Record<string, boolean>;
    requests: Record<string, boolean>;
  }; // Per-day admin locks
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
      type: Map,
      of: Boolean,
      default: () => ({}),
    },
    adminLocks: {
      sheets: {
        type: Map,
        of: Boolean,
        default: () => ({}),
      },
      assessments: {
        type: Map,
        of: Boolean,
        default: () => ({}),
      },
      meetings: {
        type: Map,
        of: Boolean,
        default: () => ({}),
      },
      requests: {
        type: Map,
        of: Boolean,
        default: () => ({}),
      },
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
