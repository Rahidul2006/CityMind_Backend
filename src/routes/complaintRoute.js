const express = require("express");
const router = express.Router();

const complaintController = require("../controllers/complaintController");
const { authenticate: authMiddleware } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// ==========================================
// COMPLAINT ROUTES FOR CITYMIND AI
// ==========================================

// 1. Create a new complaint (with image upload to Cloudinary)
router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  complaintController.createComplaint
);

// 2. Get nearby complaints for Map view (MUST BE BEFORE /:id ROUTE)
router.get(
  "/nearby",
  authMiddleware,
  complaintController.getNearbyComplaints
);

// 3. Get unassigned complaints (MUST BE BEFORE /:id ROUTE)
router.get(
  "/unassigned",
  authMiddleware,
  complaintController.getUnassignedComplaints
);

// 4. Get all complaints belonging to/visible for citizen
router.get(
  "/",
  authMiddleware,
  complaintController.getComplaints
);

// 5. Get complete details for a single complaint
router.get(
  "/:id",
  authMiddleware,
  complaintController.getComplaintById
);

// 6. Citizen verifies resolution (YES -> RESOLVED / NO -> REOPENED)
router.post(
  "/:id/verify",
  authMiddleware,
  complaintController.verifyResolution
);

// 7. Update complaint status (used by municipal dashboard / internal)
router.patch(
  "/:id/status",
  authMiddleware,
  complaintController.updateStatus
);

// 8. Assign complaint to a municipal department
router.patch(
  "/:id/department",
  authMiddleware,
  complaintController.assignDepartment
);

// 9. Delete a complaint by ID
router.delete(
  "/:id",
  authMiddleware,
  complaintController.deleteComplaint
);

module.exports = router;