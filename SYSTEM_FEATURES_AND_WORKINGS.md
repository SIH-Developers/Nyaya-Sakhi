# National Helpline Against Atrocities (NHAA 14566)
## AI-Powered Dynamic Mental Health Monitoring & Distress Prediction System
### Ministry of Social Justice and Empowerment (MoSJE) | SIH Problem Statement ID: 26094

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Complete Feature Matrix](#2-complete-feature-matrix)
3. [System Architecture & Multi-Agent Engine](#3-system-architecture--multi-agent-engine)
4. [How the Website & Counselor Dashboard Works](#4-how-the-website--counselor-dashboard-works)
5. [How the Live Channels Work (Microphone & Telegram Voice Bot)](#5-how-the-live-channels-work-microphone--telegram-voice-bot)
6. [How Proactive Check-Ins Work](#6-how-proactive-check-ins-work)
7. [Legal & Statutory Alignment (SC/ST PoA Act 1989 & DPDP Act 2023)](#7-legal--statutory-alignment-scst-poa-act-1989--dpdp-act-2023)
8. [Database Schema & Data Flow](#8-database-schema--data-flow)
9. [Step-by-Step Guide to Run & Demonstrate](#9-step-by-step-guide-to-run--demonstrate)
10. [Verification & Test Results](#10-verification--test-results)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Context (MoSJE Problem Statement 26094)
Victims of caste-based atrocities registered under the **Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989** often experience protracted judicial proceedings, socio-economic intimidation, social boycott, and delayed state compensation. 

Existing grievance helplines (such as **NHAA 14566**) are predominantly **reactive**: they wait for a victim to dial in during an acute emergency. However, clinical trauma, depression, and suicidal ideation manifest gradually as a **silent downward spiral**—marked by reduced communication, flatter vocal tone, increasing response delays, and court hearing trauma.

### 1.2 The Solution
This platform implements a **proactive, multi-modal, multi-agent AI system** orchestrated via **LangGraph**. It continuously tracks victim wellbeing across diverse touchpoints (IVRS phone calls, mobile voice notes, web chat, and SMS), detects non-linear distress escalation, explains its clinical reasoning to counselors, and triggers timely interventions under statutory rules.

```
       ┌────────────────────────────────────────────────────────┐
       │     Victim Touchpoints (Voice, Text, Telemetry)         │
       │   Telegram Bot • Browser Mic • IVRS 14566 • Web Chat   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             FastAPI Backend REST & Webhooks            │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │         LangGraph Multi-Agent Orchestrator             │
       │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
       │  │NLP Agent │  │Speech Ag.│  │Behav. Ag.│  │Context Ag│ │
       │  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘ │
       │        └─────────────┼─────────────┼─────────────┘      │
       │                      ▼                                  │
       │          Multi-Modal Fusion Agent                       │
       │                      ▼                                  │
       │          Triage & Escalation Agent                      │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   React 18 Counselor Dashboard (Glassmorphism UI)      │
       │  KPIs • Triage Roster • Longitudinal Trend • PoA Relief │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Complete Feature Matrix

| Category | Feature | Description |
| :--- | :--- | :--- |
| **Dashboard** | **National & State KPIs** | Displays real-time counts for Active Cases, Critical Caseload, Pending Counselor Alerts, and Average Response SLA. |
| **Dashboard** | **Triage Roster** | Color-coded registry categorizing victims into `Urgent` (Red), `Counselor Outreach` (Amber), `Watch` (Blue), and `Routine` (Green). |
| **Dashboard** | **Dynamic Filters & Search** | Instant client-side filtering by Caste Category (SC/ST), Legal State, Risk Tier, and Case Search by Name/FIR. |
| **Dashboard** | **Counselor Alerts Inbox** | Live alert queue with 1-click counselor acknowledgment and clinical intervention notes. |
| **Victim 360°** | **Longitudinal SVG Distress Curve** | Visualizes turn-by-turn trajectory of victim distress over time, showing the exact moment of decline. |
| **Victim 360°** | **Multi-Signal Breakdown** | Deconstructs the score into NLP Sentiment, Acoustic Prosody, Behavioral Latency, and Case Stressors. |
| **Victim 360°** | **SC/ST PoA Action Center** | 1-click legal action triggers: Witness Protection (Sec 15A), Relief Disbursement (Rule 12(4)), Legal Aid (Rule 14). |
| **Victim 360°** | **Proactive Check-In Dispatcher** | Counselor can trigger targeted proactive inquiries: Routine Wellbeing, Safety Check, or Compensation Relief. |
| **Simulator** | **Live Microphone Call Simulator** | Records real audio directly from counselor/judge microphone via WebRTC, runs speech-to-text, and analyzes acoustic wave. |
| **Simulator** | **Synthetic Channel Injector** | Allows testing of Chatbot text, IVRS voice parameters, and behavioral anomalies with custom sliders. |
| **Mobile Bot** | **Telegram Voice & Text Bot** | `@nhaa_14566_sih_bot` enables real victims/testers to send live voice notes from their smartphone without telecom fees. |
| **Mobile Bot** | **Auto-Registration of Real Users** | Automatically creates a verified profile in SQLite when a new user starts the Telegram bot. |
| **Privacy** | **AES-256 Data Encryption** | Sensitive victim interaction transcripts are encrypted at rest using PBKDF2HMAC + Fernet AES-256 (DPDP Act 2023). |
| **Privacy** | **Role-Based Access Control (RBAC)** | Restricts decrypted transcript viewing to authorized counselors and supervisors; masks data for read-only staff. |

---

## 3. System Architecture & Multi-Agent Engine

The core reasoning engine is built using **LangGraph** (`graph.py`), employing a parallel fan-out pattern to evaluate 4 distinct feature spaces simultaneously, converging into a clinical fusion agent.

### 3.1 Agent 1: Natural Language Processing Agent (`nlp_agent.py`)
* **Underlying Model:** Hugging Face Serverless API running `SamLowe/roberta-base-go_emotions` (28 emotion labels).
* **Negative Emotion Mapping:** Computes weighted distress from emotions including `sadness`, `fear`, `grief`, `anger`, `remorse`, and `disgust`.
* **Clinical Hopelessness & Self-Harm Detector:**
  * Uses a high-priority clinical lexicon targeting suicide ideation, profound despair, and hopelessness (e.g., *"no reason to live"*, *"better off dead"*, *"give up"*).
  * Immediately forces an emergency floor score of **0.95 (P1-Critical)** regardless of other signals.

### 3.2 Agent 2: Speech & Acoustic Prosody Agent (`speech_agent.py`)
* **Acoustic Signal Processing:** Analyzes audio waveforms for 3 primary vocal biomarkers of trauma:
  1. **Pitch Variance (F0 variability):** Flat, monotone pitch ($< 10.0$ Hz) indicates emotional blunting or depressive stupor. High erratic variance indicates panic.
  2. **Pause Ratio:** Silence ratio $> 25\%$ reflects cognitive hesitation, psychomotor retardation, or fear of speaking.
  3. **Speaking Rate:** Rate $< 90$ WPM or $> 175$ WPM reflects psychomotor slowing or severe anxiety.
* **Tone Distress Scoring:** Dynamically weights pitch flatness ($40\%$), pause ratio ($35\%$), and speech rate deviation ($25\%$).

### 3.3 Agent 3: Behavioral Engagement Agent (`behavior_agent.py`)
* **Longitudinal Engagement Tracking:** Compares current interaction latency with the victim's historical baseline.
* **Disengagement Markers:**
  * Response latency doubling ($> 2.0\times$ baseline).
  * 2 or more consecutive missed proactive check-in attempts.
  * Prolonged silence ($> 7$ days since last contact).
* **Clinical Significance:** In trauma survivors, sudden communicative withdrawal is the #1 leading indicator of severe depressive relapse or intimidation.

### 3.4 Agent 4: Case & Legal Context Agent (`context_agent.py`)
Integrates statutory stressors unique to the SC/ST PoA Act:
* **Accused Bail Granted:** Weight $+0.35$ (victim faces direct physical threat from released perpetrator).
* **Threat / Intimidation Reported:** Weight $+0.40$ (immediate safety hazard).
* **Court Hearing Postponed:** Weight $+0.15$ (judicial fatigue and legal despair).
* **Relief Compensation Delayed:** Weight $+0.10$ (financial distress during trial).

### 3.5 Agent 5: Multi-Modal Fusion Agent (`fusion_agent.py`)
* **Dynamic Channel Weighting:**
  * **With Audio:** $\text{Score} = 0.35 \times \text{NLP} + 0.15 \times \text{Speech} + 0.25 \times \text{Behavior} + 0.25 \times \text{Context}$
  * **Text Only:** $\text{Score} = 0.45 \times \text{NLP} + 0.00 \times \text{Speech} + 0.25 \times \text{Behavior} + 0.30 \times \text{Context}$
* **Synergistic Multiplier (The "Riya" Scenario):**
  $$\text{If } (\text{High Stress Legal Trigger} \land \text{Behavioral Withdrawal} \land \text{NLP Distress} \ge 0.40) \implies \text{Score} = \min(1.0, \text{Score} \times 1.35)$$
* **Explainability Generation:** Translates model activations into clear, bulleted reasons for counselors (e.g., *"Accused granted bail"*, *"Prosody: Flat monotone pitch detected"*).

### 3.6 Agent 6: Decision & Escalation Agent (`escalation_agent.py`)
Assigns action tiers based on fused risk score:
* 🔴 **`Urgent` ($\ge 0.75$):** Generates `P1-CRITICAL` alert; triggers counselor notification within 15 minutes; flags for witness protection.
* 🟠 **`Counselor Outreach` ($0.50 - 0.74$):** Generates `P2-HIGH` alert; queues counselor phone callback within 4 hours.
* 🟡 **`Watch` ($0.30 - 0.49$):** Increases proactive automated check-in frequency to every 48 hours.
* 🟢 **`Routine` ($< 0.30$):** Maintains standard weekly check-in schedule.

---

## 4. How the Website & Counselor Dashboard Works

### 4.1 Header & System Status
* Displays official MoSJE, NHAA 14566, and SC/ST PoA Act 1989 branding.
* Shows active database connection, real-time local time, and quick action buttons.

### 4.2 KPI Summary Cards
* **Total Monitored Cases:** Active victims registered under the PoA Act.
* **Urgent / High Risk:** Count of victims currently at critical thresholds requiring clinical human touch.
* **Pending Alerts:** Unacknowledged counselor warnings.
* **Average Response Time:** Speed of counselor triage turnaround.

### 4.3 Interactive Triage Roster
* Displays each victim's **ID, Name, Caste Category, FIR Number, Legal State, Case Stage, Accused Bail Status, Current Distress Score, and Risk Badge**.
* Includes a **Filter Bar** to segment by:
  * Risk Tier (`All`, `Urgent`, `Outreach`, `Watch`, `Routine`).
  * Caste Category (`Scheduled Caste`, `Scheduled Tribe`).
  * State (`Delhi`, `Rajasthan`, `Madhya Pradesh`, `Uttar Pradesh`, `Maharashtra`).
  * Search Query (Live matching by victim name or FIR).
* Clicking any victim row opens their **Victim 360° Profile Modal**.

### 4.4 Victim 360° Profile Modal
Contains 4 deep-dive tabs and sections:
1. **Longitudinal Distress Trajectory:** A dynamic SVG curve plotting the victim's distress score across historical turns (e.g. Turn 1 baseline $\rightarrow$ Turn 4 crisis), allowing counselors to spot inflection points.
2. **Multi-Signal Decomposition:** Side-by-side metric cards showing NLP emotion confidence, speech prosody score, behavioral latency ratio, and legal risk weight.
3. **PoA Act Statutory Case Dossier:**
   * FIR Number & Police Station jurisdiction.
   * Accused Bail Status (`Granted`, `Denied`, `Pending`).
   * Threat Flag (`Intimidation Reported` vs `Normal`).
   * Hearing Status (`Scheduled`, `Postponed`).
   * Compensation Relief Status under PoA Rules 1995 (`Pending`, `Sanctioned`, `Disbursed`).
4. **SC/ST PoA Statutory Action Center:**
   * 🛡️ **Dispatch Witness Protection Unit:** Invokes Section 15A of SC/ST PoA Act.
   * 💰 **Expedite Rehabilitation Relief:** Triggers urgent compensation release under Rule 12(4).
   * ⚖️ **Request Special Public Prosecutor:** Escalates legal support under Rule 14.
   * 📝 **Log Counselor Outreach Note:** Records counselor clinical notes directly into the case audit trail.
5. **Proactive Check-In Dispatcher:** Select between *Routine Wellbeing*, *Witness Safety Check*, or *Compensation Follow-up*, and click **"Send Proactive Check-in Prompt"** to immediately dispatch an automated outbound query to the victim's phone.

### 4.5 Counselor Alerts Feed
* Streams real-time alerts generated by the multi-agent engine.
* Highlights the priority level (`CRITICAL` vs `HIGH`), victim details, timestamp, and triggered reasons.
* Provides an **Acknowledge Alert** button with a notes input field so counselors can document the intervention.

---

## 5. How the Live Channels Work (Microphone & Telegram Voice Bot)

### 5.1 Real Browser Microphone Voice Call Simulator
Located on the dashboard under **"Live Telephony & Mic Simulator"**:
1. Click **"Start Live Call (Record Mic)"**.
2. Speak naturally into your microphone (e.g., expressing worry, stress, or normal conversation).
3. The browser records the raw audio stream via `MediaRecorder` while simultaneously transcribing speech via the Web Speech API.
4. Click **"End Call & Process Audio"**.
5. The audio file (`.ogg`/`.webm`) is uploaded via multipart form data to `POST /api/upload-audio-call`.
6. The backend extracts physical pitch variability, pauses, and energy, invokes the LangGraph pipeline, updates the database, and displays the risk score and explainability factors.

### 5.2 Telegram Voice & Text Support Bot (`@nhaa_14566_sih_bot`)
Provides 100% free, real-world smartphone testing without telecom gateway fees or credit cards:
1. Open Telegram on your phone or PC and search for **`@nhaa_14566_sih_bot`**.
2. Click **Start** (sends `/start`).
3. The bot **auto-registers** the user in the SQLite database with their real Telegram name and assigns an ID (e.g., `VIC-TG-6285611050`).
4. **Sending a Voice Note:** Hold the microphone button on Telegram, speak a message, and release.
5. The bot downloads the audio file from Telegram servers, sends it to `/api/upload-audio-call`, analyzes acoustic prosody, executes the multi-agent graph, updates the live dashboard in real time, and sends a supportive reply back on Telegram.
6. **Sending a Text Message:** Type any message in Hindi or English. The bot routes it through the NLP agent and replies with the distress assessment.

---

## 6. How Proactive Check-Ins Work

### 6.1 Why Proactive Check-Ins are Critical
Victims suffering from severe trauma or facing intimidation rarely reach out voluntarily. Proactive check-ins flip the paradigm from **reactive** to **preventative**.

### 6.2 How Check-Ins Reach the Victim
Depending on the victim's registered device and connectivity:
* **Basic Mobile Phones (Rural / Feature Phones):**
  * The telephony gateway (NHAA 14566) triggers an automated outbound IVRS call.
  * When the victim answers, an automated voice speaks the check-in question (e.g. *"Namaste, this is NHAA 14566. How are you feeling today?"*), records their spoken response, and uploads the audio.
  * Alternatively, an outbound SMS with an interactive response shortcode is sent.
* **Smartphones (Telegram / Mobile App):**
  * The system dispatches an automated prompt directly to their Telegram chat or mobile app notification.
  * The victim replies with text or a voice note.

### 6.3 Triggering Mechanisms
1. **Automated Scheduled Cadence:** Run by background scheduler based on risk tier (Weekly for Routine, every 48 hours for Watch).
2. **Counselor-Initiated Dispatch:** A counselor reviewing a victim's chart clicks **"Send Proactive Check-in Prompt"** in the Victim Detail Modal to dispatch an inquiry immediately.

---

## 7. Legal & Statutory Alignment (SC/ST PoA Act 1989 & DPDP Act 2023)

### 7.1 SC/ST (Prevention of Atrocities) Act, 1989
* **Section 15A (Witness & Victim Protection):** When intimidation or bail granted stressors cause high distress, the system flags the case for immediate police protection.
* **Rule 12(4) PoA Rules 1995 (Immediate Relief):** Tracks statutory compensation disbursement stages (25% on FIR, 50% on charge sheet, 25% on conviction). Counselors can trigger expedited relief workflows.
* **Rule 14 PoA Rules 1995 (Legal Aid & Advocacy):** Automatically flags cases where legal representation is lacking or hearings are repeatedly delayed.

### 7.2 Digital Personal Data Protection (DPDP) Act, 2023
* **Field-Level AES-256 Encryption:** All sensitive transcripts and PII are encrypted at rest using PBKDF2HMAC key derivation with Fernet (`privacy.py`).
* **Role-Based Access Control (RBAC):** Only authorized clinical counselors, supervisors, and system administrators can view decrypted interaction text. Read-only investigators receive masked strings.
* **Informed Consent Management:** Schema includes a `consent_flag` tracking victim consent for automated distress monitoring.

---

## 8. Database Schema & Data Flow

The system uses an ACID-compliant SQLite database (`distress_monitoring.db`):

### Table: `victims`
| Column | Type | Description |
| :--- | :--- | :--- |
| `victim_id` | TEXT PRIMARY KEY | Unique identifier (e.g. `VIC-2026-001` or `VIC-TG-6285611050`) |
| `name` | TEXT | Encrypted or plain victim name |
| `caste_category` | TEXT | `Scheduled Caste` or `Scheduled Tribe` |
| `fir_number` | TEXT | Registered police FIR number |
| `police_station` | TEXT | Jurisdiction police station |
| `district` / `state` | TEXT | Administrative geography |
| `case_stage` | TEXT | `FIR Filed`, `Investigation`, `Charge Sheet`, `Trial` |
| `accused_bail_status`| TEXT | `Granted`, `Denied`, `Pending` |
| `threat_reported` | INTEGER | Boolean flag for witness intimidation |
| `hearing_postponed` | INTEGER | Boolean flag for court delays |
| `compensation_status`| TEXT | `Pending`, `Sanctioned`, `Disbursed` |
| `consent_flag` | INTEGER | DPDP Act consent status |

### Table: `interaction_logs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `log_id` | TEXT PRIMARY KEY | Unique interaction turn ID |
| `victim_id` | TEXT (FK) | Reference to `victims.victim_id` |
| `turn_id` | INTEGER | Turn sequence number (1, 2, 3...) |
| `timestamp` | TEXT | ISO-8601 interaction timestamp |
| `channel` | TEXT | `ivrs`, `telegram_mobile`, `chatbot`, `browser_mic` |
| `message_text_encrypted`| TEXT | AES-256 encrypted transcript |
| `nlp_score` | REAL | Text distress score (0.0 to 1.0) |
| `speech_score` | REAL | Prosody tone score (0.0 to 1.0) |
| `behavior_score` | REAL | Latency/engagement anomaly score |
| `context_score` | REAL | Legal stressor weight |
| `fused_risk_score` | REAL | Calibrated multi-modal risk score |
| `risk_tier` | TEXT | Assigned tier (`Urgent`, `Outreach`, `Watch`, `Routine`) |
| `explainability_reasons`| TEXT | JSON array of human-readable clinical reasons |

### Table: `counselor_alerts`
| Column | Type | Description |
| :--- | :--- | :--- |
| `alert_id` | TEXT PRIMARY KEY | Unique alert ID |
| `victim_id` | TEXT (FK) | Target victim |
| `priority` | TEXT | `CRITICAL`, `HIGH`, `MEDIUM` |
| `fused_score` | REAL | Triggering risk score |
| `trigger_reasons` | TEXT | JSON array of reasons |
| `status` | TEXT | `Pending` or `Acknowledged` |
| `counselor_notes` | TEXT | Clinical intervention log |

---

## 9. Step-by-Step Guide to Run & Demonstrate

### 9.1 Prerequisites
* Python 3.10 or higher
* Node.js 18+ and npm
* Microphone access (for live web browser calls)
* Telegram App (optional, for live mobile testing)

### 9.2 Starting All Services in 1 Step
Run the master orchestrator script from the project root:
```bash
python run_project.py
```
This automatically launches:
1. **FastAPI Backend Server** on `http://127.0.0.1:8000`
2. **React Counselor Dashboard** on `http://localhost:5173`
3. **Telegram Voice & Text Bot** (`@nhaa_14566_sih_bot`)

### 9.3 Demonstration Walkthrough for Evaluators & Judges

#### Step 1: Open the Dashboard
Navigate to `http://localhost:5173` in your browser. Notice:
* The 4 KPI cards at the top.
* The Triage Roster with color-coded risk badges.
* The Alerts Feed on the right sidebar.

#### Step 2: Test the "Riya" Benchmark Case
1. In the Triage Roster, find **Riya Kumari (`VIC-2026-001`)**.
2. Notice her status is **`Urgent`** with an 88% distress score.
3. Click on Riya's card to open her **Victim 360° Profile Modal**.
4. Observe the **Longitudinal Curve**:
   * Turn 1: 18% (Baseline routine check-in).
   * Turn 2: 38% (Charge sheet filed).
   * Turn 3: 65% (Accused applied for bail, response delayed).
   * Turn 4: 88% (Accused granted bail, intimidation reported, severe hopelessness).
5. Click **"Dispatch Protection Unit"** or **"Expedite Relief"** to view the PoA Act statutory actions.

#### Step 3: Test Live Voice Calls with Your Real Microphone
1. In the **"Live Telephony & Mic Simulator"** section, select any victim from the dropdown.
2. Click **"Start Live Call (Record Mic)"**.
3. Speak into your computer microphone (e.g., *"I am feeling very scared, someone was outside my house yesterday"*).
4. Click **"End Call & Process Audio"**.
5. Watch the system perform real-time prosodic analysis, calculate the fused score, and update the dashboard.

#### Step 4: Test Live Mobile Phone Voice Notes via Telegram
1. Open Telegram on your phone and search for **`@nhaa_14566_sih_bot`**.
2. Press **Start**.
3. Hold the voice note button, record a spoken message, and send it.
4. The bot will reply with your real-time Distress Score, Risk Tier, and Detected Acoustic Factors.
5. Refresh the web dashboard—your profile will appear in the Triage Roster with your live score!

#### Step 5: Test Proactive Check-In Dispatch
1. Open any victim modal on the dashboard.
2. Under **"Send Proactive Check-in Prompt"**, choose a prompt type (*Safety Check*, *Routine Wellbeing*, or *Compensation Relief*).
3. Click **"Send Proactive Check-in Prompt"**.
4. Confirm the dispatch notification showing channel routing to IVRS/SMS/Telegram.

---

## 10. Verification & Test Results

The system includes a dedicated unit test suite covering all multi-agent components:

```bash
# Run unit test suite for all 6 agents
python test_individual_agents.py

# Run end-to-end multi-turn pipeline verification
python test_pipeline.py
```

### Verified Test Summary:
* ✅ **NLP Agent:** Verified against 28 Hugging Face GoEmotions labels + clinical hopelessness override.
* ✅ **Speech Agent:** Verified acoustic tone scoring on pitch flatness, pause ratios, and speech rate.
* ✅ **Behavioral Agent:** Verified detection of $2\times$ response latency and consecutive missed check-ins.
* ✅ **Case Context Agent:** Verified accurate risk weighting for bail status, threat reports, and hearing delays.
* ✅ **Multi-Modal Fusion Agent:** Verified dynamic audio/text weights and non-linear synergy multiplier.
* ✅ **Escalation Agent:** Verified triage categorization across all 4 risk tiers (`Urgent`, `Outreach`, `Watch`, `Routine`).
* ✅ **Privacy & Security:** Verified AES-256 field-level encryption and RBAC role masking under DPDP Act 2023.

---

*Document prepared for Ministry of Social Justice and Empowerment (MoSJE) & Smart India Hackathon (SIH).*
