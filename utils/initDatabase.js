const path = require('path');
const fs = require('fs');
const db = require('../models/db');
const blockchain = require('../blockchain/Blockchain');

async function main() {
    console.log('[Init Database] Starting generation of authentic clinical PDF reports...');
    await db.seedInitialData();
    console.log('[Init Database] Database and blockchain ledger successfully generated with authentic PDFs!');
    console.log('[Init Database] Reports count:', db.getAllReports().length);
    console.log('[Init Database] Blockchain ledger length:', blockchain.chain.length);
    console.log('[Init Database] Blockchain validity check:', blockchain.isChainValid());

    // Verify all 4 files in uploads/
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadsDir);
    console.log('[Init Database] Files in uploads directory:', files);

    process.exit(0);
}

main().catch(err => {
    console.error('[Init Database] Error:', err);
    process.exit(1);
});
