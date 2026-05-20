# Praxis: Autonomous SRE Governance

[![Google Cloud](https://img.shields.io/badge/Google_Cloud-Vertex_AI-blue?logo=googlecloud)](https://cloud.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Praxis** is an autonomous Site Reliability Engineering (SRE) platform built for zero-trust enterprise environments. 

While most AI coding assistants focus on feature generation, Praxis focuses exclusively on **production stability**. It detects system anomalies, synthesizes patches, and rigorously audits its own code through a multi-agent Governance Board before ever requesting human approval via ChatOps.

## The Problem: The "Toddler with a Handgun"
The SRE industry is facing a trust crisis. Generative AI can write code to fix a 3 AM database timeout, but allowing an AI to push directly to production is a massive risk. A patch might fix a timeout but introduce an infinite retry loop that spikes cloud billing, or bypass an auth middleware that creates a security vulnerability. 

**Speed without governance is dangerous.**

## The Solution: The Praxis Protocol
Praxis acts as a Tier-1 on-call engineer that never sleeps, but operates under strict enterprise safety rails. It is built on three core pillars: **Safety, Memory, and Documentation.**

### 🏛️ The Autonomous Governance Board
When Praxis generates a patch for a server crash, it does not immediately send it to a human. The patch must survive a concurrent audit from three specialized Vertex AI agents:
* **The Security Critic:** Audits for token leaks, injection flaws, and auth bypasses.
* **The FinOps Critic:** Analyzes Big-O complexity and API usage to prevent accidental cloud billing spikes.
* **The Architecture Critic:** Maps `import` statements to calculate the blast radius, ensuring downstream microservices are protected.

*If any critic votes "VETO", the patch is automatically rewritten until unanimous consensus is reached.*

### 🧠 Vector Incident Memory
Praxis is not an amnesiac AI. Every time a human engineer clicks "Approve & Merge", Praxis embeds the original telemetry trace and the approved code patch into a Cloud Firestore vector database. 
When a new anomaly occurs, Praxis performs a cosine similarity search. If it finds a >90% match, it doesn't hallucinate a new fix—it applies the exact logic previously validated by your senior engineers. 

### 📄 Zero-Touch Post-Mortems
Enterprises lose institutional knowledge when bugs are fixed at 3 AM without documentation. After a successful merge, Praxis autonomously generates a heavily formatted Markdown Incident Runbook (detailing Root Cause, Governance Audit Trail, and Resolution) and commits it directly to the repository.

---

## The Workflow (ChatOps Integration)
Praxis respects the human-in-the-loop. Engineers do not need to open a dashboard to resolve critical incidents.
1. **Detect:** Intercepts Datadog webhooks or native `500` server logs.
2. **Synthesize & Audit:** The Coordinator writes the fix; the Governance Board audits it.
3. **Verify:** The QA Agent generates a Playwright regression test to ensure zero technical debt.
4. **Deliver:** A highly formatted Slack webhook is delivered to the `#devops` channel.
5. **Resolve:** The engineer reviews the diff and the Board's audit, then clicks `Approve & Merge` directly from their phone.

---

## Technical Architecture

Praxis is a cloud-native architecture built entirely on Google Cloud infrastructure.

* **Compute:** Google Cloud Run (Serverless Express.js Backend)
* **AI Orchestration:** Google Cloud Vertex AI (`gemini-2.5-pro` and `gemini-2.5-flash`)
* **State & Memory:** Cloud Firestore (Native Mode & Vector Search)
* **Authentication:** GCP Application Default Credentials (ADC) & Service Account Impersonation
* **Frontend:** React, Tailwind CSS, Monaco Editor, Framer Motion
* **Real-Time Delivery:** Socket.io (WebSockets) & Slack Block Kit API

## Running Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/praxis-sre.git](https://github.com/your-username/praxis-sre.git)
   cd praxis-sre
