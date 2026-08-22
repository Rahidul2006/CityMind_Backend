const analyticsService = require("../services/analyticsServices");

const getAnalyticsOverview = async (req, res) => {
  try {
    const data = await analyticsService.getOverviewMetrics(req.query);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analytics overview",
    });
  }
};

const exportAnalyticsReport = async (req, res) => {
  try {
    const data = await analyticsService.getOverviewMetrics(req.query);
    const csvLines = [
      "Metric,Value",
      `Total Issues,${data.kpis.totalIssues}`,
      `Resolved Issues,${data.kpis.resolvedIssues}`,
      `In Progress Issues,${data.kpis.inProgressIssues}`,
      `Resolution Rate,${data.kpis.resolutionRate}%`,
      `Avg Resolution Time,${data.kpis.avgResolutionTimeHours} hours`,
      `SLA Compliance,${data.kpis.slaCompliance}%`,
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=CityMind_Analytics_${Date.now()}.csv`);
    return res.status(200).send(csvLines.join("\n"));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to export report",
    });
  }
};

module.exports = {
  getAnalyticsOverview,
  exportAnalyticsReport,
};
