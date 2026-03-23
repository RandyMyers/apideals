const Site = require('../models/site');

exports.getAllSites = async (req, res) => {
  try {
    const sites = await Site.find({ isActive: true })
      .select('name slug domains logo isActive createdAt')
      .sort({ createdAt: 1 })
      .lean();
    res.status(200).json(sites);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sites', error: error.message });
  }
};
