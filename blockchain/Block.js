const crypto = require('crypto');

/**
 * Block data structure representing an immutable ledger entry
 */
class Block {
    /**
     * @param {number} index - Block height/sequence number
     * @param {string} timestamp - ISO timestamp
     * @param {object} data - Medical report blockchain metadata
     *   - reportId: pseudonymous report identifier (e.g. REP-8F3A29B1)
     *   - reportHash: SHA-256 digest of original diagnostic file
     *   - storageReference: pointer/UUID to off-chain encrypted file
     *   - institutionNode: Node identity (e.g. 'Apex Hospital Node', 'Central Lab Node')
     *   - uploaderRole: 'Doctor' | 'Lab Staff' | 'Hospital Admin'
     *   - metadata: non-sensitive metadata (e.g. reportType, testDate)
     * @param {string} previousHash - SHA-256 hash of the previous block
     */
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    /**
     * Calculates SHA-256 cryptographic hash of the block contents
     * @returns {string} Hexadecimal block hash
     */
    calculateHash() {
        const payload = this.index +
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.nonce;
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Lightweight proof-of-authority / consensus simulation for permissioned nodes
     * @param {number} difficulty 
     */
    mineBlock(difficulty = 2) {
        const target = Array(difficulty + 1).join('0');
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
    }
}

module.exports = Block;
