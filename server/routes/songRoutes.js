const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const {
  createSong,
  getAllSongs,
  getSong,
  updateSong,
  deleteSong,
  searchSongs,
  getSongDetails
} = require('../controllers/songController');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getAllSongs);
router.get('/search', searchSongs);
router.get('/song-details', getSongDetails);
router.get('/:id', getSong);

// Routes that require either admin access or song ownership
router.post('/', createSong);
router.patch('/:id', updateSong);
router.delete('/:id', deleteSong);

module.exports = router; 