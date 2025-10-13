const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  getFormSubmissions,
  submitForm,
  formValidation
} = require('../controllers/formController');

// Public route for form submission (from app)
router.post('/submit', submitForm);

// Protected routes
router.use(authenticateToken);

router.get('/:projectId/forms', getForms);
router.post('/:projectId/forms', formValidation, createForm);
router.get('/forms/:formId', getForm);
router.put('/forms/:formId', updateForm);
router.delete('/forms/:formId', deleteForm);
router.get('/forms/:formId/submissions', getFormSubmissions);

module.exports = router;
