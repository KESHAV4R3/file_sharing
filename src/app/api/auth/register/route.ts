import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

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
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser = await User.create({
      username: normalizedUsername,
      passwordHash,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        message: 'Registration successful! Please log in.',
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);

    // MongoDB duplicate key error — username already taken
    // (also catches the stale email_1 index case)
    if (error?.code === 11000) {
      const field = Object.keys(error?.keyPattern || {})[0];
      if (field === 'username') {
        return NextResponse.json(
          { error: 'Username already exists. Please choose a different one.' },
          { status: 409 }
        );
      }
      // Stale email index or any other dup key — treat as username conflict
      return NextResponse.json(
        { error: 'Username already exists. Please choose a different one.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'An error occurred during registration.' },
      { status: 500 }
    );
  }
}
