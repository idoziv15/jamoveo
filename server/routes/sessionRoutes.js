const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const {
  startSession,
  endSession,
  getActiveSession,
  joinSession,
  leaveSession
} = require('../controllers/sessionController');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Get active session
router.get('/active', getActiveSession);

// Start new session (admin only)
router.post('/', restrictTo(true), startSession);

// End session (admin only)
router.patch('/:id/end', restrictTo(true), endSession);

// Join/leave session (all authenticated users)
router.post('/:id/join', joinSession);
router.post('/:id/leave', leaveSession);

module.exports = router; 