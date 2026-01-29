import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  sender: mongoose.Types.ObjectId; // User who sent the note
  receiver: mongoose.Types.ObjectId; // User who receives the note
  message: string;
  read: boolean;
  readAt?: Date; // When the note was read
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for faster queries
NoteSchema.index({ receiver: 1, createdAt: -1 });
NoteSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
