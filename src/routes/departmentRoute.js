const express = require("express");
const router = express.Router();

const departmentController = require("../controllers/departmentController");
const { authenticate: authMiddleware, requireAdmin } = require("../middlewares/authMiddleware");

// ==========================================
// DEPARTMENT ROUTES FOR CITYMIND AI (ADMIN ONLY)
// ==========================================

// All /api/departments routes require admin authentication
router.use(authMiddleware, requireAdmin);

// 1. Create department
router.post("/", departmentController.createDepartment);

// 2. Get all departments (with complaint counts & KPIs)
router.get("/", departmentController.getDepartments);

// 3. Get single department details
router.get("/:id", departmentController.getDepartmentById);

// 4. Update department metadata
router.patch("/:id", departmentController.updateDepartment);

// 5. Activate / Deactivate department
router.patch("/:id/status", departmentController.toggleDepartmentStatus);

// 6. Delete department (only if no complaints assigned)
router.delete("/:id", departmentController.deleteDepartment);

// 7. Get complaints assigned to specific department
router.get("/:id/complaints", departmentController.getDepartmentComplaints);

// 8. Get department detailed statistics breakdown
router.get("/:id/stats", departmentController.getDepartmentStats);

module.exports = router;
