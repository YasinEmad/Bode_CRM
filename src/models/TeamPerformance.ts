import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
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
TeamPerformanceSchema.index({ userId: 1, teamId: 1, month: 1 }, { unique: true });

export default mongoose.models.TeamPerformance ||
  mongoose.model<ITeamPerformance>('TeamPerformance', TeamPerformanceSchema);
