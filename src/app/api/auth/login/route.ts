import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { comparePassword, hashPassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please provide both username and password.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedUsername = username.trim().toLowerCase();
    let user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      // Check if there is an unapproved registration request
      const RegistrationRequest = (await import('@/lib/models/RegistrationRequest')).default;
      const regReq = await RegistrationRequest.findOne({ username: normalizedUsername });

      if (regReq && regReq.status === 'pending') {
        return NextResponse.json(
          {
            error:
              'Your registration request is pending administrator approval. Please wait for the owner/admin to approve your account before signing in.',
          },
          { status: 403 }
        );
      }

      if (regReq && regReq.status === 'rejected') {
        return NextResponse.json(
          {
            error:
              'Your registration request was declined by the administrator. Please contact the owner or register again.',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
    });

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        canUploadVideo: user.canUploadVideo ?? false,
        unlimitedFileSize: user.unlimitedFileSize ?? false,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred during login.' },
      { status: 500 }
    );
  }
}
