import mongoose, { Schema, Document, Model } from 'mongoose';

export type FileType = 'txt' | 'html' | 'pdf' | 'image' | 'csv';

export interface IFile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  fileHash?: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  uploadedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      enum: ['txt', 'html', 'pdf', 'image', 'csv'],
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileHash: {
      type: String,
      index: true,
    },
    cloudinaryUrl: {
      type: String,
      required: [true, 'Cloudinary URL is required'],
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, 'Cloudinary Public ID is required'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound indexes for user listings and duplicate detection
FileSchema.index({ userId: 1, uploadedAt: -1 });
FileSchema.index({ userId: 1, fileHash: 1 });

const FileModel: Model<IFile> = mongoose.models.File || mongoose.model<IFile>('File', FileSchema);

export default FileModel;
