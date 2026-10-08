const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { authenticate, authorizeRoles } = require('./middleware/authMiddleware');
const upload = require('./middleware/uploadMiddleware');

const authController = require('./controllers/authController');
const adminController = require('./controllers/adminController');
const reportController = require('./controllers/reportController');
const qrController = require('./controllers/qrController');
const shareController = require('./controllers/shareController');
const blockchainController = require('./controllers/blockchainController');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. AUTHENTICATION & USERS ROUTES
// ==========================================
app.get('/api/auth/users', authController.getAllUsers);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authenticate, authController.getCurrentUser);

// ==========================================
// 1.1 ADMIN USER MANAGEMENT (Role Restricted)
// ==========================================
app.get('/api/admin/users', authenticate, authorizeRoles('Admin'), adminController.getConsortiumUsers);
app.post('/api/admin/users', authenticate, authorizeRoles('Admin'), adminController.registerUser);
app.delete('/api/admin/users/:userId', authenticate, authorizeRoles('Admin'), adminController.deleteUser);
app.get('/api/admin/ai-config', authenticate, authorizeRoles('Admin'), adminController.getAiConfig);
app.post('/api/admin/ai-config', authenticate, authorizeRoles('Admin'), adminController.updateAiConfig);
app.delete('/api/admin/ai-config', authenticate, authorizeRoles('Admin'), adminController.resetAiConfig);


// ==========================================
// 2. MEDICAL REPORT MANAGEMENT ROUTES
// ==========================================
// Upload medical report (Restricted: Lab Staff & Admin)
app.post('/api/reports/upload', authenticate, authorizeRoles('Lab Staff', 'Admin'), upload.single('reportFile'), reportController.uploadReport);

// Update medical report clinical notes (Restricted: Doctor & Admin)
app.put('/api/reports/:reportId', authenticate, authorizeRoles('Doctor', 'Admin'), reportController.updateReport);

// Retrieve reports (Role-based access & search)
app.get('/api/reports', authenticate, reportController.getReports);
app.get('/api/reports/search', authenticate, reportController.searchReports);

// Chronological Medical History Timeline (Objective 1 & 3)
app.get('/api/reports/timeline/:patientId', authenticate, reportController.getPatientTimeline);

// Get single report metadata
app.get('/api/reports/:reportId', authenticate, reportController.getReportById);

// Decrypted report download with live hash verification against blockchain
app.get('/api/reports/:reportId/download', authenticate, reportController.downloadDecryptedReport);

// ==========================================
// 3. KEY FEATURE 7.1: QR CODE ANTI-FORGERY
// ==========================================
app.get('/api/qr/:reportId', qrController.getReportQRCode);
app.get('/api/verify/:reportId', qrController.verifyReportIntegrity);
app.post('/api/verify/check-file/:reportId', upload.single('testFile'), qrController.verifyReportIntegrity);
app.post('/api/verify/tamper-file/:reportId', qrController.tamperOffChainFile);

// ==========================================
// 4. KEY FEATURE 7.2: TIME-EXPIRING SECURE ACCESS LINKS
// ==========================================
app.post('/api/share/create', authenticate, shareController.createExpiringShareLink);
app.get('/api/share/view', shareController.getSharedReport);
app.get('/api/share/download', shareController.downloadSharedReportFile);

// ==========================================
// 5. PERMISSIONED BLOCKCHAIN EXPLORER ROUTES
// ==========================================
app.get('/api/blockchain/ledger', blockchainController.getBlockchainLedger);
app.get('/api/blockchain/verify', blockchainController.verifyBlockchain);
app.post('/api/blockchain/tamper-demo', blockchainController.simulateTamper);
app.post('/api/blockchain/restore', blockchainController.restoreLedger);
app.get('/api/blockchain/stats', blockchainController.getSystemStats);
app.get('/api/blockchain/audit-logs', blockchainController.getAuditLogs);

// Fallback middleware for single-page app routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.path}` });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🏥 Medical Report Management & Distribution System on Blockchain`);
    console.log(`🌐 System Online at: http://localhost:${PORT}`);
    console.log(`📊 Phase 2 Presentation Deck at: http://localhost:${PORT}/presentation.html`);
    console.log(`🔍 Anti-Forgery QR Verification at: http://localhost:${PORT}/verify.html`);
    console.log(`================================================================`);
});

module.exports = app;
