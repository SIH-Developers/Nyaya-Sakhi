"""
tests/test_compliance.py
TASK 6 — Tests for compliance endpoints (api.py, database.py)

Tests:
  T6-A: POST /api/consent → DB has consent_given=1 + consent_timestamp
  T6-B: POST /api/officer/purge WITHOUT X-Officer-Key → 401/403
  T6-C: POST /api/officer/purge WITH X-Officer-Key → 200 + old rows purged
        while derived scores remain
"""

import sys, os, json, sqlite3
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from api import api
from database import init_db, get_connection

init_db()

client = TestClient(api)

PASS = "✅ PASS"
FAIL = "❌ FAIL"
OFFICER_KEY = os.getenv("OFFICER_API_KEY", "nhaa-officer-2024")

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def seed_consent_victim(victim_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?)
    """, (
        victim_id, "Compliance Test Victim", "Scheduled Caste",
        "COMP-FIR-001", "Test PS", "Test District", "Test State",
        "FIR Filed", "Denied", "Pending", datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()


def seed_old_interaction_logs(victim_id: str, days_ago: int, count: int = 3):
    """Insert interaction_log rows with old timestamps for purge testing."""
    conn = get_connection()
    cursor = conn.cursor()
    old_ts = (datetime.now() - timedelta(days=days_ago)).isoformat()
    for i in range(count):
        cursor.execute("""
            INSERT OR REPLACE INTO interaction_logs (
                log_id, victim_id, turn_id, channel, encrypted_message,
                audio_metadata, nlp_score, speech_score, behavior_score,
                context_score, fused_risk_score, risk_tier,
                explainability_reasons, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"OLD-LOG-{victim_id}-{i}", victim_id, i+1, "test",
            "encrypted_test_message", "{}", 0.5, 0.0, 0.0, 0.0,
            0.5, "Watch", "[]", old_ts
        ))
    conn.commit()
    conn.close()
    return count


def count_interaction_logs(victim_id: str) -> int:
    conn = sqlite3.connect(
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "distress_monitoring.db")
    )
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM interaction_logs WHERE victim_id = ?", (victim_id,))
    result = c.fetchone()[0]
    conn.close()
    return result


def get_victim_row(victim_id: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM victims WHERE victim_id = ?", (victim_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


# ─────────────────────────────────────────────────────────────
# T6-A: Consent capture
# ─────────────────────────────────────────────────────────────
def test_consent_capture():
    section("T6-A: POST /api/consent — consent captured in DB")

    victim_id = "COMP-TEST-CONSENT-001"
    seed_consent_victim(victim_id)

    # Verify initial state
    before = get_victim_row(victim_id)
    print(f"  Before: consent_flag={before.get('consent_flag')} consent_timestamp={before.get('consent_timestamp')}")

    payload = {"victim_id": victim_id, "consent_given": True, "consent_type": "data_processing"}
    resp = client.post("/api/consent", json=payload)

    print(f"\n  HTTP Status: {resp.status_code}")
    print(f"  Response: {json.dumps(resp.json(), indent=2)}")

    after = get_victim_row(victim_id)
    print(f"\n  After: consent_flag={after.get('consent_flag')} consent_timestamp={after.get('consent_timestamp')}")

    errors = []
    if resp.status_code != 200:
        errors.append(f"Expected 200, got {resp.status_code}")
    if after.get("consent_flag") != 1:
        errors.append(f"consent_flag should be 1, got {after.get('consent_flag')}")
    if not after.get("consent_timestamp"):
        errors.append("consent_timestamp should be populated")
    if not resp.json().get("success"):
        errors.append("Response missing success=True")

    if errors:
        for e in errors:
            print(f"  {FAIL}: {e}")
        return False
    print(f"\n  {PASS}: Consent correctly persisted to DB")
    return True


# ─────────────────────────────────────────────────────────────
# T6-B: Officer purge WITHOUT key → 403
# ─────────────────────────────────────────────────────────────
def test_purge_without_key_is_rejected():
    section("T6-B: POST /api/officer/purge WITHOUT X-Officer-Key → 403")

    resp = client.post("/api/officer/purge", json={})
    print(f"  HTTP Status: {resp.status_code}")
    try:
        print(f"  Response: {json.dumps(resp.json(), indent=2)}")
    except Exception:
        print(f"  Response body: {resp.text}")

    if resp.status_code in (401, 403, 422):
        print(f"\n  {PASS}: Unauthenticated request correctly rejected (status {resp.status_code})")
        return True
    else:
        print(f"\n  {FAIL}: Expected 401/403/422 but got {resp.status_code}")
        return False


# ─────────────────────────────────────────────────────────────
# T6-C: Officer purge WITH correct key → 200 + old rows deleted
# ─────────────────────────────────────────────────────────────
def test_purge_with_key_deletes_old_rows():
    section("T6-C: POST /api/officer/purge WITH X-Officer-Key → deletes old rows")

    victim_id = "COMP-TEST-PURGE-001"
    seed_consent_victim(victim_id)

    # Seed: 3 rows that are 800 days old (> 730 day retention window)
    old_count_seeded = seed_old_interaction_logs(victim_id, days_ago=800, count=3)
    before_count = count_interaction_logs(victim_id)
    print(f"  Before purge: interaction_logs rows for {victim_id} = {before_count}")

    # Also verify victim record (derived score) still exists
    victim_before = get_victim_row(victim_id)
    print(f"  Victim record still in DB: {victim_before.get('victim_id')}")

    # Call purge with correct key (730 day retention)
    resp = client.post(
        "/api/officer/purge",
        headers={"x-officer-key": OFFICER_KEY},
        params={"days_to_keep": 730}
    )

    print(f"\n  HTTP Status: {resp.status_code}")
    print(f"  Response: {json.dumps(resp.json(), indent=2)}")

    after_count = count_interaction_logs(victim_id)
    victim_after = get_victim_row(victim_id)

    print(f"\n  After purge: interaction_logs rows for {victim_id} = {after_count}")
    print(f"  Victim record still present: {victim_after.get('victim_id')}")
    print(f"  current_risk_score intact: {victim_after.get('current_risk_score')}")
    print(f"  Deleted rows reported: {resp.json().get('deleted_rows')}")

    errors = []
    if resp.status_code != 200:
        errors.append(f"Expected 200, got {resp.status_code}")
    if after_count >= before_count and before_count > 0:
        errors.append(f"Expected rows to decrease: before={before_count} after={after_count}")
    if not victim_after:
        errors.append("Victim record (derived score) should NOT be deleted by purge")
    if resp.json().get("deleted_rows", 0) == 0 and before_count > 0:
        errors.append("deleted_rows should be > 0")

    if errors:
        for e in errors:
            print(f"  {FAIL}: {e}")
        return False
    print(f"\n  {PASS}: Purge deleted old logs while preserving victim record")
    return True


# ─────────────────────────────────────────────────────────────
# Run all T6 tests
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    results = {
        "T6-A: Consent capture":                test_consent_capture(),
        "T6-B: Purge without key → 403":        test_purge_without_key_is_rejected(),
        "T6-C: Purge with key → rows deleted":  test_purge_with_key_deletes_old_rows(),
    }

    print(f"\n\n{'='*60}")
    print("  TASK 6 — FINAL RESULTS")
    print(f"{'='*60}")
    for name, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status}  |  {name}")
    all_pass = all(results.values())
    print(f"\n  Overall: {'✅ ALL PASSED' if all_pass else '❌ SOME FAILED'}")
