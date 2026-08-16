const express = require('express');
const cors = require('cors');

const indexRouter = require('./routes/index');
const healthRouter = require('./routes/healthRoute');
const userRouter = require('./routes/userRoute');
const authRouter = require('./routes/authRoute');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Mount Routes
app.use('/', indexRouter);
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/users', userRouter);

module.exports = app;