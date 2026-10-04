const jwt = require('jsonwebtoken');
const db = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'med-blockchain-jwt-super-secret-key-2026';

/**
 * Authentication middleware that verifies JWT tokens or switches demo user
 */
function authenticate(req, res, next) {
    // 1. Check for standard Authorization Header
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Demo role / user header override for fast panel evaluation switcher
    const demoUserId = req.headers['x-demo-user-id'];
    if (demoUserId) {
        const demoUser = db.findUserById(demoUserId);
        if (demoUser) {
            req.user = demoUser;
            return next();
        }
    }

    if (!token) {
        // Default to first doctor for non-credentialed exploratory queries if safe
        const defaultUser = db.findUserById('usr_doc_01');
        req.user = defaultUser;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.findUserById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found in consortium database.' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session token.', error: err.message });
    }
}

/**
 * Role-Based Access Control (RBAC) guard
 * @param  {...string} allowedRoles ('Doctor', 'Lab Staff', 'Patient', 'Admin')
 */
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        if (!allowedRoles.includes(req.user.role) && req.user.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${req.user.role}' is not authorized for this healthcare operation. Required: [${allowedRoles.join(', ')}]`
            });
        }

        next();
    };
}

module.exports = {
    authenticate,
    authorizeRoles,
    JWT_SECRET
};
