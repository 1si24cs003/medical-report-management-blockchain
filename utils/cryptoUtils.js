const crypto = require('crypto');

// Default 256-bit encryption key (32 bytes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'med-blockchain-sec-key-32bytes!'; // 32 characters
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 16 bytes for AES

/**
 * Computes SHA-256 cryptographic hash (fingerprint) of a file or string buffer
 * @param {Buffer|string} data 
 * @returns {string} Hexadecimal SHA-256 hash
 */
function computeSHA256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Encrypts raw medical report file using AES-256-CBC for off-chain storage
 * Prepends the 16-byte random IV to the encrypted payload for seamless retrieval
 * @param {Buffer} buffer 
 * @param {string} [key] 
 * @returns {Buffer} Encrypted buffer (IV + Ciphertext)
 */
function encryptBuffer(buffer, key = ENCRYPTION_KEY) {
    const safeKey = crypto.createHash('sha256').update(key).digest(); // Ensure exact 32 bytes
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, safeKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    // Store IV along with encrypted payload
    return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypts an AES-256-CBC encrypted buffer
 * @param {Buffer} encryptedBuffer 
 * @param {string} [key] 
 * @returns {Buffer} Decrypted plaintext buffer
 */
function decryptBuffer(encryptedBuffer, key = ENCRYPTION_KEY) {
    const safeKey = crypto.createHash('sha256').update(key).digest();
    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const ciphertext = encryptedBuffer.subarray(IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, safeKey, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Generates pseudonymous report ID (e.g., REP-8F3A29B1)
 */
function generatePseudonymousId(prefix = 'REP') {
    const randHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${randHex}`;
}

module.exports = {
    computeSHA256,
    encryptBuffer,
    decryptBuffer,
    generatePseudonymousId,
    ENCRYPTION_KEY
};
