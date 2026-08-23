const Complaint = require("../models/ComplaintModel");
const Department = require("../models/departmentModel");

const CATEGORY_COLORS = {
  "Potholes": "#3b82f6",
  "Roads & Potholes": "#3b82f6",
  "Garbage Overflow": "#10b981",
  "Garbage & Waste": "#10b981",
  "Sanitation": "#10b981",
  "Broken Streetlights": "#f59e0b",
  "Streetlights": "#f59e0b",
  "Water Leakage": "#06b6d4",
  "Water Supply": "#06b6d4",
  "Drain Blockage": "#8b5cf6",
  "Drainage": "#8b5cf6",
  "Road Cracks": "#14b8a6",
  "Others": "#64748b",
};

class AnalyticsService {
  async getOverviewMetrics(queryParams = {}) {
    const { timeframe = "30d", department = "All", ward = "All" } = queryParams;

    // Determine date range cutoff
    const now = new Date();
    let startDate = new Date();
    if (timeframe === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === "90d") {
      startDate.setDate(now.getDate() - 90);
    } else if (timeframe === "1y") {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      // default 30d
      startDate.setDate(now.getDate() - 30);
    }

    // Build Mongoose Match Query
    const matchQuery = {
      createdAt: { $gte: startDate },
    };

    if (department && department !== "All") {
      matchQuery["department.name"] = department;
    }

    if (ward && ward !== "All") {
      matchQuery.$or = [
        { address: new RegExp(ward, "i") },
        { "location.ward": new RegExp(ward, "i") },
      ];
    }

    // Fetch complaint counts from MongoDB
    const totalCount = await Complaint.countDocuments(matchQuery);
    const resolvedCount = await Complaint.countDocuments({
      ...matchQuery,
      status: { $in: ["RESOLVED", "VERIFIED"] },
    });
    const inProgressCount = await Complaint.countDocuments({
      ...matchQuery,
      status: { $in: ["IN_PROGRESS", "ASSIGNED"] },
    });
    const pendingCount = await Complaint.countDocuments({
      ...matchQuery,
      status: { $in: ["SUBMITTED", "REOPENED"] },
    });

    const resolutionRate = totalCount > 0
      ? parseFloat(((resolvedCount / totalCount) * 100).toFixed(1))
      : 0;

    // Compute Avg Resolution Time (turnaround hours) & SLA Compliance from DB statusHistory / timestamps
    const resolvedComplaints = await Complaint.find({
      ...matchQuery,
      status: { $in: ["RESOLVED", "VERIFIED"] },
    }).lean();

    let totalResolutionHours = 0;
    let slaCompliantCount = 0;
    const defaultSlaHours = 24; // SLA target 24 hours

    resolvedComplaints.forEach((c) => {
      let resolvedAt = c.updatedAt;
      if (c.statusHistory && c.statusHistory.length > 0) {
        const resEntry = c.statusHistory.find(
          (h) => h.status === "RESOLVED" || h.status === "VERIFIED"
        );
        if (resEntry && resEntry.timestamp) {
          resolvedAt = new Date(resEntry.timestamp);
        }
      }

      const diffMs = new Date(resolvedAt).getTime() - new Date(c.createdAt).getTime();
      const hours = Math.max(diffMs / (1000 * 60 * 60), 0.1);
      totalResolutionHours += hours;

      const targetSla = c.estimatedRepairHours || defaultSlaHours;
      if (hours <= targetSla) {
        slaCompliantCount++;
      }
    });

    const avgResolutionTimeHours = resolvedCount > 0
      ? parseFloat((totalResolutionHours / resolvedCount).toFixed(1))
      : 0;

    const slaCompliance = resolvedCount > 0
      ? parseFloat(((slaCompliantCount / resolvedCount) * 100).toFixed(1))
      : 0;

    // Volume Trends by Date
    const volumeTrends = await this.getVolumeTrends(startDate, matchQuery);

    // Department Performance Breakdown from DB
    const departmentPerformance = await this.getDepartmentBreakdown(matchQuery);

    // Category Distribution from DB
    const categoryDistribution = await this.getCategoryDistribution(matchQuery, totalCount);

    // Ward Hotspots from DB
    const wardHotspots = await this.getWardHotspots(matchQuery);

    return {
      timeframe,
      lastUpdated: new Date().toISOString(),
      kpis: {
        totalIssues: totalCount,
        resolvedIssues: resolvedCount,
        inProgressIssues: inProgressCount,
        pendingIssues: pendingCount,
        resolutionRate,
        avgResolutionTimeHours,
        slaCompliance,
      },
      volumeTrends,
      departmentPerformance,
      categoryDistribution,
      wardHotspots,
    };
  }

  async getVolumeTrends(startDate, matchQuery) {
    const allComplaints = await Complaint.find(matchQuery).lean();

    // Group by date string (e.g. "May 14")
    const dateMap = {};

    allComplaints.forEach((c) => {
      const repDate = new Date(c.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!dateMap[repDate]) {
        dateMap[repDate] = { reported: 0, resolved: 0 };
      }
      dateMap[repDate].reported++;

      if (c.status === "RESOLVED" || c.status === "VERIFIED") {
        let resDateStr = repDate;
        if (c.statusHistory && c.statusHistory.length > 0) {
          const resEntry = c.statusHistory.find(
            (h) => h.status === "RESOLVED" || h.status === "VERIFIED"
          );
          if (resEntry && resEntry.timestamp) {
            resDateStr = new Date(resEntry.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }
        }
        if (!dateMap[resDateStr]) {
          dateMap[resDateStr] = { reported: 0, resolved: 0 };
        }
        dateMap[resDateStr].resolved++;
      }
    });

    const trendPoints = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      reported: counts.reported,
      resolved: counts.resolved,
    }));

    return trendPoints.slice(-10); // Return up to last 10 trend days
  }

  async getDepartmentBreakdown(matchQuery) {
    const departmentsFromDb = await Department.find().lean();
    const allComplaints = await Complaint.find(matchQuery).lean();

    const deptMap = {};

    // Initialize all departments from DB
    if (departmentsFromDb && departmentsFromDb.length > 0) {
      departmentsFromDb.forEach((d) => {
        deptMap[d._id.toString()] = {
          id: d._id.toString(),
          name: d.name,
          code: d.code || "DEPT",
          activeTasks: 0,
          completedTasks: 0,
          totalTasks: 0,
        };
        deptMap[d.name] = deptMap[d._id.toString()];
      });
    }

    allComplaints.forEach((c) => {
      const deptKey =
        c.assignedDepartment?.toString() ||
        c.department?.name ||
        "Public Works Department";

      if (!deptMap[deptKey]) {
        deptMap[deptKey] = {
          id: deptKey,
          name: c.department?.name || deptKey,
          code: c.department?.id || "DEPT",
          activeTasks: 0,
          completedTasks: 0,
          totalTasks: 0,
        };
      }

      deptMap[deptKey].totalTasks++;
      if (c.status === "RESOLVED" || c.status === "VERIFIED") {
        deptMap[deptKey].completedTasks++;
      } else {
        deptMap[deptKey].activeTasks++;
      }
    });

    const uniqueDepts = Array.from(new Set(Object.values(deptMap)));
    return uniqueDepts.map((d) => {
      const total = d.completedTasks + d.activeTasks;
      const rate = total > 0 ? parseFloat(((d.completedTasks / total) * 100).toFixed(1)) : 0;
      return {
        id: d.id,
        name: d.name,
        code: d.code,
        activeTasks: d.activeTasks,
        completedTasks: d.completedTasks,
        resolutionRate: rate,
        satisfaction: rate > 80 ? 4.7 : rate > 60 ? 4.2 : 3.8,
      };
    });
  }

  async getCategoryDistribution(matchQuery, totalIssuesCount) {
    const categoryCounts = await Complaint.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = totalIssuesCount > 0 ? totalIssuesCount : 1;

    return categoryCounts.map((c) => {
      const catName = c._id || "Others";
      return {
        category: catName,
        count: c.count,
        percentage: Math.round((c.count / total) * 100),
        color: CATEGORY_COLORS[catName] || "#64748b",
      };
    });
  }

  async getWardHotspots(matchQuery) {
    const wardAggregation = await Complaint.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $ifNull: ["$address", "$location.ward"] },
          issues: { $sum: 1 },
          resolvedCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["RESOLVED", "VERIFIED"]] }, 1, 0],
            },
          },
          categories: { $push: "$category" },
          severities: { $push: { $ifNull: ["$severity", "$aiAnalysis.severity"] } },
        },
      },
      { $sort: { issues: -1 } },
      { $limit: 8 },
    ]);

    return wardAggregation.map((w, idx) => {
      const wardName = w._id || `Ward ${idx + 1}`;
      
      // Determine top category
      const catCounts = {};
      (w.categories || []).forEach((cat) => {
        if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
      const topCategory = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] || "General Issue";

      // Determine severity ranking
      const hasCritical = (w.severities || []).some((s) => s && s.toString().toUpperCase() === "CRITICAL");
      const hasHigh = (w.severities || []).some((s) => s && s.toString().toUpperCase() === "HIGH");
      const severity = hasCritical ? "Critical" : hasHigh ? "High" : "Medium";

      const resRate = w.issues > 0 ? `${Math.round((w.resolvedCount / w.issues) * 100)}%` : "0%";

      return {
        id: `w-${idx + 1}`,
        name: wardName,
        issues: w.issues,
        severity,
        topCategory,
        resolutionRate: resRate,
      };
    });
  }
}

module.exports = new AnalyticsService();
