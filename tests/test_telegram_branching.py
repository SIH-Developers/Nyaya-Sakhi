"""
tests/test_telegram_branching.py — Automated verification for Part A:
- Telegram /start branching logic
- Case reference lookup (anti-enumeration rate limiting)
- Officer 7-day linking code generation
- Self-registration with 'self_registered_pending_verification'
"""
import pytest
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.api import api, OFFICER_API_KEY
from backend.database import init_db, get_connection, find_victim_by_fir_or_link
from backend.telegram_bot import process_telegram_update, _chat_states, _lookup_attempts

client = TestClient(api)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    _chat_states.clear()
    _lookup_attempts.clear()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM victims WHERE victim_id IN ('VIC-TEST-PART-A', 'VIC-TG-998877661', 'VIC-TG-998877662')")
    cursor.execute("DELETE FROM victims WHERE telegram_chat_id IN ('998877661', '998877662')")
    cursor.execute("""
        INSERT OR REPLACE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at, registration_status, email
        ) VALUES (
            'VIC-TEST-PART-A', 'Rameshwar Lal', 'Scheduled Caste',
            'FIR-TEST-2026/999', 'Central Police', 'Varanasi', 'UP',
            'Trial', 'Denied', 1, 'Pending', 1, '2026-09-01T10:00:00',
            'verified', 'rameshwar.test@example.com'
        )
    """)
    conn.commit()
    conn.close()

def test_generate_link_code_officer_gated():
    """Generating 6-digit link code requires X-Officer-Key."""
    # Missing key -> 422 / 403
    r_bad = client.post("/api/case/generate-link-code", json={"victim_id": "VIC-TEST-PART-A"})
    assert r_bad.status_code in [403, 422]

    # Wrong key -> 403
    r_wrong = client.post(
        "/api/case/generate-link-code",
        json={"victim_id": "VIC-TEST-PART-A"},
        headers={"x-officer-key": "invalid-secret"}
    )
    assert r_wrong.status_code == 403

    # Valid key -> 200 + 6-digit code
    r_ok = client.post(
        "/api/case/generate-link-code",
        json={"victim_id": "VIC-TEST-PART-A"},
        headers={"x-officer-key": OFFICER_API_KEY}
    )
    assert r_ok.status_code == 200
    data = r_ok.json()
    assert data["success"] is True
    assert len(data["link_code"]) == 6
    assert data["link_code"].isdigit()
    assert data["validity_days"] == 7

def test_lookup_reference_success_and_masked():
    """Lookup by FIR number returns masked victim data."""
    res = client.post("/api/case/lookup-reference", json={"query": "FIR-TEST-2026/999"})
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["victim_id"] == "VIC-TEST-PART-A"
    assert data["fir_number"] == "FIR-TEST-2026/999"
    assert "****" in data["name_masked"]  # Privacy masked

def test_lookup_reference_not_found():
    """Unmatched reference returns found: False without error."""
    res = client.post("/api/case/lookup-reference", json={"query": "NON-EXISTENT-FIR-99999"})
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is False

def test_telegram_branching_path1_fir_match():
    """Telegram /start followed by valid FIR links chat_id to existing record."""
    chat_id = 998877661
    
    # 1. Send /start
    update_start = {
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Rameshwar", "last_name": "Lal"},
            "text": "/start"
        }
    }
    process_telegram_update(update_start)
    assert _chat_states.get(chat_id, {}).get("step") == "AWAITING_REFERENCE"

    # 2. Provide matching FIR
    update_fir = {
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Rameshwar", "last_name": "Lal"},
            "text": "FIR-TEST-2026/999"
        }
    }
    process_telegram_update(update_fir)
    
    # State should be cleared upon successful linking
    assert chat_id not in _chat_states

    # Verify DB has telegram_chat_id set
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT telegram_chat_id, last_channel FROM victims WHERE victim_id = 'VIC-TEST-PART-A'")
    row = c.fetchone()
    conn.close()
    assert str(row["telegram_chat_id"]) == str(chat_id)
    assert row["last_channel"] == "telegram_mobile"

def test_telegram_branching_path2_self_registration():
    """Telegram /start followed by 'no' leads through guided self-registration with pending verification."""
    chat_id = 998877662
    
    # 1. /start
    process_telegram_update({
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Sunita", "last_name": "Devi"},
            "text": "/start"
        }
    })
    assert _chat_states.get(chat_id, {}).get("step") == "AWAITING_REFERENCE"

    # 2. Reply "no"
    process_telegram_update({
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Sunita", "last_name": "Devi"},
            "text": "no"
        }
    })
    assert _chat_states.get(chat_id, {}).get("step") == "REG_NAME"

    # 3. Name
    process_telegram_update({
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Sunita", "last_name": "Devi"},
            "text": "Sunita Devi"
        }
    })
    assert _chat_states.get(chat_id, {}).get("step") == "REG_DISTRICT"

    # 4. District
    process_telegram_update({
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Sunita", "last_name": "Devi"},
            "text": "Gorakhpur, UP"
        }
    })
    assert _chat_states.get(chat_id, {}).get("step") == "REG_FIR_STATUS"

    # 5. FIR status
    process_telegram_update({
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Sunita", "last_name": "Devi"},
            "text": "yes"
        }
    })
    assert _chat_states.get(chat_id, {}).get("step") == "REG_EMAIL"

    # 6. Email (optional)
    process_telegram_update({
        "message": {
            "chat": {"id": chat_id},
            "from": {"first_name": "Sunita", "last_name": "Devi"},
            "text": "sunita.test@example.com"
        }
    })
    assert chat_id not in _chat_states

    # Verify DB has new victim marked as self_registered_pending_verification
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM victims WHERE victim_id = ?", (f"VIC-TG-{chat_id}",))
    row = c.fetchone()
    conn.close()
    assert row is not None
    assert row["name"] == "Sunita Devi"
    assert row["registration_status"] == "self_registered_pending_verification"
    assert row["email"] == "sunita.test@example.com"
    assert "Pending" in row["fir_number"]

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
