"""
tests/test_full_history_and_verify.py — Automated verification for Part C:
- GET /api/victim/{id}/full-history aggregation
- POST /api/victim/{id}/update-email (Officer gated)
- POST /api/victim/{id}/verify (Officer gated)
"""
import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.api import api, OFFICER_API_KEY
from backend.database import init_db, get_connection

client = TestClient(api)

@pytest.fixture(autouse=True)
def setup_history_db():
    init_db()
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM victims WHERE victim_id = 'VIC-TEST-PART-C'")
    c.execute("DELETE FROM interaction_logs WHERE victim_id = 'VIC-TEST-PART-C'")
    c.execute("DELETE FROM escalation_alerts WHERE victim_id = 'VIC-TEST-PART-C'")

    c.execute("""
        INSERT INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at, registration_status, email
        ) VALUES (
            'VIC-TEST-PART-C', 'Kiran Ahirwar', 'Scheduled Caste',
            'FIR-2026/555', 'District Sadar', 'Jhansi', 'UP',
            'Trial', 'Denied', 1, 'Sanctioned', 1, '2026-09-02T10:00:00',
            'self_registered_pending_verification', NULL
        )
    """)
    c.execute("""
        INSERT INTO interaction_logs (
            log_id, victim_id, turn_id, channel, nlp_score, speech_score,
            behavior_score, context_score, fused_risk_score, risk_tier,
            explainability_reasons, audio_metadata, timestamp, encrypted_message
        ) VALUES (
            'LOG-PART-C-1', 'VIC-TEST-PART-C', 1, 'telegram_mobile', 0.90, 0.70,
            0.60, 0.80, 0.90, 'Urgent', '["Direct threat reported by victim."]',
            '{"pitch_variance": 24.5, "pause_ratio": 0.28}', '2026-09-05T10:00:00', 'EncryptedSample'
        )
    """)
    c.execute("""
        INSERT INTO escalation_alerts (
            alert_id, victim_id, timestamp, priority, risk_tier, fused_risk_score,
            recommended_action, clinical_reasons, human_in_the_loop_status,
            acknowledged, channel
        ) VALUES (
            'ALT-PART-C-1', 'VIC-TEST-PART-C', '2026-09-05T10:01:00', 'P1-CRITICAL',
            'Urgent', 0.90, 'Immediate Counselor Outreach',
            '["Active threat incident reported", "Accused family intimidating victim"]',
            'Awaiting Counselor Review', 0, 'telegram_mobile'
        )
    """)
    conn.commit()
    conn.close()

def test_full_history_aggregation():
    """GET /api/victim/{id}/full-history aggregates profile, turns, channels, alerts, and milestones."""
    res = client.get("/api/victim/VIC-TEST-PART-C/full-history")
    assert res.status_code == 200
    data = res.json()

    assert data["victim"]["victim_id"] == "VIC-TEST-PART-C"
    assert data["registration_status"] == "self_registered_pending_verification"
    assert "telegram_mobile" in data["channels_used"]

    # Turns
    assert len(data["turns"]) >= 1
    t = data["turns"][0]
    assert t["risk_tier"] == "Urgent"
    assert t["audio_metadata"]["pitch_variance"] == 24.5

    # Escalation alerts with clinical reasons
    assert len(data["escalation_alerts"]) >= 1
    alert = data["escalation_alerts"][0]
    assert alert["priority"] == "P1-CRITICAL"
    assert "Active threat incident reported" in alert["clinical_reasons"]

    # Milestones
    assert len(data["milestones"]) >= 4

def test_update_email_officer_gated():
    """Updating email requires valid X-Officer-Key."""
    # Bad key -> 403
    r_bad = client.post(
        "/api/victim/VIC-TEST-PART-C/update-email",
        json={"email": "kiran.officer.added@example.com"},
        headers={"x-officer-key": "bad-key"}
    )
    assert r_bad.status_code == 403

    # Valid key -> 200 and DB updated
    r_ok = client.post(
        "/api/victim/VIC-TEST-PART-C/update-email",
        json={"email": "kiran.officer.added@example.com"},
        headers={"x-officer-key": OFFICER_API_KEY}
    )
    assert r_ok.status_code == 200
    assert r_ok.json()["email"] == "kiran.officer.added@example.com"

    # Confirm DB
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT email FROM victims WHERE victim_id = 'VIC-TEST-PART-C'")
    assert c.fetchone()["email"] == "kiran.officer.added@example.com"
    conn.close()

def test_verify_victim_officer_gated():
    """Verifying victim transitions registration_status to verified."""
    r = client.post(
        "/api/victim/VIC-TEST-PART-C/verify",
        json={"fir_number": "FIR-VERIFIED-2026/101", "district": "Jhansi City"},
        headers={"x-officer-key": OFFICER_API_KEY}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "verified"

    # Confirm DB
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT registration_status, fir_number FROM victims WHERE victim_id = 'VIC-TEST-PART-C'")
    row = c.fetchone()
    assert row["registration_status"] == "verified"
    assert row["fir_number"] == "FIR-VERIFIED-2026/101"
    conn.close()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
