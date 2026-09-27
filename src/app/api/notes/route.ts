import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import NoteModel, { INote } from '@/lib/models/Note';
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

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);

    const notes = await NoteModel.find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .lean<INote[]>();

    const formattedNotes = notes.map((n) => ({
      id: (n._id as mongoose.Types.ObjectId).toString(),
      title: n.title,
      content: n.content || '',
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notes.';
    console.error('Fetch notes error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);

    const body = await request.json().catch(() => ({}));
    let title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content : '';

    if (!title) {
      const count = await NoteModel.countDocuments({ userId: userObjectId });
      title = `notes_${count + 1}`;
    }

    const newNote = await NoteModel.create({
      userId: userObjectId,
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        note: {
          id: newNote._id.toString(),
          title: newNote.title,
          content: newNote.content,
          createdAt: newNote.createdAt,
          updatedAt: newNote.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create note.';
    console.error('Create note error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
