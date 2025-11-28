import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ✅ CHANGED: Match the fallback with your .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('\n=== AUTH MIDDLEWARE ===');
  console.log('Token exists:', !!token);

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('✅ Token verified successfully!');
    console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
    console.log('userId:', decoded.userId);
    
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
};
