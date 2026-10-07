// HealthChain Medical Consortium Client Engine
let currentUser = null;
let authToken = localStorage.getItem('hc_auth_token') || null;

let allReportsCache = [];
let activeTagFilter = '';
let currentVerificationUrl = '';
let currentShareUrl = '';

// Registered role definitions for quick demo switching
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
        patientId: 'PT-9901',
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

// ==========================================================================
// 1. INITIALIZATION & SESSION RESTORATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUploadDropzone();
    initSearch();
    initFormListeners();

    // Check if session exists in localStorage
    const savedUserStr = localStorage.getItem('hc_current_user');
    if (authToken && savedUserStr) {
        try {
            const savedUser = JSON.parse(savedUserStr);
            applySession(authToken, savedUser);
        } catch (e) {
            console.warn('Session parse error, requiring login:', e);
            logout();
        }
    } else {
        // Enforce mandatory login gate: show login screen, hide portal
        showLoginScreen();
    }

    // Default test date to today
    const dateInput = document.getElementById('uploadDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
});

function getAuthHeaders() {
    const headers = {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (currentUser && currentUser.id) {
        headers['x-demo-user-id'] = currentUser.id;
    }
    return headers;
}

// ==========================================================================
// 2. AUTHENTICATION & LOGIN GATE LOGIC
// ==========================================================================
function switchLoginMode(mode) {
    const quickTab = document.getElementById('tabQuickLogin');
    const credsTab = document.getElementById('tabCredsLogin');
    const quickView = document.getElementById('quickLoginView');
    const credsView = document.getElementById('credsLoginView');

    if (mode === 'quick') {
        quickTab.classList.add('active');
        credsTab.classList.remove('active');
        quickView.style.display = 'block';
        credsView.style.display = 'none';
    } else {
        credsTab.classList.add('active');
        quickTab.classList.remove('active');
        credsView.style.display = 'block';
        quickView.style.display = 'none';
    }
}

async function loginAsRole(userId) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            alert('Authentication failed: ' + (data.message || 'Unknown error'));
            return;
        }

        applySession(data.token, data.user);
    } catch (err) {
        alert('Login communication error: ' + err.message);
    }
}

async function loginWithCredentials(emailOrId, password) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailOrId, password })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            alert('Authentication failed: ' + (data.message || 'Invalid credentials'));
            return;
        }

        applySession(data.token, data.user);
    } catch (err) {
        alert('Login communication error: ' + err.message);
    }
}

function applySession(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('hc_auth_token', token);
    localStorage.setItem('hc_current_user', JSON.stringify(user));

    // Hide Login Screen and Reveal Application
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';

    // Update Banner & Header Identifiers
    updateUserDisplay(user);

    // Enforce Role Permissions across Navigation & Views
    applyRolePermissions(user.role);

    // Load initial data
    loadStats();
    loadReports();
    loadTimeline();
    loadBlockchain();
    loadAuditLogs();
    if (user.role === 'Admin') {
        loadAdminUsers();
    }
}

function updateUserDisplay(user) {
    const avatar = user.role === 'Doctor' ? '👨‍⚕️' : user.role === 'Lab Staff' ? '🔬' : user.role === 'Admin' ? '🛡️' : '👤';
    
    // Header Identity
    const headerAvatar = document.getElementById('headerUserAvatar');
    const headerName = document.getElementById('headerUserName');
    const headerRole = document.getElementById('headerUserRoleBadge');
    if (headerAvatar) headerAvatar.textContent = avatar;
    if (headerName) headerName.textContent = user.name;
    if (headerRole) headerRole.textContent = user.role.toUpperCase();

    // Banner Identity
    const bannerAvatar = document.getElementById('userAvatar');
    const bannerName = document.getElementById('userNameDisplay');
    const bannerRole = document.getElementById('userRoleDisplay');
    if (bannerAvatar) bannerAvatar.textContent = avatar;
    if (bannerName) bannerName.textContent = user.name;
    
    let desc = user.role;
    if (user.department) desc += ` • ${user.department}`;
    if (user.hospital) desc += ` • ${user.hospital}`;
    if (user.laboratory) desc += ` • ${user.laboratory}`;
    if (user.patientId) desc += ` • Patient ID: ${user.patientId}`;
    if (bannerRole) bannerRole.textContent = desc;

    // Highlight Role Switcher button
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-user-id') === user.id);
    });
}

function showLoginScreen() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('hc_auth_token');
    localStorage.removeItem('hc_current_user');

    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
}

function logout() {
    showLoginScreen();
}

async function switchUserRole(userId) {
    await loginAsRole(userId);
}

// ==========================================================================
// 3. ROLE-BASED ACCESS CONTROL (RBAC) RESTRICTIONS
// ==========================================================================
function applyRolePermissions(role) {
    const tabRecords = document.getElementById('tabNavRecords');
    const tabTimeline = document.getElementById('tabNavTimeline');
    const tabUpload = document.getElementById('tabNavUpload');
    const tabAdmin = document.getElementById('tabNavAdmin');
    const tabBlockchain = document.getElementById('tabNavBlockchain');
    const tabAudit = document.getElementById('tabNavAudit');

    const patientNotice = document.getElementById('patientScopedNotice');
    const uploadRestrictedNotice = document.getElementById('uploadRestrictedNotice');
    const uploadForm = document.getElementById('uploadForm');
    const timelinePatientSelectorWrapper = document.getElementById('timelinePatientSelectorWrapper');

    // Reset default display
    tabRecords.style.display = 'inline-block';
    tabTimeline.style.display = 'inline-block';
    tabUpload.style.display = 'inline-block';
    tabAdmin.style.display = 'none';
    tabBlockchain.style.display = 'inline-block';
    tabAudit.style.display = 'inline-block';

    if (patientNotice) patientNotice.style.display = 'none';
    if (uploadRestrictedNotice) uploadRestrictedNotice.style.display = 'none';
    if (uploadForm) uploadForm.style.opacity = '1';
    if (timelinePatientSelectorWrapper) timelinePatientSelectorWrapper.style.display = 'flex';

    if (role === 'Patient') {
        // Patient can only view their own records and timeline; cannot upload or admin
        tabUpload.style.display = 'none';
        tabAdmin.style.display = 'none';
        tabBlockchain.style.display = 'none';
        tabAudit.style.display = 'none';

        if (patientNotice) patientNotice.style.display = 'flex';
        if (timelinePatientSelectorWrapper) timelinePatientSelectorWrapper.style.display = 'none';

        // Auto select records tab
        tabRecords.click();

    } else if (role === 'Lab Staff') {
        // Lab staff is restricted to uploading data and viewing archives/ledger
        tabTimeline.style.display = 'none';
        tabAdmin.style.display = 'none';
        tabAudit.style.display = 'none';

        if (uploadRestrictedNotice) uploadRestrictedNotice.style.display = 'none';
        tabUpload.click();

    } else if (role === 'Doctor') {
        // Doctor reviews records, updates diagnosis, views timeline, verifies ledger
        tabAdmin.style.display = 'none';

        // Doctor doesn't primarily upload (Lab does), but can view or is notified
        if (uploadRestrictedNotice) {
            uploadRestrictedNotice.style.display = 'flex';
            uploadRestrictedNotice.innerHTML = `<span>ℹ️</span><div><strong>Consortium Workflow Policy:</strong> Diagnostic documents are uploaded by <strong>Lab Staff</strong>. Doctors review results, add clinical diagnoses, and manage treatment plans.</div>`;
        }

        tabRecords.click();

    } else if (role === 'Admin') {
        // Admin has full consortium privileges including User Management
        tabAdmin.style.display = 'inline-block';
        tabAdmin.click();
    }
}

// ==========================================================================
// 4. TAB NAVIGATION
// ==========================================================================
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
            if (targetId === 'adminTab') loadAdminUsers();
            if (targetId === 'recordsTab') loadReports();
        });
    });
}

// ==========================================================================
// 5. STATS & SYSTEM METRICS
// ==========================================================================
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

// ==========================================================================
// 6. MEDICAL REPORTS ARCHIVE & OCR SEARCH
// ==========================================================================
async function loadReports() {
    try {
        const res = await fetch('/api/reports', { headers: getAuthHeaders() });
        if (res.status === 401) {
            logout();
            return;
        }
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

    const isDoctorOrAdmin = currentUser && (currentUser.role === 'Doctor' || currentUser.role === 'Admin');

    filtered.forEach(r => {
        const card = document.createElement('div');
        card.className = 'report-card';

        const tagsHtml = (r.keywords || []).slice(0, 4).map(k => `<span class="tag-badge">${escapeHtml(k)}</span>`).join('');

        // Doctor diagnosis remarks badge if present
        let remarksBadge = '';
        if (r.doctorRemarks) {
            remarksBadge = `
                <div style="margin-top: 6px; padding: 4px 8px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-sm); font-size: 0.74rem; color: #fde68a;">
                    👨‍⚕️ <strong>Evaluation:</strong> ${escapeHtml(r.doctorRemarks.status || 'Reviewed')} • ${escapeHtml(r.doctorRemarks.doctorName || '')}
                </div>
            `;
        }

        // Action buttons tailored by role
        let editBtnHtml = '';
        if (isDoctorOrAdmin) {
            editBtnHtml = `
                <button class="btn btn-edit" onclick="openEditReportModal('${escapeHtml(r.reportId)}')">
                    ✏️ Edit Notes
                </button>
            `;
        }

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
                ${remarksBadge}
                <div class="report-tags" style="margin-top: 8px;">
                    ${tagsHtml}
                </div>
            </div>

            <div class="report-actions">
                <button class="btn btn-primary" onclick="openReportModal('${escapeHtml(r.reportId)}')">
                    👁️ View Decrypted
                </button>
                ${editBtnHtml}
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
    if (!input) return;
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

// ==========================================================================
// 7. CHRONOLOGICAL TIMELINE (Obj 1 & 3)
// ==========================================================================
async function loadTimeline() {
    const patientSelect = document.getElementById('timelinePatientSelect');
    let patientId = patientSelect ? patientSelect.value : 'usr_pat_01';

    if (currentUser && currentUser.role === 'Patient') {
        patientId = currentUser.id;
    }

    const container = document.getElementById('timelineEntries');

    try {
        const res = await fetch(`/api/reports/timeline/${encodeURIComponent(patientId)}`, { headers: getAuthHeaders() });
        const data = await res.json();

        container.innerHTML = '';
        if (!data.success || !data.timeline || data.timeline.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); margin-left: 20px;">No historical records found for this patient.</p>';
            return;
        }

        data.timeline.forEach((item) => {
            const entry = document.createElement('div');
            entry.className = 'timeline-entry';

            const tags = (item.keywords || []).map(k => `<span class="tag-badge">${escapeHtml(k)}</span>`).join('');

            let doctorRemarkHtml = '';
            if (item.doctorRemarks) {
                doctorRemarkHtml = `
                    <div style="margin: 0.5rem 0; padding: 6px 10px; background: rgba(245, 158, 11, 0.12); border-left: 3px solid var(--accent-warning); border-radius: 4px; font-size: 0.8rem; color: #fde68a;">
                        <strong>Attending Diagnosis:</strong> ${escapeHtml(item.doctorRemarks.status || 'Evaluated')}<br>
                        ${escapeHtml(item.notes || '')}
                    </div>
                `;
            }

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
                    ${doctorRemarkHtml || `<p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0;">${escapeHtml(item.notes || 'Routine clinical investigation.')}</p>`}
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

// ==========================================================================
// 8. UPLOAD & DUPLICATE DETECTION (Obj 2 - Lab Staff Only)
// ==========================================================================
let selectedUploadFile = null;

function initUploadDropzone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('dropFileName');
    const form = document.getElementById('uploadForm');

    if (!dropZone || !fileInput || !form) return;

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

        if (currentUser && currentUser.role !== 'Lab Staff' && currentUser.role !== 'Admin') {
            alert('Access Denied: Only Lab Staff are authorized to upload diagnostic test reports to the consortium.');
            return;
        }

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
            document.getElementById('tabNavRecords').click();

        } catch (err) {
            alert('Upload Error: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🔒 Encrypt, Detect Duplicates & Anchor on Blockchain';
        }
    });
}

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

// ==========================================================================
// 9. DOCTOR CLINICAL NOTES EDITING (Doctor Only)
// ==========================================================================
function openEditReportModal(reportId) {
    if (currentUser && currentUser.role !== 'Doctor' && currentUser.role !== 'Admin') {
        alert('Access Denied: Only attending physicians (Doctors) are authorized to edit clinical diagnostic evaluations.');
        return;
    }

    const report = allReportsCache.find(r => r.reportId === reportId);
    if (!report) {
        alert('Report details not found.');
        return;
    }

    document.getElementById('editReportIdInput').value = report.reportId;
    document.getElementById('editReportBadge').textContent = report.reportId;
    document.getElementById('editReportTitle').textContent = `Clinical Evaluation: ${report.title}`;
    document.getElementById('editReportSubtitle').textContent = `Patient: ${report.patientName} (${report.patientPseudonym}) • Date: ${report.testDate}`;
    
    document.getElementById('editReportNotes').value = report.notes || '';
    if (report.doctorRemarks) {
        document.getElementById('editDiagnosisStatus').value = report.doctorRemarks.status || 'Confirmed Diagnosis';
    } else {
        document.getElementById('editDiagnosisStatus').value = 'Confirmed Diagnosis';
    }

    document.getElementById('editReportPrescription').value = report.prescription || '';
    document.getElementById('editReportFollowUp').value = report.followUpDate || '';

    const modal = document.getElementById('editReportModal');
    if (modal) modal.classList.add('active');
}

// ==========================================================================
// 10. ADMIN USER MANAGEMENT (Admin Only)
// ==========================================================================
function updateRoleSpecificFields() {
    const role = document.getElementById('newRoleSelect').value;
    const docFields = document.getElementById('doctorFieldsGroup');
    const patFields = document.getElementById('patientFieldsGroup');
    const labFields = document.getElementById('labFieldsGroup');

    docFields.style.display = role === 'Doctor' ? 'grid' : 'none';
    patFields.style.display = role === 'Patient' ? 'grid' : 'none';
    labFields.style.display = role === 'Lab Staff' ? 'grid' : 'none';
}

async function loadAdminUsers() {
    try {
        const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
        if (res.status === 403 || res.status === 401) return;
        const data = await res.json();

        if (data.success && data.stats) {
            document.getElementById('statTotalUsers').textContent = data.stats.total;
            document.getElementById('statTotalDoctors').textContent = data.stats.doctors;
            document.getElementById('statTotalPatients').textContent = data.stats.patients;
            document.getElementById('statTotalLabStaff').textContent = data.stats.labStaff;

            renderAdminUsersTable(data.users);
            populatePatientDropdowns(data.users);
        }
    } catch (err) {
        console.warn('Failed to load admin users:', err);
    }
}

function renderAdminUsersTable(users) {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    users.forEach(u => {
        const tr = document.createElement('tr');
        const avatar = u.role === 'Doctor' ? '👨‍⚕️' : u.role === 'Lab Staff' ? '🔬' : u.role === 'Admin' ? '🛡️' : '👤';
        const tagClass = u.role === 'Doctor' ? 'tag-doctor' : u.role === 'Lab Staff' ? 'tag-lab' : u.role === 'Admin' ? 'tag-admin' : 'tag-patient';

        let affiliation = u.hospital || u.laboratory || u.institution || (u.patientId ? `Patient ID: ${u.patientId}` : 'Consortium Member');
        let licenseOrNode = u.license || u.nodeId || 'Validated Node';

        tr.innerHTML = `
            <td>
                <strong>${avatar} ${escapeHtml(u.name)}</strong>
                <div style="font-size: 0.74rem; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(u.id)}</div>
            </td>
            <td><span class="role-card-tag ${tagClass}">${escapeHtml(u.role)}</span></td>
            <td style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(u.email)}</td>
            <td style="font-size: 0.82rem;">${escapeHtml(affiliation)}</td>
            <td style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(licenseOrNode)}</td>
            <td>
                ${u.role !== 'Admin' ? `<button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; color: var(--accent-danger); border-color: rgba(239, 68, 68, 0.4);" onclick="deleteAdminUser('${escapeHtml(u.id)}')">🗑️ Remove</button>` : `<span style="font-size: 0.75rem; color: var(--text-muted);">Root</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populatePatientDropdowns(users) {
    const patients = users.filter(u => u.role === 'Patient');
    const uploadSelect = document.getElementById('uploadPatient');
    const timelineSelect = document.getElementById('timelinePatientSelect');

    if (uploadSelect) {
        uploadSelect.innerHTML = patients.map(p => 
            `<option value="${p.id}">${escapeHtml(p.name)} (${p.patientId || p.id}, Age: ${p.age || 'N/A'}, ${p.gender || 'N/A'})</option>`
        ).join('');
    }

    if (timelineSelect) {
        timelineSelect.innerHTML = patients.map(p => 
            `<option value="${p.id}">${escapeHtml(p.name)} (${p.patientId || p.id})</option>`
        ).join('');
    }
}

async function deleteAdminUser(userId) {
    if (!confirm('Are you sure you want to remove this identity from the healthcare consortium?')) return;

    try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            alert('✓ Identity successfully removed.');
            loadAdminUsers();
        } else {
            alert('Removal failed: ' + data.message);
        }
    } catch (e) {
        alert('Error removing user: ' + e.message);
    }
}

// ==========================================================================
// 11. FORM LISTENERS INITIALIZATION
// ==========================================================================
function initFormListeners() {
    // 1. Credentials Login Form
    const credsForm = document.getElementById('credentialLoginForm');
    if (credsForm) {
        credsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmailInput').value;
            const password = document.getElementById('loginPasswordInput').value;
            loginWithCredentials(email, password);
        });
    }

    // 2. Doctor Edit Report Form
    const editForm = document.getElementById('editReportForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reportId = document.getElementById('editReportIdInput').value;
            const notes = document.getElementById('editReportNotes').value;
            const diagnosisStatus = document.getElementById('editDiagnosisStatus').value;
            const prescription = document.getElementById('editReportPrescription').value;
            const followUpDate = document.getElementById('editReportFollowUp').value;

            try {
                const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ notes, diagnosisStatus, prescription, followUpDate })
                });

                const data = await res.json();
                if (data.success) {
                    alert('✓ Clinical notes & diagnosis successfully updated by Attending Physician!');
                    closeModal('editReportModal');
                    loadReports();
                    loadTimeline();
                    loadAuditLogs();
                } else {
                    alert('Update failed: ' + data.message);
                }
            } catch (err) {
                alert('Error updating report: ' + err.message);
            }
        });
    }

    // 3. Admin Create User Form
    const adminUserForm = document.getElementById('adminCreateUserForm');
    if (adminUserForm) {
        adminUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const role = document.getElementById('newRoleSelect').value;
            const name = document.getElementById('newNameInput').value;
            const email = document.getElementById('newEmailInput').value;
            const password = document.getElementById('newPasswordInput').value;

            const payload = { role, name, email, password };

            if (role === 'Doctor') {
                payload.department = document.getElementById('newDoctorDept').value;
                payload.hospital = document.getElementById('newDoctorHospital').value;
                payload.doctorLicense = document.getElementById('newDoctorLicense').value;
            } else if (role === 'Patient') {
                payload.patientId = document.getElementById('newPatientId').value;
                payload.age = document.getElementById('newPatientAge').value;
                payload.gender = document.getElementById('newPatientGender').value;
                payload.bloodGroup = document.getElementById('newPatientBlood').value;
            } else if (role === 'Lab Staff') {
                payload.designation = document.getElementById('newLabDesignation').value;
                payload.laboratory = document.getElementById('newLabName').value;
            }

            try {
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) {
                    alert(`✓ SUCCESS: ${role} account created for ${name} (${email})!\nDefault password: ${password || 'password123'}`);
                    adminUserForm.reset();
                    updateRoleSpecificFields();
                    loadAdminUsers();
                } else {
                    alert('Registration failed: ' + data.message);
                }
            } catch (err) {
                alert('Error creating user: ' + err.message);
            }
        });
    }

    // 4. Share Form Listener
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
}

// ==========================================================================
// 12. BLOCKCHAIN EXPLORER & TAMPER SIMULATOR
// ==========================================================================
async function loadBlockchain() {
    const stream = document.getElementById('blockchainStream');
    if (!stream) return;
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
        await res.json();
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

// ==========================================================================
// 13. AUDIT LOGS
// ==========================================================================
async function loadAuditLogs() {
    const tbody = document.getElementById('auditLogsBody');
    if (!tbody) return;
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

// ==========================================================================
// 14. MODAL POPUPS & HANDLERS
// ==========================================================================
async function openReportModal(reportId) {
    const modal = document.getElementById('viewReportModal');
    const badge = document.getElementById('modalReportBadge');
    const title = document.getElementById('modalReportTitle');
    const sub = document.getElementById('modalReportSubtitle');
    const content = document.getElementById('modalReportContent');
    const hash = document.getElementById('modalReportHash');
    const downloadBtn = document.getElementById('modalDownloadBtn');
    const editBtn = document.getElementById('modalDoctorEditBtn');
    const remarksSection = document.getElementById('modalDoctorRemarksSection');
    const remarksContent = document.getElementById('modalDoctorRemarksContent');

    badge.textContent = reportId;
    title.textContent = 'Decrypting report from AES storage...';
    content.textContent = 'Loading...';
    remarksSection.style.display = 'none';

    // Doctor edit button inside modal
    if (currentUser && (currentUser.role === 'Doctor' || currentUser.role === 'Admin')) {
        editBtn.style.display = 'inline-block';
        editBtn.onclick = () => {
            closeModal('viewReportModal');
            openEditReportModal(reportId);
        };
    } else {
        editBtn.style.display = 'none';
    }

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

            if (r.doctorRemarks) {
                remarksSection.style.display = 'block';
                remarksContent.innerHTML = `
                    <strong>Diagnosis Status:</strong> ${escapeHtml(r.doctorRemarks.status || 'Verified')}<br>
                    <strong>Attending Physician:</strong> ${escapeHtml(r.doctorRemarks.doctorName || '')} (${escapeHtml(r.doctorRemarks.department || '')})<br>
                    <strong>Doctor Notes:</strong> ${escapeHtml(r.notes || 'None recorded')}<br>
                    ${r.prescription ? `<strong>Prescription:</strong> ${escapeHtml(r.prescription)}<br>` : ''}
                    ${r.followUpDate ? `<strong>Follow-up Date:</strong> ${escapeHtml(r.followUpDate)}` : ''}
                `;
            }
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
