import express, { Request, Response } from 'express';
import { generateToken } from '../utils/jwt.util';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  updateLastLogin,
} from '../services/user.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { SignupBody, LoginBody, AuthRequest } from '../types';
import { prisma } from '../config/prisma';

const router = express.Router();

router.post('/signup', async (req: Request<{}, {}, SignupBody>, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Invalid email address' });
      return;
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    const user = await createUser({ name, email, password });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/login', async (req: Request<{}, {}, LoginBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    await updateLastLogin(user.id);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Logged in successfully',
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'User ID not found' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ 
      message: 'User retrieved successfully',
      user 
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, avatar, googleId } = req.body;

    if (!email || !googleId) {
      res.status(400).json({ message: 'Email and Google ID are required' });
      return;
    }

    // Check if user exists
    let user = await findUserByEmail(email);

    if (!user) {
      // Create user if they don't exist
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      user = await prisma.user.create({
        data: {
          name: name || "Unknown User",
          email,
          password: randomPassword,
          avatar: avatar || "",
          isEmailVerified: true,
          role: 'USER',
        },
      });
    }

    await updateLastLogin(user.id);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Google authentication successful',
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router;