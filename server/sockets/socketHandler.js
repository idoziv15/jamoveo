const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const logger = require('../utils/logger');
const config = require('../config/config');

// Authenticate socket connection
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      logger.error('Socket authentication failed: No token provided');
      return next(new Error('No authentication token provided'));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded || !decoded.id) {
      logger.error('Socket authentication failed: Invalid token');
      return next(new Error('Invalid authentication token'));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      logger.error(`Socket authentication failed: User not found for ID ${decoded.id}`);
      return next(new Error('User not found'));
    }

    socket.user = user;
    logger.info(`Socket authenticated for user: ${user.username}`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error(`Authentication failed: ${error.message}`));
  }
};

// Handle socket events
const handleSocket = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.username}`);

    // Join session room
    socket.on('join:session', async (sessionId) => {
      try {
        const session = await Session.findById(sessionId);
        if (!session || session.status !== 'active') {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }

        socket.join(`session:${sessionId}`);
        logger.info(`${socket.user.username} joined session room: ${sessionId}`);

        // Notify others in the session
        socket.to(`session:${sessionId}`).emit('user:joined', {
          username: socket.user.username,
          instrument: socket.user.instrument
        });
      } catch (error) {
        logger.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Leave session room
    socket.on('leave:session', async (sessionId) => {
      try {
        socket.leave(`session:${sessionId}`);
        logger.info(`${socket.user.username} left session room: ${sessionId}`);

        // Notify others in the session
        socket.to(`session:${sessionId}`).emit('user:left', {
          username: socket.user.username
        });
      } catch (error) {
        logger.error('Error leaving session:', error);
      }
    });

    // Handle scroll position updates
    socket.on('scroll:update', async (data) => {
      try {
        const { sessionId, position } = data;
        socket.to(`session:${sessionId}`).emit('scroll:sync', {
          position,
          username: socket.user.username
        });
      } catch (error) {
        logger.error('Error syncing scroll:', error);
      }
    });

    // Handle session end
    socket.on('session:end', async (sessionId) => {
      try {
        const session = await Session.findById(sessionId);
        if (!session) return;

        if (session.admin.toString() === socket.user._id.toString()) {
          session.status = 'ended';
          session.endedAt = Date.now();
          await session.save();

          io.to(`session:${sessionId}`).emit('session:ended');
          logger.info(`Session ended: ${sessionId}`);
        }
      } catch (error) {
        logger.error('Error ending session:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.username}`);
    });
  });
};

module.exports = handleSocket; 