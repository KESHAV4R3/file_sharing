import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      default: 'Untitled Note',
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    content: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound index for fast retrieval of user notes sorted by recency
NoteSchema.index({ userId: 1, updatedAt: -1 });

const NoteModel: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default NoteModel;
