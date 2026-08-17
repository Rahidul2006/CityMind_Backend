const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    title: {
      type: String,
      default: "Civic Issue Report",
      trim: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      capturedAt: { type: Date, default: Date.now },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      gpsAccuracy: { type: Number, default: 0 },
    },

    capturedLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number, default: 0 },
    },

    reportedLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    locationSource: {
      type: String,
      enum: ["gps", "manual_adjustment"],
      default: "gps",
    },

    address: {
      type: String,
      default: "Location coordinates captured",
      trim: true,
    },

    // GeoJSON Point location for MongoDB geospatial 2dsphere queries
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      // [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    aiAnalysis: {
      detectedCategory: { type: String, default: "Civic Issue" },
      confidence: { type: Number, default: 0.95 },
      severity: { type: String, default: "HIGH" },
      safetyRisk: { type: String, default: "MEDIUM" },
      recommendedPriority: { type: String, default: "NORMAL" },
    },

    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "VERIFIED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "REOPENED",
        "REJECTED",
      ],
      default: "SUBMITTED",
      index: true,
    },

    department: {
      id: { type: String, default: "DEPT-CIVIC" },
      name: { type: String, default: "Public Works Department" },
    },

    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        message: { type: String, default: "" },
      },
    ],

    resolution: {
      imageUrl: { type: String, default: null },
      verifiedByCitizen: { type: Boolean, default: null },
      verificationMessage: { type: String, default: null },
      verifiedAt: { type: Date, default: null },
    },

    citizen: {
      type: mongoose.Schema.Types.Mixed,
      default: "demoCitizenId",
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for nearby GeoJSON spatial searches
complaintSchema.index({
  location: "2dsphere",
});

complaintSchema.index({
  createdAt: -1,
});

module.exports = mongoose.model("Complaint", complaintSchema);