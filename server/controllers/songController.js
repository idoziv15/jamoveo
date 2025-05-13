const Song = require('../models/Song');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const tab4uService = require('../services/tab4uService');

// Create a new song
exports.createSong = async (req, res, next) => {
  try {
    const song = await Song.create({
      ...req.body,
      createdBy: req.user._id
    });

    logger.info(`New song created: ${song.title} by ${req.user.username}`);
    res.status(201).json({
      status: 'success',
      data: { song }
    });
  } catch (error) {
    next(error);
  }
};

// Get all songs (with pagination and filtering)
exports.getAllSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = Song.find()
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username');

    const songs = await query;
    const total = await Song.countDocuments();

    res.status(200).json({
      status: 'success',
      results: songs.length,
      total,
      data: { songs }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single song
exports.getSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!song) {
      return next(new AppError('No song found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { song }
    });
  } catch (error) {
    next(error);
  }
};

// Update a song
exports.updateSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new AppError('No song found with that ID', 404));
    }

    // Check if user is admin or song creator
    if (!req.user.isAdmin && song.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have permission to update this song', 403));
    }

    Object.assign(song, req.body);
    await song.save();

    logger.info(`Song updated: ${song.title} by ${req.user.username}`);
    res.status(200).json({
      status: 'success',
      data: { song }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a song
exports.deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return next(new AppError('No song found with that ID', 404));
    }

    // Check if user is admin or song creator
    if (!req.user.isAdmin && song.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have permission to delete this song', 403));
    }

    await song.deleteOne();

    logger.info(`Song deleted: ${song.title} by ${req.user.username}`);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Search songs
exports.searchSongs = async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query) {
      return next(new AppError('Please provide a search query', 400));
    }

    // Search Tab4U
    const tab4uResults = await tab4uService.searchSongs(query);
    
    // Format results
    const songs = tab4uResults.map(song => ({
      title: song.title,
      artist: song.artist,
      url: song.url,
      source: 'tab4u'
    }));

    res.status(200).json({
      status: 'success',
      results: songs.length,
      data: { songs }
    });
  } catch (error) {
    logger.error('Search error:', error);
    next(error);
  }
};

// Get song details
exports.getSongDetails = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return next(new AppError('Please provide a song URL', 400));
    }

    const songDetails = await tab4uService.getSongDetails(url);
    
    res.status(200).json({
      status: 'success',
      data: { song: songDetails }
    });
  } catch (error) {
    logger.error('Error fetching song details:', error);
    next(error);
  }
}; 