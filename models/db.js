const fs = require('fs');
const path = require('path');
const { SAMPLE_USERS, createSeedReports } = require('../utils/seedData');
const blockchain = require('../blockchain/Blockchain');

const DB_FILE_PATH = path.join(__dirname, '..', 'data', 'database.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

class Database {
    constructor() {
        this.users = [];
        this.reports = [];
        this.sharedLinks = [];
        this.auditLogs = [];
        this.init();
    }

    init() {
        const dataDir = path.dirname(DB_FILE_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }

        if (fs.existsSync(DB_FILE_PATH)) {
            try {
                const data = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf8'));
                this.users = data.users || [];
                this.reports = data.reports || [];
                this.sharedLinks = data.sharedLinks || [];
                this.auditLogs = data.auditLogs || [];
            } catch (err) {
                console.warn('[Database] Read error, resetting db:', err.message);
                this.seedInitialData();
            }
        } else {
            this.seedInitialData();
        }

        // If reports were empty, seed them
        if (this.reports.length === 0) {
            this.seedInitialData();
        }
    }

    seedInitialData() {
        console.log('[Database] Seeding initial users and clinical records...');
        this.users = [...SAMPLE_USERS];
        const seedReports = createSeedReports(UPLOADS_DIR);

        // Anchor seed reports to the blockchain ledger if not already anchored
        for (const rep of seedReports) {
            let existingBlock = blockchain.findBlockByHash(rep.reportHash);
            if (!existingBlock) {
                const block = blockchain.addReportBlock({
                    reportId: rep.reportId,
                    reportHash: rep.reportHash,
                    storageReference: rep.storageReference,
                    reportType: rep.reportType,
                    testDate: rep.testDate,
                    patientPseudonym: rep.patientPseudonym,
                    patientId: rep.patientId
                }, rep.uploaderRole === 'Doctor' ? 'NODE-HOSP-01' : 'NODE-LAB-01');

                rep.blockIndex = block.index;
                rep.blockHash = block.hash;
            } else {
                rep.blockIndex = existingBlock.index;
                rep.blockHash = existingBlock.hash;
            }
        }

        this.reports = seedReports;
        this.auditLogs = [
            {
                id: 'log_01',
                action: 'SYSTEM_INITIALIZATION',
                details: 'Healthcare Consortium Blockchain Ledger and Database Initialized',
                timestamp: new Date().toISOString(),
                actor: 'Consortium SuperAdmin'
            }
        ];
        this.persist();
    }

    persist() {
        try {
            const payload = {
                users: this.users,
                reports: this.reports,
                sharedLinks: this.sharedLinks,
                auditLogs: this.auditLogs
            };
            fs.writeFileSync(DB_FILE_PATH, JSON.stringify(payload, null, 2), 'utf8');
        } catch (e) {
            console.error('[Database] Failed to persist:', e.message);
        }
    }

    // --- Users ---
    findUserById(id) {
        return this.users.find(u => u.id === id);
    }

    findUserByEmail(email) {
        return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    getAllUsers() {
        return this.users;
    }

    // --- Reports ---
    getAllReports() {
        return this.reports;
    }

    findReportById(id) {
        return this.reports.find(r => r.reportId === id || r.id === id);
    }

    findReportByHash(hash) {
        return this.reports.find(r => r.reportHash === hash);
    }

    getReportsForPatient(patientId) {
        return this.reports.filter(r => r.patientId === patientId || r.patientPseudonym === patientId);
    }

    /**
     * Chronological Timeline: returns reports sorted by testDate ascending/descending
     */
    getPatientTimeline(patientId, sortOrder = 'asc') {
        const patientReports = this.getReportsForPatient(patientId);
        return patientReports.sort((a, b) => {
            const dateA = new Date(a.testDate || a.createdAt);
            const dateB = new Date(b.testDate || b.createdAt);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }

    /**
     * Search reports by keyword / clinical tag / text query
     */
    searchReports(query, role = 'Doctor', patientId = null) {
        const q = (query || '').toLowerCase().trim();
        let list = this.reports;

        if (role === 'Patient' && patientId) {
            list = list.filter(r => r.patientId === patientId);
        }

        if (!q) return list;

        return list.filter(r => {
            const titleMatch = r.title && r.title.toLowerCase().includes(q);
            const notesMatch = r.notes && r.notes.toLowerCase().includes(q);
            const patientMatch = r.patientName && r.patientName.toLowerCase().includes(q);
            const tagMatch = r.keywords && r.keywords.some(k => k.toLowerCase().includes(q));
            const categoryMatch = r.categories && r.categories.some(c => c.toLowerCase().includes(q));
            const reportIdMatch = r.reportId && r.reportId.toLowerCase().includes(q);
            return titleMatch || notesMatch || patientMatch || tagMatch || categoryMatch || reportIdMatch;
        });
    }

    addReport(reportData) {
        this.reports.unshift(reportData);
        this.persist();
        return reportData;
    }

    updateReport(reportId, updates) {
        const idx = this.reports.findIndex(r => r.reportId === reportId);
        if (idx !== -1) {
            this.reports[idx] = { ...this.reports[idx], ...updates };
            this.persist();
            return this.reports[idx];
        }
        return null;
    }

    // --- Time-Expiring Shared Access Links ---
    addSharedLink(linkData) {
        this.sharedLinks.push(linkData);
        this.persist();
        return linkData;
    }

    findSharedLinkByToken(token) {
        return this.sharedLinks.find(l => l.token === token);
    }

    // --- Audit Logs ---
    logAudit(action, actor, details) {
        const entry = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            action,
            actor,
            details,
            timestamp: new Date().toISOString()
        };
        this.auditLogs.unshift(entry);
        if (this.auditLogs.length > 200) {
            this.auditLogs.pop();
        }
        this.persist();
        return entry;
    }

    getAuditLogs() {
        return this.auditLogs;
    }
}

const dbInstance = new Database();
module.exports = dbInstance;
