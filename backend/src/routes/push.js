const express = require('express');
const router = express.Router();
const {
  sendPush,
  getPushHistory
} = require('../controllers/pushController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.post('/:projectId/push', sendPush);
router.get('/:projectId/push', getPushHistory);

module.exports = router;
