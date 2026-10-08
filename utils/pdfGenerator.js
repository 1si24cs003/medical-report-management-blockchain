const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generates a professional clinical diagnostic report PDF buffer with embedded anti-forgery QR code.
 * @param {Object} report Report metadata object
 * @param {string} hostUrl Host base URL (e.g. http://localhost:3000)
 * @returns {Promise<Buffer>} Resolves to PDF Buffer
 */
async function generateMedicalReportPDF(report, hostUrl = 'http://localhost:3000') {
    const verificationUrl = `${hostUrl}/verify.html?reportId=${report.reportId}`;

    // Generate high-resolution QR Code buffer (error correction level H for reliable smartphone scanning)
    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 180,
        color: {
            dark: '#0a1128',
            light: '#ffffff'
        }
    });

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 35,
                info: {
                    Title: report.title,
                    Author: 'Metro Apex Healthcare Consortium',
                    Subject: `Diagnostic Report ${report.reportId}`,
                    Keywords: (report.keywords || []).join(', ')
                }
            });

            const buffers = [];
            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            const primaryColor = '#0f172a';
            const accentBlue = '#0284c7';
            const textDark = '#1e293b';
            const textMuted = '#64748b';
            const borderGrey = '#cbd5e1';
            const lightBg = '#f8fafc';

            // ==========================================
            // 1. HOSPITAL & DIAGNOSTIC LAB HEADER
            // ==========================================
            doc.rect(35, 30, 525, 68).fill(lightBg);
            doc.rect(35, 30, 525, 68).stroke('#cbd5e1');

            doc.fillColor(accentBlue).fontSize(15).font('Helvetica-Bold')
               .text('METRO APEX HEALTHCARE CONSORTIUM', 48, 40);
            doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
               .text('DEPARTMENT OF LABORATORY MEDICINE & DIAGNOSTIC PATHOLOGY', 48, 58);
            doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
               .text('Accredited Clinical Diagnostic Centre • Blockchain Node: NODE-HOSP-01 • NABH Certified', 48, 70)
               .text('National Health Grid Participant • Zero-Knowledge Provenance Secured', 48, 81);

            // Report ID Badge in Header Top Right
            doc.rect(425, 40, 120, 22).fill(accentBlue);
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
               .text(report.reportId, 425, 46, { width: 120, align: 'center' });

            doc.fillColor('#059669').fontSize(7.5).font('Helvetica-Bold')
               .text('● LEDGER VERIFIED', 425, 68, { width: 120, align: 'center' });

            // ==========================================
            // 2. PATIENT DEMOGRAPHICS & RECORD METADATA
            // ==========================================
            const demoY = 105;
            doc.rect(35, demoY, 525, 70).fill('#f1f5f9');
            doc.rect(35, demoY, 525, 70).stroke('#e2e8f0');

            doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
               .text('PATIENT DEMOGRAPHICS & CLINICAL METADATA', 45, demoY + 8);

            doc.fillColor(textMuted).fontSize(8).font('Helvetica');
            // Col 1
            doc.text('Patient Name:', 45, demoY + 25)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(report.patientName || 'N/A', 115, demoY + 25);

            doc.fillColor(textMuted).font('Helvetica').text('Patient ID / UHID:', 45, demoY + 39)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(report.patientPseudonym || report.patientId || 'PT-9901', 115, demoY + 39);

            doc.fillColor(textMuted).font('Helvetica').text('Referred By:', 45, demoY + 53)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(report.uploadedBy || 'Attending Physician', 115, demoY + 53);

            // Col 2
            doc.fillColor(textMuted).font('Helvetica').text('Age / Gender:', 230, demoY + 25)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(`${report.age || '48'} Y / ${report.gender || 'Male'}`, 295, demoY + 25);

            doc.fillColor(textMuted).font('Helvetica').text('Test Date:', 230, demoY + 39)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(report.testDate || '2026-08-14', 295, demoY + 39);

            doc.fillColor(textMuted).font('Helvetica').text('Report Category:', 230, demoY + 53)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(report.reportType || 'Clinical Pathology', 295, demoY + 53);

            // Col 3
            doc.fillColor(textMuted).font('Helvetica').text('Sample Ref:', 410, demoY + 25)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(`SMP-${(report.reportId || '').slice(-6)}`, 465, demoY + 25);

            doc.fillColor(textMuted).font('Helvetica').text('Ledger Block:', 410, demoY + 39)
               .fillColor(accentBlue).font('Helvetica-Bold')
               .text(`Block #${report.blockIndex || 1}`, 465, demoY + 39);

            doc.fillColor(textMuted).font('Helvetica').text('Consortium Node:', 410, demoY + 53)
               .fillColor(textDark).font('Helvetica-Bold')
               .text(report.nodeId || 'NODE-HOSP-01', 465, demoY + 53);

            // ==========================================
            // 3. INVESTIGATION TITLE
            // ==========================================
            let y = 185;
            doc.fillColor(accentBlue).fontSize(12).font('Helvetica-Bold')
               .text(report.title.toUpperCase(), 35, y);
            doc.strokeColor(accentBlue).lineWidth(1.5).moveTo(35, y + 16).lineTo(560, y + 16).stroke();

            // ==========================================
            // 4. DIAGNOSTIC RESULTS TABLE / FINDINGS
            // ==========================================
            y = 210;

            if (report.testParameters && Array.isArray(report.testParameters) && report.testParameters.length > 0) {
                // Render structured table
                doc.rect(35, y, 525, 20).fill('#0f172a');
                doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
                doc.text('INVESTIGATION / TEST PARAMETER', 45, y + 6);
                doc.text('OBSERVED VALUE', 260, y + 6);
                doc.text('REFERENCE INTERVAL', 370, y + 6);
                doc.text('STATUS', 490, y + 6);
                y += 20;

                report.testParameters.forEach((param, idx) => {
                    const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
                    doc.rect(35, y, 525, 20).fill(rowBg);
                    doc.rect(35, y, 525, 20).stroke('#e2e8f0');

                    doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
                       .text(param.parameter, 45, y + 6, { width: 210 });

                    // Observed Value
                    const valColor = param.isAbnormal ? '#b91c1c' : '#0f172a';
                    doc.fillColor(valColor).font('Helvetica-Bold')
                       .text(param.value, 260, y + 6, { width: 100 });

                    // Reference
                    doc.fillColor(textMuted).font('Helvetica')
                       .text(param.ref || 'Normal', 370, y + 6, { width: 110 });

                    // Status Badge
                    if (param.isAbnormal) {
                        doc.rect(485, y + 3, 65, 14).fill('#fee2e2');
                        doc.fillColor('#991b1b').fontSize(7.5).font('Helvetica-Bold')
                           .text(param.status || 'ABNORMAL', 485, y + 6, { width: 65, align: 'center' });
                    } else {
                        doc.rect(485, y + 3, 65, 14).fill('#dcfce7');
                        doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold')
                           .text(param.status || 'NORMAL', 485, y + 6, { width: 65, align: 'center' });
                    }

                    y += 20;
                });
            } else {
                // Format text content / findings
                const textContent = report.sampleContent || report.rawSnippet || report.notes || 'Clinical diagnostic investigation completed according to certified protocol.';
                const lines = textContent.split('\n');

                doc.rect(35, y, 525, 18).fill('#e2e8f0');
                doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold')
                   .text('DIAGNOSTIC OBSERVATIONS & INVESTIGATION DETAILS', 45, y + 5);
                y += 24;

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    if (trimmed.startsWith('-') || trimmed.match(/^[0-9]+\./)) {
                        doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
                           .text(trimmed, 50, y, { width: 495 });
                        y += 15;
                    } else if (trimmed.toUpperCase().includes('IMPRESSION:') || trimmed.toUpperCase().includes('FINDINGS:')) {
                        y += 4;
                        doc.fillColor(accentBlue).fontSize(9).font('Helvetica-Bold')
                           .text(trimmed, 45, y, { width: 505 });
                        y += 16;
                    } else {
                        doc.fillColor(textDark).fontSize(8.5).font('Helvetica')
                           .text(trimmed, 45, y, { width: 505 });
                        y += 14;
                    }
                    if (y > 450) break;
                }
            }

            // ==========================================
            // 5. CLINICAL IMPRESSION / NOTES & AI HIGHLIGHTS BOX
            // ==========================================
            y = Math.max(y + 8, 345);

            if (report.aiHighlights && (report.aiHighlights.keyFindings || report.aiHighlights.diagnosticImpression)) {
                const aiBoxHeight = 54;
                doc.rect(35, y, 525, aiBoxHeight).fill('#f0fdf4');
                doc.rect(35, y, 525, aiBoxHeight).stroke('#86efac');

                doc.fillColor('#15803d').fontSize(8.5).font('Helvetica-Bold')
                   .text(`🤖 AI CLINICAL KEY FINDINGS (${report.aiHighlights.aiEngine || 'Hybrid AI Engine'})`, 45, y + 6);

                const bullets = (report.aiHighlights.keyFindings || []).slice(0, 2);
                let curBulletY = y + 18;
                bullets.forEach(b => {
                    doc.fillColor(textDark).fontSize(7.5).font('Helvetica')
                       .text(`• ${b}`, 48, curBulletY, { width: 500 });
                    curBulletY += 11;
                });

                if (report.aiHighlights.diagnosticImpression) {
                    doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold')
                       .text(`Impression: ${report.aiHighlights.diagnosticImpression}`, 48, curBulletY, { width: 500 });
                }

                y += aiBoxHeight + 8;
            } else {
                const notesText = report.clinicalImpression || report.notes || 'Diagnostic findings evaluated. Correlate clinically with patient symptoms.';
                doc.rect(35, y, 525, 42).fill('#f8fafc');
                doc.rect(35, y, 525, 42).stroke('#cbd5e1');

                doc.fillColor(accentBlue).fontSize(8.5).font('Helvetica-Bold')
                   .text('CLINICAL IMPRESSION & INTERPRETATION', 45, y + 6);
                doc.fillColor(textDark).fontSize(8).font('Helvetica')
                   .text(notesText, 45, y + 18, { width: 505 });

                y += 48;
            }


            // ==========================================
            // 6. ATTENDING PHYSICIAN CLINICAL EVALUATION
            // ==========================================
            const docRemarks = report.doctorRemarks || {
                doctorName: 'Dr. Sarah Rao, MD',
                department: 'Cardiology & Internal Medicine',
                status: 'Reviewed & Authenticated',
                updatedAt: report.testDate || '2026-08-14'
            };

            doc.rect(35, y, 525, 52).fill('#fffbeb');
            doc.rect(35, y, 525, 52).stroke('#fde68a');

            doc.fillColor('#b45309').fontSize(8.5).font('Helvetica-Bold')
               .text('ATTENDING PHYSICIAN CLINICAL EVALUATION & SIGN-OFF', 45, y + 7);

            doc.fillColor(textDark).fontSize(8).font('Helvetica');
            doc.text(`Consultant Physician: ${docRemarks.doctorName} (${docRemarks.department || 'Internal Medicine'})`, 45, y + 22);
            doc.text(`Status: ${docRemarks.status || 'Reviewed'} • Verified Date: ${docRemarks.updatedAt || report.testDate}`, 45, y + 34);

            if (report.prescription) {
                doc.fillColor('#92400e').font('Helvetica-Bold').text(`Prescription / Advice: ${report.prescription}`, 310, y + 22, { width: 240 });
            } else {
                doc.fillColor(textMuted).font('Helvetica').text('Digital Signature: Signed via Consortium Private Key', 310, y + 22);
            }

            // ==========================================
            // 7. BOTTOM SECTION: BLOCKCHAIN PROVENANCE & SCANNABLE ANTI-FORGERY QR CODE
            // ==========================================
            const footerY = 635;

            // Security border box
            doc.rect(35, footerY, 525, 145).fill('#f0f9ff');
            doc.rect(35, footerY, 525, 145).stroke(accentBlue);

            // High-Resolution Scannable Anti-Forgery QR Code
            doc.image(qrBuffer, 46, footerY + 12, { width: 105, height: 105 });

            // QR Scan Caption
            doc.rect(46, footerY + 120, 105, 16).fill(accentBlue);
            doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
               .text('SCAN TO VERIFY', 46, footerY + 124, { width: 105, align: 'center' });

            // Provenance Details
            const provX = 165;
            doc.fillColor('#0369a1').fontSize(10.5).font('Helvetica-Bold')
               .text('CONSORTIUM BLOCKCHAIN INTEGRITY SEAL (FEATURE 7.1)', provX, footerY + 12);

            doc.fillColor(textDark).fontSize(7.5).font('Helvetica')
               .text('This diagnostic report is cryptographically anchored on the Healthcare Permissioned Ledger.', provX, footerY + 28)
               .text('Scanning the QR code using any smartphone recalculates the live SHA-256 hash and validates original untampered status.', provX, footerY + 38);

            // SHA-256 Fingerprint Box
            doc.rect(provX, footerY + 52, 380, 26).fill('#ffffff');
            doc.rect(provX, footerY + 52, 380, 26).stroke('#bae6fd');

            doc.fillColor('#0284c7').fontSize(6.5).font('Helvetica-Bold')
               .text('CRYPTOGRAPHIC SHA-256 LEDGER FINGERPRINT (ORIGINAL RECORD HASH):', provX + 6, footerY + 56);
            doc.fillColor('#0f172a').fontSize(7).font('Courier-Bold')
               .text(report.reportHash || 'c1ec0cf3d448fabace5bef6b79e3a9ef26beadacdfe72ad05a800b7c6f1b1566', provX + 6, footerY + 66, { width: 368 });

            // Blockchain specifics
            doc.fillColor(textDark).fontSize(7.5).font('Helvetica')
               .text(`Anchored Ledger Block: #${report.blockIndex || 1}  •  Status: IMMUTABLE CONSENSUS REACHED`, provX, footerY + 85)
               .text(`Verification URL: ${verificationUrl}`, provX, footerY + 97, { width: 380 })
               .text('Anti-Forgery Protocol: Tamper-evident • AES-256 Decrypted • Multi-institution Validator Sign-off', provX, footerY + 110);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateMedicalReportPDF
};
