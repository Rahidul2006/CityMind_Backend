const express = require("express");

const router = express.Router();

const departmentController = require("../controllers/departmentController");
const { authenticate: authMiddleware } = require("../middlewares/authMiddleware");


// ==========================================
// DEPARTMENT ROUTES
// ==========================================

// Create department
router.post(
  "/",
  authMiddleware,
  departmentController.createDepartment
);

// Get all departments
router.get(
  "/",
  authMiddleware,
  departmentController.getDepartments
);

// Department overview
router.get(
  "/overview",
  authMiddleware,
  departmentController.getDepartmentOverview
);

// Workload distribution
router.get(
  "/workload",
  authMiddleware,
  departmentController.getWorkloadDistribution
);

// Top overdue departments
router.get(
  "/overdue",
  authMiddleware,
  departmentController.getTopOverdueDepartments
);

// Get department by ID
router.get(
  "/:id",
  authMiddleware,
  departmentController.getDepartmentById
);

// Update department
router.patch(
  "/:id",
  authMiddleware,
  departmentController.updateDepartment
);

// Update department SLA
router.patch(
  "/:id/sla",
  authMiddleware,
  departmentController.updateSLA
);

// Get department staff
router.get(
  "/:id/staff",
  authMiddleware,
  departmentController.getDepartmentStaff
);

// Deactivate department
router.delete(
  "/:id",
  authMiddleware,
  departmentController.deleteDepartment
);


module.exports = router;