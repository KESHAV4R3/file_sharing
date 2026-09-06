import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FileModel from '@/lib/models/File';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);

    const [files, totalCount] = await Promise.all([
      FileModel.find({ userId: userObjectId })
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FileModel.countDocuments({ userId: userObjectId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const formattedFiles = files.map((f: any) => ({
      id: f._id.toString(),
      originalName: f.originalName,
      fileType: f.fileType,
      fileSize: f.fileSize || 0,
      cloudinaryUrl: f.cloudinaryUrl,
      uploadedAt: f.uploadedAt,
    }));

    return NextResponse.json({
      files: formattedFiles,
      pagination: {
        total: totalCount,
        page,
        totalPages,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Fetch files error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch user files.' },
      { status: 500 }
    );
  }
}
