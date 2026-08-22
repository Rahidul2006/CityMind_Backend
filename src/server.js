const dotenv = require('dotenv');

// Load environment variables before importing app/db configs
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas/local, then start server via Express app.listen
connectDB()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT} (Accessible via localhost and local IP)`);
      console.log(`Socket.IO initialized and ready for real-time events.`);
    });

    // Initialize Socket.IO with the Express server instance
    initSocket(server);
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });