import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FileModel from '@/lib/models/File';
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

    const file = await FileModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authUser.userId),
    }).lean();

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or access denied.' },
        { status: 404 }
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

    const file = await FileModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authUser.userId),
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or access denied.' },
        { status: 404 }
      );
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

