import { Request } from 'express';

export interface JWTPayload {
  userId: string;  // ✅ Changed from 'any' to 'string'
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// ✅ CHANGED: user is now JWTPayload instead of UserResponse
export interface AuthRequest extends Request {
  user?: JWTPayload;  // This is what the middleware sets
  token?: string;
}

export interface SignupBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  isEmailVerified: boolean;
  createdAt: Date;
}
