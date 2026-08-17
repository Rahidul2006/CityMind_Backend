const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    // Public complaint identifier
    complaintId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    // Citizen who submitted the complaint
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Complaint title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // Detailed explanation
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Municipal issue category
    category: {
      type: String,
      enum: [
        "Potholes",
        "Garbage Overflow",
        "Broken Streetlights",
        "Water Leakage",
        "Drain Blockage",
        "Road Cracks",
        "Others",
      ],
      required: true,
      index: true,
    },

    // Complaint location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },

      // [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
      },

      // Human-readable address
      address: {
        type: String,
        required: true,
        trim: true,
      },

      // Ward where complaint was reported
      ward: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ward",
        required: true,
        index: true,
      },
    },

    // Department responsible for resolving complaint
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    // Officer assigned to complaint
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Complaint status
    status: {
      type: String,
      enum: [
        "Reported",
        "Assigned",
        "In Progress",
        "Resolved",
        "Closed",
      ],
      default: "Reported",
      index: true,
    },

    // Complaint severity
    severity: {
      type: String,
      enum: [
        "Critical",
        "High",
        "Medium",
        "Low",
      ],
      default: "Medium",
      index: true,
    },

    // Priority score from 0–100
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Estimated time required for repair
    estimatedRepairHours: {
      type: Number,
      min: 0,
      default: null,
    },

    // SLA
    slaHours: {
      type: Number,
      min: 0,
      default: null,
    },

    slaDeadline: {
      type: Date,
      default: null,
      index: true,
    },

    // Resolution information
    resolutionNote: {
      type: String,
      default: "",
      trim: true,
    },

    // Important timestamps
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for Live City Map
complaintSchema.index({
  location: "2dsphere",
});

// Dashboard queries
complaintSchema.index({
  status: 1,
  severity: 1,
});

complaintSchema.index({
  department: 1,
  status: 1,
});

complaintSchema.index({
  reportedAt: -1,
});

module.exports = mongoose.model("Complaint", complaintSchema);