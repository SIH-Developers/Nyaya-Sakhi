"""
tests/test_escalation_agent.py
TASK 2 — Tests for agents/escalation_agent.py

Inserts a fresh test victim into DB, then calls escalation_agent_node()
with 4 risk scores: 0.20, 0.55, 0.80, 0.95

Asserts:
  0.20 → no escalation_alerts row, no Twilio call
  0.55 → no Twilio dispatch (watch-level badge only)
  0.80 → escalation_alerts row exists, Twilio called once
  0.95 → critical priority, Twilio called, high-priority flag
"""

import sys, os, json, sqlite3
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import patch, MagicMock
from datetime import datetime

from backend.database import init_db, get_connection, DB_PATH
init_db()

from backend.agents.escalation_agent import escalation_agent_node
from backend.config import RISK_TIERS

PASS = "✅ PASS"
FAIL = "❌ FAIL"

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def seed_test_victim(victim_id: str):
    """Insert a minimal victim row for testing."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    """, (
        victim_id, f"Test Victim {victim_id}", "Scheduled Caste",
        f"TEST-FIR-{victim_id[-3:]}", "Test PS", "Test District", "Test State",
        "FIR Filed", "Denied", 0, "Pending", datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()


def query_escalation_alert(victim_id: str) -> list:
    """Return all escalation_alerts rows for a given victim."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM escalation_alerts WHERE victim_id = ?", (victim_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def build_state(victim_id: str, score: float, tier: str) -> dict:
    return {
        "victim_id":             victim_id,
        "turn_id":               1,
        "timestamp":             datetime.now().isoformat(),
        "channel":               "test",
        "message_text":          "Test message for escalation agent",
        "fused_risk_score":      score,
        "risk_tier":             tier,
        "explainability_reasons": [f"Test reason for score {score}"],
        "nlp_results":           {"distress_score": score},
        "speech_results":        {},
        "behavioral_results":    {},
        "case_context_results":  {},
        "victim_phone":          "",   # no phone — Twilio won't call real network
    }


# ─────────────────────────────────────────────────────────────
# Test cases
# ─────────────────────────────────────────────────────────────

def run_escalation_test(label, victim_id, score, tier,
                        expect_alert_row, expect_twilio,
                        expect_priority_contains=None):
    section(f"{label} — score={score} tier={tier}")

    seed_test_victim(victim_id)

    # Clean up any prior rows for this victim
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM escalation_alerts WHERE victim_id = ?", (victim_id,))
    conn.commit()
    conn.close()

    twilio_calls = []

    def fake_dispatch(**kwargs):
        twilio_calls.append(kwargs)
        print(f"  [mock] Twilio dispatch_notification called: victim={kwargs.get('victim_id')} tier={kwargs.get('risk_tier')}")
        return {"success": True, "simulated": True}

    state = build_state(victim_id, score, tier)

    with patch("agents.escalation_agent._dispatch_twilio_alert",
               side_effect=lambda state, alert: twilio_calls.append({"state_id": state.get("victim_id"), "alert_id": alert.get("alert_id")})):
        result = escalation_agent_node(state)

    rows = query_escalation_alert(victim_id)

    print(f"\n  escalation_agent_node returned:")
    print(f"    escalation_triggered: {result.get('escalation_triggered')}")
    if result.get("escalation_alert"):
        print(f"    alert payload: {json.dumps(result.get('escalation_alert'), indent=4)}")
    if result.get("case_coordinator_log"):
        print(f"    log: {json.dumps(result.get('case_coordinator_log'), indent=4)}")

    print(f"\n  escalation_alerts DB rows for {victim_id}:")
    if rows:
        for r in rows:
            print(f"    {json.dumps(r, indent=4)}")
    else:
        print(f"    (no rows)")

    print(f"\n  Twilio dispatch calls: {len(twilio_calls)}")
    for c in twilio_calls:
        print(f"    → {c}")

    # --- Assertions ---
    errors = []

    if expect_alert_row:
        if not rows:
            errors.append("Expected escalation_alerts row but found none")
        else:
            row = rows[0]
            if expect_priority_contains and expect_priority_contains not in row.get("priority", ""):
                errors.append(f"Expected priority to contain '{expect_priority_contains}', got '{row.get('priority')}'")
            print(f"\n  Priority in DB: {row.get('priority')}")
            print(f"  Risk tier in DB: {row.get('risk_tier')}")
            print(f"  Score in DB: {row.get('fused_risk_score')}")
    else:
        if rows:
            errors.append(f"Expected NO escalation_alerts row but found {len(rows)}")

    if expect_twilio:
        if len(twilio_calls) == 0:
            errors.append("Expected Twilio dispatch but it was NOT called")
    else:
        if len(twilio_calls) > 0:
            errors.append(f"Expected NO Twilio call but got {len(twilio_calls)} calls")

    if errors:
        for e in errors:
            print(f"  {FAIL}: {e}")
        return False
    else:
        print(f"\n  {PASS}")
        return True


if __name__ == "__main__":
    results = {}

    results["T2-A: score=0.20 (Routine)"] = run_escalation_test(
        label="T2-A",
        victim_id="ESC-TEST-020",
        score=0.20,
        tier=RISK_TIERS["ROUTINE"],
        expect_alert_row=False,
        expect_twilio=False,
    )

    results["T2-B: score=0.55 (Watch)"] = run_escalation_test(
        label="T2-B",
        victim_id="ESC-TEST-055",
        score=0.55,
        tier=RISK_TIERS["WATCH"],
        expect_alert_row=True,
        expect_twilio=False,
        expect_priority_contains="P3",
    )

    results["T2-C: score=0.80 (Counselor Outreach)"] = run_escalation_test(
        label="T2-C",
        victim_id="ESC-TEST-080",
        score=0.80,
        tier=RISK_TIERS["COUNSELOR_OUTREACH"],
        expect_alert_row=True,
        expect_twilio=True,
        expect_priority_contains="P2",
    )

    results["T2-D: score=0.95 (Urgent)"] = run_escalation_test(
        label="T2-D",
        victim_id="ESC-TEST-095",
        score=0.95,
        tier=RISK_TIERS["URGENT"],
        expect_alert_row=True,
        expect_twilio=True,
        expect_priority_contains="P1",
    )

    print(f"\n\n{'='*60}")
    print("  TASK 2 — FINAL RESULTS")
    print(f"{'='*60}")
    for name, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status}  |  {name}")
    all_pass = all(results.values())
    print(f"\n  Overall: {'✅ ALL PASSED' if all_pass else '❌ SOME FAILED'}")
