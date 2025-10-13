const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getDashboardStats,
  getProjectStats
} = require('../controllers/statsController');

// All routes require authentication
router.use(authenticateToken);

router.get('/dashboard', getDashboardStats);
router.get('/project/:projectId', getProjectStats);

module.exports = router;
