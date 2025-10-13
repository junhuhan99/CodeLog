const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadKeystore, removeKeystore, getKeystoreInfo } = require('../controllers/keystoreController');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for keystore uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/keystores');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'keystore-' + req.params.projectId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const keystoreUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.keystore' || ext === '.jks' || ext === '.bks') {
      cb(null, true);
    } else {
      cb(new Error('Only keystore files (.keystore, .jks, .bks) are allowed'));
    }
  }
});

// Upload keystore
router.post('/:projectId/keystore', authenticateToken, keystoreUpload.single('keystore'), uploadKeystore);

// Remove keystore
router.delete('/:projectId/keystore', authenticateToken, removeKeystore);

// Get keystore info
router.get('/:projectId/keystore', authenticateToken, getKeystoreInfo);

module.exports = router;
