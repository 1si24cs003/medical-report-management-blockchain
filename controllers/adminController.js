const fs = require('fs');
const path = require('path');
const db = require('../models/db');
const { testGeminiApiKey } = require('../utils/aiSummarizer');

const ENV_FILE_PATH = path.join(__dirname, '..', '.env');

function syncEnvFile(key, value) {
    try {
        let content = '';
        if (fs.existsSync(ENV_FILE_PATH)) {
            content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
        }
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (value) {
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=${value}`);
            } else {
                content = content ? `${content}\n${key}=${value}\n` : `${key}=${value}\n`;
            }
        } else {
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=`);
            }
        }
        fs.writeFileSync(ENV_FILE_PATH, content, 'utf8');
    } catch (e) {
        console.warn('[Admin Controller] Could not sync .env file:', e.message);
    }
}

/**
 * Controller for Admin operations (User Management, Consortium Node Enrollment)
 */

function getConsortiumUsers(req, res) {
    try {
        const users = db.getAllUsers();
        const stats = {
            total: users.length,
            doctors: users.filter(u => u.role === 'Doctor').length,
            patients: users.filter(u => u.role === 'Patient').length,
            labStaff: users.filter(u => u.role === 'Lab Staff').length,
            admins: users.filter(u => u.role === 'Admin').length
        };

        return res.json({
            success: true,
            stats,
            users
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve consortium users.', error: err.message });
    }
}

function registerUser(req, res) {
    try {
        const {
            name,
            email,
            password,
            role,
            // Doctor fields
            department,
            hospital,
            doctorLicense,
            // Patient fields
            patientId,
            age,
            gender,
            bloodGroup,
            contact,
            // Lab Staff fields
            designation,
            laboratory,
            labLicense,
            // Blockchain node mapping
            nodeId
        } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ success: false, message: 'Name, email, and role are required fields.' });
        }

        const validRoles = ['Doctor', 'Patient', 'Lab Staff', 'Admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: `Invalid role specified. Must be one of: ${validRoles.join(', ')}` });
        }

        // Check if email already registered
        const existing = db.findUserByEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, message: `A user with email '${email}' is already registered in the consortium.` });
        }

        const timestamp = Date.now().toString(36);
        let newUser = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password ? password.trim() : 'password123',
            role,
            nodeId: nodeId || (role === 'Doctor' ? 'NODE-HOSP-01' : role === 'Lab Staff' ? 'NODE-LAB-01' : null),
            createdAt: new Date().toISOString()
        };

        if (role === 'Doctor') {
            newUser.id = `usr_doc_${timestamp}`;
            newUser.department = department || 'General Medicine';
            newUser.hospital = hospital || 'Metro Apex Hospital';
            newUser.license = doctorLicense || `MC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        } else if (role === 'Patient') {
            newUser.id = `usr_pat_${timestamp}`;
            newUser.patientId = (patientId && patientId.trim()) ? patientId.trim().toUpperCase() : `PT-${Math.floor(1000 + Math.random() * 9000)}`;
            newUser.age = parseInt(age, 10) || 30;
            newUser.gender = gender || 'Unspecified';
            newUser.bloodGroup = bloodGroup || 'O+';
            newUser.contact = contact || '+91 90000 00000';
        } else if (role === 'Lab Staff') {
            newUser.id = `usr_lab_${timestamp}`;
            newUser.designation = designation || 'Clinical Lab Technologist';
            newUser.laboratory = laboratory || 'Pathology Diagnostics Lab';
            newUser.license = labLicense || `LAB-TECH-${Math.floor(100 + Math.random() * 900)}`;
        } else if (role === 'Admin') {
            newUser.id = `usr_adm_${timestamp}`;
            newUser.institution = 'Healthcare Consortium Blockchain Authority';
        }

        const created = db.addUser(newUser);

        db.logAudit(
            'USER_REGISTERED',
            req.user ? req.user.name : 'System Admin',
            `Admin enrolled new ${role}: ${created.name} (${created.email}, ID: ${created.id})`
        );

        return res.status(201).json({
            success: true,
            message: `New ${role} account successfully created for ${created.name}!`,
            user: created
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'User registration failed.', error: err.message });
    }
}

function deleteUser(req, res) {
    try {
        const { userId } = req.params;
        const target = db.findUserById(userId);

        if (!target) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (target.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete the currently logged in admin account.' });
        }

        db.deleteUser(userId);

        db.logAudit(
            'USER_DELETED',
            req.user ? req.user.name : 'System Admin',
            `Admin removed user account: ${target.name} (${target.role}, ID: ${target.id})`
        );

        return res.json({
            success: true,
            message: `User '${target.name}' successfully removed from consortium database.`
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'User removal failed.', error: err.message });
    }
}

/**
 * Feature: Get AI Gateway Status & Active Engine
 */
function getAiConfig(req, res) {
    const key = process.env.GEMINI_API_KEY;
    const hasKey = Boolean(key && key.trim());
    const maskedKey = hasKey ? `${key.trim().slice(0, 6)}...${key.trim().slice(-4)}` : null;

    return res.json({
        success: true,
        hasKey,
        maskedKey,
        activeEngine: hasKey ? 'Google Gemini 3.8 Flash (Live Cloud AI)' : 'Local Clinical NLP Engine (Offline Fallback)',
        status: hasKey ? 'ONLINE_AI' : 'OFFLINE_FALLBACK'
    });
}

/**
 * Feature: Validate and Activate Google Gemini API Key
 */
async function updateAiConfig(req, res) {
    try {
        const { apiKey } = req.body;
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
            return res.status(400).json({ success: false, message: 'Please provide a valid Google Gemini API key.' });
        }

        const cleanKey = apiKey.trim();
        // Ping Google Gemini to verify key
        const testResult = await testGeminiApiKey(cleanKey);

        process.env.GEMINI_API_KEY = cleanKey;
        syncEnvFile('GEMINI_API_KEY', cleanKey);

        db.logAudit(
            'AI_GATEWAY_CONFIGURED',
            req.user ? req.user.name : 'System Admin',
            `Admin verified and activated Google Gemini cloud gateway (Model: ${testResult.activeModel || 'gemini-2.0-flash'})`
        );

        const maskedKey = `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`;
        return res.json({
            success: true,
            message: testResult.message || `Google Gemini API key successfully verified and activated!`,
            activeEngine: `Google Gemini (${testResult.activeModel || 'gemini-2.0-flash'})`,
            status: 'ONLINE_AI',
            maskedKey,
            warning: testResult.warning || null
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: `Verification failed: ${err.message}`,
            error: err.message
        });
    }
}

/**
 * Feature: Revert AI Gateway to Offline Fallback Mode
 */
function resetAiConfig(req, res) {
    try {
        delete process.env.GEMINI_API_KEY;
        syncEnvFile('GEMINI_API_KEY', '');

        db.logAudit(
            'AI_GATEWAY_RESET',
            req.user ? req.user.name : 'System Admin',
            'Admin reset AI Gateway to Local Clinical NLP Engine (Offline Fallback)'
        );

        return res.json({
            success: true,
            message: 'AI Gateway successfully reverted to Local Clinical NLP Engine (Offline Fallback).',
            activeEngine: 'Local Clinical NLP Engine (Offline Fallback)',
            status: 'OFFLINE_FALLBACK',
            maskedKey: null
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to reset AI config.', error: err.message });
    }
}

module.exports = {
    getConsortiumUsers,
    registerUser,
    deleteUser,
    getAiConfig,
    updateAiConfig,
    resetAiConfig
};

