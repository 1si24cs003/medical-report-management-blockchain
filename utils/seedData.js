const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { computeSHA256, encryptBuffer } = require('./cryptoUtils');
const { generateMedicalReportPDF } = require('./pdfGenerator');

const SAMPLE_USERS = [
    {
        id: 'usr_doc_01',
        name: 'Dr. Sarah Rao',
        email: 'dr.sarah@hospital.org',
        role: 'Doctor',
        department: 'Cardiology & General Medicine',
        hospital: 'Metro Apex Hospital',
        license: 'MC-2018-9941'
    },
    {
        id: 'usr_doc_02',
        name: 'Dr. Rajesh Nair',
        email: 'dr.rajesh@hospital.org',
        role: 'Doctor',
        department: 'Orthopedics & Trauma',
        hospital: 'Metro Apex Hospital',
        license: 'MC-2015-4412'
    },
    {
        id: 'usr_pat_01',
        name: 'John Doe',
        email: 'john.doe@patient.net',
        role: 'Patient',
        patientId: 'PT-9901',
        age: 48,
        gender: 'Male',
        bloodGroup: 'O+',
        contact: '+91 98765 43210'
    },
    {
        id: 'usr_pat_02',
        name: 'Meera Patel',
        email: 'meera.patel@patient.net',
        role: 'Patient',
        patientId: 'PT-9902',
        age: 34,
        gender: 'Female',
        bloodGroup: 'B+',
        contact: '+91 98450 11223'
    },
    {
        id: 'usr_lab_01',
        name: 'Alex Smith',
        email: 'alex.lab@pathology.org',
        role: 'Lab Staff',
        designation: 'Senior Lab Technologist',
        laboratory: 'Pathology Diagnostics Lab',
        license: 'LAB-TECH-772'
    },
    {
        id: 'usr_adm_01',
        name: 'Consortium SuperAdmin',
        email: 'admin@healthchain.gov',
        role: 'Admin',
        institution: 'Healthcare Consortium Blockchain Authority'
    }
];

const SEED_REPORT_DEFINITIONS = [
    {
        reportId: 'REP-7A91F2C4',
        patientId: 'usr_pat_01',
        patientName: 'John Doe',
        patientPseudonym: 'PT-9901',
        age: 48,
        gender: 'Male',
        uploadedBy: 'Alex Smith (Lab Staff)',
        uploaderId: 'usr_lab_01',
        uploaderRole: 'Lab Staff',
        nodeId: 'NODE-LAB-01',
        title: 'Fasting Blood Glucose & HbA1c Diagnostic Report',
        reportType: 'Pathology / Biochemistry',
        testDate: '2026-08-14',
        notes: 'Patient presented with mild fatigue and polydipsia. Routine glycemic profile evaluation.',
        clinicalImpression: 'Indicative of early Stage-2 Type 2 Diabetes Mellitus with elevated glycemic variability. Advised strict glycemic control, lifestyle modification, and endocrinology follow-up in 90 days.',
        prescription: 'Tab. Metformin 500mg BD after meals; 45 mins brisk walking daily.',
        doctorRemarks: {
            doctorName: 'Dr. Sarah Rao, MD',
            doctorId: 'usr_doc_01',
            department: 'Cardiology & General Medicine',
            hospital: 'Metro Apex Hospital',
            updatedAt: '2026-08-14T14:30:00Z',
            status: 'Reviewed & Prescribed'
        },
        diagnosisStatus: 'Reviewed & Prescribed',
        followUpDate: '2026-11-14',
        keywords: ['Blood Sugar', 'Glucose', 'Fasting Blood Sugar', 'HbA1c', 'Diabetes', 'Insulin'],
        categories: ['Blood Sugar / Diabetes'],
        fileName: 'JohnDoe_Glucose_Report_Aug2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Fasting Blood Sugar (FBS)', value: '142 mg/dL', ref: '70 - 99 mg/dL', status: 'HIGH', isAbnormal: true },
            { parameter: 'Postprandial Blood Glucose (PPBS)', value: '198 mg/dL', ref: '< 140 mg/dL', status: 'ELEVATED', isAbnormal: true },
            { parameter: 'Glycated Hemoglobin (HbA1c)', value: '7.4 %', ref: '4.0 - 5.6 %', status: 'DIABETIC', isAbnormal: true },
            { parameter: 'Estimated Average Glucose (eAG)', value: '165 mg/dL', ref: '< 114 mg/dL', status: 'ELEVATED', isAbnormal: true },
            { parameter: 'Fasting Serum Insulin', value: '18.2 uIU/mL', ref: '2.6 - 24.9 uIU/mL', status: 'NORMAL', isAbnormal: false }
        ],
        sampleContent: `PATIENT DIAGNOSTIC REPORT - METRO APEX HOSPITAL
Patient: John Doe | ID: PT-9901 | Age: 48 | Sex: M
Date of Test: 14-Aug-2026 | Lab Ref: LAB-88910

BIOCHEMISTRY INVESTIGATION:
1. Fasting Blood Sugar (FBS): 142 mg/dL (Normal: 70 - 99 mg/dL) [HIGH]
2. Postprandial Blood Glucose: 198 mg/dL (Normal: < 140 mg/dL) [ELEVATED]
3. Glycated Hemoglobin (HbA1c): 7.4% (Normal: 4.0 - 5.6%) [DIABETIC RANGE]

Impression: Indicative of early Stage-2 Type 2 Diabetes Mellitus.
Recommended: Lifestyle modification, glycemic control follow-up in 90 days.
Signed: Alex Smith, Senior Biochemist`
    },
    {
        reportId: 'REP-8D44B190',
        patientId: 'usr_pat_01',
        patientName: 'John Doe',
        patientPseudonym: 'PT-9901',
        age: 48,
        gender: 'Male',
        uploadedBy: 'Dr. Rajesh Nair (Doctor)',
        uploaderId: 'usr_doc_02',
        uploaderRole: 'Doctor',
        nodeId: 'NODE-HOSP-01',
        title: 'Lumbosacral Spine Digital X-Ray Examination',
        reportType: 'Radiology / Imaging',
        testDate: '2026-09-02',
        notes: 'Complaints of chronic lower back pain following occupational heavy lifting.',
        clinicalImpression: 'No acute cortical fracture or vertebral dislocation identified. Mild lumbar spondylosis with degenerative disc space narrowing at L4-L5 and L5-S1 interspaces.',
        prescription: 'Core lumbar stabilization physiotherapy; ergonomically contoured lumbar support belt.',
        doctorRemarks: {
            doctorName: 'Dr. Rajesh Nair, MS',
            doctorId: 'usr_doc_02',
            department: 'Orthopedics & Trauma',
            hospital: 'Metro Apex Hospital',
            updatedAt: '2026-09-02T16:15:00Z',
            status: 'Evaluated & Rehabilitation Prescribed'
        },
        diagnosisStatus: 'Evaluated & Rehabilitation Prescribed',
        followUpDate: '2026-10-15',
        keywords: ['Fracture', 'X-Ray', 'Spine', 'Lumbar', 'Bone', 'Trauma', 'Spondylosis'],
        categories: ['Radiology / Orthopedic'],
        fileName: 'JohnDoe_Spine_XRay_Report_Sep2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Lumbar Vertebral Alignment', value: 'Preserved Lordosis', ref: 'Normal Anatomical Curve', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Cortical Margins & Density', value: 'Intact, No Fracture', ref: 'Intact Cortices', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Intervertebral Disc Height', value: 'Narrowing at L4-L5 & L5-S1', ref: 'Uniform Intervertebral Space', status: 'DEGENERATIVE', isAbnormal: true },
            { parameter: 'Anterior Marginal Osteophytes', value: 'Early Spurring Present', ref: 'Absent Osteophytes', status: 'BORDERLINE', isAbnormal: true },
            { parameter: 'Paraspinal Soft Tissue Contours', value: 'Symmetrical / Normal', ref: 'Normal Soft Tissue Contour', status: 'NORMAL', isAbnormal: false }
        ],
        sampleContent: `RADIOLOGY & IMAGING REPORT - METRO APEX HOSPITAL
Patient: John Doe | ID: PT-9901 | Age: 48 | Sex: M
Exam: Digital X-Ray Lumbosacral Spine AP & Lateral Views
Date: 02-Sep-2026

FINDINGS:
- Alignment of lumbar vertebral bodies is preserved.
- No obvious acute cortical fracture or dislocation identified.
- Mild degenerative disc space narrowing at L4-L5 and L5-S1 interspaces.
- Early anterior osteophytic spurring noted.
- Paraspinal soft tissue contours appear normal.

IMPRESSION:
No acute fracture. Mild lumbar spondylosis with degenerative disc changes.
Advised: Physical therapy, ergonomic lumbar support.
Radiologist: Dr. Rajesh Nair, MD (Radio-diagnosis)`
    },
    {
        reportId: 'REP-9E11C83F',
        patientId: 'usr_pat_01',
        patientName: 'John Doe',
        patientPseudonym: 'PT-9901',
        age: 48,
        gender: 'Male',
        uploadedBy: 'Alex Smith (Lab Staff)',
        uploaderId: 'usr_lab_01',
        uploaderRole: 'Lab Staff',
        nodeId: 'NODE-LAB-01',
        title: 'Complete Blood Count (CBC) with Differential',
        reportType: 'Hematology',
        testDate: '2026-09-28',
        notes: 'Pre-procedural hematological workup and general health screening.',
        clinicalImpression: 'Normocytic, normochromic peripheral smear. Complete blood count parameters within normal biological reference intervals. No evidence of infection, anemia, or thrombocytopenia.',
        prescription: 'Normal health maintenance; balanced nutritional intake.',
        doctorRemarks: {
            doctorName: 'Dr. Sarah Rao, MD',
            doctorId: 'usr_doc_01',
            department: 'Cardiology & General Medicine',
            hospital: 'Metro Apex Hospital',
            updatedAt: '2026-09-28T11:45:00Z',
            status: 'Verified Normal'
        },
        diagnosisStatus: 'Verified Normal',
        followUpDate: '2027-03-28',
        keywords: ['Hemoglobin', 'Wbc', 'Rbc', 'Platelet', 'Hematocrit', 'Cbc'],
        categories: ['Hematology / CBC'],
        fileName: 'JohnDoe_CBC_Screening_Sep2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Hemoglobin (Hb)', value: '14.8 g/dL', ref: '13.5 - 17.5 g/dL', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Total Leucocyte Count (WBC)', value: '6,900 /cumm', ref: '4,000 - 11,000 /cumm', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Platelet Count', value: '265,000 /cumm', ref: '150,000 - 450,000 /cumm', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Packed Cell Volume (Hematocrit)', value: '44.2 %', ref: '40.0 - 52.0 %', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Total RBC Count', value: '4.90 mil/cumm', ref: '4.50 - 5.90 mil/cumm', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Neutrophils', value: '62 %', ref: '40 - 75 %', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Lymphocytes', value: '30 %', ref: '20 - 45 %', status: 'NORMAL', isAbnormal: false }
        ],
        sampleContent: `HEMATOLOGY WORKUP REPORT - METRO APEX HOSPITAL
Patient: John Doe | ID: PT-9901 | Age: 48 | Sex: M
Date: 28-Sep-2026 | Automated Cell Counter Analyzer

COMPLETE BLOOD COUNT:
- Hemoglobin (Hb): 14.8 g/dL (Ref: 13.5 - 17.5 g/dL) [NORMAL]
- Total Leucocyte Count (WBC): 6,900 /cumm (Ref: 4,000 - 11,000) [NORMAL]
- Platelet Count: 265,000 /cumm (Ref: 150,000 - 450,000) [NORMAL]
- Packed Cell Volume (Hematocrit): 44.2% (Ref: 40 - 52%) [NORMAL]
- RBC Count: 4.9 million/cumm (Ref: 4.5 - 5.9) [NORMAL]

Interpretation: Normocytic, normochromic peripheral smear. No hematological abnormalities detected.`
    },
    {
        reportId: 'REP-3C55A701',
        patientId: 'usr_pat_02',
        patientName: 'Meera Patel',
        patientPseudonym: 'PT-9902',
        age: 34,
        gender: 'Female',
        uploadedBy: 'Alex Smith (Lab Staff)',
        uploaderId: 'usr_lab_01',
        uploaderRole: 'Lab Staff',
        nodeId: 'NODE-LAB-01',
        title: 'Comprehensive Lipid Profile & Cardiac Risk Panel',
        reportType: 'Cardiovascular / Biochemistry',
        testDate: '2026-09-15',
        notes: 'Routine executive health checkup and lipid assessment.',
        clinicalImpression: 'Normal lipid profile with low cardiovascular risk index. Borderline LDL noted; advised Mediterranean diet with reduced saturated fat and regular cardio exercise.',
        prescription: 'Lifestyle and dietary modification; recheck fasting lipid profile in 12 months.',
        doctorRemarks: {
            doctorName: 'Dr. Sarah Rao, MD',
            doctorId: 'usr_doc_01',
            department: 'Cardiology & General Medicine',
            hospital: 'Metro Apex Hospital',
            updatedAt: '2026-09-15T15:00:00Z',
            status: 'Reviewed & Advised'
        },
        diagnosisStatus: 'Reviewed & Advised',
        followUpDate: '2027-09-15',
        keywords: ['Cholesterol', 'Triglycerides', 'Lipid', 'Hdl', 'Ldl', 'Blood Pressure'],
        categories: ['Cardiovascular'],
        fileName: 'MeeraPatel_Lipid_Profile_Sep2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Total Serum Cholesterol', value: '185 mg/dL', ref: '< 200 mg/dL', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Serum Triglycerides', value: '132 mg/dL', ref: '< 150 mg/dL', status: 'NORMAL', isAbnormal: false },
            { parameter: 'HDL Cholesterol (Protective)', value: '54 mg/dL', ref: '> 50 mg/dL', status: 'OPTIMAL', isAbnormal: false },
            { parameter: 'LDL Cholesterol (Calculated)', value: '105 mg/dL', ref: '< 100 mg/dL', status: 'BORDERLINE', isAbnormal: true },
            { parameter: 'VLDL Cholesterol', value: '26.4 mg/dL', ref: '5.0 - 40.0 mg/dL', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Total Cholesterol / HDL Ratio', value: '3.42', ref: '< 4.50 Ratio', status: 'NORMAL', isAbnormal: false }
        ],
        sampleContent: `LIPID PROFILE INVESTIGATION - PATHOLOGY DIAGNOSTICS LAB
Patient: Meera Patel | ID: PT-9902 | Age: 34 | Sex: F
Date: 15-Sep-2026

LIPID PANEL:
- Total Serum Cholesterol: 185 mg/dL (Desirable: < 200 mg/dL) [NORMAL]
- Serum Triglycerides: 132 mg/dL (Normal: < 150 mg/dL) [NORMAL]
- HDL Cholesterol: 54 mg/dL (Protective: > 50 mg/dL) [GOOD]
- LDL Cholesterol: 105 mg/dL (Optimal: < 100 mg/dL) [BORDERLINE]
- VLDL Cholesterol: 26.4 mg/dL (Ref: 5 - 40 mg/dL) [NORMAL]

Impression: Normal lipid profile with low cardiovascular risk index.`
    }
];

/**
 * Creates seed medical report files with AES-256 encryption and returns their metadata.
 * Generates genuine clinical PDFs with embedded scannable QR codes.
 */
async function createSeedReports(uploadsDir, hostUrl = 'http://localhost:3000') {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const processedReports = [];

    for (let i = 0; i < SEED_REPORT_DEFINITIONS.length; i++) {
        const rep = { ...SEED_REPORT_DEFINITIONS[i] };
        rep.blockIndex = i + 1; // Anticipated block index

        // Generate genuine binary PDF buffer with embedded scannable QR code
        const pdfBuffer = await generateMedicalReportPDF(rep, hostUrl);
        const fileHash = computeSHA256(pdfBuffer);
        rep.reportHash = fileHash;

        // Re-generate QR code data URL for frontend UI display
        const verificationUrl = `${hostUrl}/verify.html?reportId=${rep.reportId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            color: { dark: '#0b132b', light: '#ffffff' }
        });

        const encryptedBuffer = encryptBuffer(pdfBuffer);
        const storageFilename = `${rep.reportId}_encrypted.bin`;
        const storagePath = path.join(uploadsDir, storageFilename);
        fs.writeFileSync(storagePath, encryptedBuffer);

        processedReports.push({
            ...rep,
            storageReference: storageFilename,
            fileSize: pdfBuffer.length,
            encryptedSize: encryptedBuffer.length,
            qrCodeDataUrl,
            verificationUrl,
            createdAt: new Date(rep.testDate).toISOString(),
            status: 'ANCHORED_ON_BLOCKCHAIN'
        });
    }

    return processedReports;
}

module.exports = {
    SAMPLE_USERS,
    SEED_REPORT_DEFINITIONS,
    createSeedReports
};
