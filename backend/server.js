const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const projectRoutes = require('./src/routes/projects');
const buildRoutes = require('./src/routes/builds');
const pushRoutes = require('./src/routes/push');
const uploadRoutes = require('./src/routes/upload');
const tabRoutes = require('./src/routes/tabs');
const formRoutes = require('./src/routes/forms');
const statsRoutes = require('./src/routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

// Create upload directories
const fs = require('fs');
const uploadDirs = ['uploads', 'uploads/icons', 'uploads/splash', 'uploads/profiles', 'android-builds'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for uploaded images, builds, etc.)
app.use('/uploads', express.static('uploads'));
app.use('/builds', express.static('android-builds'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', buildRoutes);
app.use('/api/projects', pushRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/projects', tabRoutes);
app.use('/api', formRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeLog API is running' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'CodeLog API',
    version: '1.0.0',
    description: '웹사이트를 Android 앱으로 변환하는 플랫폼',
    author: 'Logs0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '서버 오류가 발생했습니다',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║         CodeLog API Server            ║
║                                       ║
║   Server running on port ${PORT}       ║
║   Environment: ${process.env.NODE_ENV || 'development'}            ║
║                                       ║
║   Made by Logs0                       ║
║                                       ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = app;
