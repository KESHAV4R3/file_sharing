import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const { adminId, password } = await request.json();

    const expectedId = process.env.ADMIN_ID;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedId || !expectedPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured.' },
        { status: 500 }
      );
    }

    if (adminId !== expectedId || password !== expectedPassword) {
      return NextResponse.json(
        { error: 'Invalid admin credentials.' },
        { status: 401 }
      );
    }

    const token = signAdminToken(adminId);
    return NextResponse.json({ token, adminId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Login failed.' },
      { status: 500 }
    );
  }
}
