const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Path to your User model

// Middleware to protect routes that require authentication
const authMiddleware = async (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', ''); // Bearer <token>

    // If token is not provided or is null/undefined, return an error
    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        // Verify token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user associated with the token
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found....', isAuthenticated: false });
        }

        // Attach the user to the request object (so we can access it later in the route)
        req.user = user;
        // Ensure id is available (Mongoose documents have _id, but we also set id for convenience)
        if (!req.user.id && req.user._id) {
          req.user.id = req.user._id.toString();
        }

        // Continue to the next middleware/route handler
        next();
    } catch (err) {
        console.log(err);
        // If the token is invalid or expired, return an error
        return res.status(401).json({ message: 'Invalid or expired token.', isAuthenticated: false });
    }
};

module.exports = authMiddleware;
