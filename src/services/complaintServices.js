const Complaint = require("../models/ComplaintModel");
const { uploadBufferToCloudinary } = require("../config/cloudinaryConfig");
const { emitStatusUpdate } = require("../config/socket");

class ComplaintService {
  // Generate unique complaint ID (e.g., CM-2026-001284)
  async generateComplaintId() {
    const year = new Date().getFullYear();
    const prefix = `CM-${year}-`;

    // Find latest complaint for current year to determine highest sequence number
    const latest = await Complaint.findOne({
      complaintId: { $regex: `^CM-${year}-` },
    })
      .sort({ complaintId: -1, createdAt: -1 })
      .lean();

    let seq = 1;
    if (latest && latest.complaintId) {
      const parts = latest.complaintId.split("-");
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        seq = lastNum + 1;
      }
    }

    // Also compare with total count to avoid sequence collisions
    const totalCount = await Complaint.countDocuments();
    if (totalCount >= seq) {
      seq = totalCount + 1;
    }

    // Safety loop: ensure candidateId is guaranteed unique in MongoDB
    let candidateId = `${prefix}${String(seq).padStart(6, "0")}`;
    while (await Complaint.exists({ complaintId: candidateId })) {
      seq++;
      candidateId = `${prefix}${String(seq).padStart(6, "0")}`;
    }

    return candidateId;
  }

  // Create complaint with Cloudinary image upload and MongoDB persistence
  async createComplaint(bodyData, file, citizenId) {
    const {
      category,
      description,
      latitude,
      longitude,
      gpsAccuracy,
      capturedAt,
      reportedLatitude,
      reportedLongitude,
      locationSource,
      address,
      aiAnalysis,
    } = bodyData;

    if (!category || !description) {
      throw new Error("Category and description are required");
    }

    const complaintId = await this.generateComplaintId();

    const capLat = parseFloat(latitude || reportedLatitude || 0);
    const capLng = parseFloat(longitude || reportedLongitude || 0);
    const repLat = parseFloat(reportedLatitude || capLat);
    const repLng = parseFloat(reportedLongitude || capLng);
    const accuracy = parseFloat(gpsAccuracy || 0);

    // Upload file to Cloudinary if image file is attached
    let imageObj = {
      url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7", // default placeholder
      publicId: "citymind/default",
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      latitude: capLat,
      longitude: capLng,
      gpsAccuracy: accuracy,
    };

    if (file && file.buffer) {
      const folder = `citymind/complaints/${complaintId}`;
      const uploadResult = await uploadBufferToCloudinary(file.buffer, folder);
      imageObj.url = uploadResult.url;
      imageObj.publicId = uploadResult.publicId;
    }

    // Parse AI Analysis if passed as string/object
    let parsedAi = {
      detectedCategory: category,
      confidence: 0.95,
      severity: "HIGH",
      safetyRisk: "MEDIUM",
      recommendedPriority: "NORMAL",
    };

    if (aiAnalysis) {
      try {
        parsedAi = typeof aiAnalysis === "string" ? JSON.parse(aiAnalysis) : aiAnalysis;
      } catch (e) {
        // use default
      }
    }

    const complaint = await Complaint.create({
      complaintId,
      title: bodyData.title ? bodyData.title.trim() : `${category || 'Civic Issue'} Report`,
      category,
      description: description.trim(),
      image: imageObj,
      capturedLocation: {
        latitude: capLat,
        longitude: capLng,
        accuracy: accuracy,
      },
      reportedLocation: {
        latitude: repLat,
        longitude: repLng,
      },
      locationSource: locationSource || "gps",
      address: address || "Captured GPS Location",
      // GeoJSON requires [longitude, latitude]
      location: {
        type: "Point",
        coordinates: [repLng, repLat],
      },
      aiAnalysis: parsedAi,
      status: "SUBMITTED",
      department: {
        id: "DEPT-CIVIC",
        name: "Municipal Works Department",
      },
      statusHistory: [
        {
          status: "SUBMITTED",
          timestamp: new Date(),
          message: "Complaint registered successfully by citizen.",
        },
      ],
      citizen: citizenId || "demoCitizenId",
    });

    return complaint;
  }

  // Get all complaints
  async getComplaints(query = {}) {
    const filters = {};
    if (query.category) filters.category = query.category;
    if (query.status) filters.status = query.status;

    const complaints = await Complaint.find(filters)
      .sort({ createdAt: -1 })
      .lean();

    return complaints;
  }

  // Get single complaint details by ID or complaintId
  async getComplaintById(id) {
    let complaint = await Complaint.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { complaintId: id }],
    }).lean();

    if (!complaint) {
      throw new Error(`Complaint with ID '${id}' not found`);
    }
    return complaint;
  }

  // Update status (for admin/dashboard/internal)
  async updateStatus(id, status, message = "") {
    const validStatuses = [
      "SUBMITTED",
      "VERIFIED",
      "ASSIGNED",
      "IN_PROGRESS",
      "RESOLVED",
      "REOPENED",
      "REJECTED",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status '${status}'`);
    }

    const complaint = await Complaint.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { complaintId: id }],
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const statusHistoryEntry = {
      status,
      timestamp: new Date(),
      message: message || `Status updated to ${status}`,
    };

    complaint.status = status;
    complaint.statusHistory.push(statusHistoryEntry);

    await complaint.save();

    console.log(`[STATUS] Complaint ${complaint.complaintId} status updated: ${status}`);

    // Emit Socket.IO event AFTER successful MongoDB save
    const payload = {
      complaintId: complaint.complaintId,
      mongoId: complaint._id.toString(),
      status: complaint.status,
      message: statusHistoryEntry.message,
      updatedAt: complaint.updatedAt ? complaint.updatedAt.toISOString() : new Date().toISOString(),
      statusHistoryEntry: {
        status: statusHistoryEntry.status,
        message: statusHistoryEntry.message,
        timestamp: statusHistoryEntry.timestamp.toISOString(),
      },
      complaint: complaint.toObject ? complaint.toObject() : complaint,
    };

    emitStatusUpdate(complaint.complaintId, payload);
    if (complaint.complaintId !== complaint._id.toString()) {
      emitStatusUpdate(complaint._id.toString(), payload);
    }

    return complaint;
  }

  // Citizen verify resolution endpoint
  async verifyResolution(id, resolved, message = "") {
    const complaint = await Complaint.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { complaintId: id }],
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const isResolved = Boolean(resolved);
    const newStatus = isResolved ? "RESOLVED" : "REOPENED";
    const historyMsg = isResolved
      ? `Citizen confirmed resolution: ${message || "Issue resolved"}`
      : `Citizen rejected resolution (Reopened): ${message || "Issue still exists"}`;

    const statusHistoryEntry = {
      status: newStatus,
      timestamp: new Date(),
      message: historyMsg,
    };

    complaint.status = newStatus;
    complaint.resolution = {
      imageUrl: complaint.resolution?.imageUrl || null,
      verifiedByCitizen: isResolved,
      verificationMessage: message || "",
      verifiedAt: new Date(),
    };

    complaint.statusHistory.push(statusHistoryEntry);

    await complaint.save();

    console.log(`[STATUS] Citizen resolution verification for ${complaint.complaintId}: ${newStatus}`);

    // Emit Socket.IO event AFTER successful MongoDB save
    const payload = {
      complaintId: complaint.complaintId,
      mongoId: complaint._id.toString(),
      status: complaint.status,
      message: statusHistoryEntry.message,
      updatedAt: complaint.updatedAt ? complaint.updatedAt.toISOString() : new Date().toISOString(),
      statusHistoryEntry: {
        status: statusHistoryEntry.status,
        message: statusHistoryEntry.message,
        timestamp: statusHistoryEntry.timestamp.toISOString(),
      },
      complaint: complaint.toObject ? complaint.toObject() : complaint,
    };

    emitStatusUpdate(complaint.complaintId, payload);
    if (complaint.complaintId !== complaint._id.toString()) {
      emitStatusUpdate(complaint._id.toString(), payload);
    }

    return complaint;
  }

  // Get nearby complaints within radius (meters)
  async getNearbyComplaints(latitude, longitude, radius = 5000) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radMeters = parseInt(radius) || 5000;

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error("Valid latitude and longitude are required");
    }

    // Try GeoJSON $near query, with fallback to distance filter
    try {
      const complaints = await Complaint.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            $maxDistance: radMeters,
          },
        },
      })
        .select("-citizen") // Don't expose private citizen info
        .lean();

      return complaints;
    } catch (e) {
      // Fallback query if 2dsphere index building is pending
      const all = await Complaint.find().select("-citizen").lean();
      return all.filter((c) => {
        const cLat = c.reportedLocation?.latitude || c.image?.latitude || 0;
        const cLng = c.reportedLocation?.longitude || c.image?.longitude || 0;
        const dist = this.haversineDistance(lat, lng, cLat, cLng);
        return dist <= radMeters;
      });
    }
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Assign or reassign complaint to department
  async assignComplaintToDepartment(complaintId, departmentId, reason = "", assignedBy = "Admin") {
    const Department = require("../models/departmentModel");

    const complaint = await Complaint.findOne({
      $or: [{ _id: complaintId.match(/^[0-9a-fA-F]{24}$/) ? complaintId : null }, { complaintId }],
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw new Error("Target department not found");
    }

    if (!department.isActive) {
      throw new Error(`Cannot assign complaint to inactive department '${department.name}'`);
    }

    const isReassignment = Boolean(complaint.assignedDepartment);

    complaint.assignedDepartment = department._id;
    complaint.assignedAt = new Date();
    complaint.assignedBy = assignedBy || "Admin";

    // Update embedded department object for backward compatibility
    complaint.department = {
      id: department.code || department._id.toString(),
      name: department.name,
    };

    // Store assignment history
    if (!complaint.assignmentHistory) {
      complaint.assignmentHistory = [];
    }

    complaint.assignmentHistory.push({
      departmentId: department._id,
      departmentName: department.name,
      assignedBy: assignedBy || "Admin",
      assignedAt: new Date(),
      reason: reason || (isReassignment ? "Reassigned by municipal administrator" : "Assigned to department"),
    });

    // Status transition: If status is SUBMITTED, update to ASSIGNED
    if (complaint.status === "SUBMITTED") {
      complaint.status = "ASSIGNED";
      const statusMsg = `Complaint assigned to ${department.name}`;
      complaint.statusHistory.push({
        status: "ASSIGNED",
        timestamp: new Date(),
        message: statusMsg,
      });
    } else {
      const statusMsg = isReassignment
        ? `Reassigned to ${department.name}${reason ? `: ${reason}` : ""}`
        : `Assigned to ${department.name}${reason ? `: ${reason}` : ""}`;
      complaint.statusHistory.push({
        status: complaint.status,
        timestamp: new Date(),
        message: statusMsg,
      });
    }

    await complaint.save();

    // Emit Socket.IO event
    const payload = {
      complaintId: complaint.complaintId,
      mongoId: complaint._id.toString(),
      status: complaint.status,
      message: `Assigned to ${department.name}`,
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

  // Get unassigned complaints
  async getUnassignedComplaints(query = {}) {
    const filter = {
      $or: [
        { assignedDepartment: null },
        { assignedDepartment: { $exists: false } },
      ],
    };

    if (query.category && query.category !== "All") {
      filter.category = query.category;
    }

    if (query.status && query.status !== "All") {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      filter.$and = [
        {
          $or: [
            { title: searchRegex },
            { complaintId: searchRegex },
            { description: searchRegex },
            { category: searchRegex },
            { address: searchRegex },
          ],
        },
      ];
    }

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).lean();
    return complaints;
  }
}

module.exports = new ComplaintService();