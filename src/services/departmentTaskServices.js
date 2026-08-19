const Department = require("../models/departmentModel");
const Complaint = require("../models/ComplaintModel");
const User = require("../models/userModel");
const { emitStatusUpdate } = require("../config/socket");
const { uploadBufferToCloudinary } = require("../config/cloudinaryConfig");

class DepartmentTaskService {
  // 1. Dashboard summary stats and recent tasks for officer's department
  async getDepartmentDashboard(departmentId, userId) {
    if (!departmentId) {
      throw new Error("Officer department ID is missing");
    }

    const department = await Department.findById(departmentId).lean();
    if (!department) {
      throw new Error("Assigned department not found");
    }

    const officerUser = userId ? await User.findById(userId).select("name email role lastLoginAt").lean() : null;

    const totalAssigned = await Complaint.countDocuments({ assignedDepartment: departmentId });
    const pendingCount = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: { $in: ["SUBMITTED", "ASSIGNED"] },
    });
    const inProgressCount = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: "IN_PROGRESS",
    });
    const resolvedCount = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: "RESOLVED",
    });
    const reopenedCount = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: "REOPENED",
    });
    const urgentCount = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      $or: [{ priority: "URGENT" }, { "aiAnalysis.severity": "URGENT" }, { severity: "URGENT" }],
    });
    const highPriorityCount = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      $or: [
        { priority: { $in: ["HIGH", "URGENT"] } },
        { "aiAnalysis.severity": { $in: ["HIGH", "URGENT"] } },
        { severity: { $in: ["HIGH", "URGENT"] } },
      ],
    });

    const recentTasks = await Complaint.find({ assignedDepartment: departmentId })
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean();

    return {
      department: {
        id: department._id.toString(),
        name: department.name,
        code: department.code,
        description: department.description,
        categories: department.categories,
        icon: department.icon,
        color: department.color,
      },
      officer: {
        name: officerUser?.name || department.officer?.name || "Department Officer",
        email: officerUser?.email || department.officer?.email || "",
        lastLoginAt: officerUser?.lastLoginAt || null,
      },
      stats: {
        totalAssigned,
        pending: pendingCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        reopened: reopenedCount,
        urgent: urgentCount,
        highPriority: highPriorityCount,
      },
      recentTasks,
    };
  }

  // 2. Get department-scoped tasks with filtering, search, and pagination
  async getDepartmentTasks(departmentId, query = {}) {
    if (!departmentId) {
      throw new Error("Officer department ID is missing");
    }

    const filter = { assignedDepartment: departmentId };

    if (query.status && query.status !== "All") {
      filter.status = query.status;
    }

    if (query.priority && query.priority !== "All") {
      const p = query.priority.toUpperCase();
      filter.$or = [{ priority: p }, { "aiAnalysis.severity": p }, { severity: p }];
    }

    if (query.category && query.category !== "All") {
      filter.category = query.category;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      filter.$and = [
        {
          $or: [
            { complaintId: searchRegex },
            { title: searchRegex },
            { description: searchRegex },
            { category: searchRegex },
            { address: searchRegex },
          ],
        },
      ];
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      complaints,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // 3. Get task by ID — returns 403 error if complaint does not belong to departmentId
  async getTaskById(departmentId, taskId) {
    if (!departmentId) {
      throw new Error("Officer department ID is missing");
    }

    const complaint = await Complaint.findOne({
      $or: [{ _id: taskId.match(/^[0-9a-fA-F]{24}$/) ? taskId : null }, { complaintId: taskId }],
    }).lean();

    if (!complaint) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    // STRICT BACKEND SECURITY CHECK
    if (!complaint.assignedDepartment || complaint.assignedDepartment.toString() !== departmentId.toString()) {
      const error = new Error("Forbidden: You do not have permission to view tasks belonging to another department.");
      error.statusCode = 403;
      throw error;
    }

    return complaint;
  }

  // 4. Update task status (ASSIGNED, IN_PROGRESS, RESOLVED, REOPENED)
  async updateTaskStatus(departmentId, taskId, status, message = "", officerUser = null) {
    const complaint = await Complaint.findOne({
      $or: [{ _id: taskId.match(/^[0-9a-fA-F]{24}$/) ? taskId : null }, { complaintId: taskId }],
    });

    if (!complaint) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!complaint.assignedDepartment || complaint.assignedDepartment.toString() !== departmentId.toString()) {
      const error = new Error("Forbidden: Cannot update task assigned to another department.");
      error.statusCode = 403;
      throw error;
    }

    const validStatuses = ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "REOPENED"];
    const targetStatus = status ? status.toUpperCase() : complaint.status;

    if (!validStatuses.includes(targetStatus)) {
      throw new Error(`Invalid status '${status}'. Allowed statuses: ${validStatuses.join(", ")}`);
    }

    const officerName = officerUser?.name || "Department Officer";
    complaint.status = targetStatus;

    const statusMsg = message ? message.trim() : `Status updated to ${targetStatus} by ${officerName}`;
    complaint.statusHistory.push({
      status: targetStatus,
      timestamp: new Date(),
      message: statusMsg,
    });

    await complaint.save();

    // Emit Socket.IO real-time update
    const payload = {
      complaintId: complaint.complaintId,
      mongoId: complaint._id.toString(),
      status: complaint.status,
      message: statusMsg,
      updatedAt: complaint.updatedAt ? complaint.updatedAt.toISOString() : new Date().toISOString(),
      statusHistoryEntry: complaint.statusHistory[complaint.statusHistory.length - 1],
      complaint: complaint.toObject ? complaint.toObject() : complaint,
    };

    emitStatusUpdate(complaint.complaintId, payload);
    if (complaint.complaintId !== complaint._id.toString()) {
      emitStatusUpdate(complaint._id.toString(), payload);
    }

    return complaint;
  }

  // 5. Add department remark to task
  async addTaskRemark(departmentId, taskId, message, officerUser = null) {
    if (!message || !message.trim()) {
      throw new Error("Remark message is required.");
    }

    const complaint = await Complaint.findOne({
      $or: [{ _id: taskId.match(/^[0-9a-fA-F]{24}$/) ? taskId : null }, { complaintId: taskId }],
    });

    if (!complaint) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!complaint.assignedDepartment || complaint.assignedDepartment.toString() !== departmentId.toString()) {
      const error = new Error("Forbidden: Cannot add remarks to another department's task.");
      error.statusCode = 403;
      throw error;
    }

    const officerName = officerUser?.name || "Department Officer";

    // Add remark entry
    if (!complaint.departmentRemarks) {
      complaint.departmentRemarks = [];
    }

    const remarkEntry = {
      message: message.trim(),
      createdBy: officerName,
      createdAt: new Date(),
    };

    complaint.departmentRemarks.push(remarkEntry);

    // Also push to status history for visibility
    complaint.statusHistory.push({
      status: complaint.status,
      timestamp: new Date(),
      message: `[Remark from ${officerName}]: ${message.trim()}`,
    });

    await complaint.save();
    return complaint;
  }

  // 6. Resolve task with optional resolution evidence photo uploaded to Cloudinary
  async resolveTask(departmentId, taskId, message = "", file = null, officerUser = null) {
    const complaint = await Complaint.findOne({
      $or: [{ _id: taskId.match(/^[0-9a-fA-F]{24}$/) ? taskId : null }, { complaintId: taskId }],
    });

    if (!complaint) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!complaint.assignedDepartment || complaint.assignedDepartment.toString() !== departmentId.toString()) {
      const error = new Error("Forbidden: Cannot resolve task assigned to another department.");
      error.statusCode = 403;
      throw error;
    }

    let imageUrl = "";
    let imagePublicId = "";

    // Upload resolution image to Cloudinary if provided
    if (file && file.buffer) {
      try {
        const folderPath = `citymind/resolutions/${complaint.complaintId || complaint._id}`;
        const uploadResult = await uploadBufferToCloudinary(file.buffer, folderPath);
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.publicId;
      } catch (err) {
        console.error("Cloudinary resolution upload error:", err);
      }
    }

    const officerName = officerUser?.name || "Department Officer";
    complaint.status = "RESOLVED";

    complaint.resolution = {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: officerName,
      verificationMessage: message ? message.trim() : "Issue marked as resolved by department officer.",
      imageUrl: imageUrl || complaint.resolution?.imageUrl || "",
      imagePublicId: imagePublicId || complaint.resolution?.imagePublicId || "",
    };

    const statusMsg = `Resolved by ${officerName}${message ? `: ${message.trim()}` : ""}`;
    complaint.statusHistory.push({
      status: "RESOLVED",
      timestamp: new Date(),
      message: statusMsg,
    });

    await complaint.save();

    // Emit Socket.IO event
    const payload = {
      complaintId: complaint.complaintId,
      mongoId: complaint._id.toString(),
      status: "RESOLVED",
      message: statusMsg,
      updatedAt: complaint.updatedAt ? complaint.updatedAt.toISOString() : new Date().toISOString(),
      statusHistoryEntry: complaint.statusHistory[complaint.statusHistory.length - 1],
      resolution: complaint.resolution,
      complaint: complaint.toObject ? complaint.toObject() : complaint,
    };

    emitStatusUpdate(complaint.complaintId, payload);
    if (complaint.complaintId !== complaint._id.toString()) {
      emitStatusUpdate(complaint._id.toString(), payload);
    }

    return complaint;
  }

  // 7. Priority tasks (URGENT & HIGH)
  async getPriorityTasks(departmentId) {
    if (!departmentId) {
      throw new Error("Officer department ID is missing");
    }

    const complaints = await Complaint.find({
      assignedDepartment: departmentId,
      $or: [
        { priority: { $in: ["URGENT", "HIGH"] } },
        { "aiAnalysis.severity": { $in: ["URGENT", "HIGH"] } },
        { severity: { $in: ["URGENT", "HIGH", "Critical"] } },
      ],
    })
      .sort({ updatedAt: -1 })
      .lean();

    return complaints;
  }

  // 8. Resolved tasks for officer's department
  async getResolvedTasks(departmentId) {
    if (!departmentId) {
      throw new Error("Officer department ID is missing");
    }

    const complaints = await Complaint.find({
      assignedDepartment: departmentId,
      status: "RESOLVED",
    })
      .sort({ updatedAt: -1 })
      .lean();

    return complaints;
  }

  // 9. Map tasks with original citizen geo-coordinates
  async getDepartmentMapTasks(departmentId, query = {}) {
    if (!departmentId) {
      throw new Error("Officer department ID is missing");
    }

    const filter = { assignedDepartment: departmentId };

    // Active status filter: ASSIGNED, IN_PROGRESS, REOPENED
    if (query.status && query.status !== "All") {
      filter.status = query.status;
    } else {
      filter.status = { $in: ["ASSIGNED", "IN_PROGRESS", "REOPENED"] };
    }

    if (query.priority && query.priority !== "All") {
      const p = query.priority.toUpperCase();
      filter.$or = [{ priority: p }, { "aiAnalysis.severity": p }, { severity: p }];
    }

    if (query.category && query.category !== "All") {
      filter.category = query.category;
    }

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return complaints.map((c) => {
      let lat = null;
      let lng = null;
      let accuracy = 0;

      if (c.capturedLocation && typeof c.capturedLocation.latitude === "number" && typeof c.capturedLocation.longitude === "number") {
        lat = c.capturedLocation.latitude;
        lng = c.capturedLocation.longitude;
        accuracy = c.capturedLocation.accuracy || 0;
      } else if (c.location && Array.isArray(c.location.coordinates) && c.location.coordinates.length === 2) {
        // GeoJSON: [longitude, latitude]
        lng = c.location.coordinates[0];
        lat = c.location.coordinates[1];
        accuracy = c.capturedLocation?.accuracy || c.image?.gpsAccuracy || 0;
      } else if (c.reportedLocation && typeof c.reportedLocation.latitude === "number" && typeof c.reportedLocation.longitude === "number") {
        lat = c.reportedLocation.latitude;
        lng = c.reportedLocation.longitude;
        accuracy = c.capturedLocation?.accuracy || 0;
      } else if (c.image && typeof c.image.latitude === "number" && typeof c.image.longitude === "number") {
        lat = c.image.latitude;
        lng = c.image.longitude;
        accuracy = c.image.gpsAccuracy || 0;
      }

      const priority = c.priority || c.aiAnalysis?.severity || c.severity || "MEDIUM";

      return {
        _id: c._id ? c._id.toString() : "",
        complaintId: c.complaintId || (c._id ? c._id.toString() : ""),
        category: c.category || "General",
        priority: priority.toUpperCase(),
        status: c.status,
        description: c.description || c.title || "",
        title: c.title || "Civic Complaint",
        location: {
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
        },
        locationSource: c.locationSource || "gps",
        address: c.address || "Captured GPS location",
        imageUrl: c.image?.url || (typeof c.image === "string" ? c.image : ""),
        createdAt: c.createdAt,
        assignedAt: c.assignedAt || c.createdAt,
      };
    });
  }

  // 10. Department profile
  async getDepartmentProfile(departmentId, userId) {
    const department = await Department.findById(departmentId).lean();
    if (!department) {
      throw new Error("Department not found");
    }

    const officerUser = userId ? await User.findById(userId).select("-password").lean() : null;

    return {
      department,
      officer: officerUser,
    };
  }
}

module.exports = new DepartmentTaskService();
