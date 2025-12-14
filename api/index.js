/**
 * Vercel Serverless Function Entry Point
 * This file wraps the Express app for Vercel's serverless environment
 */

// Set serverless environment flag before importing app
process.env.VERCEL = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import the Express app
const app = require('../app');

// Export the app as a serverless function
// Vercel will handle the HTTP server
module.exports = app;

