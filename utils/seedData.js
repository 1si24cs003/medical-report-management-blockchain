const fs = require('fs');
const path = require('path');
const { computeSHA256, encryptBuffer } = require('./cryptoUtils');

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

/**
 * Creates seed medical report files with AES-256 encryption and returns their metadata
 */
function createSeedReports(uploadsDir) {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const reports = [
        {
            reportId: 'REP-7A91F2C4',
            patientId: 'usr_pat_01',
            patientName: 'John Doe',
            patientPseudonym: 'PT-9901',
            uploadedBy: 'Alex Smith (Lab Staff)',
            uploaderId: 'usr_lab_01',
            uploaderRole: 'Lab Staff',
            title: 'Fasting Blood Glucose & HbA1c Diagnostic Report',
            reportType: 'Pathology / Biochemistry',
            testDate: '2026-08-14',
            notes: 'Patient presented with mild fatigue and polydipsia. Routine glycemic profile evaluation.',
            keywords: ['Blood Sugar', 'Glucose', 'Fasting Blood Sugar', 'HbA1c', 'Diabetes', 'Insulin'],
            categories: ['Blood Sugar / Diabetes'],
            fileName: 'JohnDoe_Glucose_Report_Aug2026.pdf',
            mimeType: 'application/pdf',
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
            uploadedBy: 'Dr. Rajesh Nair (Doctor)',
            uploaderId: 'usr_doc_02',
            uploaderRole: 'Doctor',
            title: 'Lumbosacral Spine Digital X-Ray Examination',
            reportType: 'Radiology / Imaging',
            testDate: '2026-09-02',
            notes: 'Complaints of chronic lower back pain following occupational heavy lifting.',
            keywords: ['Fracture', 'X-Ray', 'Spine', 'Lumbar', 'Bone', 'Trauma'],
            categories: ['Radiology / Orthopedic'],
            fileName: 'JohnDoe_Spine_XRay_Sep2026.png',
            mimeType: 'image/png',
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
            uploadedBy: 'Alex Smith (Lab Staff)',
            uploaderId: 'usr_lab_01',
            uploaderRole: 'Lab Staff',
            title: 'Complete Blood Count (CBC) with Differential',
            reportType: 'Hematology',
            testDate: '2026-09-28',
            notes: 'Pre-procedural hematological workup and general health screening.',
            keywords: ['Hemoglobin', 'Wbc', 'Rbc', 'Platelet', 'Hematocrit', 'Cbc'],
            categories: ['Hematology / CBC'],
            fileName: 'JohnDoe_CBC_Screening_Sep2026.pdf',
            mimeType: 'application/pdf',
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
            uploadedBy: 'Alex Smith (Lab Staff)',
            uploaderId: 'usr_lab_01',
            uploaderRole: 'Lab Staff',
            title: 'Comprehensive Lipid Profile & Cardiac Risk Panel',
            reportType: 'Cardiovascular / Biochemistry',
            testDate: '2026-09-15',
            notes: 'Routine executive health checkup and lipid assessment.',
            keywords: ['Cholesterol', 'Triglycerides', 'Lipid', 'Hdl', 'Ldl', 'Blood Pressure'],
            categories: ['Cardiovascular'],
            fileName: 'MeeraPatel_Lipid_Profile_Sep2026.pdf',
            mimeType: 'application/pdf',
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

    const processedReports = [];

    for (const rep of reports) {
        const rawBuffer = Buffer.from(rep.sampleContent, 'utf-8');
        const fileHash = computeSHA256(rawBuffer);
        const encryptedBuffer = encryptBuffer(rawBuffer);

        const storageFilename = `${rep.reportId}_encrypted.bin`;
        const storagePath = path.join(uploadsDir, storageFilename);
        fs.writeFileSync(storagePath, encryptedBuffer);

        processedReports.push({
            ...rep,
            reportHash: fileHash,
            storageReference: storageFilename,
            fileSize: rawBuffer.length,
            encryptedSize: encryptedBuffer.length,
            createdAt: new Date(rep.testDate).toISOString(),
            status: 'ANCHORED_ON_BLOCKCHAIN'
        });
    }

    return processedReports;
}

module.exports = {
    SAMPLE_USERS,
    createSeedReports
};
