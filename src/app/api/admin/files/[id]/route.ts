import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import FileModel from '@/lib/models/File';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import mongoose from 'mongoose';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!getAdminUser(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });

  await connectToDatabase();

  const file = await FileModel.findById(id);
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  if (file.cloudinaryPublicId) {
    await deleteFromCloudinary(file.cloudinaryPublicId, file.fileType);
  }
  await FileModel.findByIdAndDelete(id);

  return NextResponse.json({ message: `File "${file.originalName}" deleted.`, id });
}
