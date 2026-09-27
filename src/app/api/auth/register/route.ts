import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import RegistrationRequest from '@/lib/models/RegistrationRequest';
import { hashPassword } from '@/lib/auth';
import { parseUserAgent, resolveIpLocation } from '@/lib/telemetry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      username,
      password,
      screenResolution,
      language,
      timezone,
      platform,
      cpuCores,
      deviceMemory,
    } = body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedUsername = username.trim().toLowerCase();

    // 1. Check if user already exists and is active
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already registered. Please choose another or sign in.' },
        { status: 409 }
      );
    }

    // 2. Check if a request already exists
    const existingRequest = await RegistrationRequest.findOne({ username: normalizedUsername });
    if (existingRequest && existingRequest.status === 'pending') {
      return NextResponse.json(
        {
          error:
            'A registration request for this username is already pending administrator approval. Please wait for an admin to review it.',
        },
        { status: 409 }
      );
    }

    // 3. Extract network & device telemetry
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      '127.0.0.1';

    const userAgent = request.headers.get('user-agent') || '';
    const parsedUa = parseUserAgent(userAgent);
    const location = await resolveIpLocation(ipAddress, request.headers, timezone);

    const deviceInfo = {
      deviceType: parsedUa.deviceType,
      os: parsedUa.os,
      browser: parsedUa.browser,
      browserVersion: parsedUa.browserVersion,
      platform: platform || '',
      screenResolution: screenResolution || '',
      language: language || '',
      cpuCores: cpuCores ? String(cpuCores) : '',
      deviceMemory: deviceMemory ? String(deviceMemory) : '',
      userAgent,
    };

    // 4. Hash password
    const passwordHash = await hashPassword(password);

    // 5. Create or update registration request
    if (existingRequest && existingRequest.status === 'rejected') {
      // Re-submitting a previously rejected request
      existingRequest.passwordText = password;
      existingRequest.passwordHash = passwordHash;
      existingRequest.status = 'pending';
      existingRequest.ipAddress = ipAddress;
      existingRequest.location = location;
      existingRequest.deviceInfo = deviceInfo;
      existingRequest.createdAt = new Date();
      existingRequest.reviewedAt = undefined;
      existingRequest.reviewedBy = undefined;
      existingRequest.rejectionReason = undefined;
      await existingRequest.save();
    } else {
      await RegistrationRequest.create({
        username: normalizedUsername,
        passwordText: password,
        passwordHash,
        status: 'pending',
        ipAddress,
        location,
        deviceInfo,
        createdAt: new Date(),
      });
    }

    return NextResponse.json(
      {
        message:
          'Registration request submitted! Your account is pending administrator approval. Once approved by the owner, you will be able to log in.',
        pendingApproval: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration request error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred during registration.' },
      { status: 500 }
    );
  }
}

