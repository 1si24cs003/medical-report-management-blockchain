const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

function getAllUsers(req, res) {
    const users = db.getAllUsers();
    return res.json({ success: true, users });
}

function login(req, res) {
    const { userId, email, password } = req.body;
    let user = null;
    if (userId) {
        user = db.findUserById(userId);
    }
    
    if (!user && email) {
        user = db.findUserByEmail(email);
        if (!user) {
            // Also check by patientId or name or id
            user = db.getAllUsers().find(u => 
                (u.email && u.email.toLowerCase() === email.toLowerCase()) ||
                (u.id && u.id.toLowerCase() === email.toLowerCase()) ||
                (u.patientId && u.patientId.toLowerCase() === email.toLowerCase())
            );
        }
    }

    if (!user) {
        return res.status(404).json({ success: false, message: 'User identity not found in healthcare consortium database.' });
    }

    // Verify password if provided
    const userPass = user.password || 'password123';
    if (password && password !== userPass) {
        return res.status(401).json({ success: false, message: 'Invalid credentials. Password verification failed.' });
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            patientId: user.patientId || null
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );

    db.logAudit('USER_LOGIN', user.name, `User authenticated successfully with role: ${user.role}`);

    return res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
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
