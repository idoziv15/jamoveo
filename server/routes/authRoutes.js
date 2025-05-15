const express = require('express');
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

// Auth routes
router.post('/login', authController.login);
router.get('/me', protect, authController.getCurrentUser);

// User management routes
router.post('/signup', userController.signup);
router.post('/admin/signup', userController.signupAdmin);
router.patch('/me', protect, userController.updateProfile);

module.exports = router; 