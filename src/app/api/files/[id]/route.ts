import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FileModel from '@/lib/models/File';
import UserModel from '@/lib/models/User';
import { getAuthUser } from '@/lib/auth';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid file ID.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const file = await FileModel.findById(id).lean();

    if (!file) {
      return NextResponse.json(
        { error: 'File not found.' },
        { status: 404 }
      );
    }

    const isMedia = file.fileType === 'video' || file.fileType === 'audio';
    if (!isMedia && (file as any).userId.toString() !== authUser.userId) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      file: {
        id: file._id.toString(),
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize || 0,
        cloudinaryUrl: file.cloudinaryUrl,
        uploadedAt: file.uploadedAt,
      },
    });
  } catch (error: any) {
    console.error('Fetch single file error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch file details.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid file ID.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const file = await FileModel.findById(id);

    if (!file) {
      return NextResponse.json(
        { error: 'File not found.' },
        { status: 404 }
      );
    }

    const isVideo = file.fileType === 'video' || file.fileType === 'audio';
    if (isVideo) {
      // Deleting a video requires permission from admin
      const dbUser = await UserModel.findById(authUser.userId).lean();
      const canUploadVideo = (dbUser as any)?.canUploadVideo === true;

      if (!canUploadVideo) {
        return NextResponse.json(
          { error: 'You do not have permission to delete videos. Admin permission is required.' },
          { status: 403 }
        );
      }
    } else {
      if (file.userId.toString() !== authUser.userId) {
        return NextResponse.json(
          { error: 'Access denied.' },
          { status: 403 }
        );
      }
    }

    // Delete asset from Cloudinary
    if (file.cloudinaryPublicId) {
      await deleteFromCloudinary(file.cloudinaryPublicId, file.fileType);
    }

    // Delete file document from MongoDB
    await FileModel.deleteOne({ _id: file._id });

    return NextResponse.json({
      message: `Document "${file.originalName}" was successfully deleted.`,
      id: file._id.toString(),
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete file.' },
      { status: 500 }
    );
  }
}

