const departmentService = require("../services/departmentServices");


// =====================================================
// CREATE DEPARTMENT
// =====================================================

const createDepartment = async (req, res) => {
  try {
    const department =
      await departmentService.createDepartment(
        req.body
      );

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// GET ALL DEPARTMENTS
// =====================================================

const getDepartments = async (req, res) => {
  try {
    const departments =
      await departmentService.getDepartments();

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// GET DEPARTMENT BY ID
// =====================================================

const getDepartmentById = async (req, res) => {
  try {
    const department =
      await departmentService.getDepartmentById(
        req.params.id
      );

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// UPDATE DEPARTMENT
// =====================================================

const updateDepartment = async (req, res) => {
  try {
    const department =
      await departmentService.updateDepartment(
        req.params.id,
        req.body
      );

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// DELETE DEPARTMENT
// =====================================================

const deleteDepartment = async (req, res) => {
  try {
    await departmentService.deleteDepartment(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Department deactivated successfully",
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// DEPARTMENT OVERVIEW
// =====================================================

const getDepartmentOverview = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
    } = req.query;

    const data =
      await departmentService.getDepartmentOverview(
        startDate,
        endDate
      );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// WORKLOAD DISTRIBUTION
// =====================================================

const getWorkloadDistribution = async (
  req,
  res
) => {
  try {
    const data =
      await departmentService.getWorkloadDistribution();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// TOP OVERDUE DEPARTMENTS
// =====================================================

const getTopOverdueDepartments = async (
  req,
  res
) => {
  try {
    const limit =
      Number(req.query.limit) || 5;

    const data =
      await departmentService.getTopOverdueDepartments(
        limit
      );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// UPDATE SLA
// =====================================================

const updateSLA = async (req, res) => {
  try {
    const department =
      await departmentService.updateSLA(
        req.params.id,
        req.body
      );

    res.status(200).json({
      success: true,
      message: "Department SLA updated successfully",
      data: department,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// =====================================================
// GET DEPARTMENT STAFF
// =====================================================

const getDepartmentStaff = async (
  req,
  res
) => {
  try {
    const staff =
      await departmentService.getDepartmentStaff(
        req.params.id
      );

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentOverview,
  getWorkloadDistribution,
  getTopOverdueDepartments,
  updateSLA,
  getDepartmentStaff,
};