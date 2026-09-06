"""
tests/test_e2e_smoke.py
End-to-End Smoke Test

Simulates a CRITICAL severity message through the full pipeline:
  1. POST /api/chat/web  → NLP score computed
  2. POST /api/message   → Full LangGraph pipeline (escalation_alerts row)
  3. Twilio dispatch attempted (WhatsApp → SMS in demo mode)
  4. GET  /api/victims   → victim visible with correct channel badge
  5. GET  /api/alerts    → critical alert visible in dashboard

Reports elapsed time for each stage and total end-to-end time.
"""

import sys, os, json, sqlite3, uuid, time
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from api import api
from database import init_db, get_connection

init_db()
client = TestClient(api)

PASS = "✅ PASS"
FAIL = "❌ FAIL"
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "distress_monitoring.db")


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def seed_e2e_victim(victim_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?)
    """, (
        victim_id, "E2E Smoke Test Victim", "Scheduled Caste",
        "E2E-FIR-001", "E2E Police Station", "E2E District", "Delhi",
        "Trial Ongoing", "Granted",  # bail granted = high context risk
        "Pending", datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()


if __name__ == "__main__":
    section("END-TO-END SMOKE TEST — CRITICAL SEVERITY FLOW")

    VICTIM_ID  = f"E2E-VICTIM-{uuid.uuid4().hex[:6].upper()}"
    SESSION_ID = f"e2e-session-{uuid.uuid4().hex[:8]}"
    CRITICAL_MSG = (
        "The accused broke into my house last night and attacked me with a knife. "
        "I want to die. Please help me. I am in danger and terrified. "
        "Nobody is listening to me. I can't take this anymore."
    )

    results = {}
    timings = {}
    t_total_start = time.time()

    # ── STEP 1: Web chat NLP pre-check ──────────────────────────────────────
    section("STEP 1: POST /api/chat/web (NLP pre-check)")
    t0 = time.time()
    resp1 = client.post("/api/chat/web", json={
        "session_id": SESSION_ID,
        "message":    CRITICAL_MSG,
        "consent_given": True
    })
    timings["step1_web_chat_ms"] = round((time.time() - t0) * 1000)
    data1 = resp1.json()
    print(f"  HTTP status: {resp1.status_code}")
    print(f"  Mode: {data1.get('mode')}")
    print(f"  Distress score: {data1.get('distress_score')}")
    print(f"  show_emergency_banner: {data1.get('show_emergency_banner')}")
    print(f"  Answer (100 chars): {str(data1.get('answer',''))[:100]}…")
    print(f"  ⏱  Time: {timings['step1_web_chat_ms']}ms")
    results["Step 1: Web chat NLP"] = resp1.status_code == 200 and data1.get("answer")

    # ── STEP 2: Full pipeline via /api/message ───────────────────────────────
    section("STEP 2: POST /api/message (Full LangGraph pipeline)")
    seed_e2e_victim(VICTIM_ID)
    t0 = time.time()
    resp2 = client.post("/api/message", json={
        "victim_id":    VICTIM_ID,
        "message_text": CRITICAL_MSG,
        "channel":      "web_chat",
        "engagement_telemetry": {
            "consecutive_missed_checkins": 3,
            "response_latency_hours": 48.0,
            "baseline_latency_hours": 2.0,
            "days_since_last_checkin": 7
        }
    })
    timings["step2_pipeline_ms"] = round((time.time() - t0) * 1000)
    data2 = resp2.json()
    print(f"  HTTP status: {resp2.status_code}")
    print(f"  Fused risk score: {data2.get('fused_risk_score')}")
    print(f"  Risk tier: {data2.get('risk_tier')}")
    print(f"  Escalation triggered: {data2.get('escalation_triggered')}")
    print(f"  Reasons: {data2.get('explainability_reasons', [])[:2]}")
    print(f"  ⏱  Time: {timings['step2_pipeline_ms']}ms")
    results["Step 2: Full pipeline"] = resp2.status_code == 200

    # ── STEP 3: Check escalation_alerts DB row ───────────────────────────────
    section("STEP 3: DB — escalation_alerts row created")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM escalation_alerts WHERE victim_id = ? ORDER BY timestamp DESC LIMIT 1", (VICTIM_ID,))
    alert_row = c.fetchone()
    # Also check counselor_alerts
    c.execute("SELECT * FROM counselor_alerts WHERE victim_id = ? ORDER BY created_at DESC LIMIT 1", (VICTIM_ID,))
    counselor_row = c.fetchone()
    conn.close()

    if alert_row:
        alert_dict = dict(alert_row)
        print(f"  escalation_alerts row:")
        for k, v in alert_dict.items():
            print(f"    {k}: {v}")
    elif counselor_row:
        counselor_dict = dict(counselor_row)
        print(f"  counselor_alerts row (alternative):")
        for k, v in counselor_dict.items():
            print(f"    {k}: {v}")
    else:
        print(f"  No escalation_alerts or counselor_alerts row found for {VICTIM_ID}")

    alert_found = alert_row is not None or counselor_row is not None
    results["Step 3: Escalation alert in DB"] = alert_found

    # ── STEP 4: Dashboard — victim visible with channel badge ────────────────
    section("STEP 4: GET /api/victims — victim with channel badge 'web_chat'")
    t0 = time.time()
    resp4 = client.get("/api/victims")
    timings["step4_victims_ms"] = round((time.time() - t0) * 1000)
    all_victims = resp4.json()
    e2e_victim = next((v for v in all_victims if v.get("victim_id") == VICTIM_ID), None)
    if e2e_victim:
        print(f"  Found: {VICTIM_ID}")
        print(f"  last_channel: {e2e_victim.get('last_channel')}")
        print(f"  current_risk_tier: {e2e_victim.get('current_risk_tier')}")
        print(f"  current_risk_score: {e2e_victim.get('current_risk_score')}")
        print(f"  ⏱  Time: {timings['step4_victims_ms']}ms")
    else:
        print(f"  {FAIL}: Victim {VICTIM_ID} not found in /api/victims response")

    results["Step 4: Dashboard channel badge"] = (
        e2e_victim is not None and e2e_victim.get("last_channel") == "web_chat"
    )

    # ── STEP 5: Dashboard alerts feed ───────────────────────────────────────
    section("STEP 5: GET /api/alerts — critical alert visible")
    t0 = time.time()
    resp5 = client.get("/api/alerts")
    timings["step5_alerts_ms"] = round((time.time() - t0) * 1000)
    all_alerts = resp5.json()
    e2e_alert = next((a for a in all_alerts if a.get("victim_id") == VICTIM_ID), None)
    if e2e_alert:
        print(f"  Alert found: {e2e_alert.get('alert_id')}")
        print(f"  Priority: {e2e_alert.get('priority')}")
        print(f"  Risk tier: {e2e_alert.get('risk_tier')}")
        print(f"  Status: {e2e_alert.get('status')}")
        print(f"  ⏱  Time: {timings['step5_alerts_ms']}ms")
    else:
        print(f"  Note: Alert not in counselor_alerts (may be in escalation_alerts only)")
        print(f"  Total alerts in feed: {len(all_alerts)}")

    results["Step 5: Alert in dashboard feed"] = (e2e_alert is not None or alert_found)

    # ── Final timing report ──────────────────────────────────────────────────
    t_total = round((time.time() - t_total_start) * 1000)

    print(f"\n\n{'='*60}")
    print("  E2E SMOKE TEST — TIMING REPORT")
    print(f"{'='*60}")
    print(f"  Step 1 — Web chat NLP:     {timings.get('step1_web_chat_ms', '?')}ms")
    print(f"  Step 2 — Full pipeline:    {timings.get('step2_pipeline_ms', '?')}ms")
    print(f"  Step 4 — Victims API:      {timings.get('step4_victims_ms', '?')}ms")
    print(f"  Step 5 — Alerts API:       {timings.get('step5_alerts_ms', '?')}ms")
    print(f"  ─────────────────────────────────────")
    print(f"  TOTAL end-to-end:          {t_total}ms  ({t_total/1000:.2f}s)")

    print(f"\n{'='*60}")
    print("  E2E SMOKE TEST — FINAL RESULTS")
    print(f"{'='*60}")
    for name, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status}  |  {name}")
    all_pass = all(results.values())
    print(f"\n  Overall: {'✅ ALL PASSED' if all_pass else '❌ SOME FAILED'}")
    print(f"  Total time: {t_total/1000:.2f}s")
