document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const countdownBanner = document.getElementById('countdownBanner');
    const timerDisplay = document.getElementById('timerDisplay');
    const expiryMeta = document.getElementById('expiryMeta');
    const expiredCard = document.getElementById('expiredCard');
    const contentCard = document.getElementById('contentCard');

    const repBadge = document.getElementById('repBadge');
    const repTitle = document.getElementById('repTitle');
    const repPatient = document.getElementById('repPatient');
    const repDate = document.getElementById('repDate');
    const repTags = document.getElementById('repTags');
    const repSnippet = document.getElementById('repSnippet');
    const repRecipient = document.getElementById('repRecipient');
    const downloadBtn = document.getElementById('downloadBtn');

    if (!token) {
        countdownBanner.style.display = 'none';
        expiredCard.style.display = 'block';
        expiredCard.querySelector('h2').textContent = 'Missing Access Token';
        expiredCard.querySelector('p').textContent = 'Please provide a valid time-expiring JWT token link.';
        return;
    }

    let remainingSeconds = 0;
    let timerInterval = null;

    async function loadSharedReport() {
        try {
            const res = await fetch(`/api/share/view?token=${encodeURIComponent(token)}`);
            const data = await res.json();

            if (!data.success || data.status === 'EXPIRED') {
                showExpired(data.message || 'Access token has expired.');
                return;
            }

            // Populate Report
            const rep = data.report;
            repBadge.textContent = rep.reportId;
            repTitle.textContent = rep.title;
            repPatient.textContent = `Patient: ${rep.patientName} (${rep.patientPseudonym}) • ${rep.reportType}`;
            repDate.textContent = `Test Date: ${rep.testDate}`;
            repSnippet.textContent = rep.rawSnippet || 'No diagnostic preview available.';
            repRecipient.textContent = data.context ? data.context.recipientDoctor : 'Consulting Doctor';

            downloadBtn.href = `/api/share/download?token=${encodeURIComponent(token)}`;

            repTags.innerHTML = '';
            if (rep.keywords && rep.keywords.length > 0) {
                rep.keywords.forEach(kw => {
                    const span = document.createElement('span');
                    span.className = 'tag-badge';
                    span.textContent = kw;
                    repTags.appendChild(span);
                });
            }

            contentCard.style.display = 'block';

            // Start countdown timer
            remainingSeconds = Math.max(0, data.remainingSeconds);
            startCountdown();

        } catch (err) {
            showExpired('Error verifying token: ' + err.message);
        }
    }

    function formatTime(totalSeconds) {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function startCountdown() {
        updateTimerDisplay();
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                showExpired('Configured duration has elapsed. Access link automatically expired.');
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = formatTime(remainingSeconds);
        if (remainingSeconds < 60) {
            timerDisplay.style.color = '#ef4444';
            expiryMeta.textContent = 'CRITICAL: Less than 1 minute remaining before access is permanently revoked!';
        } else if (remainingSeconds < 300) {
            timerDisplay.style.color = '#f59e0b';
            expiryMeta.textContent = 'WARNING: Under 5 minutes remaining in this consultation session.';
        }
    }

    function showExpired(message) {
        countdownBanner.style.display = 'none';
        contentCard.style.display = 'none';
        expiredCard.style.display = 'block';
        if (message) {
            expiredCard.querySelector('p').textContent = message;
        }
    }

    loadSharedReport();
});
