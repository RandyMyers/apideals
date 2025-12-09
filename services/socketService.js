/**
 * Socket.IO Service
 * Centralized Socket.IO management to avoid circular dependencies
 */

let io = null;
let adminNamespace = null;

/**
 * Initialize Socket.IO
 * @param {Object} server - HTTP server instance
 */
const initSocket = (server) => {
  const { Server } = require('socket.io');
  
  io = new Server(server, {
    cors: {
      origin: process.env.ADMIN_URL || process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io'
  });

  // Create admin namespace
  adminNamespace = io.of('/admin');

  adminNamespace.use((socket, next) => {
    // Optional: Add authentication middleware here
    // For now, allow all connections (can add JWT verification later)
    next();
  });

  adminNamespace.on('connection', (socket) => {
    console.log('Admin client connected to Socket.IO', { socketId: socket.id });

    socket.on('disconnect', () => {
      console.log('Admin client disconnected from Socket.IO', { socketId: socket.id });
    });

    // Send initial connection confirmation
    socket.emit('connected', { message: 'Connected to live activity feed' });
  });

  return { io, adminNamespace };
};

/**
 * Get admin namespace
 * @returns {Object} Admin namespace
 */
const getAdminNamespace = () => {
  return adminNamespace;
};

/**
 * Emit event to admin namespace
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToAdmin = (event, data) => {
  if (adminNamespace) {
    adminNamespace.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getAdminNamespace,
  emitToAdmin
};

