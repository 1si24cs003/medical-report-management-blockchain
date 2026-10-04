# 🏥 HealthChain: Medical Report Management & Distribution System on Blockchain

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org)
[![Academic Evaluation](https://img.shields.io/badge/Mini%20Project-Phase%202%20(75%25%2B%20Done)-cyan.svg)](#)
[![Department](https://img.shields.io/badge/Department-CSE-purple.svg)](#)
[![Academic Year](https://img.shields.io/badge/AY-2026--27-orange.svg)](#)

> A decentralized, privacy-preserving healthcare framework engineered to securely manage, verify, and distribute diagnostic medical reports using permissioned blockchain technology, SHA-256 cryptographic fingerprinting, and off-chain AES-256 encryption.

---

## 📌 Project Overview

Traditional Electronic Health Record (EHR) systems face severe challenges related to data integrity, unauthorized tampering, single points of failure, and fragmented patient histories. **HealthChain** addresses these critical issues through a hybrid architecture:

* **Separation of Storage & Proof:** Diagnostic medical files (PDFs, X-rays, lab scans) remain encrypted off-chain using **AES-256-CBC**, while the **Permissioned Blockchain Ledger** anchors immutable cryptographic proofs (pseudonymous Report IDs, SHA-256 digests, timestamps, and storage pointers).
* **Cryptographic Deduplication (Objective 2):** Prevents redundant document uploads by computing SHA-256 file fingerprints and querying the ledger before storage.
* **Chronological Medical History (Objectives 1 & 3):** Consolidates patient diagnostic investigations into a unified, sequential clinical timeline to eliminate repeated diagnostic tests.
* **QR Code-Based Anti-Forgery (Feature 7.1):** Enables doctors to verify document integrity in real time by scanning an embedded QR code, revealing a **MATCH** (Authentic) or **MISMATCH** (Tampered) verdict.
* **Time-Expiring Access Links (Feature 7.2):** Patients grant consulting physicians temporary access using cryptographically signed JWT tokens with automated countdown expiration and revocation.
* **Smart Keyword Extraction via OCR (Feature 7.3):** Ingests reports using `Tesseract.js` to index clinical keywords ("Blood Sugar", "Fracture", "Hemoglobin") for instant search without decrypting raw files.

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                             USERS                                                 |
|   [Doctor] (Search/View)    [Lab Staff] (Upload)    [Patient] (View/Share)    [Admin] (Audit)     |
+--------------------------------------------------+------------------------------------------------+
                                                   | HTTPS (Secure Web Interface)
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                      APPLICATION LAYER                                            |
|                  Frontend UI (HTML5, Modern CSS Glassmorphism, JavaScript SPA)                    |
|                        Backend API Server (Node.js & Express.js Engine)                           |
+--------------------------+-------------------------------------------------+----------------------+
                           |                                                 |
                           v                                                 v
           +-------------------------------+                 +-------------------------------+
           |    REPORT FILE PROCESSING     |                 |  HASH GENERATION & DUPLICATE  |
           | 1. Medical Report (PDF/Img)   |                 | 1. Compute SHA-256 Hash       |
           | 2. AES-256-CBC Encryption     |                 | 2. Compare with Existing Chain|
           | 3. Store in uploads/          |                 | 3. If Match -> Block Duplicate|
           +---------------+---------------+                 +---------------+---------------+
                           |                                                 | (If New Report)
                           v                                                 v
+------------------------------------------+     +--------------------------------------------------+
|           OFF-CHAIN STORAGE              |     |          PERMISSIONED BLOCKCHAIN LAYER           |
|  - AES-256 Encrypted Binary Blobs        |     |  Consortium Nodes: Hospital, Lab, Clinic, Pharm   |
|  - Storage Reference Pointer             |     |  Stores ONLY:                                    |
|  - Accessible only with Decryption Key   |     |    * Pseudonymous Report ID (e.g. REP-7A91F2C4)  |
|  - Zero PII / Zero Patient Data On-Chain |     |    * Cryptographic SHA-256 File Hash             |
+------------------------------------------+     |    * Off-chain Storage Reference Pointer         |
                                                 |    * Block Hash, Previous Hash, Timestamp        |
                                                 +--------------------------------------------------+
                                                                     |
                                   Verification Flow (MATCH / MISMATCH)
                                                                     v
                                                 +--------------------------------------------------+
                                                 |        QR CODE ANTI-FORGERY VERIFICATION         |
                                                 |  Doctor scans QR -> Backend recalculates SHA-256 |
                                                 |  Compares live hash to blockchain -> Alert!      |
                                                 +--------------------------------------------------+
```

---

## 🎯 Core Project Objectives

1. **Objective 1: Reduce Repeated Diagnostic Tests**  
   Enables healthcare providers to search and retrieve historical reports in seconds, preventing unnecessary repetitions of expensive or invasive tests.
2. **Objective 2: Cryptographic Duplicate Detection (SHA-256)**  
   Guarantees a single verified reference per unique diagnostic document by identifying exact duplicates via hash comparison and rejecting redundant uploads (HTTP 409).
3. **Objective 3: Chronological Medical History Timeline**  
   Aggregates scattered diagnostic investigations into a unified, date-ordered timeline giving physicians a comprehensive overview of patient disease progression.

---

## 📁 Repository Directory Structure

```
.
├── blockchain/
│   ├── Block.js                 # Block data model (hash, prevHash, data, nonce, validator)
│   └── Blockchain.js            # Permissioned ledger, block mining, and tamper verification
├── controllers/
│   ├── authController.js        # User listing and JWT authentication
│   ├── reportController.js      # Upload, AES encryption, duplicate check, and timeline
│   ├── qrController.js          # Anti-forgery QR code generation & live MATCH/MISMATCH check
│   ├── shareController.js       # Time-expiring signed JWT links with auto-revocation
│   └── blockchainController.js  # Ledger inspection, chain audit, and tamper simulation
├── data/
│   ├── database.json            # Persistent JSON database (Users, Reports, Audit Logs)
│   └── ledger.json              # Persistent blockchain blocks and cryptographic links
├── docs/
│   ├── LITERATURE_REVIEW.md     # In-depth survey of 15 papers (2024-2025) and 13 limitations
│   ├── SYSTEM_DESIGN.md         # Full architectural, modular, and security specifications
│   └── EVALUATION_GUIDE.md      # Step-by-step panel presentation walkthrough & Q&A script
├── middleware/
│   ├── authMiddleware.js        # JWT verification and Role-Based Access Control (RBAC)
│   └── uploadMiddleware.js      # Multer memory storage configuration
├── models/
│   └── db.js                    # Unified database repository with auto-seeding engine
├── public/
│   ├── index.html               # Main Medical Portal (Doctor, Patient, Lab, Admin views)
│   ├── presentation.html        # Interactive Fullscreen Slide Deck for Phase 2 Evaluation
│   ├── verify.html              # Standalone QR Anti-Forgery Verification view
│   ├── shared.html              # Time-Expiring Secure Consultation view with countdown
│   ├── css/
│   │   ├── style.css            # Modern glassmorphism CSS design system
│   │   └── presentation.css     # Responsive presentation slide styling
│   └── js/
│       ├── app.js               # Main dashboard controller and search engine
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
└── server.js                    # Express application entry point
```

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

## 🧪 Phase 2 Evaluation Demonstration Flow

For detailed panel speaking notes and answers to evaluator questions, refer to [docs/EVALUATION_GUIDE.md](docs/EVALUATION_GUIDE.md).

1. **Phase 2 Presentation Deck (`/presentation.html`):**  
   Fullscreen slides covering the problem statement, 15-paper literature review, 13 limitations, 3 objectives, system design, and 75%+ implementation audit.
2. **Duplicate Detection Test:**  
   Click the demo button on the Upload tab to simulate an identical file upload; watch the system enforce **Objective 2** via an instant `HTTP 409 Duplicate Detected` response.
3. **Anti-Forgery QR Verification:**  
   Click **"Verify QR"** on any report to see the glowing green **MATCH** status. Then click **"Simulate File Tampering"** to flip bytes in the off-chain file and watch the system instantly detect the breach with a flashing red **MISMATCH** alert!
4. **Time-Expiring Access Link:**  
   As patient **John Doe**, generate a 2-minute temporary link. Open it in a new tab to see the live countdown clock and automatic access revocation after expiry.
5. **Chronological Medical Timeline:**  
   Review patient John Doe’s diagnostic progression across multiple dates, demonstrating **Objective 1 & 3**.

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
