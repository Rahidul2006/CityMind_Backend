const express = require('express');
const router = express.Router();
const { createUser, getAllUsers } = require('../controllers/userController');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

router.get('/', authenticate, authorizeAdmin, getAllUsers);
router.post('/', authenticate, authorizeAdmin, createUser);

module.exports = router;