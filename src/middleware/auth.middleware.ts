import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Use the same secret as your .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // 1. Log headers for debugging (optional, remove in production)
  // console.log('Headers:', req.headers);

  // 2. Get header value (case-insensitive check handled by Express usually, but being safe)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  // 3. Check if header exists
  if (!authHeader) {
    console.log('❌ Auth Middleware: No Authorization header found.');
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  // 4. Extract token (Support "Bearer <token>" and just "<token>")
  const token = (authHeader as string).replace('Bearer ', '').trim();

  if (!token) {
    console.log('❌ Auth Middleware: Token is empty.');
    res.status(401).json({ message: 'Token is missing' });
    return;
  }

  // 5. Verify Token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    console.error('❌ Auth Middleware: Verification failed:', (error as Error).message);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};