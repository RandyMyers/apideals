const Feedback = require('../models/feedback');

// Submit feedback (public, but userId preferred if authenticated)
exports.submitFeedback = async (req, res) => {
  try {
    const { type, subject, description, rating } = req.body;

    // Validate required fields
    if (!type || !subject || !description) {
      return res.status(400).json({ message: 'Type, subject, and description are required' });
    }

    // Validate type
    const validTypes = ['bug', 'feature', 'improvement', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid feedback type' });
    }

    // Get userId from token if authenticated
    const userId = req.user ? req.user.id : null;

    const feedback = new Feedback({
      userId,
      type,
      subject,
      description,
      rating,
      status: 'open',
    });

    await feedback.save();
    return res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all feedback (admin)
exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get feedback by type (admin)
exports.getFeedbackByType = async (req, res) => {
  try {
    const { type } = req.params;
    const feedback = await Feedback.find({ type })
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback by type:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single feedback by ID (admin)
exports.getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email')
      .exec();

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    return res.status(200).json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update feedback status (admin)
exports.updateFeedback = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const updateData = {};

    if (status) {
      updateData.status = status;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
      updateData.respondedBy = req.user.id;
      updateData.respondedAt = Date.now();
    }

    const feedback = await Feedback.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email')
      .exec();

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    return res.status(200).json({ message: 'Feedback updated successfully', feedback });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete feedback by ID (admin)
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    return res.status(200).json({ message: 'Feedback deleted successfully', feedback });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

