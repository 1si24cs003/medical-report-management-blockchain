# Phase 2 Panel Evaluation & Live Demonstration Guide

**Project Title:** Medical Report Management & Distribution System on Blockchain  
**Evaluation Date:** 28th October  
**Semester:** 5th Semester Mini Project  
**Department:** Computer Science & Engineering  

---

## 🎯 Goal for Phase 2 Evaluation

Your panel expects:
1. **Minimum 50% Implementation:** Demonstrated live through a functioning prototype. (We have completed **>75%**).
2. **Detailed Literature Review:** Cover the 15 recent papers (2024–2025), key takeaways, and critical drawbacks.
3. **Comprehensive System Design:** Explain the layered architecture, off-chain AES encryption, permissioned blockchain ledger, and 3 key features.
4. **Live Interactive Demonstration:** Walk through all core workflows seamlessly without technical glitches.

---

## 🚀 Quick Start Instructions

1. **Open Terminal in the project directory:**
   ```bash
   cd "C:\Users\abdul\OneDrive\Desktop\MINI PROJECT MAIN"
   ```
2. **Start the Node.js application server:**
   ```bash
   npm start
   ```
3. **Open the application in your browser:**
   - **Main System Portal:** [http://localhost:3000](http://localhost:3000)
   - **Phase 2 Presentation Deck:** [http://localhost:3000/presentation.html](http://localhost:3000/presentation.html)
   - **Standalone Anti-Forgery QR Verification:** [http://localhost:3000/verify.html](http://localhost:3000/verify.html)

---

## 📋 Step-by-Step Live Demonstration Script for Panel

Follow this exact 5-step script during your demonstration to impress the evaluation panel:

### Step 1: Open the Phase 2 Presentation Deck (2–3 Minutes)
* Open [http://localhost:3000/presentation.html](http://localhost:3000/presentation.html) in fullscreen mode (press `F` or click **⛶ Fullscreen**).
* **Slide 1–2:** Introduce the project title, motivation, and centralized database vulnerabilities.
* **Slide 3–4:** Show the Literature Survey matrix (15 papers from 2024–2025) and emphasize identified drawbacks.
* **Slide 5–6:** Present the 13 limitations of existing works and your **3 Objectives**:
  1. *Reduce repeated tests*
  2. *Duplicate detection via SHA-256*
  3. *Chronological history timeline*
* **Slide 7–10:** Walk through the System Architecture and the 3 Key Features (QR Anti-Forgery, Expiring Links, Smart OCR).
* **Slide 11:** Show the Implementation Status table proving you have exceeded the 50% minimum threshold.
* Click the blue button **"🚀 Open Live App Demo"** to transition seamlessly to the working system!

---

### Step 2: Demonstrate Mandatory Login Gate & Role-Based Access Control (RBAC)
* **Login Gate Requirement (Guide / Evaluator Input):**
  - When opening [http://localhost:3000](http://localhost:3000), the system strictly displays the **Mandatory Login Gate**.
  - No records or ledger controls are accessible without logging in.
  - Explain the 4 consortium roles and show the **Role Permission Matrix**:
    1. 🔬 **Lab Staff (Alex Smith):** Authorized strictly to upload diagnostic data and run duplicate checks. Cannot edit doctor clinical observations.
    2. 👨‍⚕️ **Doctor (Dr. Sarah Rao):** Can review reports, search via OCR, and edit/add clinical notes & diagnoses.
    3. 👤 **Patient (John Doe):** Can only view and download their personal health records and verify anti-forgery QR codes. Cannot edit or upload.
    4. 🛡️ **SuperAdmin:** Can enroll new Doctors, Patients, and Lab Technicians with blockchain node credentials.
* **Demonstrate Patient Restriction:** Click **John Doe (Patient)** → Show that Upload and Admin tabs are hidden, patient only sees their own reports, and cannot edit anything.
* **Demonstrate Doctor Editing:** Switch to **Dr. Sarah Rao (Doctor)** → Click **"✏️ Edit Notes"** on any report → Update diagnosis status to *"Confirmed Diagnosis"* and save. Show how it logs an audit trail!
* **Demonstrate Admin Identity Enrollment:** Switch to **SuperAdmin** → Go to **"👥 Consortium User Management"** tab → Enroll a new Doctor or Patient live in front of the panel!

---

### Step 3: Demonstrate Objective 1 & 3 — Chronological Medical History Timeline
* In the top toolbar, ensure the active role is **Dr. Sarah Rao (Doctor)**.
* Click the **"⏳ Chronological Medical Timeline (Obj 1 & 3)"** tab.
* Show the sequential timeline for patient **John Doe (PT-9901)**:
  - **14-Aug-2026:** Fasting Blood Sugar & HbA1c
  - **02-Sep-2026:** Lumbosacral Spine X-Ray
  - **28-Sep-2026:** Complete Blood Count (CBC)
* **What to tell the panel:**
  > *"When a patient visits a new hospital or specialist, their past reports are normally unavailable, forcing doctors to re-order the same tests. Here, our chronological timeline consolidates all past investigations in date order with instant retrieval, directly fulfilling Objective 1 (preventing repeated tests) and Objective 3 (chronological clinical progression)."*

---

### Step 3: Demonstrate Objective 2 — Cryptographic Duplicate Detection Engine
* Switch to the **"📤 Upload & Anchor Report (Lab / Staff)"** tab.
* In the right card, point out the **Duplicate Detection Engine** explanation.
* Click the yellow demo button: **"⚠️ Test Duplicate Upload Rejection (Obj 2 Demo)"**.
* The system calculates the SHA-256 hash of John Doe's Fasting Glucose Report, queries the ledger, and detects an identical match!
* An alert pops up showing:
  - `HTTP 409 CONFLICT: Duplicate Report Detected!`
  - Exact SHA-256 hash match: `c1ec0cf3d448fabace5bef6b79e3a9ef26beadacdfe72ad05a800b7c6f1b1566`
  - Rejection confirmation preventing duplicate storage.
* **What to tell the panel:**
  > *"This directly fulfills Objective 2. Before any document is accepted, its SHA-256 fingerprint is verified against the blockchain. If an identical report exists, the system rejects it immediately, preserving single-source truth and preventing cloud storage bloat."*

---

### Step 4: Demonstrate Feature 7.1 — QR Code Anti-Forgery & Live Tamper Test
* Switch to the **"📋 Medical Records & Search"** tab.
* On any report (e.g. John Doe's Glucose Report `REP-7A91F2C4`), click the green button **"🔍 Verify QR"**.
* A high-resolution QR code modal opens.
* Click **"🔍 Open Verification Endpoint"** (which opens `verify.html?reportId=REP-7A91F2C4`).
* The system recalculates the SHA-256 hash of the off-chain encrypted file and compares it with the blockchain block:
  - Status renders a glowing green **"MATCH: REPORT AUTHENTIC"**.
* **Now execute the "WOW" Factor Tamper Demonstration:**
  - Click the red button: **"⚠️ Simulate File Tampering"**.
  - A confirmation dialog asks to inject byte corruption into the off-chain file. Click OK.
  - The verification immediately re-runs and flashes a crimson red alert: **"MISMATCH: TAMPERING DETECTED"**!
  - It clearly shows that the live recomputed hash no longer matches the immutable blockchain anchor!
  - Click **"🔄 Reset / Restore Valid File"** to bring the system back to green.
* **What to tell the panel:**
  > *"This proves that even if an attacker alters a single byte of a diagnostic report in off-chain storage, the cryptographic anchor on the blockchain catches the modification instantly."*

---

### Step 5: Demonstrate Feature 7.2 & 7.3 — Expiring Share Links & OCR Search
* **Feature 7.2 (Time-Expiring Links):**
  - Switch role to **John Doe (Patient)** in the top bar.
  - Click **"⏱️ Share"** on any report.
  - Select **"2 Minutes (Quick Demo for Panel Evaluation)"** and click **"Generate Signed Expiring JWT Link"**.
  - Click **"🚀 Open Shared View"**.
  - Show the live animated countdown timer (`00:01:58 remaining`).
  - Explain that once the timer expires, the JWT signature is rejected with `HTTP 403 Forbidden`, automatically revoking access without needing complex key redistribution.
* **Feature 7.3 (Smart OCR Search):**
  - In the search bar on the Records tab, type **"Fracture"** or **"Blood Sugar"**.
  - Notice how the reports instantly filter based on tags extracted by `tesseract.js` during upload, without needing to decrypt the raw files on the server!

---

## ❓ Probable Panel Questions & Expert Answers

| Panel Question | Your Winning Answer |
|----------------|---------------------|
| **Q1: Why not store the entire medical report PDF on the blockchain?** | *"Storing multi-megabyte files directly on a blockchain causes massive ledger bloat because every node must replicate every file. Our architecture separates storage from proof: we store AES-256 encrypted files off-chain, and store only the pseudonymous Report ID, SHA-256 hash, and storage pointer on the blockchain."* |
| **Q2: How does the system handle patient privacy under HIPAA / GDPR?** | *"No personal identifying information (PII) is stored on the blockchain. Only pseudonyms (e.g. PT-9901) and cryptographic hashes are recorded on-chain. Off-chain files are encrypted at rest with AES-256."* |
| **Q3: What consensus mechanism is used in your blockchain?** | *"We implement a permissioned consortium model where pre-approved institutional nodes (Hospitals, Pathology Labs, Clinics) validate transactions via Proof-of-Authority (PoA), eliminating high energy costs and transaction fees."* |
| **Q4: How does duplicate detection work?** | *"Before writing any report, the backend generates its SHA-256 hash. If this hash matches an existing block on the chain, the server returns HTTP 409 Conflict, rejecting redundant uploads."* |
| **Q5: What is planned for Phase 3?** | *"In Phase 3, we will deploy Ethereum smart contracts on the Sepolia testnet, integrate decentralized IPFS storage, and complete the pharmacy billing reconciliation module."* |
