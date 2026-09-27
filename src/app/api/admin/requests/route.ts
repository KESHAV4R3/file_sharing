import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import RegistrationRequest from '@/lib/models/RegistrationRequest';

export async function GET(request: NextRequest) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const [requests, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    RegistrationRequest.find().sort({ createdAt: -1 }).lean(),
    RegistrationRequest.countDocuments({ status: 'pending' }),
    RegistrationRequest.countDocuments({ status: 'approved' }),
    RegistrationRequest.countDocuments({ status: 'rejected' }),
  ]);

  const mappedRequests = requests.map((r: any) => ({
    id: r._id.toString(),
    username: r.username,
    passwordText: r.passwordText || '••••••••',
    status: r.status,
    ipAddress: r.ipAddress || 'Unknown',
    location: r.location || {},
    deviceInfo: r.deviceInfo || {},
    reviewedAt: r.reviewedAt,
    reviewedBy: r.reviewedBy,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({
    requests: mappedRequests,
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: requests.length,
    },
  });
}
