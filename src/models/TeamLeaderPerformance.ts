import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamLeaderPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  month: string; // Format: "2026-01"
  calls: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
  assessments: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
  meetings: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
  requests: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
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
    calls: {
      week1: {
        type: Number,
        default: 0,
      },
      week2: {
        type: Number,
        default: 0,
      },
      week3: {
        type: Number,
        default: 0,
      },
      week4: {
        type: Number,
        default: 0,
      },
    },
    assessments: {
      week1: {
        type: Number,
        default: 0,
      },
      week2: {
        type: Number,
        default: 0,
      },
      week3: {
        type: Number,
        default: 0,
      },
      week4: {
        type: Number,
        default: 0,
      },
    },
    meetings: {
      week1: {
        type: Number,
        default: 0,
      },
      week2: {
        type: Number,
        default: 0,
      },
      week3: {
        type: Number,
        default: 0,
      },
      week4: {
        type: Number,
        default: 0,
      },
    },
    requests: {
      week1: {
        type: Number,
        default: 0,
      },
      week2: {
        type: Number,
        default: 0,
      },
      week3: {
        type: Number,
        default: 0,
      },
      week4: {
        type: Number,
        default: 0,
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
