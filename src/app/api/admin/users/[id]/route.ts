import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import UserModel from '@/lib/models/User';
import FileModel from '@/lib/models/File';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { hashPassword } from '@/lib/auth';
import mongoose from 'mongoose';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!getAdminUser(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

  await connectToDatabase();

  const user = await UserModel.findById(id).lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const files = await FileModel.find({ userId: new mongoose.Types.ObjectId(id) })
    .sort({ uploadedAt: -1 })
    .lean();

  return NextResponse.json({
    user: {
      id: (user as any)._id.toString(),
      username: (user as any).username,
      createdAt: (user as any).createdAt,
    },
    files: files.map((f: any) => ({
      id: f._id.toString(),
      originalName: f.originalName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      cloudinaryUrl: f.cloudinaryUrl,
      uploadedAt: f.uploadedAt,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!getAdminUser(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

  const body = await request.json();
  const update: Record<string, string> = {};

  if (body.username) update.username = body.username.trim();
  if (body.password) update.passwordHash = await hashPassword(body.password);

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  await connectToDatabase();

  const updated = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    message: 'User updated.',
    user: { id: (updated as any)._id.toString(), username: (updated as any).username },
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!getAdminUser(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

  await connectToDatabase();

  const user = await UserModel.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Delete all user files from Cloudinary + MongoDB
  const files = await FileModel.find({ userId: new mongoose.Types.ObjectId(id) });
  await Promise.all(
    files.map((f: any) =>
      f.cloudinaryPublicId ? deleteFromCloudinary(f.cloudinaryPublicId, f.fileType) : Promise.resolve()
    )
  );
  await FileModel.deleteMany({ userId: new mongoose.Types.ObjectId(id) });
  await UserModel.findByIdAndDelete(id);

  return NextResponse.json({ message: `User "${user.username}" and all their data deleted.` });
}
