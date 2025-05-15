const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const signToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

exports.signup = async (req, res, next) => {
  try {
    const { username, password, instrument } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return next(new AppError('Username already exists', 400));
    }

    // Create new user
    const user = await User.create({
      username,
      password,
      instrument: instrument === 'vocals' ? undefined : instrument,
      isAdmin: false
    });

    // Generate token
    const token = signToken(user._id);

    logger.info(`New user registered: ${username}`);
    res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        username: user.username,
        instrument: user.instrument,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.signupAdmin = async (req, res, next) => {
  try {
    const { username, password, instrument } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return next(new AppError('Username already exists', 400));
    }

    // Create new admin user
    const user = await User.create({
      username,
      password,
      instrument: instrument === 'vocals' ? undefined : instrument,
      isAdmin: true
    });

    // Generate token
    const token = signToken(user._id);

    logger.info(`New admin registered: ${username}`);
    res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        username: user.username,
        instrument: user.instrument,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { username, instrument, currentPassword, newPassword } = req.body;
    const user = req.user;

    // If updating password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return next(new AppError('Please provide current password', 400));
      }

      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return next(new AppError('Current password is incorrect', 401));
      }

      user.password = newPassword;
    }

    // Update other fields
    if (username) user.username = username;
    if (instrument) user.instrument = instrument === 'vocals' ? undefined : instrument;

    await user.save();

    logger.info(`User profile updated: ${user.username}`);
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          username: user.username,
          instrument: user.instrument,
          isAdmin: user.isAdmin
        }
      }
    });
  } catch (error) {
    next(error);
  }
}; 