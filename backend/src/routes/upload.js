const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { upload, uploadAppIcon, uploadSplashImage } = require('../controllers/uploadController');

// All routes require authentication
router.use(authenticateToken);

// Upload app icon
router.post('/:projectId/icon', upload.single('icon'), uploadAppIcon);

// Upload splash image
router.post('/:projectId/splash', upload.single('splash'), uploadSplashImage);

module.exports = router;
