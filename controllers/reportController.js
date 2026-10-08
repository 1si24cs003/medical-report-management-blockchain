const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../models/db');
const blockchain = require('../blockchain/Blockchain');
const { computeSHA256, encryptBuffer, decryptBuffer, generatePseudonymousId } = require('../utils/cryptoUtils');
const { processReportOCR } = require('../utils/ocrHelper');
const { generateClinicalHighlights } = require('../utils/aiSummarizer');
const { generateMedicalReportPDF } = require('../utils/pdfGenerator');

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
        if (user.role !== 'Lab Staff' && user.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${user.role}' cannot upload reports. Only Lab Staff are authorized to upload and anchor diagnostic reports to the blockchain.`
            });
        }
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

        // Step 3.5: AI CLINICAL HIGHLIGHTS & KEY FINDINGS SUMMARY (Feature 7.4 / Hybrid AI)
        const combinedText = [title, notes, ocrResult.rawSnippet, extractedKeywords.join(', ')].filter(Boolean).join('\n');
        const aiHighlights = await generateClinicalHighlights(combinedText, {
            title,
            patientName: targetPatient.name,
            reportType
        });

        // Step 4: PREPARE STANDARDIZED CLINICAL DOCUMENT BUFFER
        const reportId = generatePseudonymousId('REP');
        const hostUrl = req.protocol + '://' + req.get('host');
        const verificationUrl = `${hostUrl}/verify.html?reportId=${reportId}`;

        // QR Code Data URL for UI
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            color: { dark: '#0b132b', light: '#ffffff' }
        });

        let finalBuffer = rawBuffer;
        let finalMimeType = req.file.mimetype;
        let finalFileName = req.file.originalname;

        // If an image or text scan was uploaded, synthesize authentic NABH-certified clinical PDF with embedded QR
        if (req.file.mimetype.startsWith('image/') || req.file.mimetype === 'text/plain') {
            try {
                const reportStub = {
                    reportId,
                    title: title || 'Clinical Diagnostic Report',
                    patientName: targetPatient.name,
                    patientPseudonym: targetPatient.patientId || 'PT-' + targetPatient.id.slice(-4),
                    patientId: targetPatient.id,
                    age: targetPatient.age || 48,
                    gender: targetPatient.gender || 'Not Specified',
                    uploadedBy: user.name,
                    nodeId: nodeId || (user.role === 'Lab Staff' ? 'NODE-LAB-01' : 'NODE-HOSP-01'),
                    reportType: reportType || 'Diagnostic Investigation',
                    testDate: testDate || new Date().toISOString().split('T')[0],
                    notes: notes || '',
                    clinicalImpression: aiHighlights.diagnosticImpression,
                    aiHighlights,
                    rawSnippet: ocrResult.rawSnippet || '',
                    keywords: extractedKeywords,
                    blockIndex: (blockchain.chain.length)
                };
                const generatedPdf = await generateMedicalReportPDF(reportStub, hostUrl);
                if (generatedPdf && generatedPdf.length > 0) {
                    finalBuffer = generatedPdf;
                    finalMimeType = 'application/pdf';
                    finalFileName = `${reportId}_standardized.pdf`;
                }
            } catch (pdfErr) {
                console.warn('[Upload] Standardized PDF synthesis fallback:', pdfErr.message);
            }
        }

        // Step 5: OFF-CHAIN AES-256-CBC ENCRYPTION
        const finalDocumentHash = computeSHA256(finalBuffer);
        const encryptedBuffer = encryptBuffer(finalBuffer);
        const storageReference = `${reportId}_encrypted.bin`;
        const storagePath = path.join(UPLOADS_DIR, storageReference);
        fs.writeFileSync(storagePath, encryptedBuffer);

        // Step 6: RECORD ON PERMISSIONED BLOCKCHAIN
        const block = blockchain.addReportBlock({
            reportId,
            reportHash: finalDocumentHash,
            storageReference,
            reportType: reportType || 'Diagnostic Investigation',
            testDate: testDate || new Date().toISOString().split('T')[0],
            patientPseudonym: targetPatient.patientId || targetPatient.name,
            patientId: targetPatient.id
        }, nodeId || (user.role === 'Lab Staff' ? 'NODE-LAB-01' : 'NODE-HOSP-01'));

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
            aiHighlights,
            rawSnippet: ocrResult.rawSnippet || '',
            fileName: finalFileName,
            mimeType: finalMimeType,
            reportHash: finalDocumentHash,
            storageReference,
            fileSize: finalBuffer.length,
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
    if (user.role === 'Patient') {
        // Patient can only view their own diagnostic records
        if (query) {
            reports = db.searchReports(query, 'Patient', user.id);
        } else {
            reports = db.getReportsForPatient(user.id);
        }
    } else if (query) {
        reports = db.searchReports(query, user.role, patientId);
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
    let targetPatientId = req.params.patientId;
    
    // Strict privacy: Patient can ONLY view their own clinical timeline
    if (user.role === 'Patient') {
        targetPatientId = user.id;
    } else if (!targetPatientId) {
        targetPatientId = 'usr_pat_01';
    }

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

        const isInline = req.query.inline === 'true';
        const dispositionType = isInline ? 'inline' : 'attachment';
        const safeFileName = report.fileName || `${report.reportId}.pdf`;

        res.setHeader('Content-Type', report.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFileName}"`);
        res.setHeader('Content-Length', decryptedBuffer.length);
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

/**
 * Doctor Feature: Update clinical notes, diagnosis status, prescription, follow-up
 * Strictly restricted to Doctor (and Admin)
 */
function updateReport(req, res) {
    try {
        const user = req.user;
        const { reportId } = req.params;
        const { notes, diagnosisStatus, prescription, followUpDate } = req.body;

        if (user.role !== 'Doctor' && user.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: `Permission denied. Role '${user.role}' cannot modify clinical diagnostic records. Only authorized Doctors can update clinical evaluations.`
            });
        }

        const existingReport = db.findReportById(reportId);
        if (!existingReport) {
            return res.status(404).json({ success: false, message: 'Report not found in consortium database.' });
        }

        const updates = {};
        if (notes !== undefined) updates.notes = notes;
        if (diagnosisStatus !== undefined) updates.diagnosisStatus = diagnosisStatus;
        if (prescription !== undefined) updates.prescription = prescription;
        if (followUpDate !== undefined) updates.followUpDate = followUpDate;
        updates.doctorRemarks = {
            doctorName: user.name,
            doctorId: user.id,
            department: user.department || 'Attending Physician',
            hospital: user.hospital || 'Metro Apex Hospital',
            updatedAt: new Date().toISOString(),
            status: diagnosisStatus || existingReport.diagnosisStatus || 'Reviewed & Verified'
        };

        const updated = db.updateReport(reportId, updates);

        db.logAudit(
            'DOCTOR_CLINICAL_UPDATE',
            user.name,
            `Doctor updated diagnosis notes for report ${reportId} (Status: ${diagnosisStatus || 'Clinical Review Updated'})`
        );

        return res.json({
            success: true,
            message: `Clinical notes and diagnosis successfully updated by ${user.name}.`,
            report: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update report.', error: err.message });
    }
}

module.exports = {
    uploadReport,
    getReports,
    getPatientTimeline,
    getReportById,
    downloadDecryptedReport,
    searchReports,
    updateReport
};
