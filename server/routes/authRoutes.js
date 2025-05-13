const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');
const config = require('../config/config');

const router = express.Router();

// Helper function to generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

// Regular user signup
router.post('/signup', async (req, res, next) => {
  try {
    // Debugging point 1: Check incoming request
    debugger;
    const { username, password, instrument } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return next(new AppError('Username already exists', 400));
    }

    // Debugging point 2: Before user creation
    debugger;
    // Create new user
    const user = await User.create({
      username,
      password,
      instrument: instrument === 'vocals' ? undefined : instrument,
      isAdmin: false
    });

    // Generate token
    const token = signToken(user._id);

    // Debugging point 3: After user creation
    debugger;
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
});

// Admin signup
router.post('/admin/signup', async (req, res, next) => {
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
});

// Login route for both regular users and admins
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Check if username and password exist
    if (!username || !password) {
      return next(new AppError('Please provide username and password', 400));
    }

    // Find user and check password
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid username or password', 401));
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = signToken(user._id);

    logger.info(`User logged in: ${username}`);
    res.status(200).json({
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
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user._id,
        username: req.user.username,
        instrument: req.user.instrument,
        isAdmin: req.user.isAdmin
      }
    }
  });
});

// Update user profile
router.patch('/me', protect, async (req, res, next) => {
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
});

module.exports = router; 