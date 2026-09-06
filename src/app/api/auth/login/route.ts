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

    // Auto-ensure dedicated media account (@video) with video@123
    if (normalizedUsername === 'video' && password === 'video@123') {
      if (!user) {
        const passwordHash = await hashPassword('video@123');
        user = await User.create({
          username: 'video',
          passwordHash,
          createdAt: new Date(),
        });
      } else {
        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) {
          const passwordHash = await hashPassword('video@123');
          user.passwordHash = passwordHash;
          await user.save();
        }
      }
    }

    if (!user) {
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
