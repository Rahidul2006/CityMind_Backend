const express = require("express");

const router = express.Router();

const complaintController = require("../controllers/complaintController");
const { authenticate: authMiddleware } = require("../middlewares/authMiddleware");


// ==========================================
// COMPLAINT ROUTES
// ==========================================

// Create a new complaint
router.post(
  "/",
  authMiddleware,
  complaintController.createComplaint
);

// Get all complaints
// Supports:
// ?search=pothole
// ?status=In Progress
// ?severity=Critical
// ?category=Potholes
// ?department=departmentId
// ?ward=wardId
// ?page=1&limit=10
router.get(
  "/",
  authMiddleware,
  complaintController.getComplaints
);

// Complaint statistics
router.get(
  "/stats",
  authMiddleware,
  complaintController.getComplaintStatistics
);

// Issues by category
router.get(
  "/stats/category",
  authMiddleware,
  complaintController.getIssuesByCategory
);

// Issues by status
router.get(
  "/stats/status",
  authMiddleware,
  complaintController.getIssuesByStatus
);

// Priority complaints
router.get(
  "/priority",
  authMiddleware,
  complaintController.getPriorityIssues
);

// Complaints for live map
router.get(
  "/map",
  authMiddleware,
  complaintController.getMapIssues
);

// Get a single complaint
router.get(
  "/:id",
  authMiddleware,
  complaintController.getComplaintById
);

// Update complaint
router.patch(
  "/:id",
  authMiddleware,
  complaintController.updateComplaint
);

// Assign complaint to officer
router.patch(
  "/:id/assign",
  authMiddleware,
  complaintController.assignComplaint
);

// Update complaint status
router.patch(
  "/:id/status",
  authMiddleware,
  complaintController.updateStatus
);

// Resolve complaint
router.patch(
  "/:id/resolve",
  authMiddleware,
  complaintController.resolveComplaint
);

// Delete complaint
router.delete(
  "/:id",
  authMiddleware,
  complaintController.deleteComplaint
);


module.exports = router;