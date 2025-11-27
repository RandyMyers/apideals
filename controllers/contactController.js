const ContactSubmission = require('../models/contactSubmission');

// Submit a contact form (public)
exports.submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Name, email, subject, and message are required' });
    }

    // Get userId from token if authenticated
    const userId = req.user ? req.user.id : null;

    const submission = new ContactSubmission({
      name,
      email,
      subject,
      message,
      phone,
      userId,
      status: 'pending',
    });

    await submission.save();
    return res.status(201).json({ message: 'Contact submission received successfully', submission });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all contact submissions (admin)
exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await ContactSubmission.find()
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single submission by ID (admin)
exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email')
      .exec();

    if (!submission) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }

    return res.status(200).json({ submission });
  } catch (error) {
    console.error('Error fetching contact submission:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update submission status (admin)
exports.updateSubmission = async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const updateData = {};

    if (status) {
      updateData.status = status;
    }

    if (adminResponse) {
      updateData.adminResponse = adminResponse;
      updateData.respondedBy = req.user.id;
      updateData.respondedAt = Date.now();
    }

    const submission = await ContactSubmission.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('userId', 'name email')
      .populate('respondedBy', 'name email')
      .exec();

    if (!submission) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }

    return res.status(200).json({ message: 'Contact submission updated successfully', submission });
  } catch (error) {
    console.error('Error updating contact submission:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a submission by ID (admin)
exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }

    return res.status(200).json({ message: 'Contact submission deleted successfully', submission });
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

