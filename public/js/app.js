// HealthChain Main Application Client Engine
let currentUser = {
    id: 'usr_doc_01',
    name: 'Dr. Sarah Rao',
    role: 'Doctor',
    department: 'Cardiology & General Medicine'
};

let allReportsCache = [];
let activeTagFilter = '';
let currentVerificationUrl = '';
let currentShareUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUploadDropzone();
    initSearch();
    loadStats();
    loadReports();
    loadTimeline();
    loadBlockchain();
    loadAuditLogs();

    // Default test date to today
    const dateInput = document.getElementById('uploadDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
});

// ==========================================
// 1. ROLE SWITCHING & AUTHENTICATION
// ==========================================
const USERS_MAP = {
    'usr_doc_01': {
        id: 'usr_doc_01',
        name: 'Dr. Sarah Rao',
        role: 'Doctor',
        desc: 'Department of Cardiology • Metro Apex Hospital',
        avatar: '👨‍⚕️'
    },
    'usr_lab_01': {
        id: 'usr_lab_01',
        name: 'Alex Smith',
        role: 'Lab Staff',
        desc: 'Senior Technologist • Pathology Diagnostics Lab',
        avatar: '🔬'
    },
    'usr_pat_01': {
        id: 'usr_pat_01',
        name: 'John Doe',
        role: 'Patient',
        desc: 'Patient ID: PT-9901 • Blood Group: O+',
        avatar: '👤'
    },
    'usr_adm_01': {
        id: 'usr_adm_01',
        name: 'Consortium SuperAdmin',
        role: 'Admin',
        desc: 'Healthcare Consortium Blockchain Authority',
        avatar: '🛡️'
    }
};

function switchUser(userId) {
    const user = USERS_MAP[userId];
    if (!user) return;
    currentUser = user;

    // Update active button state
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-user-id') === userId);
    });

    // Update Banner
    document.getElementById('userAvatar').textContent = user.avatar;
    document.getElementById('userNameDisplay').textContent = user.name;
    document.getElementById('userRoleDisplay').textContent = user.desc;

    // Auto-adjust timeline patient if patient role is active
    if (user.role === 'Patient') {
        const select = document.getElementById('timelinePatientSelect');
        if (select) select.value = userId;
    }

    // Refresh views with new role context
    loadReports();
    loadTimeline();
}

function getAuthHeaders() {
    return {
        'x-demo-user-id': currentUser.id
    };
}

// ==========================================
// 2. TAB NAVIGATION
// ==========================================
function initTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');

            if (targetId === 'blockchainTab') loadBlockchain();
            if (targetId === 'auditTab') loadAuditLogs();
            if (targetId === 'timelineTab') loadTimeline();
        });
    });
}

// ==========================================
// 3. STATS & SYSTEM METRICS
// ==========================================
async function loadStats() {
    try {
        const res = await fetch('/api/blockchain/stats', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.stats) {
            document.getElementById('metricReports').textContent = data.stats.totalReports;
            document.getElementById('metricBlocks').textContent = data.stats.totalBlocks;
            document.getElementById('metricDuplicates').textContent = data.stats.duplicatesPrevented;
            
            const statusEl = document.getElementById('metricChainStatus');
            if (data.stats.isBlockchainValid) {
                statusEl.textContent = 'VALID';
                statusEl.style.color = 'var(--accent-success)';
            } else {
                statusEl.textContent = 'TAMPERED';
                statusEl.style.color = 'var(--accent-danger)';
            }
        }
    } catch (e) {
        console.warn('Failed to load stats:', e.message);
    }
}

// ==========================================
// 4. MEDICAL REPORTS ARCHIVE & OCR SEARCH
// ==========================================
async function loadReports() {
    try {
        const res = await fetch('/api/reports', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
            allReportsCache = data.reports || [];
            document.getElementById('recordsCountBadge').textContent = allReportsCache.length;
            renderReports(allReportsCache);
        }
    } catch (err) {
        console.error('Error loading reports:', err);
    }
}

function renderReports(reports) {
    const grid = document.getElementById('reportsGrid');
    grid.innerHTML = '';

    let filtered = reports;
    if (activeTagFilter) {
        filtered = filtered.filter(r => 
            (r.keywords && r.keywords.some(k => k.toLowerCase().includes(activeTagFilter.toLowerCase()))) ||
            (r.title && r.title.toLowerCase().includes(activeTagFilter.toLowerCase()))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📁</div>
                <h4>No diagnostic records found</h4>
                <p style="font-size: 0.85rem;">Try changing your filter keyword or upload a new test report.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(r => {
        const card = document.createElement('div');
        card.className = 'report-card';

        const tagsHtml = (r.keywords || []).slice(0, 4).map(k => `<span class="tag-badge">${escapeHtml(k)}</span>`).join('');

        card.innerHTML = `
            <div>
                <div class="report-card-top">
                    <span class="report-id-badge">${escapeHtml(r.reportId)}</span>
                    <span class="report-date">${escapeHtml(r.testDate || '')}</span>
                </div>
                <h4 class="report-title">${escapeHtml(r.title)}</h4>
                <p class="report-meta">
                    Patient: <strong>${escapeHtml(r.patientName)}</strong> (${escapeHtml(r.patientPseudonym)})<br>
                    <span style="color: var(--text-muted); font-size: 0.78rem;">Anchored on Block #${r.blockIndex} • ${escapeHtml(r.reportType)}</span>
                </p>
                <div class="report-tags">
                    ${tagsHtml}
                </div>
            </div>

            <div class="report-actions">
                <button class="btn btn-primary" onclick="openReportModal('${escapeHtml(r.reportId)}')">
                    👁️ View Decrypted
                </button>
                <button class="btn btn-qr" onclick="openQrModal('${escapeHtml(r.reportId)}')">
                    🔍 Verify QR
                </button>
                <button class="btn btn-share" onclick="openShareModal('${escapeHtml(r.reportId)}', '${escapeHtml(r.title)}')">
                    ⏱️ Share
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function initSearch() {
    const input = document.getElementById('reportSearchInput');
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderReports(allReportsCache);
            return;
        }

        const filtered = allReportsCache.filter(r => {
            const title = (r.title || '').toLowerCase();
            const patient = (r.patientName || '').toLowerCase();
            const tags = (r.keywords || []).map(k => k.toLowerCase()).join(' ');
            const id = (r.reportId || '').toLowerCase();
            return title.includes(query) || patient.includes(query) || tags.includes(query) || id.includes(query);
        });

        renderReports(filtered);
    });
}

function filterByTag(tag) {
    activeTagFilter = tag;
    document.querySelectorAll('.filter-tag-chip').forEach(c => {
        c.classList.toggle('active', c.textContent.toLowerCase().includes(tag.toLowerCase()) || (!tag && c.textContent.includes('All')));
    });
    renderReports(allReportsCache);
}

// ==========================================
// 5. CHRONOLOGICAL TIMELINE (Obj 1 & 3)
// ==========================================
async function loadTimeline() {
    const patientSelect = document.getElementById('timelinePatientSelect');
    const patientId = patientSelect ? patientSelect.value : 'usr_pat_01';
    const container = document.getElementById('timelineEntries');

    try {
        const res = await fetch(`/api/reports/timeline/${encodeURIComponent(patientId)}`, { headers: getAuthHeaders() });
        const data = await res.json();

        container.innerHTML = '';
        if (!data.success || !data.timeline || data.timeline.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); margin-left: 20px;">No historical records found for this patient.</p>';
            return;
        }

        data.timeline.forEach((item, idx) => {
            const entry = document.createElement('div');
            entry.className = 'timeline-entry';

            const tags = (item.keywords || []).map(k => `<span class="tag-badge">${escapeHtml(k)}</span>`).join('');

            entry.innerHTML = `
                <div class="timeline-node"></div>
                <div class="timeline-card">
                    <div class="timeline-card-header">
                        <div>
                            <span class="report-id-badge">${escapeHtml(item.reportId)}</span>
                            <strong style="margin-left: 8px; font-size: 1.05rem;">${escapeHtml(item.title)}</strong>
                        </div>
                        <span class="timeline-date-badge">📅 Test Date: ${escapeHtml(item.testDate)}</span>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0;">
                        ${escapeHtml(item.notes || 'Routine clinical investigation.')}
                    </p>
                    <div style="display: flex; gap: 0.35rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                        ${tags}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.75rem;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">
                            Ledger Anchor: <strong>Block #${item.blockIndex}</strong> (${item.blockHash ? item.blockHash.slice(0, 16) + '...' : ''})
                        </span>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" onclick="openReportModal('${escapeHtml(item.reportId)}')">View Report</button>
                            <button class="btn btn-qr" onclick="openQrModal('${escapeHtml(item.reportId)}')">Anti-Forgery QR</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(entry);
        });

    } catch (e) {
        console.error('Timeline error:', e);
    }
}

// ==========================================
// 6. UPLOAD & DUPLICATE DETECTION (Obj 2)
// ==========================================
let selectedUploadFile = null;

function initUploadDropzone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('dropFileName');
    const form = document.getElementById('uploadForm');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    function handleFileSelect(file) {
        selectedUploadFile = file;
        fileNameDisplay.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        dropZone.style.borderColor = 'var(--accent-cyan)';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedUploadFile) {
            alert('Please select a medical report file (PDF / PNG / JPG / TXT).');
            return;
        }

        const submitBtn = document.getElementById('submitUploadBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Computing SHA-256 & Checking Blockchain...';

        const formData = new FormData();
        formData.append('reportFile', selectedUploadFile);
        formData.append('patientId', document.getElementById('uploadPatient').value);
        formData.append('title', document.getElementById('uploadTitle').value);
        formData.append('reportType', document.getElementById('uploadType').value);
        formData.append('testDate', document.getElementById('uploadDate').value);
        formData.append('notes', document.getElementById('uploadNotes').value);
        formData.append('nodeId', document.getElementById('uploadNode').value);

        try {
            const res = await fetch('/api/reports/upload', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData
            });

            const data = await res.json();

            // Objective 2 Demonstration: DUPLICATE REJECTED
            if (res.status === 409 || data.duplicateDetected) {
                alert(`⚠️ OBJECTIVE 2 ENFORCED: DUPLICATE MEDICAL REPORT DETECTED!\n\n` +
                      `Cryptographic SHA-256 fingerprint:\n${data.fileHash}\n\n` +
                      `This report is already anchored on the blockchain. Redundant upload was blocked to prevent duplicate records and save storage!`);
                loadStats();
                return;
            }

            if (!res.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            alert(`✓ SUCCESS: Report encrypted with AES-256 and anchored to Blockchain Block #${data.block.index}!\n` +
                  `OCR Extracted Tags: [${(data.ocrInfo.extractedKeywords || []).join(', ')}]`);

            form.reset();
            selectedUploadFile = null;
            fileNameDisplay.textContent = 'Drag & Drop or Click to Select';
            dropZone.style.borderColor = '';

            loadReports();
            loadTimeline();
            loadStats();
            loadBlockchain();

            // Switch to Records tab
            document.querySelector('.nav-tab[data-target="recordsTab"]').click();

        } catch (err) {
            alert('Upload Error: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🔒 Encrypt, Detect Duplicates & Anchor on Blockchain';
        }
    });
}

// Objective 2 Live Trigger Helper
async function simulateDuplicateUpload() {
    const sampleDuplicateContent = `PATIENT DIAGNOSTIC REPORT - METRO APEX HOSPITAL
Patient: John Doe | ID: PT-9901 | Age: 48 | Sex: M
Date of Test: 14-Aug-2026 | Lab Ref: LAB-88910

BIOCHEMISTRY INVESTIGATION:
1. Fasting Blood Sugar (FBS): 142 mg/dL (Normal: 70 - 99 mg/dL) [HIGH]
2. Postprandial Blood Glucose: 198 mg/dL (Normal: < 140 mg/dL) [ELEVATED]
3. Glycated Hemoglobin (HbA1c): 7.4% (Normal: 4.0 - 5.6%) [DIABETIC RANGE]

Impression: Indicative of early Stage-2 Type 2 Diabetes Mellitus.
Recommended: Lifestyle modification, glycemic control follow-up in 90 days.
Signed: Alex Smith, Senior Biochemist`;

    const blob = new Blob([sampleDuplicateContent], { type: 'text/plain' });
    const file = new File([blob], 'Duplicate_Glucose_Report.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('reportFile', file);
    formData.append('patientId', 'usr_pat_01');
    formData.append('title', 'Duplicate Blood Glucose Report');
    formData.append('reportType', 'Pathology / Biochemistry');
    formData.append('testDate', '2026-08-14');
    formData.append('notes', 'Duplicate upload attempt for panel demo');

    try {
        const res = await fetch('/api/reports/upload', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        const data = await res.json();

        if (res.status === 409 || data.duplicateDetected) {
            alert(`🛑 OBJECTIVE 2 LIVE VERIFICATION:\n\n` +
                  `STATUS: 409 CONFLICT (Duplicate Detected!)\n` +
                  `SHA-256 Hash: ${data.fileHash.slice(0, 32)}...\n\n` +
                  `The blockchain detected that this diagnostic document already exists. Redundant upload was successfully prevented!`);
            loadStats();
        } else {
            alert('Upload response: ' + JSON.stringify(data));
        }
    } catch (e) {
        alert('Simulated duplicate test failed: ' + e.message);
    }
}

// ==========================================
// 7. BLOCKCHAIN EXPLORER & TAMPER SIMULATOR
// ==========================================
async function loadBlockchain() {
    const stream = document.getElementById('blockchainStream');
    try {
        const res = await fetch('/api/blockchain/ledger', { headers: getAuthHeaders() });
        const data = await res.json();

        stream.innerHTML = '';
        if (!data.success || !data.chain) return;

        data.chain.forEach(block => {
            const card = document.createElement('div');
            const isGenesis = (block.index === 0);
            const isTampered = (block.data && block.data.tampered);

            card.className = `block-card ${isGenesis ? 'genesis' : ''} ${isTampered ? 'tampered' : ''}`;

            card.innerHTML = `
                <div class="block-header">
                    <div>
                        <span class="block-index-tag">${isGenesis ? '⭐ GENESIS BLOCK #0' : `BLOCK #${block.index}`}</span>
                        <strong style="margin-left: 10px; font-size: 0.95rem;">
                            ${isGenesis ? 'Consortium Genesis Anchor' : (block.data.reportType || 'Medical Report Block')}
                        </strong>
                    </div>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">
                        ⏱️ ${new Date(block.timestamp).toLocaleString()}
                    </span>
                </div>

                <div class="hash-row">
                    <span class="hash-label">Block Hash:</span>
                    <span class="hash-value">${escapeHtml(block.hash)}</span>
                </div>
                <div class="hash-row">
                    <span class="hash-label">Prev Hash:</span>
                    <span style="color: #94a3b8;">${escapeHtml(block.previousHash)}</span>
                </div>

                <div style="background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-top: 0.75rem; font-size: 0.82rem;">
                    <strong>Block Payload Data:</strong>
                    <pre style="font-family: var(--font-mono); color: #cbd5e1; margin-top: 4px; white-space: pre-wrap;">${escapeHtml(JSON.stringify(block.data, null, 2))}</pre>
                </div>
            `;

            stream.appendChild(card);
        });

    } catch (e) {
        console.error('Blockchain load error:', e);
    }
}

async function verifyChainIntegrity() {
    try {
        const res = await fetch('/api/blockchain/verify', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.isValid) {
            alert('✓ BLOCKCHAIN INTEGRITY VERIFIED: All block hashes and previousHash cryptographic links are 100% valid!');
        } else {
            alert(`⚠️ TAMPERING DETECTED ON LEDGER!\n${data.details.error}`);
        }
        loadStats();
        loadBlockchain();
    } catch (e) {
        alert('Verification request failed: ' + e.message);
    }
}

async function triggerTamperSimulation() {
    if (!confirm('Simulate malicious block modification? This will alter Block #1 hash to demonstrate how blockchain catches tampering live for the panel.')) return;

    try {
        const res = await fetch('/api/blockchain/tamper-demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ blockIndex: 1, maliciousHash: '0000000000malicious_hacker_hash_tamper_attempt' })
        });
        const data = await res.json();
        alert(`⚠️ TAMPER INJECTED: Block #1 has been modified.\n\nNow running chain verification to see detection:`);
        verifyChainIntegrity();
    } catch (e) {
        alert('Tamper demo failed: ' + e.message);
    }
}

async function restoreChain() {
    try {
        const res = await fetch('/api/blockchain/restore', { method: 'POST', headers: getAuthHeaders() });
        const data = await res.json();
        alert(data.message);
        loadStats();
        loadBlockchain();
    } catch (e) {
        alert('Restore failed: ' + e.message);
    }
}

// ==========================================
// 8. AUDIT LOGS
// ==========================================
async function loadAuditLogs() {
    const tbody = document.getElementById('auditLogsBody');
    try {
        const res = await fetch('/api/blockchain/audit-logs', { headers: getAuthHeaders() });
        const data = await res.json();
        tbody.innerHTML = '';

        if (!data.success || !data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No audit events recorded.</td></tr>';
            return;
        }

        data.logs.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: var(--font-mono); font-size: 0.78rem;">${new Date(l.timestamp).toLocaleTimeString()}</td>
                <td><strong style="color: var(--accent-cyan); font-size: 0.8rem;">${escapeHtml(l.action)}</strong></td>
                <td style="font-size: 0.82rem;">${escapeHtml(l.actor)}</td>
                <td style="font-size: 0.82rem;">${escapeHtml(l.details)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error('Audit logs error:', e);
    }
}

// ==========================================
// 9. MODALS & FEATURE POPUPS
// ==========================================
async function openReportModal(reportId) {
    const modal = document.getElementById('viewReportModal');
    const badge = document.getElementById('modalReportBadge');
    const title = document.getElementById('modalReportTitle');
    const sub = document.getElementById('modalReportSubtitle');
    const content = document.getElementById('modalReportContent');
    const hash = document.getElementById('modalReportHash');
    const downloadBtn = document.getElementById('modalDownloadBtn');

    badge.textContent = reportId;
    title.textContent = 'Decrypting report from AES storage...';
    content.textContent = 'Loading...';

    modal.classList.add('active');

    try {
        const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.report) {
            const r = data.report;
            title.textContent = r.title;
            sub.textContent = `Patient: ${r.patientName} (${r.patientPseudonym}) • Date: ${r.testDate} • Category: ${r.reportType}`;
            content.textContent = r.rawSnippet || 'Report decrypted successfully from off-chain storage.';
            hash.textContent = `SHA-256 Fingerprint: ${r.reportHash}`;
            downloadBtn.href = `/api/reports/${encodeURIComponent(reportId)}/download`;
        }
    } catch (e) {
        content.textContent = 'Error decrypting report: ' + e.message;
    }
}

async function openQrModal(reportId) {
    const modal = document.getElementById('qrModal');
    const img = document.getElementById('qrModalImg');
    const badge = document.getElementById('qrReportId');
    const directLink = document.getElementById('qrDirectVerifyLink');

    badge.textContent = reportId;
    modal.classList.add('active');

    try {
        const res = await fetch(`/api/qr/${encodeURIComponent(reportId)}`);
        const data = await res.json();
        if (data.success) {
            img.src = data.qrCodeDataUrl;
            currentVerificationUrl = data.verificationUrl;
            directLink.href = data.verificationUrl;
        }
    } catch (e) {
        alert('QR code load failed: ' + e.message);
    }
}

function openShareModal(reportId, reportTitle) {
    const modal = document.getElementById('shareModal');
    document.getElementById('shareReportId').value = reportId;
    document.getElementById('shareReportTitle').value = `${reportId} - ${reportTitle}`;
    document.getElementById('shareResultBox').style.display = 'none';
    modal.classList.add('active');
}

// Handle Share Form Submission
const shareForm = document.getElementById('shareLinkForm');
if (shareForm) {
    shareForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reportId = document.getElementById('shareReportId').value;
        const durationMinutes = document.getElementById('shareDuration').value;
        const recipientDoctor = document.getElementById('shareDoctor').value;

        try {
            const res = await fetch('/api/share/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ reportId, durationMinutes, recipientDoctor })
            });

            const data = await res.json();
            if (data.success) {
                currentShareUrl = data.shareUrl;
                document.getElementById('generatedShareUrl').value = data.shareUrl;
                document.getElementById('openShareUrlBtn').href = data.shareUrl;
                document.getElementById('shareResultBox').style.display = 'block';
            } else {
                alert('Share failed: ' + data.message);
            }
        } catch (e) {
            alert('Error generating share link: ' + e.message);
        }
    });
}

function copyVerificationUrl() {
    if (currentVerificationUrl) {
        navigator.clipboard.writeText(currentVerificationUrl);
        alert('✓ Verification URL copied to clipboard!');
    }
}

function copyShareUrl() {
    if (currentShareUrl) {
        navigator.clipboard.writeText(currentShareUrl);
        alert('✓ Expiring Share Link copied to clipboard!');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
