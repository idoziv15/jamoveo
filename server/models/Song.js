const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true
  },
  artist: {
    type: String,
    required: [true, 'Artist name is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Song content is required']
  },
  chords: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastPlayed: {
    type: Date
  },
  playCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
});

// Index for text search with weights
songSchema.index(
  { 
    title: 'text',
    artist: 'text',
    tags: 'text'
  },
  {
    weights: {
      title: 10,
      artist: 5,
      tags: 1
    },
    name: 'TextIndex'
  }
);

// Ensure index is created
songSchema.on('index', function(err) {
  if (err) {
    console.error('Song index error: %s', err);
  } else {
    console.info('Song indexing complete');
  }
});

module.exports = mongoose.model('Song', songSchema); 