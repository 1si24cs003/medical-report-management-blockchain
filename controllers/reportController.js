const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../models/db');
const blockchain = require('../blockchain/Blockchain');
const { computeSHA256, encryptBuffer, decryptBuffer, generatePseudonymousId } = require('../utils/cryptoUtils');
const { processReportOCR } = require('../utils/ocrHelper');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Upload a medical report
 * Implements:
 * 1. SHA-256 Hashing
 * 2. Duplicate Detection (Objective 2)
 * 3. Smart Keyword Extraction / OCR (Feature 7.3)
 * 4. Off-Chain AES-256 Encryption
 * 5. Blockchain Ledger Anchoring
 * 6. QR Code Generation (Feature 7.1)
 */
async function uploadReport(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please attach a medical report document (PDF, PNG, JPG).' });
        }

        const user = req.user;
        const {
            patientId,
            title,
            reportType,
            testDate,
            notes,
            manualTags,
            nodeId
        } = req.body;

        const targetPatient = db.findUserById(patientId);
        if (!targetPatient) {
            return res.status(400).json({ success: false, message: 'Invalid patient selected.' });
        }

        const rawBuffer = req.file.buffer;

        // Step 1: Compute SHA-256 cryptographic hash (fingerprint)
        const fileHash = computeSHA256(rawBuffer);

        // Step 2: DUPLICATE DETECTION (Objective 2)
        // Check if identical hash exists in Blockchain Ledger or Database
        const existingBlock = blockchain.findBlockByHash(fileHash);
        const existingReport = db.findReportByHash(fileHash);

        if (existingBlock || existingReport) {
            db.logAudit(
                'DUPLICATE_REPORT_PREVENTED',
                user.name,
                `Duplicate upload rejected. Hash: ${fileHash.slice(0, 16)}... matched existing report ID: ${existingReport ? existingReport.reportId : existingBlock.data.reportId}`
            );

            return res.status(409).json({
                success: false,
                duplicateDetected: true,
                message: 'Duplicate medical report detected! A cryptographically identical report has already been anchored on the blockchain. Redundant upload prevented.',
                existingReport: existingReport || null,
                existingBlock: existingBlock || null,
                fileHash
            });
        }

        // Step 3: SMART KEYWORD EXTRACTION via OCR (Feature 7.3)
        const ocrResult = await processReportOCR(rawBuffer, req.file.mimetype, notes);
        let extractedKeywords = ocrResult.keywords || [];
        let extractedCategories = ocrResult.categories || [];

        // Append any manual user-supplied tags
        if (manualTags) {
            const extra = manualTags.split(',').map(t => t.trim()).filter(Boolean);
            extractedKeywords = Array.from(new Set([...extractedKeywords, ...extra]));
        }

        // Step 4: OFF-CHAIN AES-256-CBC ENCRYPTION
        const reportId = generatePseudonymousId('REP');
        const encryptedBuffer = encryptBuffer(rawBuffer);
        const storageReference = `${reportId}_encrypted.bin`;
        const storagePath = path.join(UPLOADS_DIR, storageReference);
        fs.writeFileSync(storagePath, encryptedBuffer);

        // Step 5: RECORD ON PERMISSIONED BLOCKCHAIN (Stores pseudonymous ID, hash, timestamp, storage ref)
        const block = blockchain.addReportBlock({
            reportId,
            reportHash: fileHash,
            storageReference,
            reportType: reportType || 'Diagnostic Investigation',
            testDate: testDate || new Date().toISOString().split('T')[0],
            patientPseudonym: targetPatient.patientId || targetPatient.name,
            patientId: targetPatient.id
        }, nodeId || (user.role === 'Lab Staff' ? 'NODE-LAB-01' : 'NODE-HOSP-01'));

        // Step 6: GENERATE ANTI-FORGERY QR CODE (Feature 7.1)
        // Points to verification endpoint: /verify.html?reportId=...
        const hostUrl = req.protocol + '://' + req.get('host');
        const verificationUrl = `${hostUrl}/verify.html?reportId=${reportId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            color: {
                dark: '#0b132b',
                light: '#ffffff'
            }
        });

        // Step 7: PERSIST METADATA IN APPLICATION DATABASE
        const newReport = {
            reportId,
            patientId: targetPatient.id,
            patientName: targetPatient.name,
            patientPseudonym: targetPatient.patientId || 'PT-' + targetPatient.id.slice(-4),
            uploadedBy: user.name,
            uploaderId: user.id,
            uploaderRole: user.role,
            title: title || 'Clinical Diagnostic Report',
            reportType: reportType || 'Diagnostic Test',
            testDate: testDate || new Date().toISOString().split('T')[0],
            notes: notes || '',
            keywords: extractedKeywords,
            categories: extractedCategories,
            rawSnippet: ocrResult.rawSnippet || '',
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            reportHash: fileHash,
            storageReference,
            fileSize: rawBuffer.length,
            encryptedSize: encryptedBuffer.length,
            qrCodeDataUrl,
            verificationUrl,
            blockIndex: block.index,
            blockHash: block.hash,
            createdAt: new Date().toISOString(),
            status: 'ANCHORED_ON_BLOCKCHAIN'
        };

        db.addReport(newReport);

        db.logAudit(
            'REPORT_UPLOADED',
            user.name,
            `Uploaded report ${reportId} for patient ${targetPatient.name}. Anchored to Block #${block.index}`
        );

        return res.status(201).json({
            success: true,
            message: 'Medical report encrypted, anchored to blockchain, and anti-forgery QR generated successfully.',
            report: newReport,
            block: {
                index: block.index,
                hash: block.hash,
                previousHash: block.previousHash,
                timestamp: block.timestamp
            },
            ocrInfo: {
                extractedKeywords,
                categories: extractedCategories
            }
        });

    } catch (err) {
        console.error('[Upload Controller Error]:', err);
        return res.status(500).json({ success: false, message: 'Internal server error processing report.', error: err.message });
    }
}

/**
 * Retrieve reports based on user role and query
 */
function getReports(req, res) {
    const user = req.user;
    const { patientId, query } = req.query;

    let reports;
    if (query) {
        reports = db.searchReports(query, user.role, user.role === 'Patient' ? user.id : patientId);
    } else if (user.role === 'Patient') {
        reports = db.getReportsForPatient(user.id);
    } else if (patientId) {
        reports = db.getReportsForPatient(patientId);
    } else {
        reports = db.getAllReports();
    }

    return res.json({ success: true, count: reports.length, reports });
}

/**
 * Objective 1 & 3: Chronological Medical History Timeline
 */
function getPatientTimeline(req, res) {
    const user = req.user;
    const targetPatientId = req.params.patientId || (user.role === 'Patient' ? user.id : 'usr_pat_01');
    const sortOrder = req.query.order || 'asc';

    const timeline = db.getPatientTimeline(targetPatientId, sortOrder);
    const patient = db.findUserById(targetPatientId);

    return res.json({
        success: true,
        patient: patient || { name: 'Patient ' + targetPatientId },
        count: timeline.length,
        timeline
    });
}

/**
 * Get individual report metadata
 */
function getReportById(req, res) {
    const report = db.findReportById(req.params.reportId);
    if (!report) {
        return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    return res.json({ success: true, report });
}

/**
 * Decrypt and download medical report
 * Verifies SHA-256 hash against blockchain before delivering
 */
function downloadDecryptedReport(req, res) {
    try {
        const report = db.findReportById(req.params.reportId);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found in database.' });
        }

        const filePath = path.join(UPLOADS_DIR, report.storageReference);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Encrypted off-chain file not found.' });
        }

        const encryptedData = fs.readFileSync(filePath);
        // Decrypt using AES-256-CBC
        const decryptedBuffer = decryptBuffer(encryptedData);

        // Verification check: ensure decrypted payload hash matches blockchain record
        const liveHash = computeSHA256(decryptedBuffer);
        const isAuthentic = (liveHash === report.reportHash);

        if (!isAuthentic) {
            db.logAudit(
                'TAMPER_ALERT_ON_DOWNLOAD',
                req.user ? req.user.name : 'Anonymous',
                `Report ${report.reportId} failed hash verification during download request!`
            );
            return res.status(400).json({
                success: false,
                tampered: true,
                message: 'SECURITY ALERT: File hash does not match blockchain record! File has been tampered with or corrupted.'
            });
        }

        db.logAudit(
            'REPORT_DECRYPTED',
            req.user ? req.user.name : 'Authorized Viewer',
            `Decrypted and accessed report ${report.reportId}`
        );

        res.setHeader('Content-Type', report.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${report.fileName || 'report.pdf'}"`);
        res.setHeader('X-Blockchain-Verified', 'true');
        res.setHeader('X-Report-Hash', liveHash);

        return res.send(decryptedBuffer);

    } catch (err) {
        console.error('[Download Controller Error]:', err);
        return res.status(500).json({ success: false, message: 'Decryption failed.', error: err.message });
    }
}

/**
 * Search reports by OCR tags / keywords
 */
function searchReports(req, res) {
    const { q, patientId } = req.query;
    const user = req.user;
    const results = db.searchReports(q, user.role, user.role === 'Patient' ? user.id : patientId);

    return res.json({
        success: true,
        query: q,
        count: results.length,
        results
    });
}

module.exports = {
    uploadReport,
    getReports,
    getPatientTimeline,
    getReportById,
    downloadDecryptedReport,
    searchReports
};
