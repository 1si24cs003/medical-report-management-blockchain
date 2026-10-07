const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../models/db');
const { computeSHA256, decryptBuffer } = require('../utils/cryptoUtils');

const SHARE_JWT_SECRET = process.env.SHARE_JWT_SECRET || 'med-blockchain-share-link-secret-key-2026';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Feature 7.2: Patient creates a time-expiring signed access link
 */
function createExpiringShareLink(req, res) {
    try {
        const { reportId, durationMinutes, doctorNotes, recipientDoctor } = req.body;
        const report = db.findReportById(reportId);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        // Default: 60 minutes. Supports short 2-minute demo for evaluation panel!
        const duration = parseInt(durationMinutes, 10) || 60;
        const expiresInSeconds = duration * 60;

        const payload = {
            reportId: report.reportId,
            patientId: report.patientId,
            patientName: report.patientName,
            accessContext: 'doctor_consultation_time_limited',
            recipientDoctor: recipientDoctor || 'Consulting Physician',
            notes: doctorNotes || '',
            createdAt: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(payload, SHARE_JWT_SECRET, {
            expiresIn: expiresInSeconds
        });

        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
        const hostUrl = req.protocol + '://' + req.get('host');
        const shareUrl = `${hostUrl}/shared.html?token=${token}`;

        const sharedRecord = {
            token,
            reportId: report.reportId,
            patientId: report.patientId,
            patientName: report.patientName,
            reportTitle: report.title,
            recipientDoctor: recipientDoctor || 'External Doctor',
            durationMinutes: duration,
            expiresAt,
            createdAt: new Date().toISOString()
        };

        db.addSharedLink(sharedRecord);

        db.logAudit(
            'TIME_EXPIRING_LINK_CREATED',
            req.user ? req.user.name : report.patientName,
            `Created temporary share link for ${report.reportId} valid for ${duration} min(s) (Expires: ${expiresAt})`
        );

        return res.status(201).json({
            success: true,
            message: `Time-expiring link generated successfully (Valid for ${duration} minutes).`,
            token,
            shareUrl,
            expiresAt,
            durationMinutes: duration,
            expiresInSeconds
        });

    } catch (err) {
        console.error('[Share Link Error]:', err);
        return res.status(500).json({ success: false, message: 'Failed to create share link.', error: err.message });
    }
}

/**
 * Feature 7.2: Doctor accesses shared link
 * Verifies JWT signature and real-time expiration
 */
function getSharedReport(req, res) {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ success: false, message: 'No access token provided.' });
    }

    try {
        const decoded = jwt.verify(token, SHARE_JWT_SECRET);
        const report = db.findReportById(decoded.reportId);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Referenced medical report no longer exists.' });
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        const remainingSeconds = decoded.exp - nowSeconds;

        db.logAudit(
            'SHARED_LINK_ACCESSED',
            'Consulting Doctor (via Shared Link)',
            `Accessed shared report ${report.reportId} with token. Time remaining: ${remainingSeconds}s`
        );

        return res.json({
            success: true,
            status: 'VALID',
            remainingSeconds,
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
            report: {
                reportId: report.reportId,
                title: report.title,
                reportType: report.reportType,
                patientName: report.patientName,
                patientPseudonym: report.patientPseudonym,
                testDate: report.testDate,
                notes: report.notes,
                keywords: report.keywords,
                categories: report.categories,
                fileName: report.fileName,
                fileSize: report.fileSize,
                blockIndex: report.blockIndex,
                blockHash: report.blockHash,
                rawSnippet: report.rawSnippet
            },
            context: {
                recipientDoctor: decoded.recipientDoctor,
                accessContext: decoded.accessContext
            }
        });

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            db.logAudit(
                'EXPIRED_LINK_ACCESS_REJECTED',
                'Unauthorized Visitor',
                `Attempted access using expired token (Expired at: ${err.expiredAt})`
            );

            return res.status(403).json({
                success: false,
                status: 'EXPIRED',
                message: 'SECURITY ACCESS DENIED: This secure sharing link has expired. The patient must grant a new temporary permission token.',
                expiredAt: err.expiredAt
            });
        }

        return res.status(401).json({
            success: false,
            status: 'INVALID_TOKEN',
            message: 'SECURITY ACCESS DENIED: Invalid or tampered access token signature.',
            error: err.message
        });
    }
}

/**
 * Stream decrypted content for valid shared token
 */
function downloadSharedReportFile(req, res) {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Missing token');
    }

    try {
        const decoded = jwt.verify(token, SHARE_JWT_SECRET);
        const report = db.findReportById(decoded.reportId);
        if (!report) return res.status(404).send('Report not found');

        const filePath = path.join(UPLOADS_DIR, report.storageReference);
        if (!fs.existsSync(filePath)) return res.status(404).send('Storage file not found');

        const encryptedData = fs.readFileSync(filePath);
        const decryptedBuffer = decryptBuffer(encryptedData);

        res.setHeader('Content-Type', report.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.fileName || 'report.pdf'}"`);
        res.setHeader('Content-Length', decryptedBuffer.length);
        return res.send(decryptedBuffer);

    } catch (err) {
        return res.status(403).send('Access Denied: Expired or invalid token');
    }
}

module.exports = {
    createExpiringShareLink,
    getSharedReport,
    downloadSharedReportFile
};
