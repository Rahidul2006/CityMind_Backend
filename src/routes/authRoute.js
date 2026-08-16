const express = require('express');
const router = express.Router();
const { signup, login, logout, getProfile } = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);

module.exports = router;
