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
        id: 'usr_doc_03',
        name: 'Dr. Ananya Sen',
        email: 'dr.ananya@clinic.org',
        role: 'Doctor',
        department: 'Pulmonology & Respiratory Care',
        hospital: 'City Care Clinic',
        license: 'MC-2019-3382'
    },
    {
        id: 'usr_doc_04',
        name: 'Dr. Vikram Mehta',
        email: 'dr.vikram@neuro.org',
        role: 'Doctor',
        department: 'Neurology & Spine Care',
        hospital: 'Apex Neuro Institute',
        license: 'MC-2014-8821'
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
        id: 'usr_pat_03',
        name: 'Robert Chen',
        email: 'robert.chen@patient.net',
        role: 'Patient',
        patientId: 'PT-9903',
        age: 54,
        gender: 'Male',
        bloodGroup: 'A+',
        contact: '+91 97112 33445'
    },
    {
        id: 'usr_pat_04',
        name: 'Ayesha Khan',
        email: 'ayesha.khan@patient.net',
        role: 'Patient',
        patientId: 'PT-9904',
        age: 29,
        gender: 'Female',
        bloodGroup: 'AB+',
        contact: '+91 98221 55667'
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
    // -------------------------------------------------------------
    // PATIENT 1: JOHN DOE (PT-9901) - 3 CHRONOLOGICAL INVESTIGATIONS
    // -------------------------------------------------------------
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
        aiHighlights: {
            keyFindings: [
                'Fasting Blood Sugar: 142 mg/dL (Elevated, Diabetic baseline)',
                'Postprandial Glucose: 198 mg/dL (Exceeds 140 mg/dL normal threshold)',
                'HbA1c: 7.4% (Consistent with early Stage-2 Type 2 Diabetes)'
            ],
            abnormalFlags: [
                'Elevated Fasting Glucose (142 mg/dL) vs Normal (70-99 mg/dL)',
                'Elevated HbA1c (7.4%) vs Normal (< 5.7%)'
            ],
            diagnosticImpression: 'Confirmed Stage-2 Type 2 Diabetes Mellitus with moderate glycemic variability.',
            recommendedAction: 'Initiate metformin oral therapy; follow up in 90 days with repeat HbA1c.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `PATIENT DIAGNOSTIC REPORT - METRO APEX HOSPITAL\nPatient: John Doe | ID: PT-9901 | Age: 48 | Sex: M\nDate of Test: 14-Aug-2026 | Lab Ref: LAB-88910\n\nBIOCHEMISTRY INVESTIGATION:\n1. Fasting Blood Sugar (FBS): 142 mg/dL (Normal: 70 - 99 mg/dL) [HIGH]\n2. Postprandial Blood Glucose: 198 mg/dL (Normal: < 140 mg/dL) [ELEVATED]\n3. Glycated Hemoglobin (HbA1c): 7.4% (Normal: 4.0 - 5.6%) [DIABETIC RANGE]`
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
        aiHighlights: {
            keyFindings: [
                'Vertebral Cortices: Intact (Acute traumatic fracture excluded)',
                'Disc Spaces: Degenerative narrowing at L4-L5 and L5-S1 levels',
                'Osteophytes: Early anterior lumbar marginal spurring'
            ],
            abnormalFlags: [
                'Degenerative lumbar disc space narrowing at L4-L5 and L5-S1',
                'No acute traumatic cortical discontinuity identified'
            ],
            diagnosticImpression: 'Mild lumbar spondylosis with multilevel degenerative disc arthropathy; no fracture.',
            recommendedAction: 'Engage in core-strengthening physical therapy; ergonomic work posture modification.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `RADIOLOGY & IMAGING REPORT - METRO APEX HOSPITAL\nPatient: John Doe | ID: PT-9901 | Age: 48 | Sex: M\nExam: Digital X-Ray Lumbosacral Spine AP & Lateral Views\nDate: 02-Sep-2026\n\nFINDINGS:\n- Alignment of lumbar vertebral bodies is preserved.\n- No obvious acute cortical fracture or dislocation identified.\n- Mild degenerative disc space narrowing at L4-L5 and L5-S1 interspaces.\n- Early anterior osteophytic spurring noted.\n\nIMPRESSION:\nNo acute fracture. Mild lumbar spondylosis with degenerative disc changes.`
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
        aiHighlights: {
            keyFindings: [
                'Hemoglobin: 14.8 g/dL (Adequate, no anemia)',
                'Leukocyte Count (WBC): 6,900 /cumm (Normal immune baseline)',
                'Platelets: 265,000 /cumm (Optimal coagulation baseline)'
            ],
            abnormalFlags: [
                'No hematological anomalies or cytopenias flagged'
            ],
            diagnosticImpression: 'Complete blood count within optimal physiological reference parameters.',
            recommendedAction: 'Routine preventive healthcare monitoring in 6-12 months.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `HEMATOLOGY WORKUP REPORT - METRO APEX HOSPITAL\nPatient: John Doe | ID: PT-9901 | Age: 48 | Sex: M\nDate: 28-Sep-2026 | Automated Cell Counter Analyzer\n\nCOMPLETE BLOOD COUNT:\n- Hemoglobin (Hb): 14.8 g/dL (Ref: 13.5 - 17.5 g/dL) [NORMAL]\n- Total Leucocyte Count (WBC): 6,900 /cumm (Ref: 4,000 - 11,000) [NORMAL]\n- Platelet Count: 265,000 /cumm (Ref: 150,000 - 450,000) [NORMAL]\n- RBC Count: 4.9 million/cumm (Ref: 4.5 - 5.9) [NORMAL]`
    },

    // -------------------------------------------------------------
    // PATIENT 2: MEERA PATEL (PT-9902) - 2 INVESTIGATIONS
    // -------------------------------------------------------------
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
        aiHighlights: {
            keyFindings: [
                'Total Cholesterol: 185 mg/dL (Desirable range < 200 mg/dL)',
                'HDL Cholesterol: 54 mg/dL (Protective cardiovascular fraction)',
                'Calculated LDL: 105 mg/dL (Borderline elevation)'
            ],
            abnormalFlags: [
                'Borderline calculated LDL (105 mg/dL) vs Desirable (< 100 mg/dL)'
            ],
            diagnosticImpression: 'Favorable global lipid panel with isolated mild borderline LDL cholesterol elevation.',
            recommendedAction: 'Adopt dietary saturated fat reduction; recheck fasting profile in 12 months.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `LIPID PROFILE INVESTIGATION - PATHOLOGY DIAGNOSTICS LAB\nPatient: Meera Patel | ID: PT-9902 | Age: 34 | Sex: F\nDate: 15-Sep-2026\n\nLIPID PANEL:\n- Total Serum Cholesterol: 185 mg/dL (Desirable: < 200 mg/dL) [NORMAL]\n- Serum Triglycerides: 132 mg/dL (Normal: < 150 mg/dL) [NORMAL]\n- HDL Cholesterol: 54 mg/dL (Protective: > 50 mg/dL) [GOOD]\n- LDL Cholesterol: 105 mg/dL (Optimal: < 100 mg/dL) [BORDERLINE]`
    },
    {
        reportId: 'REP-5C32F810',
        patientId: 'usr_pat_02',
        patientName: 'Meera Patel',
        patientPseudonym: 'PT-9902',
        age: 34,
        gender: 'Female',
        uploadedBy: 'Alex Smith (Lab Staff)',
        uploaderId: 'usr_lab_01',
        uploaderRole: 'Lab Staff',
        nodeId: 'NODE-LAB-01',
        title: 'Thyroid Stimulating Hormone (TSH) & Free T4 Profile',
        reportType: 'Endocrine / Hormonal',
        testDate: '2026-10-02',
        notes: 'Complaints of chronic sluggishness, fatigue, and cold intolerance.',
        clinicalImpression: 'Serum TSH mildly elevated at 5.42 uIU/mL with normal peripheral Free T4 (1.18 ng/dL). Picture consistent with subclinical hypothyroidism.',
        prescription: 'Tab. Levothyroxine 25 mcg OD in morning on empty stomach.',
        doctorRemarks: {
            doctorName: 'Dr. Sarah Rao, MD',
            doctorId: 'usr_doc_01',
            department: 'Cardiology & General Medicine',
            hospital: 'Metro Apex Hospital',
            updatedAt: '2026-10-02T12:00:00Z',
            status: 'Prescribed & Monitoring'
        },
        diagnosisStatus: 'Prescribed & Monitoring',
        followUpDate: '2026-11-28',
        keywords: ['Thyroid', 'Tsh', 'T4', 'Endocrine', 'Hormone'],
        categories: ['Endocrine'],
        fileName: 'MeeraPatel_Thyroid_Panel_Oct2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Thyroid Stimulating Hormone (TSH)', value: '5.42 uIU/mL', ref: '0.45 - 4.50 uIU/mL', status: 'ELEVATED', isAbnormal: true },
            { parameter: 'Free Thyroxine (FT4)', value: '1.18 ng/dL', ref: '0.82 - 1.77 ng/dL', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Free Triiodothyronine (FT3)', value: '3.12 pg/mL', ref: '2.00 - 4.40 pg/mL', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Thyroid Peroxidase (TPO) Antibody', value: '14.2 IU/mL', ref: '< 34.0 IU/mL', status: 'NEGATIVE', isAbnormal: false }
        ],
        aiHighlights: {
            keyFindings: [
                'Serum TSH: 5.42 uIU/mL (Mild elevation above 4.50 uIU/mL threshold)',
                'Free T4: 1.18 ng/dL (Normal circulating peripheral thyroxine)',
                'TPO Antibodies: Negative (Absence of acute autoimmune thyroiditis)'
            ],
            abnormalFlags: [
                'Elevated TSH (5.42 uIU/mL) consistent with subclinical hypothyroid state'
            ],
            diagnosticImpression: 'Subclinical hypothyroidism with preserved peripheral thyroid hormone levels.',
            recommendedAction: 'Trial low-dose levothyroxine 25 mcg; repeat serum TSH in 8 weeks.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `ENDOCRINE INVESTIGATION - PATHOLOGY DIAGNOSTICS LAB\nPatient: Meera Patel | ID: PT-9902 | Age: 34 | Sex: F\nDate: 02-Oct-2026\n\nTHYROID PANEL:\n- TSH: 5.42 uIU/mL (Ref: 0.45 - 4.50 uIU/mL) [ELEVATED]\n- Free T4: 1.18 ng/dL (Ref: 0.82 - 1.77 ng/dL) [NORMAL]\n- Free T3: 3.12 pg/mL (Ref: 2.00 - 4.40 pg/mL) [NORMAL]\n\nImpression: Subclinical hypothyroidism with normal free hormone levels.`
    },

    // -------------------------------------------------------------
    // PATIENT 3: ROBERT CHEN (PT-9903) - 2 INVESTIGATIONS
    // -------------------------------------------------------------
    {
        reportId: 'REP-6A18D902',
        patientId: 'usr_pat_03',
        patientName: 'Robert Chen',
        patientPseudonym: 'PT-9903',
        age: 54,
        gender: 'Male',
        uploadedBy: 'Dr. Sarah Rao (Doctor)',
        uploaderId: 'usr_doc_01',
        uploaderRole: 'Doctor',
        nodeId: 'NODE-HOSP-01',
        title: '12-Lead Electrocardiogram & High-Sensitivity Troponin-I',
        reportType: 'Cardiovascular / Critical Care',
        testDate: '2026-09-10',
        notes: 'Presented to Emergency with acute atypical retrosternal chest discomfort radiating to left arm.',
        clinicalImpression: 'Sinus tachycardia (HR 96 bpm). Trace ST flattening in leads V4-V6 without acute ST-elevation. Serial Troponin-I within normal reference limits. Acute coronary syndrome excluded.',
        prescription: 'Tab. Aspirin 75mg OD; Tab. Atorvastatin 20mg HS; Urgent Stress Echocardiogram.',
        doctorRemarks: {
            doctorName: 'Dr. Sarah Rao, MD',
            doctorId: 'usr_doc_01',
            department: 'Cardiology & General Medicine',
            hospital: 'Metro Apex Hospital',
            updatedAt: '2026-09-10T18:00:00Z',
            status: 'Stabilized & Investigated'
        },
        diagnosisStatus: 'Stabilized & Investigated',
        followUpDate: '2026-09-18',
        keywords: ['Ecg', 'Electrocardiogram', 'Troponin', 'Cardiovascular', 'Heart Rate', 'Chest Pain'],
        categories: ['Cardiovascular'],
        fileName: 'RobertChen_ECG_Troponin_Sep2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Heart Rate (12-Lead ECG)', value: '96 bpm', ref: '60 - 100 bpm', status: 'NORMAL', isAbnormal: false },
            { parameter: 'High-Sensitivity Troponin-I (hs-cTnI)', value: '0.008 ng/mL', ref: '< 0.014 ng/mL', status: 'OPTIMAL', isAbnormal: false },
            { parameter: 'Creatine Kinase-MB (CK-MB)', value: '18.4 U/L', ref: '< 25.0 U/L', status: 'NORMAL', isAbnormal: false },
            { parameter: 'ST-Segment Deviation', value: 'Absent / Isoelectric', ref: 'Isoelectric Baseline', status: 'NORMAL', isAbnormal: false }
        ],
        aiHighlights: {
            keyFindings: [
                'Cardiac Biomarker hs-cTnI: 0.008 ng/mL (Myocardial necrosis ruled out)',
                '12-Lead Rhythm: Regular Sinus Rhythm at 96 bpm',
                'Enzyme Marker CK-MB: 18.4 U/L (Optimal physiological baseline)'
            ],
            abnormalFlags: [
                'No critical ischemic ST elevation or myocardial infarction markers identified'
            ],
            diagnosticImpression: 'Atypical chest discomfort with negative cardiac biomarkers; acute ischemia ruled out.',
            recommendedAction: 'Schedule outpatient stress echocardiography to assess inducible ischemia.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `CARDIOLOGY EMERGENCY ASSESSMENT - METRO APEX HOSPITAL\nPatient: Robert Chen | ID: PT-9903 | Age: 54 | Sex: M\nDate: 10-Sep-2026\n\nCARDIAC EVALUATION:\n- Heart Rate: 96 bpm (Sinus rhythm)\n- hs-Troponin-I: 0.008 ng/mL (Ref: < 0.014 ng/mL) [NORMAL]\n- CK-MB: 18.4 U/L (Ref: < 25.0 U/L) [NORMAL]\n\nImpression: Negative serial cardiac biomarkers. Acute coronary necrosis excluded.`
    },
    {
        reportId: 'REP-9F71E304',
        patientId: 'usr_pat_03',
        patientName: 'Robert Chen',
        patientPseudonym: 'PT-9903',
        age: 54,
        gender: 'Male',
        uploadedBy: 'Dr. Sarah Rao (Doctor)',
        uploaderId: 'usr_doc_01',
        uploaderRole: 'Doctor',
        nodeId: 'NODE-HOSP-01',
        title: 'Exercise Stress Echocardiogram & Left Ventricular Function Study',
        reportType: 'Cardiovascular / Imaging',
        testDate: '2026-09-18',
        notes: 'Follow-up functional stress investigation following ER evaluation on Sep 10.',
        clinicalImpression: 'Negative for inducible myocardial ischemia up to 9.2 METs. Preserved left ventricular systolic function with LVEF 62%. Good functional exercise tolerance.',
        prescription: 'Lifestyle modification; reduce sodium intake; routine cardiology follow-up in 6 months.',
        doctorRemarks: {
            doctorName: 'Dr. Sarah Rao, MD',
            doctorId: 'usr_doc_01',
            department: 'Cardiology & General Medicine',
            hospital: 'Metro Apex Hospital',
            updatedAt: '2026-09-18T14:30:00Z',
            status: 'Cleared & Outpatient Follow-up'
        },
        diagnosisStatus: 'Cleared & Outpatient Follow-up',
        followUpDate: '2027-03-18',
        keywords: ['Echocardiogram', 'Stress Test', 'Cardiovascular', 'Lvef', 'Ejection Fraction'],
        categories: ['Cardiovascular'],
        fileName: 'RobertChen_Stress_Echo_Sep2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Left Ventricular Ejection Fraction (LVEF)', value: '62 %', ref: '55 - 70 %', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Peak Workload Capacity', value: '9.2 METs', ref: '> 8.0 METs', status: 'EXCELLENT', isAbnormal: false },
            { parameter: 'Inducible Wall Motion Abnormality', value: 'None Detected', ref: 'Negative', status: 'NORMAL', isAbnormal: false },
            { parameter: 'Resting Blood Pressure', value: '128/82 mmHg', ref: '< 130/85 mmHg', status: 'NORMAL', isAbnormal: false }
        ],
        aiHighlights: {
            keyFindings: [
                'Resting & Post-Stress LVEF: 62% (Preserved myocardial contractility)',
                'Functional Workload: 9.2 METs (High physical capacity)',
                'Regional Wall Motion: Normal kinetics across all coronary territories'
            ],
            abnormalFlags: [
                'No exercise-induced regional wall motion abnormalities or ischemia'
            ],
            diagnosticImpression: 'Normal functional stress echocardiogram with preserved cardiac reserve.',
            recommendedAction: 'Discharge from acute cardiology monitoring; routine lifestyle maintenance.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `STRESS ECHOCARDIOGRAPHY - METRO APEX HOSPITAL\nPatient: Robert Chen | ID: PT-9903 | Age: 54 | Sex: M\nDate: 18-Sep-2026\n\nFUNCTIONAL STUDY:\n- Left Ventricular Ejection Fraction: 62% [NORMAL]\n- Peak Workload: 9.2 METs [EXCELLENT]\n- Regional Wall Motion Abnormality: None [NEGATIVE]\n\nImpression: Normal stress echocardiogram. No inducible ischemia.`
    },

    // -------------------------------------------------------------
    // PATIENT 4: AYESHA KHAN (PT-9904) - 2 INVESTIGATIONS
    // -------------------------------------------------------------
    {
        reportId: 'REP-2D44C119',
        patientId: 'usr_pat_04',
        patientName: 'Ayesha Khan',
        patientPseudonym: 'PT-9904',
        age: 29,
        gender: 'Female',
        uploadedBy: 'Dr. Ananya Sen (Doctor)',
        uploaderId: 'usr_doc_03',
        uploaderRole: 'Doctor',
        nodeId: 'NODE-CLINIC-01',
        title: 'High-Resolution Pulmonary Spirometry & Lung Function Test',
        reportType: 'Respiratory / Pulmonology',
        testDate: '2026-09-05',
        notes: 'Complaints of recurrent dry cough, expiratory wheezing triggered by dust and cold air.',
        clinicalImpression: 'Spirometry reveals mild reversible obstructive airway pattern with 15% post-bronchodilator FEV1 improvement. Findings diagnostic of mild bronchial asthma.',
        prescription: 'Inhaler Budesonide + Formoterol 200/6 mcg 1 puff BD; SOS Levosalbutamol inhaler.',
        doctorRemarks: {
            doctorName: 'Dr. Ananya Sen, MD',
            doctorId: 'usr_doc_03',
            department: 'Pulmonology & Respiratory Care',
            hospital: 'City Care Clinic',
            updatedAt: '2026-09-05T16:00:00Z',
            status: 'Diagnosed & Managed'
        },
        diagnosisStatus: 'Diagnosed & Managed',
        followUpDate: '2026-10-05',
        keywords: ['Spirometry', 'Pulmonary', 'Fev1', 'Asthma', 'Bronchial', 'Respiratory', 'Lung'],
        categories: ['Respiratory'],
        fileName: 'AyeshaKhan_Spirometry_Sep2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'FEV1 (Pre-Bronchodilator)', value: '2.42 L (78% Pred)', ref: '> 80% Predicted', status: 'MILD DECREASE', isAbnormal: true },
            { parameter: 'FEV1 (Post-Bronchodilator)', value: '2.78 L (+15%)', ref: '> 12% Reversibility', status: 'REVERSIBLE', isAbnormal: true },
            { parameter: 'Forced Vital Capacity (FVC)', value: '3.15 L (91% Pred)', ref: '> 80% Predicted', status: 'NORMAL', isAbnormal: false },
            { parameter: 'FEV1/FVC Ratio', value: '68.4 %', ref: '> 75.0 %', status: 'OBSTRUCTIVE', isAbnormal: true }
        ],
        aiHighlights: {
            keyFindings: [
                'FEV1/FVC Ratio: 68.4% (Obstructive ventilatory defect)',
                'Post-Bronchodilator FEV1 Reversibility: +15% (Significant bronchodilation)',
                'Forced Vital Capacity (FVC): 3.15 L (Normal lung volumes)'
            ],
            abnormalFlags: [
                'Reversible obstructive airflow limitation consistent with bronchial asthma'
            ],
            diagnosticImpression: 'Mild persistent bronchial asthma responsive to inhaled bronchodilators.',
            recommendedAction: 'Commence maintenance ICS-LABA combination therapy; repeat spirometry in 60 days.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `PULMONARY FUNCTION TEST - CITY CARE CLINIC NODE\nPatient: Ayesha Khan | ID: PT-9904 | Age: 29 | Sex: F\nDate: 05-Sep-2026\n\nSPIROMETRY:\n- FEV1 (Pre-BD): 2.42 L (78% Predicted) [MILD DECREASE]\n- FEV1 (Post-BD): 2.78 L (+15% Reversibility) [SIGNIFICANT REVERSIBILITY]\n- FEV1/FVC: 68.4% [OBSTRUCTIVE PATTERN]\n\nImpression: Reversible airflow limitation diagnostic of bronchial asthma.`
    },
    {
        reportId: 'REP-8B99A045',
        patientId: 'usr_pat_04',
        patientName: 'Ayesha Khan',
        patientPseudonym: 'PT-9904',
        age: 29,
        gender: 'Female',
        uploadedBy: 'Alex Smith (Lab Staff)',
        uploaderId: 'usr_lab_01',
        uploaderRole: 'Lab Staff',
        nodeId: 'NODE-LAB-01',
        title: 'Serum Total IgE & Comprehensive Respiratory Allergen Screen',
        reportType: 'Immunology / Allergy',
        testDate: '2026-09-22',
        notes: 'Allergen screening to pinpoint environmental hypersensitivity triggers.',
        clinicalImpression: 'Markedly elevated Total IgE (480 IU/mL). Strong positive specific IgE reactivity to House Dust Mites (D. pteronyssinus) Class 4. Negative for common fungal molds.',
        prescription: 'Allergen barrier bed encasings; HEPA room air purifier; oral antihistamines as needed.',
        doctorRemarks: {
            doctorName: 'Dr. Ananya Sen, MD',
            doctorId: 'usr_doc_03',
            department: 'Pulmonology & Respiratory Care',
            hospital: 'City Care Clinic',
            updatedAt: '2026-09-22T17:15:00Z',
            status: 'Reviewed & Addressed'
        },
        diagnosisStatus: 'Reviewed & Addressed',
        followUpDate: '2027-03-22',
        keywords: ['Ige', 'Allergy', 'Dust Mite', 'Immunology', 'Respiratory', 'Allergen'],
        categories: ['Respiratory'],
        fileName: 'AyeshaKhan_Allergen_Screen_Sep2026.pdf',
        mimeType: 'application/pdf',
        testParameters: [
            { parameter: 'Total Serum IgE', value: '480 IU/mL', ref: '< 100 IU/mL', status: 'HIGH', isAbnormal: true },
            { parameter: 'D. pteronyssinus (House Dust Mite)', value: '18.6 kUA/L', ref: '< 0.35 kUA/L', status: 'CLASS 4 (VERY HIGH)', isAbnormal: true },
            { parameter: 'D. farinae (House Dust Mite)', value: '14.2 kUA/L', ref: '< 0.35 kUA/L', status: 'CLASS 3 (HIGH)', isAbnormal: true },
            { parameter: 'Aspergillus fumigatus (Mold)', value: '0.12 kUA/L', ref: '< 0.35 kUA/L', status: 'NEGATIVE', isAbnormal: false }
        ],
        aiHighlights: {
            keyFindings: [
                'Total Serum IgE: 480 IU/mL (Severe atopic state)',
                'D. pteronyssinus Specific IgE: 18.6 kUA/L (High allergy trigger)',
                'Mold Allergens: Negative'
            ],
            abnormalFlags: [
                'Marked atopic hypersensitivity to house dust mite aeroallergens'
            ],
            diagnosticImpression: 'Extrinsic allergic asthma driven primarily by domestic dust mite aeroallergens.',
            recommendedAction: 'Implement strict house dust mite mitigation; consider sublingual allergen immunotherapy.',
            aiEngine: 'Local Clinical NLP Engine (Consortium Verified)'
        },
        sampleContent: `IMMUNOLOGY & ALLERGEN SCREEN - PATHOLOGY DIAGNOSTICS LAB\nPatient: Ayesha Khan | ID: PT-9904 | Age: 29 | Sex: F\nDate: 22-Sep-2026\n\nALLERGEN PANEL:\n- Total Serum IgE: 480 IU/mL (Ref: < 100 IU/mL) [HIGH]\n- D. pteronyssinus: 18.6 kUA/L [CLASS 4 VERY HIGH]\n- D. farinae: 14.2 kUA/L [CLASS 3 HIGH]\n\nImpression: Severe atopic sensitization to house dust mites.`
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
        rep.blockIndex = i + 1; // Consecutive block index

        // Generate genuine binary PDF buffer with embedded scannable QR code & AI highlights
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
