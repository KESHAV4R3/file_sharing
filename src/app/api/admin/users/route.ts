import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import UserModel from '@/lib/models/User';
import FileModel from '@/lib/models/File';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  if (!getAdminUser(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();

  const users = await UserModel.find({ username: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .lean();

  const usersWithStats = await Promise.all(
    users.map(async (u: any) => {
      const [fileCount, storageAgg] = await Promise.all([
        FileModel.countDocuments({ userId: u._id }),
        FileModel.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(u._id) } },
          { $group: { _id: null, total: { $sum: '$fileSize' } } },
        ]),
      ]);
      return {
        id: u._id.toString(),
        username: u.username,
        createdAt: u.createdAt,
        fileCount,
        totalStorage: storageAgg[0]?.total ?? 0,
      };
    })
  );

  return NextResponse.json({ users: usersWithStats });
}
