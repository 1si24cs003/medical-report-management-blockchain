const fs = require('fs');
const path = require('path');
const Block = require('./Block');

const LEDGER_FILE_PATH = path.join(__dirname, '..', 'data', 'ledger.json');

/**
 * Permissioned Blockchain Ledger for Medical Report Anchoring
 */
class Blockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 2; // Fast mining for permissioned network
        this.nodeNodes = [
            { id: 'NODE-HOSP-01', name: 'Metro Apex Hospital Node', type: 'Hospital' },
            { id: 'NODE-LAB-01', name: 'Pathology Diagnostics Lab Node', type: 'Lab' },
            { id: 'NODE-CLINIC-01', name: 'City Care Clinic Node', type: 'Clinic' },
            { id: 'NODE-PHARM-01', name: 'CareFirst Pharmacy Node', type: 'Pharmacy' }
        ];
        this.loadChain();
    }

    /**
     * Creates genesis block for the health consortium
     */
    createGenesisBlock() {
        return new Block(
            0,
            '2026-10-01T00:00:00.000Z',
            {
                message: 'Genesis Block - Healthcare Consortium Permissioned Ledger Initialized',
                network: 'HealthChain Consortium v1.0',
                nodes: this.nodeNodes.map(n => n.name)
            },
            '0000000000000000000000000000000000000000000000000000000000000000'
        );
    }

    /**
     * Loads ledger from persistent disk, or initializes genesis
     */
    loadChain() {
        try {
            const dataDir = path.dirname(LEDGER_FILE_PATH);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            if (fs.existsSync(LEDGER_FILE_PATH)) {
                const raw = fs.readFileSync(LEDGER_FILE_PATH, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.chain = parsed.map(b => {
                        const block = new Block(b.index, b.timestamp, b.data, b.previousHash);
                        block.hash = b.hash;
                        block.nonce = b.nonce;
                        return block;
                    });
                    return;
                }
            }
        } catch (e) {
            console.warn('[Blockchain] Error loading ledger file, recreating genesis:', e.message);
        }

        // Initialize with Genesis block
        const genesis = this.createGenesisBlock();
        genesis.mineBlock(this.difficulty);
        this.chain = [genesis];
        this.saveChain();
    }

    /**
     * Persists chain to disk
     */
    saveChain() {
        try {
            const dataDir = path.dirname(LEDGER_FILE_PATH);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(LEDGER_FILE_PATH, JSON.stringify(this.chain, null, 2), 'utf8');
        } catch (e) {
            console.error('[Blockchain] Failed to save ledger:', e.message);
        }
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Mines and appends a new block for a medical report
     * @param {object} reportPayload 
     * @param {string} [nodeId] 
     * @returns {Block} Newly added block
     */
    addReportBlock(reportPayload, nodeId = 'NODE-HOSP-01') {
        const latestBlock = this.getLatestBlock();
        const selectedNode = this.nodeNodes.find(n => n.id === nodeId) || this.nodeNodes[0];

        const blockData = {
            reportId: reportPayload.reportId,
            reportHash: reportPayload.reportHash,
            storageReference: reportPayload.storageReference,
            reportType: reportPayload.reportType,
            testDate: reportPayload.testDate || new Date().toISOString().split('T')[0],
            patientPseudonym: reportPayload.patientPseudonym || 'PT-' + reportPayload.patientId.slice(-4),
            institutionNode: selectedNode.name,
            nodeId: selectedNode.id,
            recordedAt: new Date().toISOString()
        };

        const newBlock = new Block(
            this.chain.length,
            new Date().toISOString(),
            blockData,
            latestBlock.hash
        );

        newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
        this.saveChain();
        return newBlock;
    }

    /**
     * Finds block by report SHA-256 hash (used for Duplicate Detection)
     * @param {string} sha256Hash 
     * @returns {Block|null}
     */
    findBlockByHash(sha256Hash) {
        for (let i = 1; i < this.chain.length; i++) {
            if (this.chain[i].data && this.chain[i].data.reportHash === sha256Hash) {
                return this.chain[i];
            }
        }
        return null;
    }

    /**
     * Finds block by pseudonymous Report ID
     * @param {string} reportId 
     * @returns {Block|null}
     */
    findBlockByReportId(reportId) {
        for (let i = 1; i < this.chain.length; i++) {
            if (this.chain[i].data && this.chain[i].data.reportId === reportId) {
                return this.chain[i];
            }
        }
        return null;
    }

    /**
     * Full chain verification: checks cryptographic linkages and recomputed block hashes
     * @returns {{ isValid: boolean, error?: string, brokenBlockIndex?: number }}
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Verify current block's hash matches calculated hash
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return {
                    isValid: false,
                    error: `Tampering detected at Block #${currentBlock.index}! Recalculated hash does not match block hash.`,
                    brokenBlockIndex: currentBlock.index
                };
            }

            // Verify previous hash pointer
            if (currentBlock.previousHash !== previousBlock.hash) {
                return {
                    isValid: false,
                    error: `Broken chain link at Block #${currentBlock.index}! previousHash (${currentBlock.previousHash.slice(0, 16)}...) does not match Block #${previousBlock.index} hash (${previousBlock.hash.slice(0, 16)}...).`,
                    brokenBlockIndex: currentBlock.index
                };
            }
        }
        return { isValid: true };
    }

    /**
     * Live Tamper Simulation (for evaluation panel demonstration)
     * Alters data in block at index to show how the blockchain immediately catches it!
     */
    simulateTampering(blockIndex, fakeHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
        if (blockIndex <= 0 || blockIndex >= this.chain.length) {
            throw new Error('Invalid block index for tamper demonstration');
        }
        const block = this.chain[blockIndex];
        block.data.reportHash = fakeHash;
        block.data.tampered = true;
        this.saveChain();
        return block;
    }

    /**
     * Restores chain from original valid state or recalculates
     */
    repairOrReset() {
        this.loadChain();
        return this.isChainValid();
    }
}

// Singleton blockchain instance
const blockchainInstance = new Blockchain();

module.exports = blockchainInstance;
