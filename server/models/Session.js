const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    instrument: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  }
});

// Index for finding active sessions
sessionSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('Session', sessionSchema); 