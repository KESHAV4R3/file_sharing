import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import NoteModel, { INote } from '@/lib/models/Note';
import { getAuthUser } from '@/lib/auth';
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
      return NextResponse.json({ error: 'Invalid note ID.' }, { status: 400 });
    }

    await connectToDatabase();
    const note = await NoteModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authUser.userId),
    }).lean<INote | null>();

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      note: {
        id: (note._id as mongoose.Types.ObjectId).toString(),
        title: note.title,
        content: note.content || '',
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch note.';
    console.error('Fetch single note error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Invalid note ID.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData: { title?: string; content?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (typeof body.title === 'string' && body.title.trim()) {
      updateData.title = body.title.trim().slice(0, 100);
    }

    if (typeof body.content === 'string') {
      updateData.content = body.content;
    }

    await connectToDatabase();
    const updatedNote = await NoteModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(authUser.userId),
      },
      { $set: updateData },
      { new: true }
    ).lean<INote | null>();

    if (!updatedNote) {
      return NextResponse.json(
        { error: 'Note not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      note: {
        id: (updatedNote._id as mongoose.Types.ObjectId).toString(),
        title: updatedNote.title,
        content: updatedNote.content || '',
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update note.';
    console.error('Update note error:', error);
    return NextResponse.json(
      { error: message },
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
      return NextResponse.json({ error: 'Invalid note ID.' }, { status: 400 });
    }

    await connectToDatabase();
    const deletedNote = await NoteModel.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authUser.userId),
    });

    if (!deletedNote) {
      return NextResponse.json(
        { error: 'Note not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Note "${deletedNote.title}" was deleted successfully.`,
      id: deletedNote._id.toString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete note.';
    console.error('Delete note error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
