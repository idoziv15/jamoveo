const Song = require('../models/Song');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const songAPIService = require('../services/songAPIService');

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

// Get all songs
exports.getAllSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = Song.find().sort('-createdAt').skip(skip).limit(limit).populate('createdBy', 'username');
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

    // Check if the query contains Hebrew characters
    const isHebrew = /[\u0590-\u05FF]/.test(query);

    // Search with a API service
    const availableSongs = isHebrew
      ? await songAPIService.scrapeTab4U(query)
      : await songAPIService.scrapeChordie(query.toLowerCase());

    // const availableSongs = [
    //   {
    //     title: 'Hey Jude',
    //     artist: 'The Beatles',
    //     url: 'hey_jude',
    //     source: 'local'
    //   }
    // ];

    // Filter songs based on search query
    const songs = availableSongs.filter(song =>
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query)
    );

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
    const { instrument } = req.user;
    
    // Validate URL parameter
    if (!url) {
      return next(new AppError('URL parameter is required', 400));
    }
    
    // Get raw song details from the service
    const songData = await songAPIService.getSongDetails(url);
    // const songData = await songAPIService.getSongFromScreenshotViaGPT(url);
    // Process the song content based on user type - show chords for all instruments except vocals
    const processedContent = formatSongContent(songData.lines, instrument !== 'vocals');
    
    res.status(200).json({
      success: true,
      data: {
        ...songData,
        lines: processedContent
      }
    });
  } catch (error) {
    logger.error('Error in getSongDetails controller:', error);
    next(error);
  }
};

/**
 * Formats song content based on whether chords should be displayed
 * @param {Array} lines Array of line objects containing lyrics and chords
 * @param {boolean} showChords Whether to show chords (true for players)
 * @returns {Array} Formatted lines with proper positioning
 */
const formatSongContent = (lines, showChords) => {
  if (!showChords) {
    // For singers, return only lyrics
    return lines.map(line => ({
      type: 'lyrics',
      content: line.lyrics || ''
    }));
  }

  // For players, return both chords and lyrics
  const formattedLines = [];

  lines
    .filter(line => line && typeof line === 'object')
    .forEach(line => {
      const safeChords = (line.chords || []).filter(
        chord =>
          chord &&
          typeof chord.text === 'string' &&
          chord.text.trim() !== '' &&
          typeof chord.position === 'number' &&
          chord.position >= 0
      );

      if (safeChords.length > 0) {
        formattedLines.push({
          type: 'chords',
          content: '',
          positions: safeChords.map(chord => ({
            text: chord.text.trim(),
            position: chord.position
          }))
        });
      }

      formattedLines.push({
        type: 'lyrics',
        content: line.lyrics || ''
      });
    });

  return formattedLines;
};

exports.formatSongContent = formatSongContent;