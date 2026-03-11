import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-prod';

interface TokenPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: number, email: string): string => {
  return jwt.sign(
    { userId, email },
    SECRET_KEY,
    { expiresIn: '7d' }
  );
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, SECRET_KEY) as TokenPayload;
};

/**
 * Extract token from Authorization header
 */
export const extractToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '').trim();
};