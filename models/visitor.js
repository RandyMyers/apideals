const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VisitorSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String, required: true },
    city: { type: String },
    region: { type: String },
    country: { type: String, required: true },
    continent: { type: String },
    zipCode: { type: String },
    population: { type: Number },
    currency: { type: String },
    currencyName: { type: String },
    languages: [{ type: String }],
    latitude: { type: Number },
    longitude: { type: Number },
    timezone: { type: String },
    userAgent: { type: String, required: true },
    browserLanguage: { type: String },
    platform: { type: String },
    deviceType: { type: String },
    visitedAt: { type: Date, default: Date.now },
    visitCount: { type: Number, default: 1 }, // Tracks visit frequency
    referralCode: { type: String } 
});

// Create a compound index for unique IP and userAgent combination
VisitorSchema.index({ ip: 1, userAgent: 1 }, { unique: true });

const Visitor = mongoose.model('Visitor', VisitorSchema);
module.exports = Visitor;
