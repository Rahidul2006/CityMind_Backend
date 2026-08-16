const express = require('express');
const app = express();
const indexRouter = require('./routes/index');
const healthRouter = require('./routes/healthRoute');
const userRouter = require('./routes/userRoute');


app.use(express.json());
app.use('/', indexRouter);
app.use('/health', healthRouter);
app.use('/users', userRouter);

module.exports = app;
