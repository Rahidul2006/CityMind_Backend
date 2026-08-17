const departmentService = require("../services/departmentServices");

const createDepartment = async (req, res) => {
  try {
    const department = await departmentService.createDepartment(req.body);
    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
      department,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create department",
      errorCode: "DEPARTMENT_CREATE_FAILED",
    });
  }
};

const getDepartments = async (req, res) => {
  try {
    const result = await departmentService.getDepartments(req.query);
    res.status(200).json({
      success: true,
      data: result.departments,
      summary: result.summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch departments",
      errorCode: "DEPARTMENTS_FETCH_FAILED",
    });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    res.status(200).json({
      success: true,
      data: department,
      department,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || "Department not found",
      errorCode: "DEPARTMENT_NOT_FOUND",
    });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
      department,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update department",
      errorCode: "DEPARTMENT_UPDATE_FAILED",
    });
  }
};

const toggleDepartmentStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const department = await departmentService.toggleDepartmentStatus(req.params.id, isActive);
    res.status(200).json({
      success: true,
      message: `Department ${department.isActive ? "activated" : "deactivated"} successfully`,
      data: department,
      department,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update department status",
      errorCode: "STATUS_TOGGLE_FAILED",
    });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    await departmentService.deleteDepartment(req.params.id);
    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete department",
      errorCode: "DEPARTMENT_DELETE_FAILED",
    });
  }
};

const getDepartmentComplaints = async (req, res) => {
  try {
    const result = await departmentService.getDepartmentComplaints(req.params.id, req.query);
    res.status(200).json({
      success: true,
      data: result.complaints,
      complaints: result.complaints,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch department complaints",
      errorCode: "DEPARTMENT_COMPLAINTS_FETCH_FAILED",
    });
  }
};

const getDepartmentStats = async (req, res) => {
  try {
    const stats = await departmentService.getDepartmentStats(req.params.id);
    res.status(200).json({
      success: true,
      data: stats,
      stats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch department stats",
      errorCode: "DEPARTMENT_STATS_FETCH_FAILED",
    });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
  getDepartmentComplaints,
  getDepartmentStats,
};
