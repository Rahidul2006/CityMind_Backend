const complaintService = require("../services/complaintServices");

const createComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.createComplaint(
      req.body,
      req.file,
      req.user?._id || "demoCitizenId"
    );

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      complaint,
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create complaint",
      errorCode: "COMPLAINT_CREATE_FAILED",
    });
  }
};

const getComplaints = async (req, res) => {
  try {
    const complaints = await complaintService.getComplaints(req.query);

    res.status(200).json({
      success: true,
      complaints,
      data: complaints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch complaints",
      errorCode: "COMPLAINTS_FETCH_FAILED",
    });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const complaint = await complaintService.getComplaintById(req.params.id);

    res.status(200).json({
      success: true,
      complaint,
      data: complaint,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || "Complaint not found",
      errorCode: "COMPLAINT_NOT_FOUND",
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const complaint = await complaintService.updateStatus(
      req.params.id,
      req.body.status,
      req.body.message
    );

    res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
      complaint,
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update status",
      errorCode: "STATUS_UPDATE_FAILED",
    });
  }
};

const verifyResolution = async (req, res) => {
  try {
    const { resolved, message } = req.body;
    const complaint = await complaintService.verifyResolution(
      req.params.id,
      resolved,
      message
    );

    res.status(200).json({
      success: true,
      message: resolved
        ? "Resolution verified by citizen"
        : "Complaint marked as reopened",
      complaint,
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Resolution verification failed",
      errorCode: "VERIFICATION_FAILED",
    });
  }
};

const getNearbyComplaints = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    const complaints = await complaintService.getNearbyComplaints(
      latitude,
      longitude,
      radius
    );

    res.status(200).json({
      success: true,
      complaints,
      data: complaints,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch nearby complaints",
      errorCode: "NEARBY_FETCH_FAILED",
    });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateStatus,
  verifyResolution,
  getNearbyComplaints,
};