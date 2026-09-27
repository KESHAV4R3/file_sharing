import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import UserModel from '@/lib/models/User';
import FileModel from '@/lib/models/File';
import RegistrationRequest from '@/lib/models/RegistrationRequest';

export async function GET(request: NextRequest) {
  if (!getAdminUser(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();

  const [totalUsers, totalFiles, storageAgg, pendingRequests] = await Promise.all([
    UserModel.countDocuments({ username: { $exists: true, $ne: null } }),
    FileModel.countDocuments(),
    FileModel.aggregate([{ $group: { _id: null, total: { $sum: '$fileSize' } } }]),
    RegistrationRequest.countDocuments({ status: 'pending' }),
  ]);

  const totalStorage = storageAgg[0]?.total ?? 0;

  return NextResponse.json({ totalUsers, totalFiles, totalStorage, pendingRequests });
}

