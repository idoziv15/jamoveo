const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config/config');

// Helper function to generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

exports.login = async (req, res, next) => {
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
};

exports.getCurrentUser = async (req, res) => {
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
}; 