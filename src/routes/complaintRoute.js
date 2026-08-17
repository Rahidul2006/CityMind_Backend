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

// 3. Get all complaints belonging to/visible for citizen
router.get(
  "/",
  authMiddleware,
  complaintController.getComplaints
);

// 4. Get complete details for a single complaint
router.get(
  "/:id",
  authMiddleware,
  complaintController.getComplaintById
);

// 5. Citizen verifies resolution (YES -> RESOLVED / NO -> REOPENED)
router.post(
  "/:id/verify",
  authMiddleware,
  complaintController.verifyResolution
);

// 6. Update complaint status (used by municipal dashboard / internal)
router.patch(
  "/:id/status",
  authMiddleware,
  complaintController.updateStatus
);

module.exports = router;