const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

// Public/Admin route to get analytics dashboard overview
router.get("/overview", analyticsController.getAnalyticsOverview);

// Export analytics data as CSV
router.get("/export", analyticsController.exportAnalyticsReport);

module.exports = router;
