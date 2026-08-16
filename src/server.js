const app = require('./app');
const dotenv = require('dotenv');



dotenv.config();

const PORT = process.env.PORT || 3000;
const connectDB = require('./config/db');



connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
  });