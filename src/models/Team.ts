import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  leader: mongoose.Types.ObjectId; // User who is team leader
  members: mongoose.Types.ObjectId[]; // Users in the team
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, unique: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
