const express = require('express');
const cors = require('cors');

const indexRouter = require('./routes/index');
const healthRouter = require('./routes/healthRoute');
const userRouter = require('./routes/userRoute');
const authRouter = require('./routes/authRoute');
const complaintRoute = require("./routes/complaintRoute");
const departmentRoute = require("./routes/departmentRoute");

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Mount Routes
app.use('/', indexRouter);
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use("/api/complaints", complaintRoute);
app.use("/api/departments", departmentRoute);

module.exports = app;