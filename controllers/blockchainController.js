const blockchain = require('../blockchain/Blockchain');
const db = require('../models/db');

function getBlockchainLedger(req, res) {
    const chainValidation = blockchain.isChainValid();
    return res.json({
        success: true,
        chainLength: blockchain.chain.length,
        isChainValid: chainValidation.isValid,
        validationDetails: chainValidation,
        chain: blockchain.chain,
        nodes: blockchain.nodeNodes
    });
}

function verifyBlockchain(req, res) {
    const result = blockchain.isChainValid();
    db.logAudit(
        'BLOCKCHAIN_INTEGRITY_AUDIT',
        req.user ? req.user.name : 'System Auditor',
        `Full chain integrity verification: ${result.isValid ? 'VALID' : 'BROKEN'}`
    );
    return res.json({
        success: true,
        isValid: result.isValid,
        details: result
    });
}

function simulateTamper(req, res) {
    try {
        const { blockIndex, maliciousHash } = req.body;
        const targetIndex = parseInt(blockIndex, 10) || 1;

        if (targetIndex >= blockchain.chain.length) {
            return res.status(400).json({ success: false, message: 'Block index does not exist in chain.' });
        }

        const tamperedBlock = blockchain.simulateTampering(targetIndex, maliciousHash);
        const validation = blockchain.isChainValid();

        db.logAudit(
            'DEMO_BLOCK_TAMPERED',
            req.user ? req.user.name : 'Evaluator Demo',
            `Deliberate hash modification injected into Block #${targetIndex} to test tamper-evident consensus.`
        );

        return res.json({
            success: true,
            tamperedBlockIndex: targetIndex,
            message: `Block #${targetIndex} hash tampered with! Verification now detects broken integrity.`,
            tamperedBlock,
            validationAfterTampering: validation
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Tamper simulation failed.', error: err.message });
    }
}

function restoreLedger(req, res) {
    db.seedInitialData();
    blockchain.loadChain();
    return res.json({
        success: true,
        message: 'Consortium blockchain ledger successfully restored to verified state.',
        isValid: blockchain.isChainValid().isValid
    });
}

function getSystemStats(req, res) {
    const allReports = db.getAllReports();
    const allUsers = db.getAllUsers();
    const auditLogs = db.getAuditLogs();
    const chainValidation = blockchain.isChainValid();

    const duplicatesPrevented = auditLogs.filter(l => l.action === 'DUPLICATE_REPORT_PREVENTED').length;
    const verifiedChecks = auditLogs.filter(l => l.action === 'ANTI_FORGERY_VERIFICATION').length;

    return res.json({
        success: true,
        stats: {
            totalReports: allReports.length,
            totalBlocks: blockchain.chain.length,
            totalPatients: allUsers.filter(u => u.role === 'Patient').length,
            totalDoctors: allUsers.filter(u => u.role === 'Doctor').length,
            totalLabStaff: allUsers.filter(u => u.role === 'Lab Staff').length,
            activeNodes: blockchain.nodeNodes.length,
            duplicatesPrevented,
            verifiedChecks,
            isBlockchainValid: chainValidation.isValid
        },
        nodes: blockchain.nodeNodes
    });
}

function getAuditLogs(req, res) {
    return res.json({
        success: true,
        logs: db.getAuditLogs()
    });
}

module.exports = {
    getBlockchainLedger,
    verifyBlockchain,
    simulateTamper,
    restoreLedger,
    getSystemStats,
    getAuditLogs
};
