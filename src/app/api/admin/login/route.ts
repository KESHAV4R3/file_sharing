import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const { adminId, password } = await request.json();

    const ownerId = process.env.OWNER_ID;
    const ownerPassword = process.env.OWNER_PASSWORD;
    const adminIdEnv = process.env.ADMIN_ID;
    const adminPasswordEnv = process.env.ADMIN_PASSWORD;

    if (!ownerId && !adminIdEnv) {
      return NextResponse.json(
        { error: 'Owner/Admin credentials not configured in environment.' },
        { status: 500 }
      );
    }

    const inputId = (adminId || '').trim();
    const isOwnerMatch =
      Boolean(ownerId && ownerPassword && inputId === ownerId && password === ownerPassword);
    const isAdminMatch =
      Boolean(adminIdEnv && adminPasswordEnv && inputId === adminIdEnv && password === adminPasswordEnv);

    if (!isOwnerMatch && !isAdminMatch) {
      return NextResponse.json(
        { error: 'Invalid owner credentials.' },
        { status: 401 }
      );
    }

    const token = signAdminToken(inputId);
    return NextResponse.json({ token, adminId: inputId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Login failed.' },
      { status: 500 }
    );
  }
}
