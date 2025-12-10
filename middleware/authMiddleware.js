const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Path to your User model

// Middleware to protect routes that require authentication
const authMiddleware = async (req, res, next) => {
    console.log('[authMiddleware] Authentication check started');
    console.log('[authMiddleware] Request path:', req.path);
    console.log('[authMiddleware] Request method:', req.method);
    
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    console.log('[authMiddleware] Auth header present:', !!authHeader);
    console.log('[authMiddleware] Auth header length:', authHeader?.length);
    
    const token = authHeader?.replace('Bearer ', ''); // Bearer <token>
    console.log('[authMiddleware] Token extracted:', token ? `Present (${token.length} chars)` : 'Missing');

    // If token is not provided or is null/undefined, return an error
    if (!token || token === 'null' || token === 'undefined') {
        console.error('[authMiddleware] Token missing or invalid');
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
        console.log('[authMiddleware] Verifying token...');
        // Verify token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[authMiddleware] Token verified, user ID:', decoded.id);

        // Find the user associated with the token
        const user = await User.findById(decoded.id);

        if (!user) {
            console.error('[authMiddleware] User not found for ID:', decoded.id);
            return res.status(401).json({ message: 'User not found....', isAuthenticated: false });
        }

        console.log('[authMiddleware] User found:', user.email || user.username, 'Type:', user.userType);

        // Attach the user to the request object (so we can access it later in the route)
        req.user = user;
        // Ensure id is available (Mongoose documents have _id, but we also set id for convenience)
        if (!req.user.id && req.user._id) {
          req.user.id = req.user._id.toString();
        }

        console.log('[authMiddleware] Authentication successful, proceeding to route handler');
        // Continue to the next middleware/route handler
        next();
    } catch (err) {
        console.error('[authMiddleware] Token verification failed:', err.name, err.message);
        // If the token is invalid or expired, return an error
        return res.status(401).json({ message: 'Invalid or expired token.', isAuthenticated: false });
    }
};

module.exports = authMiddleware;
