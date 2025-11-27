const Policy = require('../models/policy');

// Get all policies
exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find();
    res.status(200).json(policies);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get a single policy by title
exports.getPolicyByTitle = async (req, res) => {
  const { title } = req.params;
  try {
    const policy = await Policy.findOne({ title });
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    res.status(200).json(policy);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update a policy by title
exports.updatePolicy = async (req, res) => {
  const { title } = req.params;
  const { content } = req.body;
  try {
    const updatedPolicy = await Policy.findOneAndUpdate(
      { title },
      { content, lastUpdated: Date.now() },
      { new: true }
    );
    if (!updatedPolicy) return res.status(404).json({ message: 'Policy not found' });
    res.status(200).json(updatedPolicy);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Create a new policy
exports.createPolicy = async (req, res) => {
  const { title, content } = req.body;
  try {
    const policy = new Policy({ title, content });
    await policy.save();
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: 'Error creating policy', error });
  }
};

// Delete a policy by title
exports.deletePolicy = async (req, res) => {
    const { title } = req.params;
    try {
      const deletedPolicy = await Policy.findOneAndDelete({ title });
      if (!deletedPolicy) {
        return res.status(404).json({ message: 'Policy not found' });
      }
      res.status(200).json({ message: 'Policy deleted successfully', deletedPolicy });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
  
