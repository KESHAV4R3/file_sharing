import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || 'fallback-admin-secret-for-build';

export interface AdminPayload {
  adminId: string;
  isAdmin: true;
}

export function signAdminToken(adminId: string): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET is not configured');
  return jwt.sign({ adminId, isAdmin: true }, secret, { expiresIn: '8h' });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminPayload;
    if (!decoded.isAdmin) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getAdminUser(request: Request): AdminPayload | null {
  const authHeader =
    request.headers.get('authorization') ||
    request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1]?.trim();
  if (!token) return null;
  return verifyAdminToken(token);
}
