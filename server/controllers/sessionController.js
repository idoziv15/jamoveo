const Session = require('../models/Session');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Start a new session
exports.startSession = async (req, res, next) => {
  try {
    const { songId } = req.body;

    const session = await Session.create({
      song: songId,
      admin: req.user._id,
      participants: [{
        user: req.user._id,
        instrument: req.user.instrument
      }]
    });

    await session.populate('song');
    await session.populate('admin', 'username');
    await session.populate('participants.user', 'username instrument');

    logger.info(`New session started by ${req.user.username} for song ${session.song.title}`);
    res.status(201).json({
      status: 'success',
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

// End a session
exports.endSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return next(new AppError('No session found with that ID', 404));
    }

    if (session.admin.toString() !== req.user._id.toString()) {
      return next(new AppError('Only the session admin can end the session', 403));
    }

    session.status = 'ended';
    session.endedAt = Date.now();
    await session.save();

    logger.info(`Session ended by ${req.user.username}`);
    res.status(200).json({
      status: 'success',
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

// Get active session
exports.getActiveSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ status: 'active' })
      .populate('song')
      .populate('admin', 'username')
      .populate('participants.user', 'username instrument');

    if (!session) {
      return next(new AppError('No active session found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

// Join a session
exports.joinSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return next(new AppError('No session found with that ID', 404));
    }

    if (session.status !== 'active') {
      return next(new AppError('This session has ended', 400));
    }

    // Check if user is already in session
    const isParticipant = session.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      session.participants.push({
        user: req.user._id,
        instrument: req.user.instrument
      });
      await session.save();
    }

    await session.populate('song');
    await session.populate('admin', 'username');
    await session.populate('participants.user', 'username instrument');

    logger.info(`${req.user.username} joined session for song ${session.song.title}`);
    res.status(200).json({
      status: 'success',
      data: { session }
    });
  } catch (error) {
    next(error);
  }
};

// Leave a session
exports.leaveSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return next(new AppError('No session found with that ID', 404));
    }

    if (session.status !== 'active') {
      return next(new AppError('This session has ended', 400));
    }

    // Remove user from participants
    session.participants = session.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    );
    await session.save();

    logger.info(`${req.user.username} left the session`);
    res.status(200).json({
      status: 'success',
      data: { session }
    });
  } catch (error) {
    next(error);
  }
}; 