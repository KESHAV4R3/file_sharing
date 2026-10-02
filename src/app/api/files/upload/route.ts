import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FileModel, { FileType } from '@/lib/models/File';
import UserModel from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { uploadBufferToCloudinary } from '@/lib/cloudinary';
import mongoose from 'mongoose';
import crypto from 'crypto';

function determineFileType(fileName: string, mimeType: string): FileType | null {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (lowerName.endsWith('.txt') || mimeType === 'text/plain') {
    return 'txt';
  }
  if (lowerName.endsWith('.html') || lowerName.endsWith('.htm') || mimeType === 'text/html') {
    return 'html';
  }
  if (
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    (mimeType === 'application/vnd.ms-excel' && !lowerName.endsWith('.csv'))
  ) {
    return 'excel';
  }
  if (lowerName.endsWith('.csv') || mimeType === 'text/csv') {
    return 'csv';
  }
  if (
    mimeType.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)$/i.test(lowerName)
  ) {
    return 'image';
  }
  if (
    mimeType.startsWith('video/') ||
    /\.(mp4|webm|mov|avi|mkv|wmv|flv|m4v|3gp|ogv)$/i.test(lowerName)
  ) {
    return 'video';
  }
  if (
    mimeType.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|weba)$/i.test(lowerName)
  ) {
    return 'audio';
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to upload files.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as globalThis.File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided in request.' },
        { status: 400 }
      );
    }

    const originalName = file.name || 'untitled_file';
    const mimeType = file.type || '';
    const fileType = determineFileType(originalName, mimeType);

    if (!fileType) {
      return NextResponse.json(
        {
          error: 'Unsupported file type. Allowed formats: PDF, TXT, HTML, CSV, Excel (.xlsx, .xls), Images, Audio, and Video files.',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const dbUser = await UserModel.findById(authUser.userId).lean();
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const canUploadVideo = (dbUser as any)?.canUploadVideo === true;
    const unlimitedFileSize = (dbUser as any)?.unlimitedFileSize === true;

    // Video/media upload requires permission granted by owner/admin
    if (fileType === 'video' || fileType === 'audio') {
      if (!canUploadVideo) {
        return NextResponse.json(
          {
            error: 'You do not have permission to upload video files. Please contact the owner or administrator to grant you video upload access.',
          },
          { status: 403 }
        );
      }
    }

    // Check total account storage quota
    const { getMaxAccountStorageMb, getMaxAccountStorageBytes } = await import('@/lib/storageConfig');
    const maxAccountStorageMb = getMaxAccountStorageMb();
    const maxAccountStorageBytes = getMaxAccountStorageBytes();

    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);
    const storageAgg = await FileModel.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: '$fileSize' } } },
    ]);
    const currentStorage = storageAgg[0]?.total ?? 0;
    const reportedSize = file.size || 0;

    // ACCOUNT STORAGE QUOTA ENFORCEMENT:
    // If unlimitedFileSize is FALSE: total storage for this account cannot exceed MAX_ACCOUNT_STORAGE_MB (default 50MB from env).
    // If unlimitedFileSize is TRUE: unlimited storage — any number of any size of files and videos allowed!
    if (!unlimitedFileSize) {
      if (currentStorage >= maxAccountStorageBytes) {
        return NextResponse.json(
          {
            error: `Account storage limit reached! Your account has reached the ${maxAccountStorageMb}MB total storage cap (${(currentStorage / (1024 * 1024)).toFixed(1)}MB used). You cannot upload any more files. Please delete existing files or contact the administrator to enable unlimited storage.`,
          },
          { status: 400 }
        );
      }

      if (currentStorage + reportedSize > maxAccountStorageBytes) {
        const remainingMb = Math.max(0, (maxAccountStorageBytes - currentStorage) / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          {
            error: `Total account storage limit (${maxAccountStorageMb}MB) exceeded! Currently used: ${(currentStorage / (1024 * 1024)).toFixed(1)}MB. File size: ${(reportedSize / (1024 * 1024)).toFixed(1)}MB. Remaining available storage: ${remainingMb}MB. Please delete some files or contact the administrator to enable unlimited storage.`,
          },
          { status: 400 }
        );
      }
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileSize = reportedSize || buffer.length || 0;

    // Secondary verify on actual buffer length
    if (!unlimitedFileSize) {
      if (currentStorage + buffer.length > maxAccountStorageBytes) {
        const remainingMb = Math.max(0, (maxAccountStorageBytes - currentStorage) / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          {
            error: `Total account storage limit (${maxAccountStorageMb}MB) exceeded! Currently used: ${(currentStorage / (1024 * 1024)).toFixed(1)}MB. File size: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB. Remaining available storage: ${remainingMb}MB. Please delete some files or contact the administrator to enable unlimited storage.`,
          },
          { status: 400 }
        );
      }
    }

    // Compute SHA-256 hash of file content to detect duplicate documents
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Check if an identical document already exists in the user's account:
    // Matches by content hash (identical file contents) OR by same filename + size
    const existingFile = await FileModel.findOne({
      userId: new mongoose.Types.ObjectId(authUser.userId),
      $or: [
        { fileHash: fileHash },
        { originalName: originalName, fileSize: fileSize },
      ],
    });

    if (existingFile) {
      return NextResponse.json(
        {
          error: `Duplicate document detected! "${existingFile.originalName}" is already uploaded in your document library.`,
          duplicateId: existingFile._id.toString(),
        },
        { status: 409 }
      );
    }

    // Upload to Cloudinary only after verifying the document is not a duplicate
    const cloudinaryResult = await uploadBufferToCloudinary(buffer, originalName, fileType);
    const resolvedSize = fileSize || cloudinaryResult.bytes || 0;

    const newFile = await FileModel.create({
      userId: new mongoose.Types.ObjectId(authUser.userId),
      originalName,
      fileType,
      fileSize: resolvedSize,
      fileHash,
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      uploadedAt: new Date(),
    });

    return NextResponse.json(
      {
        message: 'File uploaded successfully!',
        file: {
          id: newFile._id.toString(),
          originalName: newFile.originalName,
          fileType: newFile.fileType,
          fileSize: newFile.fileSize,
          cloudinaryUrl: newFile.cloudinaryUrl,
          uploadedAt: newFile.uploadedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred during file upload.' },
      { status: 500 }
    );
  }
}
