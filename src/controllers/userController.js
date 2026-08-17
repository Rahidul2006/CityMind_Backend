const User = require('../models/userModel');
const Department = require('../models/departmentModel');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      role: user.role,
      departmentId: user.departmentId || null,
    },
    process.env.JWT_SECRET || 'secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'ADMIN', departmentId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email is already registered.' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role,
      departmentId: departmentId || null,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('departmentId', 'name code');
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, password, role = 'ADMIN' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email is already registered.' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account is deactivated. Contact municipal administration.' });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    let department = null;
    if (user.departmentId) {
      department = await Department.findById(user.departmentId).select('name code icon color categories');
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: department ? department.name : '',
        departmentCode: department ? department.code : '',
        department: department,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const departmentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const role = (user.role || '').toUpperCase();
    if (role !== 'DEPARTMENT_OFFICER' && role !== 'OFFICER') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Credentials belong to an Admin account. Use Admin login.',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Department officer account is currently deactivated.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    let department = null;
    if (user.departmentId) {
      department = await Department.findById(user.departmentId);
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Department officer authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: 'DEPARTMENT_OFFICER',
        departmentId: user.departmentId,
        departmentName: department ? department.name : '',
        departmentCode: department ? department.code : '',
        department: department,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    let department = null;
    if (req.user?.departmentId) {
      department = await Department.findById(req.user.departmentId);
    }
    return res.status(200).json({
      success: true,
      user: req.user,
      department: department,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { signup, login, departmentLogin, logout, getProfile, createUser, getAllUsers };