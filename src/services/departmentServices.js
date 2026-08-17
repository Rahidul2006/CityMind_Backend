const mongoose = require("mongoose");

const Department = require("../models/departmentModel");
const Complaint = require("../models/ComplaintModel");

class DepartmentService {
  // =====================================================
  // CREATE DEPARTMENT
  // =====================================================

  async createDepartment(data) {
    const {
      name,
      code,
      description,
      head,
      teams,
      contactEmail,
      contactPhone,
      budget,
      sla,
      color,
      iconName,
    } = data;

    if (!name || !code) {
      throw new Error(
        "Department name and code are required"
      );
    }

    const existingDepartment =
      await Department.findOne({
        $or: [
          { name: name.trim() },
          { code: code.toUpperCase() },
        ],
      });

    if (existingDepartment) {
      throw new Error(
        "Department with this name or code already exists"
      );
    }

    const department = await Department.create({
      name: name.trim(),

      code: code.toUpperCase().trim(),

      description: description || "",

      head: head || null,

      teams: teams || 0,

      contactEmail: contactEmail || "",

      contactPhone: contactPhone || "",

      budget: budget || undefined,

      sla: sla || undefined,

      color: color || "#3b82f6",

      iconName: iconName || "building",

      isActive: true,
    });

    return department;
  }

  // =====================================================
  // GET ALL DEPARTMENTS
  // =====================================================

  async getDepartments() {
    return Department.find({
      isActive: true,
    })
      .populate(
        "head",
        "name email phone role"
      )
      .sort({
        name: 1,
      })
      .lean();
  }

  // =====================================================
  // GET DEPARTMENT BY ID
  // =====================================================

  async getDepartmentById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid department ID");
    }

    const department = await Department.findById(id)
      .populate(
        "head",
        "name email phone role"
      )
      .lean();

    if (!department) {
      throw new Error("Department not found");
    }

    return department;
  }

  // =====================================================
  // UPDATE DEPARTMENT
  // =====================================================

  async updateDepartment(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid department ID");
    }

    const allowedFields = [
      "name",
      "code",
      "description",
      "head",
      "teams",
      "contactEmail",
      "contactPhone",
      "budget",
      "sla",
      "color",
      "iconName",
      "isActive",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (updateData.code) {
      updateData.code =
        updateData.code.toUpperCase();
    }

    const department =
      await Department.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).populate(
        "head",
        "name email phone role"
      );

    if (!department) {
      throw new Error("Department not found");
    }

    return department;
  }

  // =====================================================
  // DELETE / DEACTIVATE DEPARTMENT
  // =====================================================

  async deleteDepartment(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid department ID");
    }

    // Soft delete
    const department =
      await Department.findByIdAndUpdate(
        id,
        {
          isActive: false,
        },
        {
          new: true,
        }
      );

    if (!department) {
      throw new Error("Department not found");
    }

    return department;
  }

  // =====================================================
  // DEPARTMENT OVERVIEW
  // =====================================================

  async getDepartmentOverview(
    startDate = null,
    endDate = null
  ) {
    const match = {
      department: {
        $ne: null,
      },
    };

    if (startDate || endDate) {
      match.reportedAt = {};

      if (startDate) {
        match.reportedAt.$gte =
          new Date(startDate);
      }

      if (endDate) {
        match.reportedAt.$lte =
          new Date(endDate);
      }
    }

    return Complaint.aggregate([
      {
        $match: match,
      },

      // Group complaints department-wise
      {
        $group: {
          _id: "$department",

          assigned: {
            $sum: 1,
          },

          active: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      "Reported",
                      "Assigned",
                      "In Progress",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },

          resolved: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      "Resolved",
                      "Closed",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },

          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $nin: [
                        "$status",
                        [
                          "Resolved",
                          "Closed",
                        ],
                      ],
                    },

                    {
                      $ne: [
                        "$slaDeadline",
                        null,
                      ],
                    },

                    {
                      $lt: [
                        "$slaDeadline",
                        new Date(),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },

          resolvedWithinSLA: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $in: [
                        "$status",
                        [
                          "Resolved",
                          "Closed",
                        ],
                      ],
                    },

                    {
                      $ne: [
                        "$resolvedAt",
                        null,
                      ],
                    },

                    {
                      $ne: [
                        "$slaDeadline",
                        null,
                      ],
                    },

                    {
                      $lte: [
                        "$resolvedAt",
                        "$slaDeadline",
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },

          totalResolutionTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: [
                        "$reportedAt",
                        null,
                      ],
                    },

                    {
                      $ne: [
                        "$resolvedAt",
                        null,
                      ],
                    },
                  ],
                },

                {
                  $subtract: [
                    "$resolvedAt",
                    "$reportedAt",
                  ],
                },

                0,
              ],
            },
          },

          resolvedWithTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: [
                        "$reportedAt",
                        null,
                      ],
                    },

                    {
                      $ne: [
                        "$resolvedAt",
                        null,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // Join department
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "department",
        },
      },

      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Calculate statistics
      {
        $addFields: {
          slaCompliance: {
            $cond: [
              {
                $gt: ["$resolved", 0],
              },

              {
                $multiply: [
                  {
                    $divide: [
                      "$resolvedWithinSLA",
                      "$resolved",
                    ],
                  },
                  100,
                ],
              },

              0,
            ],
          },

          avgResolutionHours: {
            $cond: [
              {
                $gt: [
                  "$resolvedWithTime",
                  0,
                ],
              },

              {
                $divide: [
                  {
                    $divide: [
                      "$totalResolutionTime",
                      1000,
                    ],
                  },

                  3600,
                ],
              },

              0,
            ],
          },
        },
      },

      // Final response
      {
        $project: {
          _id: 0,

          departmentId:
            "$department._id",

          name:
            "$department.name",

          code:
            "$department.code",

          head:
            "$department.head",

          teams:
            "$department.teams",

          assigned: 1,

          active: 1,

          resolved: 1,

          overdue: 1,

          avgResolutionHours: {
            $round: [
              "$avgResolutionHours",
              2,
            ],
          },

          avgResolutionDays: {
            $round: [
              {
                $divide: [
                  "$avgResolutionHours",
                  24,
                ],
              },
              2,
            ],
          },

          slaCompliance: {
            $round: [
              "$slaCompliance",
              2,
            ],
          },

          budget:
            "$department.budget",

          color:
            "$department.color",

          iconName:
            "$department.iconName",
        },
      },

      {
        $sort: {
          assigned: -1,
        },
      },
    ]);
  }

  // =====================================================
  // WORKLOAD DISTRIBUTION
  // =====================================================

  async getWorkloadDistribution() {
    return Complaint.aggregate([
      {
        $match: {
          department: {
            $ne: null,
          },
        },
      },

      {
        $group: {
          _id: "$department",

          issueCount: {
            $sum: 1,
          },
        },
      },

      {
        $group: {
          _id: null,

          totalIssues: {
            $sum: "$issueCount",
          },

          departments: {
            $push: {
              departmentId: "$_id",
              issueCount: "$issueCount",
            },
          },
        },
      },

      {
        $unwind: "$departments",
      },

      {
        $lookup: {
          from: "departments",

          localField:
            "departments.departmentId",

          foreignField: "_id",

          as: "department",
        },
      },

      {
        $unwind: "$department",
      },

      {
        $project: {
          _id: 0,

          departmentId:
            "$department._id",

          name:
            "$department.name",

          issueCount:
            "$departments.issueCount",

          workloadPercentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$departments.issueCount",
                      "$totalIssues",
                    ],
                  },

                  100,
                ],
              },

              2,
            ],
          },

          color:
            "$department.color",

          iconName:
            "$department.iconName",
        },
      },

      {
        $sort: {
          workloadPercentage: -1,
        },
      },
    ]);
  }

  // =====================================================
  // TOP OVERDUE DEPARTMENTS
  // =====================================================

  async getTopOverdueDepartments(
    limit = 5
  ) {
    return Complaint.aggregate([
      {
        $match: {
          department: {
            $ne: null,
          },

          status: {
            $nin: [
              "Resolved",
              "Closed",
            ],
          },

          slaDeadline: {
            $ne: null,
            $lt: new Date(),
          },
        },
      },

      {
        $group: {
          _id: "$department",

          overdueCount: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: "departments",

          localField: "_id",

          foreignField: "_id",

          as: "department",
        },
      },

      {
        $unwind: "$department",
      },

      {
        $project: {
          _id: 0,

          departmentId:
            "$department._id",

          name:
            "$department.name",

          overdueCount: 1,

          color:
            "$department.color",

          iconName:
            "$department.iconName",
        },
      },

      {
        $sort: {
          overdueCount: -1,
        },
      },

      {
        $limit: Number(limit),
      },
    ]);
  }

  // =====================================================
  // UPDATE DEPARTMENT SLA
  // =====================================================

  async updateSLA(id, slaData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid department ID");
    }

    const department =
      await Department.findByIdAndUpdate(
        id,
        {
          $set: {
            sla: slaData,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!department) {
      throw new Error("Department not found");
    }

    return department;
  }

  // =====================================================
  // DEPARTMENT STAFF
  // =====================================================

  async getDepartmentStaff(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid department ID");
    }

    const User = require("../models/userModel");

    return User.find({
      department: id,
      isActive: true,
    })
      .select("name email phone role")
      .sort({
        name: 1,
      })
      .lean();
  }
}

module.exports = new DepartmentService();