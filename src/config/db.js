
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI ;
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1); // Stop the process if connection fails
  }
};

module.exports = connectDB;