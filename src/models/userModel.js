const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
}, { timestamps: true });

// Mongoose will create a collection named "users" (pluralized lowercase)
const User = mongoose.model('User', userSchema);

module.exports = User;