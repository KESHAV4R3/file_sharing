import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CodeFileModel, { ICodeFile } from '@/lib/models/CodeFile';
import { getAuthUser } from '@/lib/auth';
import { detectLanguage } from '@/app/api/code-files/route';
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
      return NextResponse.json({ error: 'Invalid file ID.' }, { status: 400 });
    }

    await connectToDatabase();
    const file = await CodeFileModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authUser.userId),
    }).lean<ICodeFile | null>();

    if (!file) {
      return NextResponse.json(
        { error: 'Code file not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      file: {
        id: (file._id as mongoose.Types.ObjectId).toString(),
        fileName: file.fileName,
        language: file.language || detectLanguage(file.fileName),
        content: file.content || '',
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch code file.';
    console.error('Fetch code file error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
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
      return NextResponse.json({ error: 'Invalid file ID.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData: { fileName?: string; language?: string; content?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (typeof body.fileName === 'string' && body.fileName.trim()) {
      const trimmedName = body.fileName.trim().slice(0, 120);
      updateData.fileName = trimmedName;
      updateData.language = detectLanguage(trimmedName);
    }

    if (typeof body.content === 'string') {
      updateData.content = body.content;
    }

    await connectToDatabase();
    const updatedFile = await CodeFileModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(authUser.userId),
      },
      { $set: updateData },
      { new: true }
    ).lean<ICodeFile | null>();

    if (!updatedFile) {
      return NextResponse.json(
        { error: 'Code file not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      file: {
        id: (updatedFile._id as mongoose.Types.ObjectId).toString(),
        fileName: updatedFile.fileName,
        language: updatedFile.language || detectLanguage(updatedFile.fileName),
        content: updatedFile.content || '',
        createdAt: updatedFile.createdAt,
        updatedAt: updatedFile.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update code file.';
    console.error('Update code file error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid file ID.' }, { status: 400 });
    }

    await connectToDatabase();
    const deletedFile = await CodeFileModel.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authUser.userId),
    });

    if (!deletedFile) {
      return NextResponse.json(
        { error: 'Code file not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Code file "${deletedFile.fileName}" was deleted successfully.`,
      id: deletedFile._id.toString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete code file.';
    console.error('Delete code file error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
