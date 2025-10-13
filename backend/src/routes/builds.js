const express = require('express');
const router = express.Router();
const {
  getBuilds,
  createBuild,
  getBuildStatus,
  downloadBuild
} = require('../controllers/buildController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.get('/:projectId/builds', getBuilds);
router.post('/:projectId/builds', createBuild);
router.get('/:projectId/builds/:buildId', getBuildStatus);
router.get('/:projectId/builds/:buildId/download', downloadBuild);

module.exports = router;
