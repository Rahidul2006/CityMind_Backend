const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
} = require('../controllers/userController');

// GET /users
router.get('/', getAllUsers);

// POST /users
router.post('/', createUser);

module.exports = router;