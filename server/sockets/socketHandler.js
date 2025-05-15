const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const logger = require('../utils/logger');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');
const songAPIService = require('../services/songAPIService');
const { formatSongContent } = require('../controllers/songController');

// Helper function to get song details
const getSongDetails = async (songId) => {
  try {
    const filePath = path.join(__dirname, '..', `${songId}.json`);
    const songData = await fs.readFile(filePath, 'utf-8');
    const rawSongData = JSON.parse(songData);

    // Process the raw song data
    const processedLines = rawSongData.map(line => {
      // Calculate positions for lyrics and chords
      let chordsLine = '';
      let currentPosition = 0;
      
      // First build the lyrics line
      const lyricsLine = line.map(word => word.lyrics).join(' ');
      
      // Then place chords at correct positions
      line.forEach((word, index) => {
        // Calculate the position where this word starts
        const wordStart = index === 0 ? 0 : lyricsLine.indexOf(word.lyrics, currentPosition);
        
        // If this word has a chord, add spaces until its position and then add the chord
        if (word.chords) {
          // Pad with spaces until the word position
          while (chordsLine.length < wordStart) {
            chordsLine += ' ';
          }
          chordsLine += word.chords;
        }
        
        // Update current position to after this word
        currentPosition = wordStart + word.lyrics.length;
      });
      
      return {
        lyrics: lyricsLine,
        chords: chordsLine
      };
    });

    // Create the formatted song object
    return {
      _id: songId,
      title: songId === 'hey_jude' ? 'Hey Jude' : 'ואיך שלא',
      artist: songId === 'hey_jude' ? 'The Beatles' : 'אביתר בנאי',
      lines: processedLines
    };
  } catch (err) {
    logger.error('Error getting song details:', err);
    return null;
  }
};

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

  // Keep track of active session and participants
  let activeSession = null;
  const participants = new Map();

  const hasAdminParticipant = () => {
    return Array.from(participants.values()).some(p => p.isAdmin);
  };

  const broadcastParticipants = () => {
    if (!activeSession) return;
    
    const participantsList = Array.from(participants.values()).map(p => ({
      username: p.username,
      instrument: p.instrument,
      isAdmin: p.isAdmin
    }));

    io.emit('session:participants', participantsList);
    logger.info(`Broadcasting ${participantsList.length} participants`);
  };

  const endSession = () => {
    activeSession = null;
    participants.clear();
    // First broadcast the session end event
    io.emit('session:ended');
    // Then force null state to all clients
    io.emit('session:current_state', null);
    // Force disconnect all clients from the session
    io.emit('session:force_clear');
    logger.info('Session ended and all clients notified');
  };

  const removeParticipant = (socketId) => {
    if (participants.has(socketId)) {
      const participant = participants.get(socketId);
      participants.delete(socketId);
      logger.info(`Removed participant: ${participant.username}`);
      
      // If no admin is left and session is active, end the session
      if (!hasAdminParticipant() && activeSession) {
        endSession();
      } else if (activeSession) {
        broadcastParticipants();
      }
    }
  };

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.username}`);

    // Handle get current session state
    socket.on('session:get_current', () => {
      // Double check if session is actually active
      if (!activeSession || !hasAdminParticipant()) {
        socket.emit('session:current_state', null);
        // Only log if state changed from active to null
        if (socket.lastKnownState !== null) {
          logger.info(`Sent null state to ${socket.user.username} - no active session or admin`);
          socket.lastKnownState = null;
        }
        return;
      }
      
      // Only send and log if state has changed
      if (socket.lastKnownState !== activeSession._id) {
        // Send current session state
        socket.emit('session:current_state', activeSession);
        
        // Also send participants list to ensure UI is in sync
        const participantsList = Array.from(participants.values()).map(p => ({
          username: p.username,
          instrument: p.instrument,
          isAdmin: p.isAdmin
        }));
        socket.emit('session:participants', participantsList);
        
        logger.info(`Sent current session state to ${socket.user.username}: ${activeSession.title}`);
        socket.lastKnownState = activeSession._id;
      }
    });

    // Handle song selection (admin only)
    socket.on('song:select', async (songId) => {
      try {
        logger.info(`Received song:select event with ID/URL: ${songId}`);
        if (!socket.user.isAdmin) {
          socket.emit('error', { message: 'Only admins can select songs' });
          return;
        }

        // Check if the songId is a URL (for external songs) or a local ID
        const isUrl = songId.startsWith('http');        
        // Get and process song details using the service
        const songDetails = isUrl ? await songAPIService.getChordieSongWithPuppeteer(songId) : await songAPIService.getSongDetails(songId, 'local');

        if (!songDetails) {
          socket.emit('error', { message: 'Failed to load song details' });
          return;
        }

        logger.info(`🎸 Got song from Puppeteer: ${songDetails?.title}`);
        logger.info(`🎼 Line preview: ${JSON.stringify(songDetails?.lines?.slice(0, 2))}`);

        // Format the song content
        const formattedLines = formatSongContent(
          songDetails.lines,
          socket.user.instrument !== 'vocals'
        );        

        // Update active session with the exact song details we got
        activeSession = {
          ...songDetails,
          lines: formattedLines,
          _id: songId,
          source: isUrl ? new URL(songId).hostname : 'local'
        };
        
        // Add admin to participants if not already present
        participants.set(socket.id, {
          id: socket.user._id,
          username: socket.user.username,
          isAdmin: socket.user.isAdmin,
          instrument: socket.user.instrument
        });

        // Broadcast new session to all clients
        logger.info(`Broadcasting song: ${JSON.stringify(activeSession)}`);
        
        // First broadcast song selection event
        logger.info(`📡 Emitting session:song_selected: ${activeSession?.title}`);
        io.emit('session:song_selected', activeSession);
        
        // Then broadcast current state to ensure all clients are updated
        io.emit('session:current_state', activeSession);
        
        // Finally broadcast new session notification
        io.emit('session:new', activeSession);
        
        // Broadcast participants list
        broadcastParticipants();
        
        logger.info(`New session started by admin ${socket.user.username}: ${songDetails.title}`);
      } catch (error) {
        logger.error('Error handling song selection:', error);
        socket.emit('error', { message: `Failed to select song: ${error.message}` });
      }
    });

    // Handle user joining session
    socket.on('session:join', () => {
      if (!activeSession) {
        socket.emit('error', { message: 'No active session to join' });
        return;
      }

      // Check if there's an admin in the session
      if (!hasAdminParticipant()) {
        socket.emit('error', { message: 'Cannot join session: No admin present' });
        socket.emit('session:current_state', null);
        return;
      }

      // Add user to participants
      participants.set(socket.id, {
        id: socket.user._id,
        username: socket.user.username,
        instrument: socket.user.instrument,
        isAdmin: socket.user.isAdmin
      });

      // Send current session state to joining user
      socket.emit('session:current_state', activeSession);
      
      // Broadcast updated participants list
      broadcastParticipants();
      
      logger.info(`User ${socket.user.username} joined the session`);
    });

    // Handle user leaving session
    socket.on('session:leave', () => {
      removeParticipant(socket.id);
      logger.info(`User ${socket.user.username} left the session`);
    });

    // Handle session end (admin only)
    socket.on('session:end', () => {
      try {
        if (!socket.user.isAdmin) {
          socket.emit('error', { message: 'Only admins can end sessions' });
          return;
        }

        endSession();
      } catch (error) {
        logger.error('Error ending session:', error);
        socket.emit('error', { message: 'Failed to end session' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      removeParticipant(socket.id);
      logger.info(`User disconnected: ${socket.user.username}`);
    });
  });
};

module.exports = handleSocket; 