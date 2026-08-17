const mongoose = require("mongoose");
const Complaint = require("../models/ComplaintModel");

class ComplaintService {
  // =====================================================
  // CREATE COMPLAINT
  // =====================================================

  async createComplaint(data, citizenId) {
    const {
      title,
      description,
      category,
      location,
      department,
      estimatedRepairHours,
      slaHours,
    } = data;

    // Basic validation
    if (!title || !description || !category) {
      throw new Error(
        "Title, description and category are required"
      );
    }

    if (!location?.coordinates || !location?.address) {
      throw new Error("Complete location information is required");
    }

    if (!location.ward) {
      throw new Error("Ward is required");
    }

    // Generate public complaint ID
    const complaintId = await this.generateComplaintId();

    // Calculate SLA deadline if SLA is provided
    let slaDeadline = null;

    if (slaHours) {
      slaDeadline = new Date(
        Date.now() + slaHours * 60 * 60 * 1000
      );
    }

    const complaint = await Complaint.create({
      complaintId,

      citizen: citizenId,

      title: title.trim(),

      description: description.trim(),

      category,

      location,

      department: department || null,

      estimatedRepairHours:
        estimatedRepairHours || null,

      slaHours: slaHours || null,

      slaDeadline,

      status: "Reported",

      // Initial values.
      // These can be changed by admin/officer later.
      severity: "Medium",

      score: 0,

      reportedAt: new Date(),
    });

    return complaint;
  }

  // =====================================================
  // GENERATE COMPLAINT ID
  // =====================================================

  async generateComplaintId() {
    const year = new Date().getFullYear();

    const count = await Complaint.countDocuments();

    const number = String(count + 1).padStart(6, "0");

    return `CMP-${year}-${number}`;
  }

  // =====================================================
  // GET ALL COMPLAINTS
  // =====================================================

  async getComplaints(filters = {}) {
    const {
      search,
      status,
      severity,
      category,
      department,
      ward,
      page = 1,
      limit = 10,
    } = filters;

    const query = {};

    // Search by title/category/address
    if (search) {
      query.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
        {
          "location.address": {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    if (category) {
      query.category = category;
    }

    if (department) {
      query.department = department;
    }

    if (ward) {
      query["location.ward"] = ward;
    }

    const skip = (page - 1) * limit;

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate("citizen", "name email")
        .populate("department", "name code")
        .populate("assignedOfficer", "name email")
        .populate("location.ward", "wardNumber name")
        .sort({ reportedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Complaint.countDocuments(query),
    ]);

    return {
      complaints,

      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =====================================================
  // GET COMPLAINT BY ID
  // =====================================================

  async getComplaintById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid complaint ID");
    }

    const complaint = await Complaint.findById(id)
      .populate("citizen", "name email phone")
      .populate("department", "name code")
      .populate("assignedOfficer", "name email phone")
      .populate("location.ward", "wardNumber name");

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    return complaint;
  }

  // =====================================================
  // UPDATE COMPLAINT
  // =====================================================

  async updateComplaint(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid complaint ID");
    }

    const allowedFields = [
      "title",
      "description",
      "category",
      "location",
      "estimatedRepairHours",
      "department",
      "severity",
      "score",
      "slaHours",
      "slaDeadline",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    return complaint;
  }

  // =====================================================
  // ASSIGN COMPLAINT TO OFFICER
  // =====================================================

  async assignComplaint(id, officerId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid complaint ID");
    }

    if (!mongoose.Types.ObjectId.isValid(officerId)) {
      throw new Error("Invalid officer ID");
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        assignedOfficer: officerId,
        status: "Assigned",
        assignedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    return complaint;
  }

  // =====================================================
  // UPDATE STATUS
  // =====================================================

  async updateStatus(id, newStatus) {
    const allowedStatuses = [
      "Reported",
      "Assigned",
      "In Progress",
      "Resolved",
      "Closed",
    ];

    if (!allowedStatuses.includes(newStatus)) {
      throw new Error("Invalid complaint status");
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const updateData = {
      status: newStatus,
    };

    // Status timestamps
    if (newStatus === "In Progress") {
      updateData.startedAt = new Date();
    }

    if (newStatus === "Resolved") {
      updateData.resolvedAt = new Date();
    }

    if (newStatus === "Closed") {
      updateData.closedAt = new Date();

      // If closed directly, make sure resolvedAt exists
      if (!complaint.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }

    Object.assign(complaint, updateData);

    await complaint.save();

    return complaint;
  }

  // =====================================================
  // RESOLVE COMPLAINT
  // =====================================================

  async resolveComplaint(id, resolutionNote = "") {
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    complaint.status = "Resolved";
    complaint.resolvedAt = new Date();
    complaint.resolutionNote = resolutionNote.trim();

    await complaint.save();

    return complaint;
  }

  // =====================================================
  // DELETE COMPLAINT
  // =====================================================

  async deleteComplaint(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid complaint ID");
    }

    const complaint = await Complaint.findByIdAndDelete(id);

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    return complaint;
  }

  // =====================================================
  // COMPLAINT STATISTICS
  // =====================================================

  async getComplaintStatistics() {
    const [
      total,
      active,
      critical,
      pending,
      resolved,
      overdue,
    ] = await Promise.all([
      Complaint.countDocuments(),

      Complaint.countDocuments({
        status: {
          $in: [
            "Reported",
            "Assigned",
            "In Progress",
          ],
        },
      }),

      Complaint.countDocuments({
        severity: "Critical",
        status: {
          $nin: ["Resolved", "Closed"],
        },
      }),

      Complaint.countDocuments({
        status: {
          $in: [
            "Reported",
            "Assigned",
            "In Progress",
          ],
        },
      }),

      Complaint.countDocuments({
        status: "Resolved",
      }),

      Complaint.countDocuments({
        status: {
          $nin: ["Resolved", "Closed"],
        },
        slaDeadline: {
          $lt: new Date(),
          $ne: null,
        },
      }),
    ]);

    return {
      total,
      active,
      critical,
      pending,
      resolved,
      overdue,
    };
  }

  // =====================================================
  // ISSUES BY CATEGORY
  // =====================================================

  async getIssuesByCategory() {
    return Complaint.aggregate([
      {
        $group: {
          _id: "$category",
          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);
  }

  // =====================================================
  // ISSUES BY STATUS
  // =====================================================

  async getIssuesByStatus() {
    return Complaint.aggregate([
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);
  }

  // =====================================================
  // PRIORITY ISSUES
  // =====================================================

  async getPriorityIssues(limit = 10) {
    return Complaint.find({
      status: {
        $nin: ["Resolved", "Closed"],
      },

      severity: {
        $in: ["Critical", "High"],
      },
    })
      .populate("department", "name")
      .populate("location.ward", "wardNumber name")
      .sort({
        score: -1,
        reportedAt: -1,
      })
      .limit(limit)
      .lean();
  }

  // =====================================================
  // MAP ISSUES
  // =====================================================

  async getMapIssues(filters = {}) {
    const query = {};

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.ward) {
      query["location.ward"] = filters.ward;
    }

    return Complaint.find(query)
      .select(
        "complaintId title category status severity score location"
      )
      .populate(
        "location.ward",
        "wardNumber name"
      )
      .lean();
  }
}

module.exports = new ComplaintService();