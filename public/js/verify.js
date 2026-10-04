document.addEventListener('DOMContentLoaded', () => {
    const reportIdInput = document.getElementById('reportIdInput');
    const runVerifyBtn = document.getElementById('runVerifyBtn');
    const resultCard = document.getElementById('resultCard');
    const statusBadge = document.getElementById('statusBadge');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const statusDesc = document.getElementById('statusDesc');
    const liveHashDisplay = document.getElementById('liveHashDisplay');
    const anchoredHashDisplay = document.getElementById('anchoredHashDisplay');
    const matchSummary = document.getElementById('matchSummary');
    const resReportId = document.getElementById('resReportId');
    const resPatient = document.getElementById('resPatient');
    const resBlockIndex = document.getElementById('resBlockIndex');
    const resNode = document.getElementById('resNode');
    const resBlockHash = document.getElementById('resBlockHash');
    const resTimestamp = document.getElementById('resTimestamp');
    const tamperFileBtn = document.getElementById('tamperFileBtn');
    const repairFileBtn = document.getElementById('repairFileBtn');

    // Parse URL params for ?reportId=
    const urlParams = new URLSearchParams(window.location.search);
    const initialReportId = urlParams.get('reportId');
    if (initialReportId) {
        reportIdInput.value = initialReportId;
        verifyReport(initialReportId);
    }

    window.setQuickReport = function(id) {
        reportIdInput.value = id;
        verifyReport(id);
    };

    runVerifyBtn.addEventListener('click', () => {
        const id = reportIdInput.value.trim();
        if (!id) {
            alert('Please enter a Report ID.');
            return;
        }
        verifyReport(id);
    });

    async function verifyReport(reportId) {
        runVerifyBtn.disabled = true;
        runVerifyBtn.innerHTML = '⏳ Computing SHA-256 & Checking Ledger...';

        try {
            const res = await fetch(`/api/verify/${encodeURIComponent(reportId)}`);
            const data = await res.json();

            resultCard.style.display = 'block';

            if (!data.success && data.status === 'NOT_FOUND') {
                statusBadge.className = 'status-badge-big status-badge-mismatch';
                statusIcon.textContent = '✕';
                statusText.textContent = 'REPORT NOT FOUND';
                statusDesc.textContent = data.message || 'No record exists for this ID on the ledger.';
                liveHashDisplay.textContent = 'N/A';
                anchoredHashDisplay.textContent = 'N/A';
                matchSummary.innerHTML = '<span style="color: #f87171;">Record missing from consortium database.</span>';
                return;
            }

            resReportId.textContent = data.reportId;
            resPatient.textContent = data.patientName || data.patientPseudonym;
            resBlockIndex.textContent = `Block #${data.blockchainDetails.blockIndex}`;
            resNode.textContent = data.blockchainDetails.institutionNode || 'Consortium Node';
            resBlockHash.textContent = data.blockchainDetails.blockHash;
            resTimestamp.textContent = new Date(data.blockchainDetails.timestamp).toLocaleString();

            liveHashDisplay.textContent = data.liveComputedHash;
            anchoredHashDisplay.textContent = data.anchoredBlockchainHash;

            if (data.isAuthentic) {
                statusBadge.className = 'status-badge-big status-badge-match';
                statusIcon.textContent = '✓';
                statusText.textContent = 'MATCH: REPORT AUTHENTIC';
                statusDesc.textContent = data.verificationMessage;
                matchSummary.innerHTML = '<span style="color: #34d399;">✓ Cryptographic integrity 100% verified. Document is unchanged since anchoring.</span>';
            } else {
                statusBadge.className = 'status-badge-big status-badge-mismatch';
                statusIcon.textContent = '⚠️';
                statusText.textContent = 'MISMATCH: TAMPERING DETECTED';
                statusDesc.textContent = data.verificationMessage;
                matchSummary.innerHTML = '<span style="color: #f87171;">⚠️ ALERT: Computed hash does NOT match the anchored blockchain record! The file has been modified.</span>';
            }

        } catch (err) {
            alert('Failed to connect to verification API: ' + err.message);
        } finally {
            runVerifyBtn.disabled = false;
            runVerifyBtn.innerHTML = '🔒 Verify Integrity on Blockchain';
        }
    }

    // Tamper Button
    tamperFileBtn.addEventListener('click', async () => {
        const id = reportIdInput.value.trim();
        if (!id) return;
        if (!confirm(`Inject deliberate tampering into off-chain file for ${id}? This will prove how blockchain catches unauthorized changes.`)) return;

        try {
            const res = await fetch(`/api/verify/tamper-file/${encodeURIComponent(id)}`, { method: 'POST' });
            const data = await res.json();
            alert(data.message);
            // Re-verify immediately to show MISMATCH
            verifyReport(id);
        } catch (e) {
            alert('Tamper injection failed: ' + e.message);
        }
    });

    // Reset / Repair Button
    repairFileBtn.addEventListener('click', async () => {
        if (!confirm('Restore consortium database and files to original verified state?')) return;
        try {
            const res = await fetch('/api/blockchain/restore', { method: 'POST' });
            const data = await res.json();
            alert(data.message);
            const id = reportIdInput.value.trim();
            if (id) verifyReport(id);
        } catch (e) {
            alert('Reset failed: ' + e.message);
        }
    });
});
