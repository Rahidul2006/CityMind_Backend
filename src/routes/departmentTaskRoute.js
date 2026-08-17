const express = require("express");
const router = express.Router();

const departmentTaskController = require("../controllers/departmentTaskController");
const { authenticate, requireDepartmentOfficer } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// All routes under /api/department require authentication AND Department Officer role
router.use(authenticate, requireDepartmentOfficer);

// 1. Department Dashboard stats
router.get("/dashboard", departmentTaskController.getDashboard);

// 2. Department Assigned Tasks list (with filters)
router.get("/tasks", departmentTaskController.getTasks);

// 3. Priority Issues (URGENT & HIGH)
router.get("/priority", departmentTaskController.getPriorityTasks);

// 4. Resolved Tasks
router.get("/resolved", departmentTaskController.getResolvedTasks);

// 5. Department Map Tasks
router.get("/map", departmentTaskController.getMapTasks);

// 6. Officer & Department Profile
router.get("/profile", departmentTaskController.getProfile);

// 7. Single Task Details (MUST BE AFTER named routes)
router.get("/tasks/:id", departmentTaskController.getTaskById);

// 8. Update Task Status
router.patch("/tasks/:id/status", departmentTaskController.updateStatus);

// 9. Add Department Remark
router.post("/tasks/:id/remarks", departmentTaskController.addRemark);

// 10. Mark Task as Resolved with optional resolution evidence photo
router.post(
  "/tasks/:id/resolve",
  upload.single("image"),
  departmentTaskController.resolveTask
);

module.exports = router;
