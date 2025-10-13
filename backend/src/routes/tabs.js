const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getTabs,
  createTab,
  updateTab,
  deleteTab,
  tabValidation
} = require('../controllers/tabController');

// All routes require authentication
router.use(authenticateToken);

router.get('/:projectId/tabs', getTabs);
router.post('/:projectId/tabs', tabValidation, createTab);
router.put('/tabs/:tabId', updateTab);
router.delete('/tabs/:tabId', deleteTab);

module.exports = router;
