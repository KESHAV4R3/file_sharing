import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import RegistrationRequest from '@/lib/models/RegistrationRequest';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  const body = await request.json();
  const { action, reason } = body;

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
  }

  await connectToDatabase();

  const regReq = await RegistrationRequest.findById(id);
  if (!regReq) {
    return NextResponse.json({ error: 'Registration request not found' }, { status: 404 });
  }

  if (action === 'approve') {
    // Check if user already exists
    let existingUser = await User.findOne({ username: regReq.username });
    if (existingUser) {
      // User already exists, just mark request as approved
      regReq.status = 'approved';
      regReq.reviewedAt = new Date();
      regReq.reviewedBy = admin.adminId;
      await regReq.save();

      return NextResponse.json({
        message: `Account @${regReq.username} is already active. Request marked as approved.`,
        status: 'approved',
      });
    }

    // Create user account in User collection
    const newUser = await User.create({
      username: regReq.username,
      passwordHash: regReq.passwordHash,
      canUploadVideo: false,
      unlimitedFileSize: false,
      createdAt: new Date(),
    });

    regReq.status = 'approved';
    regReq.reviewedAt = new Date();
    regReq.reviewedBy = admin.adminId;
    await regReq.save();

    return NextResponse.json({
      message: `Account @${regReq.username} approved and created successfully!`,
      status: 'approved',
      userId: newUser._id.toString(),
    });
  }

  if (action === 'reject') {
    regReq.status = 'rejected';
    regReq.reviewedAt = new Date();
    regReq.reviewedBy = admin.adminId;
    if (reason) regReq.rejectionReason = reason;
    await regReq.save();

    return NextResponse.json({
      message: `Registration request for @${regReq.username} rejected.`,
      status: 'rejected',
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  await connectToDatabase();

  const deleted = await RegistrationRequest.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Registration request not found' }, { status: 404 });
  }

  return NextResponse.json({
    message: `Registration request for @${deleted.username} deleted.`,
  });
}
