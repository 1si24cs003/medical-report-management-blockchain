# Phase 2 Presentation Script & Slide-by-Slide Speaking Notes

**Evaluation Date:** 28th October  
**Subject:** 5th Semester Mini Project Phase 2 Evaluation  
**Project:** Medical Report Management & Distribution System on Blockchain  

---

## 🎤 Presentation Strategy

* **Total Time:** ~10 to 12 minutes (Presentation + Live Demonstration + Panel Q&A)
* **Goal:** Convince the panel that:
  1. You have a deep understanding of the 15 recent research papers and the 13 specific limitations in existing systems.
  2. Your 3 objectives were chosen with sound clinical and technical rationale.
  3. You have **far exceeded** the 50% implementation requirement (reaching ~75%+ with all core features working).
  4. Your live demonstration proves tamper detection, duplicate prevention, and time-expiring security in action.

---

## 📽️ Slide-by-Slide Speaking Script

### Slide 1: Title Slide
> *"Respected guide and panel members, good morning. Today we present Phase 2 of our mini project: **'Medical Report Management & Distribution System on Blockchain'**. In this phase, we have completed our detailed literature review of fifteen recent papers from 2024 and 2025, developed our layered system design, and implemented over 75% of our working prototype."*

### Slide 2: Introduction & Healthcare Challenges
> *"Healthcare data is among the most sensitive digital assets in the world. Traditionally, patient records, diagnostic scans, and laboratory reports are stored in paper files or centralized hospital databases. These centralized repositories face serious vulnerabilities: they represent a single point of failure vulnerable to ransomware, their records can be modified by unauthorized insiders without cryptographic auditability, and fragmented systems force patients to repeat identical diagnostic tests. Our project establishes a balanced ecosystem connecting Hospitals, Diagnostic Labs, Clinics, and Pharmacies through a permissioned blockchain layer."*

### Slide 3 & 4: Literature Survey (15 Papers: 2024–2025)
> *"For our literature survey, we analyzed fifteen seminal papers published in the last two years:
> - **Turan et al. (2024)** explored semi-decentralized PKI, but still retained centralized certificate gateways that preserve single points of failure.
> - **Liu et al. (2024)** proposed proxy re-encryption on consortium blockchains, but it introduces heavy governance bottlenecks.
> - **Martínez et al. (2025)** utilized Self-Sovereign Identity and DIDs, but placing private key management solely on patients leads to permanent record loss if keys are lost.
> - **Ramesh et al. (2025)** examined cross-chain EHR sharing with Polkadot relays, but cross-network bridges introduce severe architectural complexity.
> - **Nowrozy et al. (2024)** surveyed homomorphic encryption and zero-knowledge proofs, which remain too computationally heavy for routine clinical hospital triage.
> - And papers like **Anwar Ali et al. (2025)** studied searchable encryption, but high trapdoor indexing latency impairs query response times."*

### Slide 5: Limitations of Existing Works (The 13 Bottlenecks)
> *"Synthesizing these fifteen papers, we isolated 13 core limitations in existing literature. Most notably: high cryptographic complexity, excessive storage overhead from attempting to store large medical scans directly on-chain, public ledger privacy violations under HIPAA and GDPR, difficulty in revoking access once granted, and the total absence of an integrated, operable medical report distribution model."*

### Slide 6: Problem Statement & The 3 Core Objectives
> *"To solve these 13 limitations, we defined three concrete, measurable objectives:
> 1. **Objective 1: Reduce Repeated Diagnostic Tests** by providing doctors with instant chronological retrieval of a patient's historical reports across healthcare visits.
> 2. **Objective 2: Detect Duplicate Medical Reports using SHA-256 Hashing**, ensuring a single verified reference and eliminating redundant storage.
> 3. **Objective 3: Chronological Medical History Timeline**, transforming fragmented files into an organized clinical progression view."*

### Slide 7: Proposed System Architecture (Figures 6.1 & 6.2)
> *"Our architecture is structured across four distinct layers:
> - The **Application Layer** with our modern responsive web dashboard and Node.js REST API.
> - The **Core Business Modules** managing deduplication, OCR indexing, and timelines.
> - The **Data Storage Layer**, where we strictly separate storage from proof: sensitive medical files are encrypted off-chain using AES-256-CBC.
> - The **Permissioned Blockchain Layer**, which stores only pseudonymous report IDs, SHA-256 cryptographic hashes, timestamps, and storage reference pointers across institutional nodes."*

### Slide 8: Key Feature 1 — QR Code-Based Anti-Forgery
> *"Our first highlight feature is QR Code-Based Anti-Forgery. When a report is uploaded, its SHA-256 hash is anchored on the blockchain and a unique QR code is generated. When a doctor scans this QR code, our verification endpoint recalculates the live file fingerprint and compares it to the blockchain record, outputting a clear MATCH or MISMATCH verdict."*

### Slide 9: Key Feature 2 — Time-Expiring Secure Access Links
> *"Our second feature solves the access revocation problem. Patients can share a report with a specialist for a limited time (e.g. 1 hour or 2 minutes for demonstration). The backend issues a cryptographically signed JWT with embedded expiry. Once the timer reaches zero, access is permanently denied by the server, eliminating permanent authorization leaks."*

### Slide 10: Key Feature 3 — Smart Keyword Extraction (OCR)
> *"Our third feature addresses searchable privacy. Using Tesseract.js OCR, our system extracts clinical terms like 'Blood Sugar' or 'Fracture' upon upload and stores tags in our database index. Attending doctors can search reports by clinical condition without needing to decrypt the raw files on the server."*

### Slide 11: Phase 2 Implementation Progress Matrix
> *"As demonstrated in this matrix, while the college requirement for Phase 2 is a minimum of 50% implementation, our batch has completed over 85% of the system. This includes our newly enforced Mandatory Login Gate, strict Role-Based Access Control (Lab upload only, Doctor clinical review editing, Patient personal download scoping, and Admin identity enrollment), full off-chain AES encryption, SHA-256 duplicate detection, permissioned blockchain ledger, QR anti-forgery verification, time-expiring JWT links, chronological timelines, and OCR search."*

### Slide 12 & 13: Transition to Live System Demonstration
> *"We would now like to demonstrate our working software live to the panel. We will show the Mandatory Login Gate first, walk through the role restrictions for Lab Staff, Doctors, and Patients, demonstrate live duplicate detection, and prove our tamper detection via QR code."*
> *(Proceed to open the live portal and follow the steps in [EVALUATION_GUIDE.md](EVALUATION_GUIDE.md)).*
