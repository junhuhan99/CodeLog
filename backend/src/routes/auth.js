const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getCurrentUser,
  registerValidation,
  loginValidation
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
