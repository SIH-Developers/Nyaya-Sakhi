"""
tests/test_patient_portal.py — Automated verification for Part B:
- Brevo Email OTP delivery
- Rate limiting (max 3/15 min -> 429)
- Single-use and expiry enforcement
- No OTP leakage in response
- Strict allowlist response model for Patient Dashboard
- Session logout
"""
import pytest
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from api import api
from database import init_db, get_connection

client = TestClient(api)

@pytest.fixture(autouse=True)
def setup_portal_db():
    init_db()
    conn = get_connection()
    c = conn.cursor()
    # Clean up test records
    c.execute("DELETE FROM patient_otps WHERE victim_id LIKE 'VIC-PORTAL-%'")
    # Victim with email
    c.execute("""
        INSERT OR REPLACE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at, registration_status, email
        ) VALUES (
            'VIC-PORTAL-001', 'Meena Kumari', 'Scheduled Caste',
            'FIR-2026/777', 'Mahila Thana', 'Aligarh', 'UP',
            'Trial', 'Denied', 0, 'Pending', 1, '2026-09-01T10:00:00',
            'verified', 'meena.test@example.com'
        )
    """)
    # Victim without email
    c.execute("""
        INSERT OR REPLACE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at, registration_status, email
        ) VALUES (
            'VIC-PORTAL-NOEMAIL', 'Radha Devi', 'Scheduled Caste',
            'FIR-2026/888', 'Rural Thana', 'Basti', 'UP',
            'FIR Filed', 'Pending', 0, 'Pending', 1, '2026-09-01T10:00:00',
            'verified', NULL
        )
    """)
    # Interaction log for history
    c.execute("""
        INSERT OR REPLACE INTO interaction_logs (
            log_id, victim_id, turn_id, channel, nlp_score, speech_score,
            behavior_score, context_score, fused_risk_score, risk_tier,
            explainability_reasons, timestamp, encrypted_message
        ) VALUES (
            'LOG-PORTAL-1', 'VIC-PORTAL-001', 1, 'telegram_mobile', 0.85, 0.5,
            0.6, 0.4, 0.85, 'Urgent', '["Critical fear markers detected."]',
            '2026-09-05T14:30:00', 'EncryptedText123'
        )
    """)
    conn.commit()
    conn.close()

def test_request_otp_rejects_missing_email():
    """Requesting OTP for victim without email returns clear guidance without error."""
    res = client.post("/api/patient/request-otp", json={"identifier": "VIC-PORTAL-NOEMAIL"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "No email on file" in data["message"]

def test_request_otp_never_exposes_otp_code():
    """Requesting OTP sends email and NEVER returns OTP in API response."""
    res = client.post("/api/patient/request-otp", json={"identifier": "VIC-PORTAL-001"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Verification code sent" in data["message"]
    # CRITICAL: No OTP in response
    assert "otp" not in data
    assert "otp_code" not in data
    assert "code" not in data

def test_request_otp_rate_limiting():
    """Max 3 requests per 15 minutes; 4th call must be blocked with HTTP 429."""
    # Clear existing
    conn = get_connection()
    conn.cursor().execute("DELETE FROM patient_otps WHERE victim_id = 'VIC-PORTAL-001'")
    conn.commit()
    conn.close()

    # Requests 1, 2, 3 succeed
    for i in range(3):
        r = client.post("/api/patient/request-otp", json={"identifier": "VIC-PORTAL-001"})
        assert r.status_code == 200, f"Request {i+1} failed"

    # Request 4 is rate-limited
    r4 = client.post("/api/patient/request-otp", json={"identifier": "VIC-PORTAL-001"})
    assert r4.status_code == 429
    assert "Too many OTP requests" in r4.json()["detail"]

def test_verify_otp_single_use_and_replay_protection():
    """Valid OTP issues JWT token; reusing the same OTP immediately fails (single-use)."""
    # Create known test OTP in DB directly
    test_otp = "839201"
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO patient_otps (victim_id, email, otp_code, expires_at, created_at, used) VALUES (?, ?, ?, ?, ?, 0)",
        ("VIC-PORTAL-001", "meena.test@example.com", test_otp, (datetime.now() + timedelta(minutes=10)).isoformat(), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    # 1. First verification succeeds
    res1 = client.post("/api/patient/verify-otp", json={"identifier": "VIC-PORTAL-001", "otp": test_otp})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert "token" in data1
    token = data1["token"]

    # 2. Immediate second verification with SAME OTP fails (replay attack prevented)
    res2 = client.post("/api/patient/verify-otp", json={"identifier": "VIC-PORTAL-001", "otp": test_otp})
    assert res2.status_code == 401
    assert "Invalid, expired, or already used" in res2.json()["detail"]

def test_verify_otp_expired_fails():
    """Expired OTP fails validation."""
    expired_otp = "112233"
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO patient_otps (victim_id, email, otp_code, expires_at, created_at, used) VALUES (?, ?, ?, ?, ?, 0)",
        ("VIC-PORTAL-001", "meena.test@example.com", expired_otp, (datetime.now() - timedelta(minutes=1)).isoformat(), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    res = client.post("/api/patient/verify-otp", json={"identifier": "VIC-PORTAL-001", "otp": expired_otp})
    assert res.status_code == 401

def test_patient_dashboard_strict_allowlist_and_privacy_masking():
    """
    Patient Dashboard must strictly conform to allowlist:
    NEVER leaks fused_risk_score, current_risk_score, risk_tier, clinical_reasons, or counselor_notes.
    """
    # Create active OTP and get token
    active_otp = "998811"
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO patient_otps (victim_id, email, otp_code, expires_at, created_at, used) VALUES (?, ?, ?, ?, ?, 0)",
        ("VIC-PORTAL-001", "meena.test@example.com", active_otp, (datetime.now() + timedelta(minutes=10)).isoformat(), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    auth_res = client.post("/api/patient/verify-otp", json={"identifier": "VIC-PORTAL-001", "otp": active_otp})
    token = auth_res.json()["token"]

    # Fetch dashboard
    dash_res = client.get("/api/patient/dashboard", headers={"authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    # 1. STRICT ALLOWLIST ASSERTION
    ALLOWED_KEYS = {"victim_id", "name_masked", "case_milestones", "checkin_history", "helpline_numbers", "can_checkin"}
    assert set(dash_data.keys()) <= ALLOWED_KEYS, f"Unexpected keys leaked into patient response: {set(dash_data.keys()) - ALLOWED_KEYS}"

    # 2. Strict absence of sensitive surveillance / clinical data
    raw_json_str = dash_res.text
    forbidden_terms = ["0.85", "Urgent", "Critical fear markers", "EncryptedText123", "counselor_notes", "fused_risk_score"]
    for term in forbidden_terms:
        assert term not in raw_json_str, f"Sensitive term '{term}' leaked into patient dashboard response!"

    # 3. Emergency helplines present
    assert dash_data["helpline_numbers"]["nhaa_helpline"] == "14566"
    assert dash_data["helpline_numbers"]["police_emergency"] == "112"

    # 4. Milestone progress present
    milestones = dash_data["case_milestones"]
    assert len(milestones) >= 4
    stages = [m["stage"] for m in milestones]
    assert "FIR Filed" in stages
    assert "Special Court Trial" in stages

def test_patient_logout_invalidates_session():
    """Logout invalidates session token immediately."""
    otp = "445566"
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO patient_otps (victim_id, email, otp_code, expires_at, created_at, used) VALUES (?, ?, ?, ?, ?, 0)",
        ("VIC-PORTAL-001", "meena.test@example.com", otp, (datetime.now() + timedelta(minutes=10)).isoformat(), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    auth_res = client.post("/api/patient/verify-otp", json={"identifier": "VIC-PORTAL-001", "otp": otp})
    token = auth_res.json()["token"]

    # Dashboard works before logout
    r_before = client.get("/api/patient/dashboard", headers={"authorization": f"Bearer {token}"})
    assert r_before.status_code == 200

    # Logout
    r_logout = client.post("/api/patient/logout", headers={"authorization": f"Bearer {token}"})
    assert r_logout.status_code == 200

    # Dashboard fails after logout
    r_after = client.get("/api/patient/dashboard", headers={"authorization": f"Bearer {token}"})
    assert r_after.status_code == 401

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
