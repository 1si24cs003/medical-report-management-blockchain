const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../models/db');
const blockchain = require('../blockchain/Blockchain');
const { computeSHA256, decryptBuffer } = require('../utils/cryptoUtils');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Feature 7.1: Get QR Code Data for a Report
 */
async function getReportQRCode(req, res) {
    try {
        const { reportId } = req.params;
        const report = db.findReportById(reportId);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        const hostUrl = req.protocol + '://' + req.get('host');
        const verificationUrl = `${hostUrl}/verify.html?reportId=${reportId}`;

        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 320,
            color: {
                dark: '#002B49',
                light: '#FFFFFF'
            }
        });

        return res.json({
            success: true,
            reportId,
            verificationUrl,
            qrDataUrl,
            anchoredHash: report.reportHash,
            blockIndex: report.blockIndex
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error generating QR code.', error: err.message });
    }
}

/**
 * Feature 7.1: Live Blockchain Anti-Forgery Verification Endpoint
 * Compares current file hash against blockchain-anchored hash
 * Returns MATCH or MISMATCH
 */
async function verifyReportIntegrity(req, res) {
    try {
        const { reportId } = req.params;
        const report = db.findReportById(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                status: 'NOT_FOUND',
                message: `Report ID '${reportId}' not found in the consortium records.`
            });
        }

        // Retrieve block from blockchain
        const block = blockchain.findBlockByReportId(reportId) || blockchain.chain[report.blockIndex];
        if (!block) {
            return res.status(404).json({
                success: false,
                status: 'BLOCKCHAIN_RECORD_MISSING',
                message: 'No corresponding block found on the blockchain ledger.'
            });
        }

        const anchoredHash = block.data.reportHash || report.reportHash;

        // Check if an external file was provided for verification (Doctor re-uploads suspected file)
        let liveHash;
        let fileSource = 'Off-Chain Encrypted Storage';

        if (req.file && req.file.buffer) {
            liveHash = computeSHA256(req.file.buffer);
            fileSource = 'Directly Provided File Upload';
        } else {
            // Read off-chain encrypted file and decrypt
            const filePath = path.join(UPLOADS_DIR, report.storageReference);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    status: 'STORAGE_FILE_MISSING',
                    message: 'Off-chain encrypted document file is missing.'
                });
            }

            const encryptedData = fs.readFileSync(filePath);
            const decryptedBuffer = decryptBuffer(encryptedData);
            liveHash = computeSHA256(decryptedBuffer);
        }

        const isMatch = (liveHash.toLowerCase() === anchoredHash.toLowerCase());

        db.logAudit(
            'ANTI_FORGERY_VERIFICATION',
            req.user ? req.user.name : 'Doctor / Verification Scanner',
            `Verification check on ${reportId}: ${isMatch ? 'MATCH (Authentic)' : 'MISMATCH (Tampered)'}`
        );

        return res.json({
            success: true,
            status: isMatch ? 'MATCH' : 'MISMATCH',
            isAuthentic: isMatch,
            reportId: report.reportId,
            patientName: report.patientName,
            patientPseudonym: report.patientPseudonym,
            reportType: report.reportType,
            testDate: report.testDate,
            fileSource,
            liveComputedHash: liveHash,
            anchoredBlockchainHash: anchoredHash,
            blockchainDetails: {
                blockIndex: block.index,
                blockHash: block.hash,
                previousHash: block.previousHash,
                timestamp: block.timestamp,
                institutionNode: block.data.institutionNode
            },
            verificationMessage: isMatch 
                ? 'MATCH: The diagnostic report is authentic and exactly consistent with the immutable blockchain-anchored fingerprint.'
                : 'MISMATCH: Cryptographic fingerprint differs! The report has been tampered with or modified since anchoring on the blockchain.'
        });

    } catch (err) {
        console.error('[Verification Controller Error]:', err);
        return res.status(500).json({ success: false, message: 'Verification error.', error: err.message });
    }
}

/**
 * Live Demonstration Helper: Tamper with Off-Chain File
 * Modifies 1 byte in the encrypted storage file to show live panel how verification triggers MISMATCH
 */
function tamperOffChainFile(req, res) {
    try {
        const { reportId } = req.params;
        const report = db.findReportById(reportId);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        const filePath = path.join(UPLOADS_DIR, report.storageReference);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Off-chain file not found.' });
        }

        // Intentionally corrupt bytes to simulate unauthorized tampering
        const data = fs.readFileSync(filePath);
        // Flip bits in the data payload
        data[25] = data[25] ^ 0xFF;
        data[26] = data[26] ^ 0xAA;
        fs.writeFileSync(filePath, data);

        db.logAudit(
            'DEMO_FILE_TAMPER_INJECTED',
            'Evaluator / Demo Console',
            `Injected deliberate tampering in off-chain file for ${reportId} to demonstrate blockchain mismatch detection.`
        );

        return res.json({
            success: true,
            tampered: true,
            message: `Deliberate byte corruption injected into off-chain file '${report.storageReference}'. Run verification now to see blockchain detect the tampering!`,
            reportId
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: 'Tamper simulation failed.', error: err.message });
    }
}

module.exports = {
    getReportQRCode,
    verifyReportIntegrity,
    tamperOffChainFile
};
