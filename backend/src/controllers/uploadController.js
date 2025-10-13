const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

// Upload app icon
const uploadAppIcon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다' });
    }

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Resize and optimize image
    const iconPath = `uploads/icons/${uuidv4()}.png`;
    await sharp(req.file.path)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 90 })
      .toFile(iconPath);

    // Update project settings
    await db.execute(
      'UPDATE project_settings SET app_icon = ? WHERE project_id = ?',
      [iconPath, req.params.projectId]
    );

    res.json({
      message: '앱 아이콘이 업로드되었습니다',
      icon_url: `/${iconPath}`
    });
  } catch (error) {
    console.error('Upload app icon error:', error);
    res.status(500).json({ error: '파일 업로드에 실패했습니다' });
  }
};

// Upload splash image
const uploadSplashImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다' });
    }

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Resize and optimize image
    const splashPath = `uploads/splash/${uuidv4()}.png`;
    await sharp(req.file.path)
      .resize(1080, 1920, {
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 90 })
      .toFile(splashPath);

    // Update project settings
    await db.execute(
      'UPDATE project_settings SET splash_image = ? WHERE project_id = ?',
      [splashPath, req.params.projectId]
    );

    res.json({
      message: '스플래시 이미지가 업로드되었습니다',
      splash_url: `/${splashPath}`
    });
  } catch (error) {
    console.error('Upload splash image error:', error);
    res.status(500).json({ error: '파일 업로드에 실패했습니다' });
  }
};

module.exports = {
  upload,
  uploadAppIcon,
  uploadSplashImage
};
