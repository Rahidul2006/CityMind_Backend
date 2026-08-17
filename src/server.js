const http = require('http');
const dotenv = require('dotenv');

// Load environment variables before importing app/db configs
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
initSocket(server);

// Connect to MongoDB Atlas, then start server on 0.0.0.0 to accept connections from emulators and physical devices
connectDB()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT} (Accessible via localhost and local IP)`);
      console.log(`Socket.IO initialized and ready for real-time events.`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });