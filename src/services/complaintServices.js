const Complaint = require("../models/ComplaintModel");
const { uploadBufferToCloudinary } = require("../config/cloudinaryConfig");

class ComplaintService {
  // Generate unique complaint ID (e.g., CM-2026-001284)
  async generateComplaintId() {
    const year = new Date().getFullYear();
    const count = await Complaint.countDocuments();
    const number = String(count + 1).padStart(6, "0");
    return `CM-${year}-${number}`;
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
      const complaintIdTemp = await this.generateComplaintId();
      const folder = `citymind/complaints/${complaintIdTemp}`;
      const uploadResult = await uploadBufferToCloudinary(file.buffer, folder);
      imageObj.url = uploadResult.url;
      imageObj.publicId = uploadResult.publicId;
    }

    const complaintId = await this.generateComplaintId();

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

    complaint.status = status;
    complaint.statusHistory.push({
      status,
      timestamp: new Date(),
      message: message || `Status updated to ${status}`,
    });

    await complaint.save();
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

    complaint.status = newStatus;
    complaint.resolution = {
      imageUrl: complaint.resolution?.imageUrl || null,
      verifiedByCitizen: isResolved,
      verificationMessage: message || "",
      verifiedAt: new Date(),
    };

    complaint.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      message: historyMsg,
    });

    await complaint.save();
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
}

module.exports = new ComplaintService();