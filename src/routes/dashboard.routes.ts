import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Get user dashboards
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('=== Fetching dashboards for user:', userId);
    
    const dashboards = await prisma.dashboard.findMany({
      where: { ownerId: userId },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`✅ Found ${dashboards.length} dashboards for user ${userId}`);
    res.json(dashboards);
  } catch (error) {
    console.error('❌ Get dashboards error:', error);
    res.status(500).json([]);
  }
});

// Create Dashboard
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { title, description, template, isPublic, folderId } = req.body;
    
    console.log('📊 Creating dashboard:', { title, template, userId });
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Dashboard title is required' });
    }
    
    // Generate unique slug
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    
    const dashboard = await prisma.dashboard.create({
      data: {
        title: title.trim(),
        description: description || null,
        slug,
        template: template || 'blank',
        isPublic: isPublic || false,
        folderId: folderId || null,
        ownerId: userId
      }
    });
    
    console.log(`✅ Created dashboard "${dashboard.title}" with ID ${dashboard.id}`);
    
    res.json({
      message: 'Dashboard created successfully',
      dashboard
    });
  } catch (error: any) {
    console.error('❌ Create dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to create dashboard' });
  }
});

// Get single dashboard
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const dashboardId = req.params.id;
    
    const dashboard = await prisma.dashboard.findFirst({
      where: { 
        id: dashboardId,
        ownerId: userId 
      },
      include: {
        folder: true,
        whiteboardElements: true
      }
    });
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    // Update view count
    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { 
        viewCount: { increment: 1 },
        lastAccessedAt: new Date()
      }
    });
    
    res.json({
      message: 'Dashboard retrieved successfully',
      dashboard
    });
  } catch (error: any) {
    console.error('❌ Get dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
  }
});

// Update dashboard
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const dashboardId = req.params.id;
    const { title, description, folderId, isPublic, thumbnail } = req.body;
    
    const existingDashboard = await prisma.dashboard.findFirst({
      where: { id: dashboardId, ownerId: userId }
    });
    
    if (!existingDashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    const dashboard = await prisma.dashboard.update({
      where: { id: dashboardId },
      data: {
        title: title?.trim() || existingDashboard.title,
        description: description !== undefined ? description : existingDashboard.description,
        folderId: folderId !== undefined ? folderId : existingDashboard.folderId,
        isPublic: isPublic !== undefined ? isPublic : existingDashboard.isPublic,
        thumbnail: thumbnail !== undefined ? thumbnail : existingDashboard.thumbnail
      }
    });
    
    res.json({
      message: 'Dashboard updated successfully',
      dashboard
    });
  } catch (error: any) {
    console.error('❌ Update dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to update dashboard' });
  }
});

// Delete dashboard
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const dashboardId = req.params.id;
    
    const dashboard = await prisma.dashboard.findFirst({
      where: { id: dashboardId, ownerId: userId }
    });
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    await prisma.dashboard.delete({
      where: { id: dashboardId }
    });
    
    res.json({ message: 'Dashboard deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete dashboard' });
  }
});

export default router;