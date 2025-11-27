const ReportIssue = require('../models/reportIssue');

// Submit issue report (public)
exports.submitReport = async (req, res) => {
  try {
    const { type, relatedId, relatedType, title, description, evidence, priority } = req.body;

    // Validate required fields
    if (!type || !title || !description) {
      return res.status(400).json({ message: 'Type, title, and description are required' });
    }

    // Validate type
    const validTypes = ['coupon', 'deal', 'store', 'user', 'content', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    // Get userId from token if authenticated
    const userId = req.user ? req.user.id : null;

    const report = new ReportIssue({
      userId,
      type,
      relatedId,
      relatedType,
      title,
      description,
      evidence: evidence || [],
      priority: priority || 'medium',
      status: 'pending',
    });

    await report.save();
    return res.status(201).json({ message: 'Issue report submitted successfully', report });
  } catch (error) {
    console.error('Error submitting issue report:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reports (admin)
exports.getAllReports = async (req, res) => {
  try {
    const reports = await ReportIssue.find()
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get reports by type (admin)
exports.getReportsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const reports = await ReportIssue.find({ type })
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('Error fetching reports by type:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single report by ID (admin)
exports.getReportById = async (req, res) => {
  try {
    const report = await ReportIssue.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .exec();

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.status(200).json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update report status (admin)
exports.updateReport = async (req, res) => {
  try {
    const { status, priority, adminNotes } = req.body;
    const updateData = {};

    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolvedBy = req.user.id;
        updateData.resolvedAt = Date.now();
      }
    }

    if (priority) {
      updateData.priority = priority;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const report = await ReportIssue.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .exec();

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.status(200).json({ message: 'Report updated successfully', report });
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete report by ID (admin)
exports.deleteReport = async (req, res) => {
  try {
    const report = await ReportIssue.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.status(200).json({ message: 'Report deleted successfully', report });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

