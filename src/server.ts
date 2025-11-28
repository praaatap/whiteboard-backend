import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './utils/jwt.util';

// Import routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import folderRoutes from './routes/folder.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/folders', folderRoutes);

// --- BATCH PROCESSING CONFIGURATION ---
const BATCH_CONFIG = {
  ELEMENT_BATCH_SIZE: 50,        // Max elements before flush
  ELEMENT_FLUSH_INTERVAL: 2000,  // Flush every 2 seconds
  CHAT_BATCH_SIZE: 20,           // Max chat messages before flush
  CHAT_FLUSH_INTERVAL: 1000,     // Flush every 1 second
  ACTIVITY_BATCH_SIZE: 30,       // Max activities before flush
  ACTIVITY_FLUSH_INTERVAL: 3000  // Flush every 3 seconds
};

// --- IN-MEMORY BATCH QUEUES ---
interface BatchQueue<T> {
  items: T[];
  timer: NodeJS.Timeout | null;
}

const elementBatches = new Map<string, BatchQueue<any>>(); // dashboardId → queue
const chatBatches = new Map<string, BatchQueue<any>>();
const activityBatches = new Map<string, BatchQueue<any>>();
const updateQueue = new Map<string, any>(); // elementId → latest update (deduped)

// --- WebSocket Server ---
const wss = new WebSocket.Server({ noServer: true });
const whiteboardConnections = new Map<string, Map<string, WebSocket>>();
const userPresence = new Map<string, Map<string, UserPresence>>();
const typingUsers = new Map<string, Set<string>>();

interface UserPresence {
  userId: string;
  username: string;
  avatar: string;
  color: string;
  status: 'online' | 'busy' | 'away';
  role: 'admin' | 'editor' | 'viewer';
  lastSeen: number;
  cursorX?: number;
  cursorY?: number;
}

// --- BATCH FLUSH FUNCTIONS ---

async function flushElementBatch(dashboardId: string) {
  const batch = elementBatches.get(dashboardId);
  if (!batch || batch.items.length === 0) return;

  try {
    console.log(`💾 Flushing ${batch.items.length} elements to DB for dashboard ${dashboardId}`);
    
    await prisma.whiteboardElement.createMany({
      data: batch.items,
      skipDuplicates: true
    });

    // Clear batch
    batch.items = [];
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
  } catch (error) {
    console.error('❌ Element batch flush error:', error);
  }
}

async function flushUpdateQueue() {
  const updates = Array.from(updateQueue.values());
  if (updates.length === 0) return;

  try {
    console.log(`💾 Flushing ${updates.length} element updates to DB`);
    
    // Use transaction for batch updates
    await prisma.$transaction(
      updates.map(update => 
        prisma.whiteboardElement.update({
          where: { id: update.id },
          data: {
            properties: update.properties,
            isLocked: update.isLocked
          }
        })
      )
    );

    updateQueue.clear();
  } catch (error) {
    console.error('❌ Update queue flush error:', error);
  }
}

async function flushChatBatch(dashboardId: string) {
  const batch = chatBatches.get(dashboardId);
  if (!batch || batch.items.length === 0) return;

  try {
    console.log(`💾 Flushing ${batch.items.length} chat messages to DB for dashboard ${dashboardId}`);
    
    await prisma.chatMessage.createMany({
      data: batch.items,
      skipDuplicates: true
    });

    batch.items = [];
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
  } catch (error) {
    console.error('❌ Chat batch flush error:', error);
  }
}

async function flushActivityBatch(dashboardId: string) {
  const batch = activityBatches.get(dashboardId);
  if (!batch || batch.items.length === 0) return;

  try {
    console.log(`💾 Flushing ${batch.items.length} activities to DB for dashboard ${dashboardId}`);
    
    // FIX: Convert lowercase types to Uppercase to match Prisma Enum
    const formattedData = batch.items.map(item => ({
        ...item,
        // Convert 'create' -> 'CREATE', 'join' -> 'JOIN', etc.
        type: item.type.toUpperCase() 
    }));

    await prisma.activity.createMany({
      data: formattedData,
      skipDuplicates: true
    });

    batch.items = [];
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
  } catch (error) {
    console.error('❌ Activity batch flush error:', error);
  }
}

// --- BATCH QUEUE HELPERS ---

function addToElementBatch(dashboardId: string, element: any) {
  if (!elementBatches.has(dashboardId)) {
    elementBatches.set(dashboardId, { items: [], timer: null });
  }

  const batch = elementBatches.get(dashboardId)!;
  batch.items.push(element);

  // Flush if batch size reached
  if (batch.items.length >= BATCH_CONFIG.ELEMENT_BATCH_SIZE) {
    flushElementBatch(dashboardId);
  } else if (!batch.timer) {
    // Set timer for periodic flush
    batch.timer = setTimeout(() => flushElementBatch(dashboardId), BATCH_CONFIG.ELEMENT_FLUSH_INTERVAL);
  }
}

function addToUpdateQueue(elementId: string, update: any) {
  // Deduplication: only keep the latest update for each element
  updateQueue.set(elementId, update);

  // Flush periodically
  if (updateQueue.size >= 50) {
    flushUpdateQueue();
  }
}

function addToChatBatch(dashboardId: string, message: any) {
  if (!chatBatches.has(dashboardId)) {
    chatBatches.set(dashboardId, { items: [], timer: null });
  }

  const batch = chatBatches.get(dashboardId)!;
  batch.items.push(message);

  if (batch.items.length >= BATCH_CONFIG.CHAT_BATCH_SIZE) {
    flushChatBatch(dashboardId);
  } else if (!batch.timer) {
    batch.timer = setTimeout(() => flushChatBatch(dashboardId), BATCH_CONFIG.CHAT_FLUSH_INTERVAL);
  }
}

function addToActivityBatch(dashboardId: string, activity: any) {
  if (!activityBatches.has(dashboardId)) {
    activityBatches.set(dashboardId, { items: [], timer: null });
  }

  const batch = activityBatches.get(dashboardId)!;
  batch.items.push(activity);

  if (batch.items.length >= BATCH_CONFIG.ACTIVITY_BATCH_SIZE) {
    flushActivityBatch(dashboardId);
  } else if (!batch.timer) {
    batch.timer = setTimeout(() => flushActivityBatch(dashboardId), BATCH_CONFIG.ACTIVITY_FLUSH_INTERVAL);
  }
}

// --- PERIODIC FLUSH (SAFETY NET) ---
setInterval(() => {
  // Flush all pending batches every 5 seconds as safety net
  elementBatches.forEach((_, dashboardId) => flushElementBatch(dashboardId));
  flushUpdateQueue();
  chatBatches.forEach((_, dashboardId) => flushChatBatch(dashboardId));
  activityBatches.forEach((_, dashboardId) => flushActivityBatch(dashboardId));
}, 5000);

// --- WebSocket Connection ---
wss.on('connection', async (socket: WebSocket, request: any) => {
  const user = request.user;
  if (!user) { socket.close(4001, 'Unauthorized'); return; }

  const urlParts = request.url.split('/');
  const dashboardId = urlParts[urlParts.length - 1].split('?')[0];
  if (!dashboardId) { socket.close(4001, 'Dashboard ID required'); return; }

  const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const userColor = userColorFromHash(user.name);

  if (!whiteboardConnections.has(dashboardId)) {
    whiteboardConnections.set(dashboardId, new Map());
  }
  const boardConnections = whiteboardConnections.get(dashboardId)!;
  boardConnections.set(connectionId, socket);

  if (!userPresence.has(dashboardId)) {
    userPresence.set(dashboardId, new Map());
  }
  const presence = userPresence.get(dashboardId)!;
  presence.set(user.userId, {
    userId: user.userId,
    username: user.name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
    color: userColor,
    status: 'online',
    role: 'editor',
    lastSeen: Date.now()
  });

  console.log(`✅ User ${user.name} (${connectionId}) connected to ${dashboardId}`);

  // Load initial data (ONCE on connection)
  try {
    const savedElements = await prisma.whiteboardElement.findMany({
      where: { dashboardId },
      orderBy: { createdAt: 'asc' }
    });

    const history = savedElements.map((el: any) => ({
      id: el.id,
      type: el.type,
      isLocked: el.isLocked,
      parentId: el.parentId,
      comments: el.comments || [],
      createdBy: el.createdBy,
      createdAt: el.createdAt,
      ...(el.properties as object)
    }));

    const chatMessages = await prisma.chatMessage.findMany({
      where: { dashboardId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const activities = await prisma.activity.findMany({
      where: { dashboardId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const currentPresence = Array.from(presence.values());

    socket.send(JSON.stringify({
      type: 'connection_established',
      clientId: connectionId,
      userId: user.userId,
      username: user.name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
      color: userColor,
      history: history,
      chatMessages: chatMessages.reverse(),
      activities: activities.reverse(),
      presence: currentPresence
    }));
  } catch (err) {
    console.error("❌ Error loading history:", err);
  }

  // User joined activity (batched)
  const joinActivity = {
    id: `activity-${Date.now()}`,
    userId: user.userId,
    username: user.name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
    action: 'joined the board',
    details: '',
    timestamp: Date.now(),
    type: 'join' as const,
    dashboardId
  };

  addToActivityBatch(dashboardId, joinActivity);

  broadcast(dashboardId, {
    type: 'user_joined',
    clientId: connectionId,
    userId: user.userId,
    username: user.name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
    color: userColor,
    status: 'online',
    role: 'editor',
    activity: joinActivity
  }, connectionId);

  const heartbeatInterval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      const userPres = presence.get(user.userId);
      if (userPres) userPres.lastSeen = Date.now();
    }
  }, 30000);

  // --- MESSAGE HANDLER ---
  socket.on('message', async (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      const enhancedMsg = { 
        ...msg, 
        userId: user.userId, 
        username: user.name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
        clientId: connectionId 
      };

      const userPres = presence.get(user.userId);
      if (userPres) userPres.lastSeen = Date.now();

      // 1. CHAT MESSAGES (batched)
      if (msg.type === 'chat_message') {
        const chatMsg = {
          id: `chat-${Date.now()}`,
          userId: user.userId,
          username: user.name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
          message: msg.message,
          timestamp: Date.now(),
          dashboardId
        };

        addToChatBatch(dashboardId, chatMsg);

        broadcast(dashboardId, {
          type: 'chat_message',
          message: chatMsg
        }, '');
      }

      // 2. TYPING INDICATORS (no DB, memory only)
      else if (msg.type === 'typing_start') {
        if (!typingUsers.has(dashboardId)) {
          typingUsers.set(dashboardId, new Set());
        }
        typingUsers.get(dashboardId)!.add(user.userId);

        broadcast(dashboardId, {
          type: 'typing_indicator',
          userId: user.userId,
          username: user.name,
          isTyping: true
        }, connectionId);

        setTimeout(() => {
          typingUsers.get(dashboardId)?.delete(user.userId);
          broadcast(dashboardId, {
            type: 'typing_indicator',
            userId: user.userId,
            username: user.name,
            isTyping: false
          }, connectionId);
        }, 3000);
      }

      // 3. STATUS CHANGE (memory only, broadcast immediately)
      else if (msg.type === 'status_change') {
        const userPres = presence.get(user.userId);
        if (userPres) {
          userPres.status = msg.status;
          broadcast(dashboardId, {
            type: 'presence_update',
            userId: user.userId,
            username: user.name,
            status: msg.status
          }, connectionId);
        }
      }

      // 4. CURSOR POSITION (memory only, no DB)
      else if (msg.type === 'cursor_move') {
        const userPres = presence.get(user.userId);
        if (userPres) {
          userPres.cursorX = msg.x;
          userPres.cursorY = msg.y;
        }
        
        broadcast(dashboardId, {
          ...enhancedMsg,
          color: userColor
        }, connectionId);
      }

      // 5. COMMENTS (immediate DB write for critical data)
      else if (msg.type === 'add_comment') {
        const comment = {
          id: `comment-${Date.now()}`,
          userId: user.userId,
          username: user.name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
          text: msg.text,
          timestamp: Date.now()
        };

        const element = await prisma.whiteboardElement.findUnique({
          where: { id: msg.elementId }
        });

        if (element) {
          const existingComments = (element.comments as any[]) || [];
          await prisma.whiteboardElement.update({
            where: { id: msg.elementId },
            data: {
              comments: [...existingComments, comment]
            }
          });

          broadcast(dashboardId, {
            type: 'element_comment_added',
            elementId: msg.elementId,
            comment
          }, '');

          const activity = {
            id: `activity-${Date.now()}`,
            userId: user.userId,
            username: user.name,
            avatar: comment.avatar,
            action: 'commented',
            details: `on ${element.type}`,
            timestamp: Date.now(),
            type: 'comment' as const,
            dashboardId
          };

          addToActivityBatch(dashboardId, activity);
          broadcast(dashboardId, { type: 'activity', activity }, '');
        }
      }

      // 6. REACTIONS (batched updates)
      else if (msg.type === 'add_reaction') {
        const reaction = {
          userId: user.userId,
          username: user.name,
          emoji: msg.emoji,
          timestamp: Date.now()
        };

        const element = await prisma.whiteboardElement.findUnique({
          where: { id: msg.elementId }
        });

        if (element) {
          const reactions = ((element.properties as any).reactions || []);
          
          // Queue update instead of immediate write
          addToUpdateQueue(msg.elementId, {
            id: msg.elementId,
            properties: {
              ...(element.properties as object),
              reactions: [...reactions, reaction]
            },
            isLocked: element.isLocked
          });

          broadcast(dashboardId, {
            type: 'element_reaction',
            elementId: msg.elementId,
            reaction
          }, '');
        }
      }

      // 7. VOICE/VIDEO SIGNALS (no DB, WebRTC only)
      if (['voice_signal', 'video_signal', 'join_voice', 'leave_voice', 'join_video', 'leave_video'].includes(msg.type)) {
        broadcast(dashboardId, enhancedMsg, connectionId);
        return;
      }

      // 8. BATCH DRAW (batched)
      if (msg.type === 'batch_draw_action') {
        broadcast(dashboardId, { type: 'batch_draw_action', elements: msg.elements }, connectionId);

        const dbData = msg.elements.map((el: any) => {
           const { id, type, isLocked, parentId, ...props } = el;
           return {
             id,
             dashboardId,
             type,
             isLocked: isLocked || false,
             zIndex: type === 'rectangle' && isLocked ? 0 : 10, 
             parentId: parentId || null,
             createdBy: user.userId,
             properties: props
           };
        });

        // Add all to batch
        dbData.forEach((item: any) => addToElementBatch(dashboardId, item));
      }

      // 9. SINGLE DRAW (batched)
      else if (msg.type === 'draw_action') {
        broadcast(dashboardId, enhancedMsg, connectionId);
        
        const { id, type, isLocked, parentId, ...props } : any = msg.element;
        
        addToElementBatch(dashboardId, {
          id, 
          dashboardId,
          type,
          isLocked: isLocked || false,
          zIndex: 10,
          parentId: parentId || null,
          createdBy: user.userId,
          properties: props
        });

        const activity = {
          id: `activity-${Date.now()}`,
          userId: user.userId,
          username: user.name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
          action: 'created',
          details: `a ${type}`,
          timestamp: Date.now(),
          type: 'create' as const,
          dashboardId
        };
        
        addToActivityBatch(dashboardId, activity);
        broadcast(dashboardId, { type: 'activity', activity }, '');
      } 
      
      // 10. UPDATE ELEMENT (batched with deduplication)
      else if (msg.type === 'element_update') {
        broadcast(dashboardId, enhancedMsg, connectionId);
        const { id, type, isLocked, ...props } : any = msg.element;
        
        addToUpdateQueue(id, {
          id,
          properties: props,
          isLocked: isLocked
        });
      } 
      
      // 11. CLEAR BOARD (immediate)
      else if (msg.type === 'clear_board') {
        broadcast(dashboardId, enhancedMsg, connectionId);
        
        await prisma.whiteboardElement.deleteMany({
          where: { dashboardId }
        });

        const activity = {
          id: `activity-${Date.now()}`,
          userId: user.userId,
          username: user.name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
          action: 'cleared the board',
          details: 'All elements removed',
          timestamp: Date.now(),
          type: 'delete' as const,
          dashboardId
        };
        
        addToActivityBatch(dashboardId, activity);
        broadcast(dashboardId, { type: 'activity', activity }, '');
      }

    } catch (err) {
      console.error("❌ WS Message Error:", err);
    }
  });

  socket.on('close', async () => {
    clearInterval(heartbeatInterval);
    
    const conns = whiteboardConnections.get(dashboardId);
    conns?.delete(connectionId);
    if (conns?.size === 0) whiteboardConnections.delete(dashboardId);

    presence.delete(user.userId);

    const leaveActivity = {
      id: `activity-${Date.now()}`,
      userId: user.userId,
      username: user.name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
      action: 'left the board',
      details: '',
      timestamp: Date.now(),
      type: 'join' as const,
      dashboardId
    };

    addToActivityBatch(dashboardId, leaveActivity);

    broadcast(dashboardId, { 
      type: 'user_left', 
      clientId: connectionId,
      userId: user.userId,
      activity: leaveActivity
    }, connectionId);

    console.log(`❌ User ${user.name} disconnected from ${dashboardId}`);
  });
});

function broadcast(dashboardId: string, message: any, senderId: string) {
  const clients = whiteboardConnections.get(dashboardId);
  if (!clients) return;

  const msgStr = JSON.stringify({ ...message });
  clients.forEach((client, id) => {
    if (id !== senderId && client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    } else if (senderId === '' && client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
}

function userColorFromHash(str: string): string {
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A8", "#33FFF5", "#FFD700", "#00CED1"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  if (url.pathname.startsWith('/ws/whiteboard')) {
    const token = url.searchParams.get('token');
    const user = verifyToken(token || ''); 
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    (request as any).user = user;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// --- GRACEFUL SHUTDOWN ---
async function gracefulShutdown() {
  console.log('⚠️  Shutting down gracefully...');
  
  // Flush all pending batches
  console.log('💾 Flushing all pending batches...');
  await Promise.all([
    ...Array.from(elementBatches.keys()).map(id => flushElementBatch(id)),
    ...Array.from(chatBatches.keys()).map(id => flushChatBatch(id)),
    ...Array.from(activityBatches.keys()).map(id => flushActivityBatch(id)),
    flushUpdateQueue()
  ]);
  
  await prisma.$disconnect();
  console.log('✅ All data saved. Goodbye!');
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Batch config: Elements=${BATCH_CONFIG.ELEMENT_BATCH_SIZE}, Chat=${BATCH_CONFIG.CHAT_BATCH_SIZE}`);
  console.log(`✅ API Routes:`);
  console.log(`   📍 http://localhost:${PORT}/api/health`);
  console.log(`   🔐 http://localhost:${PORT}/api/auth/...`);
  console.log(`   📊 http://localhost:${PORT}/api/dashboards`);
  console.log(`   📁 http://localhost:${PORT}/api/folders`);
  console.log(`   🔌 ws://localhost:${PORT}/ws/whiteboard/:id`);
});
