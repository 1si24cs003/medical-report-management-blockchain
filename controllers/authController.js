const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

function getAllUsers(req, res) {
    const users = db.getAllUsers();
    return res.json({ success: true, users });
}

function login(req, res) {
    const { userId, email } = req.body;
    let user = null;
    if (userId) {
        user = db.findUserById(userId);
    } else if (email) {
        user = db.findUserByEmail(email);
    }

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found in consortium database.' });
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
            name: user.name,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );

    db.logAudit('USER_LOGIN', user.name, `User logged in with role: ${user.role}`);

    return res.json({
        success: true,
        token,
        user
    });
}

function getCurrentUser(req, res) {
    return res.json({
        success: true,
        user: req.user
    });
}

module.exports = {
    getAllUsers,
    login,
    getCurrentUser
};
