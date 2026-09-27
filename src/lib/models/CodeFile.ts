import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICodeFile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fileName: string;
  language: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CodeFileSchema = new Schema<ICodeFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [120, 'File name cannot exceed 120 characters'],
    },
    language: {
      type: String,
      default: 'plaintext',
      trim: true,
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

// Compound index for user listings sorted by updated date
CodeFileSchema.index({ userId: 1, updatedAt: -1 });

const CodeFileModel: Model<ICodeFile> =
  mongoose.models.CodeFile || mongoose.model<ICodeFile>('CodeFile', CodeFileSchema);

export default CodeFileModel;
