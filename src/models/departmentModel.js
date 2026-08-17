const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    // Department name
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },

    // Short unique identifier
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },

    // Department description
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // Department head
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Number of teams working under department
    teams: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Department contact information
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    // Department budget
    budget: {
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },

      currency: {
        type: String,
        default: "INR",
        uppercase: true,
        trim: true,
      },

      financialYear: {
        type: String,
        default: null,
        trim: true,
      },
    },

    // Default SLA configuration
    sla: {
      defaultHours: {
        type: Number,
        min: 1,
        default: 48,
      },

      criticalHours: {
        type: Number,
        min: 1,
        default: 24,
      },

      highHours: {
        type: Number,
        min: 1,
        default: 48,
      },

      mediumHours: {
        type: Number,
        min: 1,
        default: 72,
      },

      lowHours: {
        type: Number,
        min: 1,
        default: 120,
      },
    },

    // UI appearance
    color: {
      type: String,
      default: "#3b82f6",
      trim: true,
    },

    iconName: {
      type: String,
      enum: [
        "car",
        "trash",
        "zap",
        "droplet",
        "waves",
        "recycle",
        "wrench",
        "building",
      ],
      default: "building",
    },

    // Whether department is currently operational
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Department", departmentSchema);