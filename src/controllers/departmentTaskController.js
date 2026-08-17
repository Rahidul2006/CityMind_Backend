const departmentTaskService = require("../services/departmentTaskServices");

const getDashboard = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const data = await departmentTaskService.getDepartmentDashboard(departmentId, req.user?._id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch department dashboard",
      errorCode: "DASHBOARD_FETCH_FAILED",
    });
  }
};

const getTasks = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const result = await departmentTaskService.getDepartmentTasks(departmentId, req.query);
    res.status(200).json({
      success: true,
      data: result.complaints,
      complaints: result.complaints,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch department tasks",
      errorCode: "TASKS_FETCH_FAILED",
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const task = await departmentTaskService.getTaskById(departmentId, req.params.id);
    res.status(200).json({
      success: true,
      data: task,
      complaint: task,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to fetch task details",
      errorCode: "TASK_NOT_FOUND",
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const { status, message } = req.body;
    const task = await departmentTaskService.updateTaskStatus(
      departmentId,
      req.params.id,
      status,
      message,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: task,
      complaint: task,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to update status",
      errorCode: "STATUS_UPDATE_FAILED",
    });
  }
};

const addRemark = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const { message } = req.body;
    const task = await departmentTaskService.addTaskRemark(
      departmentId,
      req.params.id,
      message,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Remark added successfully",
      data: task,
      complaint: task,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to add remark",
      errorCode: "REMARK_FAILED",
    });
  }
};

const resolveTask = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const message = req.body.message || req.body.resolutionMessage || "";
    const task = await departmentTaskService.resolveTask(
      departmentId,
      req.params.id,
      message,
      req.file,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Task marked as resolved successfully",
      data: task,
      complaint: task,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to mark task as resolved",
      errorCode: "RESOLVE_FAILED",
    });
  }
};

const getPriorityTasks = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const complaints = await departmentTaskService.getPriorityTasks(departmentId);
    res.status(200).json({
      success: true,
      data: complaints,
      complaints,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch priority tasks",
      errorCode: "PRIORITY_FETCH_FAILED",
    });
  }
};

const getResolvedTasks = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const complaints = await departmentTaskService.getResolvedTasks(departmentId);
    res.status(200).json({
      success: true,
      data: complaints,
      complaints,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch resolved tasks",
      errorCode: "RESOLVED_FETCH_FAILED",
    });
  }
};

const getMapTasks = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const complaints = await departmentTaskService.getDepartmentMapTasks(departmentId);
    res.status(200).json({
      success: true,
      data: complaints,
      complaints,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch map tasks",
      errorCode: "MAP_FETCH_FAILED",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const departmentId = req.user?.departmentId;
    if (!departmentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User is not linked to any municipal department.",
        errorCode: "NO_DEPARTMENT_ASSIGNED",
      });
    }

    const profileData = await departmentTaskService.getDepartmentProfile(departmentId, req.user?._id);
    res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch department profile",
      errorCode: "PROFILE_FETCH_FAILED",
    });
  }
};

module.exports = {
  getDashboard,
  getTasks,
  getTaskById,
  updateStatus,
  addRemark,
  resolveTask,
  getPriorityTasks,
  getResolvedTasks,
  getMapTasks,
  getProfile,
};
