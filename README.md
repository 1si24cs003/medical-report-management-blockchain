# 🏥 HealthChain: Medical Report Management & Distribution System on Blockchain

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org)
[![Academic Evaluation](https://img.shields.io/badge/Mini%20Project-Phase%202%20(85%25%2B%20Done)-cyan.svg)](#)
[![Security Gate](https://img.shields.io/badge/RBAC-Mandatory%20Login%20Gate-emerald.svg)](#)
[![Department](https://img.shields.io/badge/Department-CSE-purple.svg)](#)
[![Academic Year](https://img.shields.io/badge/AY-2026--27-orange.svg)](#)

> An enterprise-grade, privacy-preserving healthcare consortium framework engineered to securely manage, verify, and distribute diagnostic medical reports using **permissioned blockchain technology**, **SHA-256 cryptographic fingerprinting**, **off-chain AES-256-CBC encryption**, and **strict Role-Based Access Control (RBAC)**.

---

## 📌 Project Overview & Introduction

Traditional Electronic Health Record (EHR) and laboratory management systems suffer from critical vulnerabilities: centralized points of failure vulnerable to ransomware, unauthorized record tampering, fragmented health histories across healthcare providers, and high costs from repeated diagnostic testing.

**HealthChain** resolves these challenges through a hybrid architecture combining off-chain cryptographic storage with an immutable permissioned blockchain ledger, protected by a **Mandatory Login Gate** and **strict Role-Based Access Control (RBAC)**:

1. **Mandatory Login Gate & Zero-Trust Authentication:** The portal enforces strict pre-authentication lockout. All diagnostic reports, clinical records, upload channels, and blockchain ledger controls are inaccessible without authenticated session tokens (JWT).
2. **Separation of Storage & Proof:** Multi-megabyte diagnostic files (PDFs, pathology lab results, X-rays) remain encrypted off-chain using **AES-256-CBC**, while the **Permissioned Blockchain Ledger** anchors immutable cryptographic proofs (pseudonymous Report IDs, SHA-256 digest fingerprints, block timestamps, and off-chain storage pointers).
3. **Role-Based Access Control (RBAC):**
   * **🔬 Lab Staff:** Authorized exclusively to upload diagnostic reports, compute cryptographic fingerprints, and execute duplicate detection. Strictly restricted from modifying doctor clinical evaluations.
   * **👨‍⚕️ Doctor:** Authorized to search records via OCR, inspect patient timelines, and **review, edit, and append clinical diagnoses, treatment plans, prescriptions, and follow-up schedules**.
   * **👤 Patient:** Strictly scoped to their personal health records only. Authorized to view and download decrypted files with live blockchain verification, scan anti-forgery QR codes, and create time-expiring share links. **Restricted from editing records or uploading files**.
   * **🛡️ Consortium SuperAdmin:** Full administrative control to **enroll new Doctors, Patients, and Lab Technicians** with institutional node credentials, manage consortium identities, and audit ledger integrity.
4. **Cryptographic Deduplication (Objective 2):** Calculates SHA-256 fingerprints before file storage; queries the ledger in real time to reject redundant uploads (`HTTP 409 Conflict`), preserving single-source truth and eliminating cloud storage waste.
5. **Chronological Medical History Timeline (Objectives 1 & 3):** Consolidates patient diagnostic investigations into a unified, date-ordered timeline to eliminate repeated diagnostic scans and tests.
6. **QR Code Anti-Forgery Verification (Feature 7.1):** Enables immediate document authenticity checks by scanning an embedded QR code, comparing the live file hash against the immutable blockchain block (`MATCH` vs. `MISMATCH`).
7. **Time-Expiring Access Links (Feature 7.2):** Patients grant consulting physicians temporary access using cryptographically signed JWT tokens with automated countdown expiration and instant revocation.
8. **Smart Keyword Extraction via OCR (Feature 7.3):** Ingests reports using `Tesseract.js` to index clinical keywords ("Blood Sugar", "Fracture", "Hemoglobin") for instant search without decrypting raw files off-chain.

---

## 🛡️ Role-Based Access Control (RBAC) Permission Matrix

The system enforces strict permission boundaries across both backend API endpoints and frontend interface modules:

| Operational Feature | 🔬 Lab Staff | 👨‍⚕️ Doctor | 👤 Patient | 🛡️ SuperAdmin | Enforced Endpoint / Protection |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Mandatory Portal Login** | ✅ | ✅ | ✅ | ✅ | `POST /api/auth/login` |
| **Upload Diagnostic Reports** | ✅ *(Primary)* | ❌ *(Restricted)* | ❌ *(Blocked)* | ✅ | `POST /api/reports/upload` (`Lab Staff`, `Admin`) |
| **SHA-256 Duplicate Check** | ✅ | ❌ | ❌ | ✅ | Objective 2 Ledger Query |
| **View All Diagnostic Records** | ✅ | ✅ | ❌ *(Self only)* | ✅ | `GET /api/reports` |
| **View Personal Records Only** | ❌ | ❌ | ✅ *(Strict)* | ❌ | Auto-scoped to `patientId` |
| **Edit Clinical Notes & Diagnosis** | ❌ *(Blocked)* | ✅ *(Primary)* | ❌ *(Blocked)* | ✅ | `PUT /api/reports/:id` (`Doctor`, `Admin`) |
| **Chronological Patient Timeline** | ❌ | ✅ *(All Patients)* | ✅ *(Self only)* | ✅ | `GET /api/reports/timeline/:id` |
| **Download Decrypted Report** | ✅ | ✅ | ✅ | ✅ | `GET /api/reports/:id/download` |
| **Anti-Forgery QR Verification** | ✅ | ✅ | ✅ | ✅ | `GET /api/verify/:id` (Public) |
| **Generate Expiring Share Link** | ❌ | ✅ | ✅ | ✅ | `POST /api/share/create` |
| **Enroll New Doctors & Patients** | ❌ | ❌ | ❌ | ✅ *(Exclusive)* | `POST /api/admin/users` (`Admin` only) |
| **Blockchain Explorer & Tamper Test** | ✅ | ✅ | ❌ | ✅ | `GET /api/blockchain/*` |
| **Consortium Audit Logs** | ❌ | ✅ | ❌ | ✅ | `GET /api/blockchain/audit-logs` |

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                     MANDATORY LOGIN GATE                                          |
|            Authentication Required (JWT Session Token + Zero-Trust Role Routing)                  |
+---------------------------------------------------------------------------------------------------+
                                                  |
           +--------------------+-----------------+--------------------+--------------------+
           |                    |                                      |                    |
           v                    v                                      v                    v
      [LAB STAFF]            [DOCTOR]                              [PATIENT]             [ADMIN]
  - Upload Test Reports  - Search Reports via OCR              - View Own Records   - Enroll Doctors & Patients
  - Deduplication Check  - Edit Clinical Notes & Diagnosis     - Download Decrypted - Manage Consortium Directory
  - Ledger Anchoring     - Inspect Patient Timelines           - Verify QR Code     - Audit Chain Integrity
           |                    |                                      |                    |
           +--------------------+-----------------+--------------------+--------------------+
                                                  |
                                                  v HTTPS / REST API
+---------------------------------------------------------------------------------------------------+
|                                      APPLICATION LAYER                                            |
|                 Frontend: HTML5, Vanilla Modern CSS Glassmorphism, JavaScript SPA                  |
|                 Backend: Node.js, Express.js Engine, RBAC Middleware, JWT Security                |
+---------------------------------------------------------------------------------------------------+
        |                                                 |                                 |
        v                                                 v                                 v
+-------------------------------+                 +-------------------------------+ +-------------------------------+
|    REPORT FILE ENCRYPTION     |                 |  HASH GENERATION & DUPLICATE  | |    DOCTOR CLINICAL REVIEW     |
| 1. Medical Document Upload    |                 | 1. Compute SHA-256 Digest     | | 1. Review Diagnostic Findings|
| 2. AES-256-CBC File Encrypt   |                 | 2. Compare against Blockchain | | 2. Update Diagnosis Status   |
| 3. Store in uploads/*.bin     |                 | 3. If Match -> HTTP 409 Reject| | 3. Append Prescription Notes  |
+---------------+---------------+                 +---------------+---------------+ +---------------+---------------+
                |                                                 |                                 |
                v                                                 v (If New Report)                 v
+------------------------------------------+     +--------------------------------------------------+
|           OFF-CHAIN STORAGE              |     |          PERMISSIONED BLOCKCHAIN LAYER           |
|  - AES-256 Encrypted Binary Blobs        |     |  Consortium Nodes: Hospital, Lab, Clinic, Pharm  |
|  - Storage Reference Pointer             |     |  Stores ONLY:                                    |
|  - Decrypted only by authorized keys     |     |    * Pseudonymous Report ID (e.g. REP-7A91F2C4)  |
|  - Zero PII / Zero Patient Data On-Chain |     |    * Cryptographic SHA-256 File Hash             |
+------------------------------------------+     |    * Off-chain Storage Reference Pointer         |
                                                 |    * Block Hash, Previous Hash, Timestamp        |
                                                 +--------------------------------------------------+
                                                                     |
                                                   Verification Flow (MATCH / MISMATCH)
                                                                     v
                                                 +--------------------------------------------------+
                                                 |        QR CODE ANTI-FORGERY VERIFICATION         |
                                                 |  Scan QR -> Backend re-hashes off-chain file     |
                                                 |  Compares live hash to blockchain -> Alert!      |
                                                 +--------------------------------------------------+
```

---

## 🎯 Core Project Objectives

1. **Objective 1: Reduce Repeated Diagnostic Tests**  
   Consolidates diagnostic investigations into a rapid-retrieval clinical record, allowing doctors to review previous scans before ordering expensive or invasive re-tests.
2. **Objective 2: Cryptographic Duplicate Detection (SHA-256)**  
   Computes a SHA-256 file fingerprint upon upload and verifies it against the blockchain ledger. If a duplicate exists, the system rejects it immediately (`HTTP 409 Conflict`), preventing redundant uploads and cloud bloat.
3. **Objective 3: Chronological Medical History Timeline**  
   Automatically aggregates scattered diagnostic reports across institutions into a sequential, filterable patient timeline for tracking disease progression over time.

---

## 📁 Repository Directory Structure

```
.
├── blockchain/
│   ├── Block.js                 # Block data model (hash, prevHash, data, nonce, validator)
│   └── Blockchain.js            # Permissioned ledger, block mining, and tamper verification
├── controllers/
│   ├── authController.js        # User authentication, credential validation, JWT issuance
│   ├── adminController.js       # Admin user management (Doctor, Patient, Lab Staff enrollment)
│   ├── reportController.js      # Upload, AES encryption, duplicate check, doctor notes update
│   ├── qrController.js          # Anti-forgery QR code generation & live MATCH/MISMATCH check
│   ├── shareController.js       # Time-expiring signed JWT links with auto-revocation
│   └── blockchainController.js  # Ledger inspection, chain audit, and tamper simulation
├── data/
│   ├── database.json            # Persistent JSON database (Users, Reports, Shared Links, Audits)
│   └── ledger.json              # Persistent blockchain blocks and cryptographic links
├── docs/
│   ├── LITERATURE_REVIEW.md     # In-depth survey of 15 papers (2024-2025) and 13 limitations
│   ├── SYSTEM_DESIGN.md         # Full architectural, modular, and security specifications
│   ├── EVALUATION_GUIDE.md      # Step-by-step panel presentation walkthrough & Q&A script
│   └── PHASE2_PRESENTATION.md   # Presentation script and slide-by-slide speaking notes
├── middleware/
│   ├── authMiddleware.js        # Strict JWT verification and Role-Based Access Control (RBAC)
│   └── uploadMiddleware.js      # Multer memory storage configuration
├── models/
│   └── db.js                    # Unified database repository with auto-seeding engine
├── public/
│   ├── index.html               # Main Medical Portal with Mandatory Login Gate & RBAC Views
│   ├── presentation.html        # Interactive Fullscreen Slide Deck for Phase 2 Evaluation
│   ├── verify.html              # Standalone QR Anti-Forgery Verification view
│   ├── shared.html              # Time-Expiring Secure Consultation view with countdown
│   ├── css/
│   │   ├── style.css            # Modern glassmorphism CSS design system with login styling
│   │   └── presentation.css     # Responsive presentation slide styling
│   └── js/
│       ├── app.js               # Main application engine (RBAC, Login, Reports, Admin, Ledger)
│       ├── presentation.js      # Slide deck navigation and keyboard controller
│       ├── verify.js            # QR verification and live tamper demonstration logic
│       └── shared.js            # Countdown timer and decrypted document viewer
├── uploads/                     # Off-chain AES-256 encrypted binary medical files (.bin)
├── utils/
│   ├── cryptoUtils.js           # SHA-256 hashing, AES-256 encryption/decryption
│   ├── ocrHelper.js             # Tesseract.js OCR and clinical keyword tag extractor
│   └── seedData.js              # Initial realistic medical dataset and demo accounts
├── .gitignore                   # Standard ignore rules for Node.js
├── LICENSE                      # MIT Open Source License
├── package.json                 # Project dependencies and npm scripts
└── server.js                    # Express application entry point & route definitions
```

---

## 🔌 Complete REST API Reference

### 1. Authentication & Consortium Users
* `POST /api/auth/login` — Authenticate using email/ID and password; issues signed JWT session token.
* `GET /api/auth/me` — Retrieve currently authenticated user profile and active role permissions.
* `GET /api/auth/users` — Retrieve consortium demo identities.

### 2. Admin User Management (`Admin` Only)
* `GET /api/admin/users` — List all registered consortium users (Doctors, Patients, Lab Staff, Admins).
* `POST /api/admin/users` — Enroll new Doctor, Patient, or Lab Staff identity with login credentials and node IDs.
* `DELETE /api/admin/users/:userId` — Remove user identity from the healthcare consortium.

### 3. Medical Report Management
* `POST /api/reports/upload` — Upload medical report (`Lab Staff`, `Admin`). Executes SHA-256 deduplication, AES-256 encryption, and blockchain anchoring.
* `PUT /api/reports/:reportId` — Update clinical notes, diagnosis status, prescriptions, and follow-up dates (`Doctor`, `Admin`).
* `GET /api/reports` — Fetch reports (Patients receive strictly scoped personal reports; Doctors/Lab/Admin receive all).
* `GET /api/reports/search` — Search reports by OCR keyword tags and patient query.
* `GET /api/reports/timeline/:patientId` — Retrieve chronological diagnostic timeline (Objectives 1 & 3).
* `GET /api/reports/:reportId` — Retrieve single report metadata and blockchain block info.
* `GET /api/reports/:reportId/download` — Decrypt and download file with live SHA-256 blockchain verification.

### 4. Anti-Forgery QR Verification
* `GET /api/qr/:reportId` — Generate anti-forgery QR code data URL pointing to verification endpoint.
* `GET /api/verify/:reportId` — Verify off-chain encrypted file hash against immutable blockchain block.
* `POST /api/verify/check-file/:reportId` — Verify external uploaded document against blockchain record.
* `POST /api/verify/tamper-file/:reportId` — Simulate deliberate byte-level file corruption to demonstrate tamper detection.

### 5. Time-Expiring Secure Access Links
* `POST /api/share/create` — Generate signed JWT access link with custom expiration window (e.g. 2 mins, 1 hr).
* `GET /api/share/view` — Retrieve shared report payload while token is valid; returns 403 upon expiry.
* `GET /api/share/download` — Download shared document file before token expiration.

### 6. Blockchain Explorer & Ledger Integrity
* `GET /api/blockchain/ledger` — Inspect full permissioned blockchain blocks, hashes, and validator nodes.
* `GET /api/blockchain/verify` — Execute full cryptographic chain integrity audit (`verifyChain`).
* `POST /api/blockchain/tamper-demo` — Inject deliberate tampering into Block #1 to demonstrate broken hash links.
* `POST /api/blockchain/restore` — Restore blockchain ledger to 100% verified state.
* `GET /api/blockchain/stats` — Retrieve system counters (total reports, blocks, duplicates prevented, validity).
* `GET /api/blockchain/audit-logs` — Retrieve immutable audit log trail of all system events.

---

## ⚡ Quick Start & Installation

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** (v9 or higher)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/medical-report-blockchain.git
cd medical-report-blockchain
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the application
```bash
npm start
```
The server will start at:
* 🌐 **Main Medical Portal:** [http://localhost:3000](http://localhost:3000)
* 📊 **Phase 2 Presentation Deck:** [http://localhost:3000/presentation.html](http://localhost:3000/presentation.html)
* 🔍 **Anti-Forgery Verification:** [http://localhost:3000/verify.html](http://localhost:3000/verify.html)

---

## 👥 Pre-Configured Consortium Network Demo Accounts

All demo accounts use the standard consortium password: `password123` (or 1-click login on the portal gate):

| Role | Name | Email / ID | Specialty / Details | Consortium Node |
| :--- | :--- | :--- | :--- | :--- |
| **👨‍⚕️ Doctor** | Dr. Sarah Rao | `dr.sarah@hospital.org` | Cardiology & General Medicine (Metro Apex Hospital) | `NODE-HOSP-01` |
| **👨‍⚕️ Doctor** | Dr. Rajesh Nair | `dr.rajesh@hospital.org` | Orthopedics & Trauma (Metro Apex Hospital) | `NODE-HOSP-01` |
| **👩‍⚕️ Doctor** | Dr. Ananya Sen | `dr.ananya@clinic.org` | Pulmonology & Respiratory Care (City Care Clinic) | `NODE-CLINIC-01` |
| **👨‍⚕️ Doctor** | Dr. Vikram Mehta | `dr.vikram@neuro.org` | Neurology & Spine Care (Apex Neuro Institute) | `NODE-HOSP-01` |
| **🔬 Lab Staff** | Alex Smith | `alex.lab@pathology.org` | Senior Diagnostic Technologist (Pathology Lab) | `NODE-LAB-01` |
| **👤 Patient** | John Doe | `john.doe@patient.net` | ID: `PT-9901` • Age: 48, Male (Blood: O+) | Regional Patient |
| **👩 Patient** | Meera Patel | `meera.patel@patient.net` | ID: `PT-9902` • Age: 34, Female (Blood: B+) | Regional Patient |
| **👨 Patient** | Robert Chen | `robert.chen@patient.net` | ID: `PT-9903` • Age: 54, Male (Blood: A+) | Regional Patient |
| **👩 Patient** | Ayesha Khan | `ayesha.khan@patient.net` | ID: `PT-9904` • Age: 29, Female (Blood: AB+) | Regional Patient |
| **🛡️ Admin** | Consortium SuperAdmin | `admin@consortium.gov` | Blockchain Authority & Consortium Identity Registrar | SuperAdmin Node |

---

## 🧪 Live Evaluation Demonstration Flow

Follow this structured workflow during evaluation demonstrations:

1. **Mandatory Login Gate:**
   * Open [http://localhost:3000](http://localhost:3000) — notice that the application strictly presents the **Login Gate** before revealing any records.
   * Demonstrate the **One-Click Quick Role Cards** or sign in with credentials (`password123`).
2. **Patient Restrictions:**
   * Sign in as **John Doe (Patient)**:
     - Notice that the Upload tab and Admin tabs are completely hidden.
     - Only John Doe's personal diagnostic reports and chronological timeline are accessible.
     - "Edit Notes" buttons are hidden; patients cannot alter clinical records.
3. **Lab Staff Upload & Deduplication (Objective 2):**
   * Sign in as **Alex Smith (Lab Staff)**:
     - Access the **Upload & Anchor** tab.
     - Click **"⚠️ Test Duplicate Upload Rejection (Obj 2 Demo)"**.
     - System computes the SHA-256 fingerprint, matches John Doe's existing Glucose report on the ledger, and blocks the upload with `HTTP 409 Conflict`.
4. **Doctor Review & Clinical Notes Editing:**
   * Sign in as **Dr. Sarah Rao (Doctor)**:
     - View all reports and search via OCR tags ("Blood Sugar", "Fracture").
     - Inspect patient John Doe's **Chronological Timeline (Objectives 1 & 3)**.
     - Click **"✏️ Edit Notes"** on any report: update diagnosis status to *"Confirmed Diagnosis"*, enter prescription notes, and save.
     - Show the updated doctor evaluation badge and corresponding immutable audit log!
5. **Admin Identity Enrollment:**
   * Sign in as **SuperAdmin**:
     - Navigate to **"👥 Consortium User Management"**.
     - Enroll a new Doctor or Patient live in front of the panel.
     - Show that the new identity immediately appears in the directory and can log in at the portal gate!
6. **QR Anti-Forgery & Live Tamper Test (Feature 7.1):**
   * Click **"Verify QR"** on any report → click **"Open Verification Endpoint"** (`/verify.html`).
   * Initial status: glowing green **MATCH: REPORT AUTHENTIC**.
   * Click **"⚠️ Simulate File Tampering"** → Status immediately switches to flashing red **MISMATCH: TAMPERING DETECTED**!
   * Click **"🔄 Reset / Restore Valid File"** to return to green.
7. **Time-Expiring Share Links (Feature 7.2):**
   * Generate a 2-minute expiring link, open `/shared.html`, and watch the countdown timer automatically revoke access upon expiry.

---

## 🛣️ Phase 3 Development Roadmap

- [ ] Smart Contract deployment to Ethereum Sepolia / Polygon testnet.
- [ ] Distributed storage migration to IPFS / Filecoin cluster.
- [ ] End-to-end Pharmacy Module billing reconciliation.
- [ ] Native mobile application for camera-based QR scanning.
- [ ] Zero-Knowledge Proofs (ZK-SNARKs) for selective disclosure of diagnostic metrics.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
