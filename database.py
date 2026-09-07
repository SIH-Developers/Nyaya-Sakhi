"""
SQLite Database Layer for SIH 26094
Stores Victims, Case Context, Encrypted Interaction Logs, and Counselor Alerts.
"""
import sqlite3
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from privacy import encrypt_sensitive_field, decrypt_sensitive_field

DB_PATH = Path(__file__).parent / "distress_monitoring.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Victims & NHAA Legal Case Records Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS victims (
        victim_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        caste_category TEXT DEFAULT 'Scheduled Caste',
        fir_number TEXT,
        police_station TEXT,
        district TEXT,
        state TEXT,
        case_stage TEXT DEFAULT 'FIR Filed',
        accused_bail_status TEXT DEFAULT 'Denied',
        threat_reported INTEGER DEFAULT 0,
        hearing_postponed INTEGER DEFAULT 0,
        compensation_status TEXT DEFAULT 'Pending',
        current_risk_score REAL DEFAULT 0.0,
        current_risk_tier TEXT DEFAULT 'Routine',
        last_interaction_at TEXT,
        consent_flag INTEGER DEFAULT 1,
        created_at TEXT
    )
    """)

    # 2. Encrypted Interaction Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interaction_logs (
        log_id TEXT PRIMARY KEY,
        victim_id TEXT NOT NULL,
        turn_id INTEGER,
        channel TEXT NOT NULL,
        encrypted_message TEXT,
        audio_metadata TEXT,
        nlp_score REAL,
        speech_score REAL,
        behavior_score REAL,
        context_score REAL,
        fused_risk_score REAL,
        risk_tier TEXT,
        explainability_reasons TEXT,
        timestamp TEXT,
        FOREIGN KEY (victim_id) REFERENCES victims(victim_id)
    )
    """)

    # 3. Counselor Alerts Table (Human-in-the-Loop)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS counselor_alerts (
        alert_id TEXT PRIMARY KEY,
        victim_id TEXT NOT NULL,
        priority TEXT NOT NULL,
        risk_tier TEXT NOT NULL,
        fused_risk_score REAL NOT NULL,
        recommended_action TEXT,
        sc_st_poa_interventions TEXT,
        clinical_reasons TEXT,
        status TEXT DEFAULT 'Pending',
        counselor_notes TEXT DEFAULT '',
        created_at TEXT,
        acknowledged_at TEXT,
        FOREIGN KEY (victim_id) REFERENCES victims(victim_id)
    )
    """)

    # Migration: add new columns if they don't exist (safe for existing DBs)
    for col_def in [
        ("consent_timestamp", "ALTER TABLE victims ADD COLUMN consent_timestamp TEXT"),
        ("last_channel",       "ALTER TABLE victims ADD COLUMN last_channel TEXT"),
        ("telegram_chat_id",   "ALTER TABLE victims ADD COLUMN telegram_chat_id TEXT"),
        ("registration_status", "ALTER TABLE victims ADD COLUMN registration_status TEXT DEFAULT 'verified'"),
        ("link_code",          "ALTER TABLE victims ADD COLUMN link_code TEXT"),
        ("link_code_expiry",   "ALTER TABLE victims ADD COLUMN link_code_expiry TEXT"),
        ("email",              "ALTER TABLE victims ADD COLUMN email TEXT"),
        ("phone_number",       "ALTER TABLE victims ADD COLUMN phone_number TEXT"),
    ]:
        try:
            cursor.execute(col_def[1])
        except Exception:
            pass  # column already exists

    # 4. Escalation Alerts table (TASK 2 — used by escalation_agent)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS escalation_alerts (
        alert_id TEXT PRIMARY KEY,
        victim_id TEXT NOT NULL,
        timestamp TEXT,
        priority TEXT,
        risk_tier TEXT,
        fused_risk_score REAL,
        recommended_action TEXT,
        clinical_reasons TEXT,
        human_in_the_loop_status TEXT DEFAULT 'Awaiting Counselor Review',
        acknowledged INTEGER DEFAULT 0,
        channel TEXT,
        FOREIGN KEY (victim_id) REFERENCES victims(victim_id)
    )
    """)

    # 5. Patient OTPs Table (Part B — Patient Portal SMS/Email OTP authentication)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patient_otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        victim_id TEXT NOT NULL,
        email TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        used INTEGER DEFAULT 0
    )
    """)

    conn.commit()
    conn.close()

def save_victim_turn(state: Dict[str, Any]) -> str:
    """Save completed turn into interaction_logs and update victim summary."""
    conn = get_connection()
    cursor = conn.cursor()

    victim_id = state.get("victim_id", "UNKNOWN")
    turn_id = state.get("turn_id", 1)
    channel = state.get("channel", "chatbot")
    msg_raw = state.get("message_text", "")
    encrypted_msg = encrypt_sensitive_field(msg_raw)
    
    audio_meta_json = json.dumps(state.get("audio_metadata") or {})
    nlp_score = state.get("nlp_results", {}).get("distress_score", 0.0)
    speech_score = state.get("speech_results", {}).get("tone_distress_score", 0.0)
    behavior_score = state.get("behavioral_results", {}).get("behavioral_anomaly_score", 0.0)
    context_score = state.get("case_context_results", {}).get("context_risk_weight", 0.0)
    
    fused_score = state.get("fused_risk_score", 0.0)
    risk_tier = state.get("risk_tier", "Routine")
    reasons_json = json.dumps(state.get("explainability_reasons", []))
    timestamp = state.get("timestamp") or datetime.now().isoformat()
    log_id = f"LOG-{victim_id}-T{turn_id}-{uuid.uuid4().hex[:8]}"

    # Insert interaction log
    cursor.execute("""
    INSERT OR REPLACE INTO interaction_logs (
        log_id, victim_id, turn_id, channel, encrypted_message, audio_metadata,
        nlp_score, speech_score, behavior_score, context_score,
        fused_risk_score, risk_tier, explainability_reasons, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_id, victim_id, turn_id, channel, encrypted_msg, audio_meta_json,
        nlp_score, speech_score, behavior_score, context_score,
        fused_score, risk_tier, reasons_json, timestamp
    ))

    # Update victim's current score, tier, last_channel
    cursor.execute("""
    UPDATE victims
    SET current_risk_score = ?, current_risk_tier = ?, last_interaction_at = ?, last_channel = ?
    WHERE victim_id = ?
    """, (fused_score, risk_tier, timestamp, channel, victim_id))

    # If escalation triggered, save alert
    if state.get("escalation_triggered") and state.get("escalation_alert"):
        alert = state["escalation_alert"]
        interventions = state.get("sc_st_poa_interventions", [
            "Immediate Telephonic Counseling Outreach",
            "Emergency Legal Aid & Public Prosecutor Notification"
        ])
        cursor.execute("""
        INSERT OR REPLACE INTO counselor_alerts (
            alert_id, victim_id, priority, risk_tier, fused_risk_score,
            recommended_action, sc_st_poa_interventions, clinical_reasons,
            status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        """, (
            alert.get("alert_id"),
            victim_id,
            alert.get("priority", "P1-CRITICAL"),
            risk_tier,
            fused_score,
            alert.get("recommended_action"),
            json.dumps(interventions),
            json.dumps(alert.get("clinical_reasons", [])),
            timestamp
        ))

    conn.commit()
    conn.close()
    return log_id

def get_all_victims() -> List[Dict[str, Any]]:
    """Retrieve all victim profiles sorted by current risk severity."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM victims
    ORDER BY 
        CASE current_risk_tier
            WHEN 'Urgent' THEN 1
            WHEN 'Counselor Outreach' THEN 2
            WHEN 'Watch' THEN 3
            ELSE 4
        END, current_risk_score DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_victim_details(victim_id: str) -> Optional[Dict[str, Any]]:
    """Get single victim record."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM victims WHERE victim_id = ?", (victim_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_victim_history(victim_id: str, user_role: str = "counselor") -> List[Dict[str, Any]]:
    """Retrieve turn history and decrypted messages for longitudinal plotting."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM interaction_logs
    WHERE victim_id = ?
    ORDER BY turn_id ASC, timestamp ASC
    """, (victim_id,))
    rows = cursor.fetchall()
    conn.close()

    history = []
    for r in rows:
        d = dict(r)
        d["message_text"] = decrypt_sensitive_field(d.get("encrypted_message", ""), user_role)
        d["explainability_reasons"] = json.loads(d.get("explainability_reasons") or "[]")
        d["audio_metadata"] = json.loads(d.get("audio_metadata") or "{}")
        history.append(d)
    return history

def get_alerts(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve counselor alerts with associated victim metadata."""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
    SELECT a.*, v.name as victim_name, v.district, v.state, v.caste_category, v.fir_number
    FROM counselor_alerts a
    JOIN victims v ON a.victim_id = v.victim_id
    """
    params = []
    if status_filter:
        query += " WHERE a.status = ?"
        params.append(status_filter)
    query += " ORDER BY CASE a.priority WHEN 'P1-CRITICAL' THEN 1 ELSE 2 END, a.created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    alerts = []
    for r in rows:
        d = dict(r)
        d["clinical_reasons"] = json.loads(d.get("clinical_reasons") or "[]")
        d["sc_st_poa_interventions"] = json.loads(d.get("sc_st_poa_interventions") or "[]")
        alerts.append(d)
    return alerts

def acknowledge_alert(alert_id: str, counselor_notes: str = "") -> bool:
    """Acknowledge alert by counselor."""
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    cursor.execute("""
    UPDATE counselor_alerts
    SET status = 'Acknowledged', counselor_notes = ?, acknowledged_at = ?
    WHERE alert_id = ?
    """, (counselor_notes, now_str, alert_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def get_system_stats() -> Dict[str, Any]:
    """National / State / District summary statistics."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM victims")
    total_victims = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM counselor_alerts WHERE status = 'Pending'")
    pending_alerts = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM victims WHERE current_risk_tier = 'Urgent'")
    urgent_cases = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM victims WHERE current_risk_tier = 'Counselor Outreach'")
    outreach_cases = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM interaction_logs")
    total_interactions = cursor.fetchone()[0]

    conn.close()
    return {
        "total_monitored_victims": total_victims,
        "pending_critical_alerts": pending_alerts,
        "urgent_cases": urgent_cases,
        "outreach_cases": outreach_cases,
        "total_interactions_logged": total_interactions
    }


# ── Case Linking & Reference Lookup (Part A) ──────────────────────────────────

def find_victim_by_fir_or_link(query: str) -> Optional[Dict[str, Any]]:
    """
    Search victims table by FIR number or active 6-digit link code.
    Matches exact FIR, case-insensitive FIR, or unexpired link_code.
    """
    if not query:
        return None
    q = query.strip()
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now().isoformat()

    # 1. Match by 6-digit link code if applicable
    if q.isdigit() and len(q) == 6:
        cursor.execute(
            "SELECT * FROM victims WHERE link_code = ? AND link_code_expiry >= ?",
            (q, now_iso)
        )
        row = cursor.fetchone()
        if row:
            conn.close()
            return dict(row)

    # 2. Match by exact FIR number (case-insensitive)
    cursor.execute("SELECT * FROM victims WHERE UPPER(fir_number) = UPPER(?)", (q,))
    row = cursor.fetchone()
    if row:
        conn.close()
        return dict(row)

    # 3. Match normalized FIR (e.g. if user entered '2026/894' for 'FIR-2026/894')
    cursor.execute("SELECT * FROM victims WHERE fir_number LIKE ?", (f"%{q}%",))
    rows = cursor.fetchall()
    conn.close()
    if len(rows) == 1:
        return dict(rows[0])
    return None

def link_telegram_to_victim(victim_id: str, chat_id: int) -> bool:
    """Attach Telegram chat_id to an existing victim record."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE victims SET telegram_chat_id = ?, last_channel = 'telegram_mobile' WHERE victim_id = ?",
        (str(chat_id), victim_id)
    )
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def generate_and_save_link_code(victim_id: str) -> Dict[str, Any]:
    """
    Generate a 6-digit linking code valid for 7 days for a victim record.
    Used by District Officers for in-person intake linking.
    """
    import random
    from datetime import timedelta
    code = f"{random.randint(100000, 999999)}"
    expiry = (datetime.now() + timedelta(days=7)).isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE victims SET link_code = ?, link_code_expiry = ? WHERE victim_id = ?",
        (code, expiry, victim_id)
    )
    conn.commit()
    conn.close()
    return {"victim_id": victim_id, "link_code": code, "expires_at": expiry}

def update_victim_email(victim_id: str, email: str) -> bool:
    """Update victim email for Patient Portal access (Officer authenticated)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE victims SET email = ? WHERE victim_id = ?",
        (email.strip().lower(), victim_id)
    )
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def verify_and_update_victim(victim_id: str, fir_number: Optional[str] = None, district: Optional[str] = None) -> bool:
    """Officer verifies self-registered victim and attaches official FIR number."""
    conn = get_connection()
    cursor = conn.cursor()
    updates = ["registration_status = 'verified'"]
    params = []
    if fir_number:
        updates.append("fir_number = ?")
        params.append(fir_number.strip())
    if district:
        updates.append("district = ?")
        params.append(district.strip())
    params.append(victim_id)

    query = f"UPDATE victims SET {', '.join(updates)} WHERE victim_id = ?"
    cursor.execute(query, params)
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0


# ── Patient Portal OTP & Rate Limiting (Part B) ────────────────────────────────

def check_otp_rate_limit(victim_id: str, email: str) -> bool:
    """
    Returns True if allowed, False if rate limited.
    Enforces max 3 OTP requests per victim/email within 15 minutes.
    Called BEFORE generating OTP and BEFORE dispatching via Brevo.
    """
    from datetime import timedelta
    conn = get_connection()
    cursor = conn.cursor()
    cutoff = (datetime.now() - timedelta(minutes=15)).isoformat()
    cursor.execute(
        "SELECT COUNT(*) FROM patient_otps WHERE (victim_id = ? OR email = ?) AND created_at >= ?",
        (victim_id, email.lower(), cutoff)
    )
    count = cursor.fetchone()[0]
    conn.close()
    return count < 3

def record_patient_otp(victim_id: str, email: str, otp_code: str, expires_at: str) -> None:
    """Record a generated OTP in the database with 10-minute expiry."""
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now().isoformat()
    cursor.execute(
        """INSERT INTO patient_otps (victim_id, email, otp_code, expires_at, created_at, used)
           VALUES (?, ?, ?, ?, ?, 0)""",
        (victim_id, email.lower(), otp_code, expires_at, now_iso)
    )
    conn.commit()
    conn.close()

def validate_patient_otp(identifier: str, otp_code: str) -> Optional[Dict[str, Any]]:
    """
    Validates OTP for victim_id or email:
    - Enforces used = 0 (single-use)
    - Enforces expires_at > now() (unexpired)
    - Atomically marks used = 1 on success to prevent replay attacks
    Returns victim record if valid, None otherwise.
    """
    clean_id = identifier.strip()
    clean_otp = otp_code.strip()
    now_iso = datetime.now().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT id, victim_id, email, expires_at, used
           FROM patient_otps
           WHERE (UPPER(victim_id) = UPPER(?) OR LOWER(email) = LOWER(?))
             AND otp_code = ?
             AND used = 0
           ORDER BY id DESC LIMIT 1""",
        (clean_id, clean_id, clean_otp)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    otp_id = row["id"]
    expires_at = row["expires_at"]
    target_victim_id = row["victim_id"]

    if expires_at < now_iso:
        conn.close()
        return None

    # Atomically mark as consumed
    cursor.execute("UPDATE patient_otps SET used = 1 WHERE id = ?", (otp_id,))
    conn.commit()

    # Fetch victim details
    cursor.execute("SELECT * FROM victims WHERE victim_id = ?", (target_victim_id,))
    victim_row = cursor.fetchone()
    conn.close()
    return dict(victim_row) if victim_row else None


# ── Full History Aggregation (Part C) ──────────────────────────────────────────

def get_full_victim_history(victim_id: str) -> Optional[Dict[str, Any]]:
    """
    Aggregate full patient history for Counselor Dashboard detail view:
    - Demographic and case milestone details
    - Longitudinal interaction logs with voice prosody & explainability
    - Channels utilized summary
    - Escalation alerts with clinical reasons
    """
    victim = get_victim_details(victim_id)
    if not victim:
        return None

    conn = get_connection()
    cursor = conn.cursor()

    # Fetch all interaction logs
    cursor.execute(
        """SELECT log_id, turn_id, channel, nlp_score, speech_score, behavior_score,
                  context_score, fused_risk_score, risk_tier, explainability_reasons,
                  audio_metadata, timestamp, encrypted_message
           FROM interaction_logs
           WHERE victim_id = ?
           ORDER BY turn_id ASC""",
        (victim_id,)
    )
    logs_raw = cursor.fetchall()

    turns = []
    channels_used = set()
    for row in logs_raw:
        item = dict(row)
        try:
            item["explainability_reasons"] = json.loads(item.get("explainability_reasons") or "[]")
        except Exception:
            item["explainability_reasons"] = []
        try:
            item["audio_metadata"] = json.loads(item.get("audio_metadata") or "{}")
        except Exception:
            item["audio_metadata"] = {}
        # Decrypt message text for counselor view
        try:
            item["message_text"] = decrypt_sensitive_field(item.get("encrypted_message") or "")
        except Exception:
            item["message_text"] = "[Protected Message]"
        item.pop("encrypted_message", None)
        if item.get("channel"):
            channels_used.add(item["channel"])
        turns.append(item)

    # Fetch past escalation alerts
    cursor.execute(
        """SELECT alert_id, timestamp, priority, risk_tier, fused_risk_score,
                  recommended_action, clinical_reasons, human_in_the_loop_status,
                  acknowledged, channel
           FROM escalation_alerts
           WHERE victim_id = ?
           ORDER BY timestamp DESC""",
        (victim_id,)
    )
    alerts_raw = cursor.fetchall()
    alerts = []
    for a in alerts_raw:
        ad = dict(a)
        try:
            ad["clinical_reasons"] = json.loads(ad.get("clinical_reasons") or "[]")
        except Exception:
            ad["clinical_reasons"] = []
        alerts.append(ad)

    conn.close()

    # Milestone timeline
    milestones = [
        {"milestone": "FIR Filed", "completed": bool(victim.get("fir_number") and victim.get("fir_number") != "Intake (Pending FIR)")},
        {"milestone": "Investigation / Chargesheet", "completed": victim.get("case_stage") in ["Charge Sheet Filed", "Trial", "Judgment"]},
        {"milestone": "Accused Bail Status", "status": victim.get("accused_bail_status", "Pending")},
        {"milestone": "Special Court Trial", "completed": victim.get("case_stage") in ["Trial", "Judgment"]},
        {"milestone": "Relief & Compensation", "status": victim.get("compensation_status", "Pending")},
    ]

    return {
        "victim": victim,
        "turns": turns,
        "channels_used": list(channels_used),
        "escalation_alerts": alerts,
        "milestones": milestones,
        "registration_status": victim.get("registration_status", "verified")
    }

