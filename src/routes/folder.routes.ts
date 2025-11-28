import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Get user folders
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📁 Fetching folders for user:', userId);
    
    const folders = await prisma.folder.findMany({
      where: { userId },
      include: {
        dashboards: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            updatedAt: true,
            viewCount: true,
            isPublic: true,
            template: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`✅ Found ${folders.length} folders for user ${userId}`);
    res.json(folders);
  } catch (error) {
    console.error('❌ Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create folder
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { name, color, icon } = req.body;
    
    console.log('📁 Creating folder:', { name, color, userId });
    
    if (!name || !name.trim()) {
      console.log('❌ Folder name is missing');
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        color: color || 'indigo',
        icon: icon || null,
        userId
      }
    });
    
    console.log(`✅ Created folder "${folder.name}" with ID ${folder.id}`);
    res.json(folder);
  } catch (error: any) {
    console.error('❌ Create folder error:', error);
    res.status(500).json({ error: error.message || 'Failed to create folder' });
  }
});

// Update folder
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const folderId = req.params.id;
    const { name, color, icon } = req.body;
    
    console.log('📁 Updating folder:', folderId);
    
    // Check if folder belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: { id: folderId, userId }
    });
    
    if (!existingFolder) {
      console.log('❌ Folder not found:', folderId);
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: { 
        name: name?.trim() || existingFolder.name,
        color: color || existingFolder.color,
        icon: icon !== undefined ? icon : existingFolder.icon
      }
    });
    
    console.log(`✅ Updated folder "${folder.name}"`);
    res.json(folder);
  } catch (error: any) {
    console.error('❌ Update folder error:', error);
    res.status(500).json({ error: error.message || 'Failed to update folder' });
  }
});

// Delete folder
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const folderId = req.params.id;
    
    console.log('📁 Deleting folder:', folderId);
    
    // Check if folder belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: { id: folderId, userId }
    });
    
    if (!existingFolder) {
      console.log('❌ Folder not found:', folderId);
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // First, remove folder reference from all dashboards
    await prisma.dashboard.updateMany({
      where: { folderId },
      data: { folderId: null }
    });
    
    // Then delete the folder
    await prisma.folder.delete({
      where: { id: folderId }
    });
    
    console.log(`✅ Deleted folder "${existingFolder.name}"`);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete folder error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete folder' });
  }
});

// Move dashboard to folder
router.post('/move-dashboard', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { dashboardId, folderId } = req.body;
    
    console.log('📁 Moving dashboard:', { dashboardId, folderId, userId });
    
    if (!dashboardId) {
      console.log('❌ Dashboard ID is missing');
      return res.status(400).json({ error: 'Dashboard ID is required' });
    }
    
    // Check if dashboard belongs to user
    const dashboard = await prisma.dashboard.findFirst({
      where: { id: dashboardId, ownerId: userId }
    });
    
    if (!dashboard) {
      console.log('❌ Dashboard not found:', dashboardId);
      return res.status(404).json({ error: 'Dashboard not found or access denied' });
    }
    
    // If folderId is provided, verify it belongs to user
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId }
      });
      
      if (!folder) {
        console.log('❌ Folder not found:', folderId);
        return res.status(404).json({ error: 'Folder not found' });
      }
    }
    
    // Update dashboard folder
    const updatedDashboard = await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { folderId: folderId || null }
    });
    
    console.log(`✅ Moved dashboard "${dashboard.title}" to ${folderId ? 'folder ' + folderId : 'root'}`);
    res.json(updatedDashboard);
  } catch (error: any) {
    console.error('❌ Move dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to move dashboard' });
  }
});

// Get dashboards in a specific folder
router.get('/:id/dashboards', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const folderId = req.params.id;
    
    console.log('📁 Fetching dashboards in folder:', folderId);
    
    // Verify folder belongs to user
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId }
    });
    
    if (!folder) {
      console.log('❌ Folder not found:', folderId);
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const dashboards = await prisma.dashboard.findMany({
      where: { folderId, ownerId: userId },
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`✅ Found ${dashboards.length} dashboards in folder "${folder.name}"`);
    res.json(dashboards);
  } catch (error: any) {
    console.error('❌ Get folder dashboards error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch folder dashboards' });
  }
});

export default router;
