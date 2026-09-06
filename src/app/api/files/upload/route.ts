import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FileModel, { FileType } from '@/lib/models/File';
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
  if (lowerName.endsWith('.csv') || mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
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
          error: 'Unsupported file type. Allowed formats: PDF, TXT, HTML, CSV, Images, Audio, and Video files.',
        },
        { status: 400 }
      );
    }

    // Only the dedicated media account ("video") is authorized to upload audio and video
    const isMediaAccount = authUser.username?.toLowerCase() === 'video';
    if (!isMediaAccount && (fileType === 'video' || fileType === 'audio')) {
      return NextResponse.json(
        {
          error: 'Audio and video uploads are restricted to the dedicated media account ("video"). Please log in to the "video" account to upload media files.',
        },
        { status: 403 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileSize = file.size || buffer.length || 0;

    // Compute SHA-256 hash of file content to detect duplicate documents
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    await connectToDatabase();

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
