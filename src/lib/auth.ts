import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-build';

export interface AuthPayload {
  userId: string;
  username: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'xxxxx') {
    throw new Error('JWT_SECRET is not configured properly in environment');
  }
  // Short-lived token per specs (e.g. 2 hours)
  return jwt.sign(payload, secret, { expiresIn: '2h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'xxxxx') {
      return null;
    }
    const decoded = jwt.verify(token, secret) as AuthPayload;
    return {
      userId: decoded.userId,
      username: decoded.username,
    };
  } catch {
    return null;
  }
}

export function getAuthUser(request: Request): AuthPayload | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return null;
  }
  return verifyToken(token);
}
