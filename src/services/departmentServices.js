const Department = require("../models/departmentModel");
const Complaint = require("../models/ComplaintModel");

class DepartmentService {
  async createDepartment(data) {
    const User = require("../models/userModel");
    const {
      name,
      code,
      description,
      categories,
      contactEmail,
      contactPhone,
      address,
      icon,
      color,
      isActive,
      createOfficerLogin,
      officerName,
      officerEmail,
      officerPassword,
      officer,
    } = data;

    if (!name || !code) {
      throw new Error("Department name and code are required");
    }

    const cleanCode = code.trim().toUpperCase();

    const existingCode = await Department.findOne({ code: cleanCode });
    if (existingCode) {
      throw new Error(`Department code '${cleanCode}' already exists.`);
    }

    // Auto-provision department login credentials for every created department
    const shouldCreateOfficer = createOfficerLogin !== false;
    const targetOfficerName = officerName || (officer ? officer.name : "") || `${name.trim()} Officer`;
    let targetOfficerEmail = officerEmail || (officer ? officer.email : "") || contactEmail || `${cleanCode.toLowerCase()}@citymind.com`;
    let targetOfficerPassword = officerPassword || (officer ? officer.password : "") || `${cleanCode.toLowerCase()}123`;

    targetOfficerEmail = targetOfficerEmail.trim().toLowerCase();

    // Check if officer user already exists
    let existingUser = await User.findOne({ email: targetOfficerEmail });
    if (existingUser) {
      if (createOfficerLogin || officerEmail) {
        throw new Error(`Officer email '${targetOfficerEmail}' is already registered in the system.`);
      } else {
        // Fallback email generator if default email collision happens
        targetOfficerEmail = `${cleanCode.toLowerCase()}_${Date.now().toString().slice(-4)}@citymind.com`;
      }
    }

    const department = await Department.create({
      name: name.trim(),
      code: cleanCode,
      description: description ? description.trim() : "",
      categories: Array.isArray(categories) ? categories : [],
      contactEmail: contactEmail ? contactEmail.trim() : targetOfficerEmail,
      contactPhone: contactPhone ? contactPhone.trim() : "",
      address: address ? address.trim() : "",
      icon: icon || "building",
      color: color || "#3b82f6",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    if (shouldCreateOfficer) {
      const officerUser = await User.create({
        name: targetOfficerName.trim(),
        email: targetOfficerEmail,
        password: targetOfficerPassword,
        role: "DEPARTMENT_OFFICER",
        departmentId: department._id,
        isActive: true,
      });

      department.officerUserId = officerUser._id;
      department.officer = {
        name: officerUser.name,
        email: officerUser.email,
      };
      await department.save();
    }

    return department;
  }

  async getDepartments(query = {}) {
    const filter = {};
    if (query.isActive !== undefined && query.isActive !== "all" && query.isActive !== "All") {
      filter.isActive = query.isActive === "true" || query.isActive === true;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      filter.$or = [{ name: searchRegex }, { code: searchRegex }, { description: searchRegex }];
    }

    const departments = await Department.find(filter).sort({ name: 1 }).lean();

    // Compute dynamic complaint statistics for each department
    const enrichedDepartments = await Promise.all(
      departments.map(async (dept) => {
        const assignedCount = await Complaint.countDocuments({
          assignedDepartment: dept._id,
        });

        const inProgressCount = await Complaint.countDocuments({
          assignedDepartment: dept._id,
          status: { $in: ["IN_PROGRESS", "ASSIGNED"] },
        });

        const resolvedCount = await Complaint.countDocuments({
          assignedDepartment: dept._id,
          status: "RESOLVED",
        });

        const activeCount = await Complaint.countDocuments({
          assignedDepartment: dept._id,
          status: { $in: ["SUBMITTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "REOPENED"] },
        });

        return {
          ...dept,
          id: dept._id.toString(),
          complaintCount: assignedCount,
          assigned: assignedCount,
          inProgress: inProgressCount,
          active: activeCount,
          resolved: resolvedCount,
        };
      })
    );

    // Compute overview KPIs
    const totalDepartments = await Department.countDocuments();
    const activeDepartments = await Department.countDocuments({ isActive: true });
    const totalAssignedComplaints = await Complaint.countDocuments({
      assignedDepartment: { $ne: null },
    });
    const totalUnassignedComplaints = await Complaint.countDocuments({
      $or: [{ assignedDepartment: null }, { assignedDepartment: { $exists: false } }],
    });

    return {
      departments: enrichedDepartments,
      summary: {
        totalDepartments,
        activeDepartments,
        totalAssignedComplaints,
        totalUnassignedComplaints,
      },
    };
  }

  async getDepartmentById(id) {
    const department = await Department.findById(id).lean();
    if (!department) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    const stats = await this.getDepartmentStats(id);

    return {
      ...department,
      id: department._id.toString(),
      stats,
    };
  }

  async updateDepartment(id, data) {
    const department = await Department.findById(id);
    if (!department) {
      throw new Error("Department not found");
    }

    if (data.code && data.code.toUpperCase() !== department.code) {
      const cleanCode = data.code.trim().toUpperCase();
      const existing = await Department.findOne({ code: cleanCode, _id: { $ne: id } });
      if (existing) {
        throw new Error(`Department code '${cleanCode}' already exists.`);
      }
      department.code = cleanCode;
    }

    if (data.name) department.name = data.name.trim();
    if (data.description !== undefined) department.description = data.description.trim();
    if (data.categories) department.categories = Array.isArray(data.categories) ? data.categories : [];
    if (data.contactEmail !== undefined) department.contactEmail = data.contactEmail.trim();
    if (data.contactPhone !== undefined) department.contactPhone = data.contactPhone.trim();
    if (data.address !== undefined) department.address = data.address.trim();
    if (data.icon) department.icon = data.icon;
    if (data.color) department.color = data.color;
    if (data.isActive !== undefined) department.isActive = Boolean(data.isActive);

    await department.save();
    return department;
  }

  async toggleDepartmentStatus(id, isActive) {
    const department = await Department.findById(id);
    if (!department) {
      throw new Error("Department not found");
    }

    department.isActive = isActive !== undefined ? Boolean(isActive) : !department.isActive;
    await department.save();
    return department;
  }

  async deleteDepartment(id) {
    const User = require("../models/userModel");

    // Unassign complaints assigned to this department
    await Complaint.updateMany(
      { assignedDepartment: id },
      { 
        $unset: { assignedDepartment: 1 }, 
        $set: { status: "SUBMITTED" }
      }
    );

    // Delete associated department officer user accounts
    const dept = await Department.findById(id);
    if (dept) {
      if (dept.officerUserId) {
        await User.findByIdAndDelete(dept.officerUserId);
      }
      await User.deleteMany({ departmentId: id });
    }

    const result = await Department.findByIdAndDelete(id);
    if (!result) {
      throw new Error("Department not found");
    }
    return result;
  }

  async getDepartmentComplaints(id, query = {}) {
    const department = await Department.findById(id);
    if (!department) {
      throw new Error("Department not found");
    }

    const filter = { assignedDepartment: id };

    if (query.status && query.status !== "All") {
      filter.status = query.status;
    }

    if (query.category && query.category !== "All") {
      filter.category = query.category;
    }

    if (query.priority) {
      filter["aiAnalysis.severity"] = query.priority.toUpperCase();
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      filter.$or = [
        { title: searchRegex },
        { complaintId: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { address: searchRegex },
      ];
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const skip = (page - 1) * limit;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Complaint.countDocuments(filter);

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

  async getDepartmentStats(id) {
    const totalComplaints = await Complaint.countDocuments({ assignedDepartment: id });
    const submitted = await Complaint.countDocuments({ assignedDepartment: id, status: "SUBMITTED" });
    const assigned = await Complaint.countDocuments({ assignedDepartment: id, status: "ASSIGNED" });
    const inProgress = await Complaint.countDocuments({ assignedDepartment: id, status: "IN_PROGRESS" });
    const resolved = await Complaint.countDocuments({ assignedDepartment: id, status: "RESOLVED" });
    const reopened = await Complaint.countDocuments({ assignedDepartment: id, status: "REOPENED" });
    const rejected = await Complaint.countDocuments({ assignedDepartment: id, status: "REJECTED" });

    const urgent = await Complaint.countDocuments({
      assignedDepartment: id,
      "aiAnalysis.severity": { $in: ["CRITICAL", "URGENT", "Critical"] },
    });

    const highPriority = await Complaint.countDocuments({
      assignedDepartment: id,
      "aiAnalysis.severity": { $in: ["HIGH", "High", "CRITICAL", "Critical"] },
    });

    return {
      totalComplaints,
      submitted,
      assigned,
      inProgress,
      resolved,
      reopened,
      rejected,
      urgent,
      highPriority,
    };
  }
}

module.exports = new DepartmentService();
