const jwt = require('jsonwebtoken');
const User = require('../models/user');

// List of all valid roles
const VALID_ROLES = [
    'superAdmin',       // Full access
    'couponManager',    // Manage coupons/deals
    'customerSupport',  // Help with customer inquiries
    'contentEditor',    // Edit content on the app
    'marketingManager'  // Manage marketing campaigns
];

// Middleware to check authentication and authorization
const adminMiddleware = (requiredUserTypes) => {
    return async (req, res, next) => {
        // 1. Get the token from request headers
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Authentication token is required.' });
        }

        try {
            // 2. Verify the token and decode the payload
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            console.log(decoded);

            // 3. Find the user by decoded userId
            const user = await User.findById(decoded.id);
            console.log(user);

            if (!user) {
                return res.status(401).json({ message: 'User for auth not found.' });
            }

            // 4. Validate the user's role
            if (!VALID_ROLES.includes(user.userType)) {
                return res.status(403).json({ message: 'Access denied. Invalid role.' });
            }

            if (!requiredUserTypes.includes(user.userType)) {
                return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
            }

            // 5. Attach user data to request object
            req.user = user;

            // Proceed to the next middleware or route handler
            next();

        } catch (error) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
    };
};

module.exports = adminMiddleware;
