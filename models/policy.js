const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true, // Ensure no duplicate titles
  },
  content: {
    type: String,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Policy', PolicySchema);
