const complaintService = require("../services/complaintServices");

const createComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.createComplaint(
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const getComplaints = async (req, res) => {
  try {
    const result =
      await complaintService.getComplaints(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getComplaintById = async (req, res) => {
  try {
    const complaint =
      await complaintService.getComplaintById(
        req.params.id
      );

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


const updateComplaint = async (req, res) => {
  try {
    const complaint =
      await complaintService.updateComplaint(
        req.params.id,
        req.body
      );

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const assignComplaint = async (req, res) => {
  try {
    const complaint =
      await complaintService.assignComplaint(
        req.params.id,
        req.body.officerId
      );

    res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const updateStatus = async (req, res) => {
  try {
    const complaint =
      await complaintService.updateStatus(
        req.params.id,
        req.body.status
      );

    res.status(200).json({
      success: true,
      message: "Complaint status updated",
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const resolveComplaint = async (req, res) => {
  try {
    const complaint =
      await complaintService.resolveComplaint(
        req.params.id,
        req.body.resolutionNote
      );

    res.status(200).json({
      success: true,
      message: "Complaint resolved successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const deleteComplaint = async (req, res) => {
  try {
    await complaintService.deleteComplaint(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


const getComplaintStatistics = async (req, res) => {
  try {
    const stats =
      await complaintService.getComplaintStatistics();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getIssuesByCategory = async (req, res) => {
  try {
    const data =
      await complaintService.getIssuesByCategory();

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


const getIssuesByStatus = async (req, res) => {
  try {
    const data =
      await complaintService.getIssuesByStatus();

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


const getPriorityIssues = async (req, res) => {
  try {
    const data =
      await complaintService.getPriorityIssues(
        req.query.limit || 10
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


const getMapIssues = async (req, res) => {
  try {
    const data =
      await complaintService.getMapIssues(
        req.query
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


module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  assignComplaint,
  updateStatus,
  resolveComplaint,
  deleteComplaint,
  getComplaintStatistics,
  getIssuesByCategory,
  getIssuesByStatus,
  getPriorityIssues,
  getMapIssues,
};