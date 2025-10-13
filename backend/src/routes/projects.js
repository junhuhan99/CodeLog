const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  updateProjectSettings,
  uploadFirebaseConfig,
  removeFirebaseConfig,
  projectValidation
} = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.get('/', getProjects);
router.post('/', projectValidation, createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.put('/:id/settings', updateProjectSettings);
router.post('/:id/firebase-config', uploadFirebaseConfig);
router.delete('/:id/firebase-config', removeFirebaseConfig);

module.exports = router;
