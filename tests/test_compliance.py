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
from backend.api import api
from backend.database import init_db, get_connection

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
    conn = get_connection()
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


# ────────────────────────────────────────────────────────────
# T6-D: Wrong key value must be rejected with 403
# ────────────────────────────────────────────────────────────
def test_purge_wrong_key_rejected():
    section("T6-D: POST /api/officer/purge with WRONG key value → 403")

    # Seed rows so there is something at risk of deletion
    victim_id = "COMP-TEST-WRONG-KEY-001"
    seed_consent_victim(victim_id)
    seed_old_interaction_logs(victim_id, days_ago=800, count=2)
    rows_before = count_interaction_logs(victim_id)
    print(f"  Rows at risk before test: {rows_before}")
    assert rows_before > 0, "Test setup issue: no rows seeded"

    wrong_keys = [
        "definitely-not-the-real-key-12345",
        "nhaa-officer-2025",          # almost-correct
        "NHAA-OFFICER-2024",          # correct value, wrong case
        "",                            # empty string (different from missing header)
    ]

    all_rejected = True
    for bad_key in wrong_keys:
        resp = client.post(
            "/api/officer/purge",
            headers={"x-officer-key": bad_key},
        )
        rows_after = count_interaction_logs(victim_id)
        accepted = resp.status_code == 200
        deleted  = rows_after < rows_before
        symbol   = "REJECTED" if not accepted else "!!! ACCEPTED !!!"
        print(f"  Key: {repr(bad_key):45s}  status={resp.status_code}  rows_after={rows_after}  [{symbol}]")
        if accepted or deleted:
            all_rejected = False

    rows_final = count_interaction_logs(victim_id)
    print(f"  Rows after all wrong-key attempts: {rows_final} (must equal {rows_before})")

    if all_rejected and rows_final == rows_before:
        print(f"\n  {PASS}: All 4 wrong/malformed keys correctly rejected; no rows deleted")
        return True
    else:
        print(f"\n  {FAIL}: At least one wrong key was accepted or rows were deleted")
        return False


# ────────────────────────────────────────────────────────────
# T6-E: Key with whitespace padding must be rejected
# (tests that server strips correctly and doesn't accidentally accept " correct-key ")
# ────────────────────────────────────────────────────────────
def test_purge_whitespace_key_behavior():
    section("T6-E: Whitespace-padded key — strip correctly, reject if wrong value")

    # The server does .strip() then compare_digest(). So:
    # " nhaa-officer-2024 "  → strips to correct key → ACCEPT (200)
    # " wrong-key "          → strips to wrong key   → REJECT (403)

    results_e = {}

    # Case 1: padded CORRECT key — server strips, should accept
    resp_padded_correct = client.post(
        "/api/officer/purge",
        headers={"x-officer-key": f" {OFFICER_KEY} "},
        params={"days_to_keep": 730},
    )
    print(f"  Padded correct key ' {OFFICER_KEY} ': status={resp_padded_correct.status_code}")
    results_e["padded_correct_accepted"] = resp_padded_correct.status_code == 200

    # Case 2: padded WRONG key — server strips, should reject
    resp_padded_wrong = client.post(
        "/api/officer/purge",
        headers={"x-officer-key": " wrong-key "},
    )
    print(f"  Padded wrong key ' wrong-key ':   status={resp_padded_wrong.status_code}")
    results_e["padded_wrong_rejected"] = resp_padded_wrong.status_code in (401, 403)

    # Case 3: tab-padded wrong key
    resp_tab_wrong = client.post(
        "/api/officer/purge",
        headers={"x-officer-key": "\twrong-key\t"},
    )
    print(f"  Tab-padded wrong key:              status={resp_tab_wrong.status_code}")
    results_e["tab_wrong_rejected"] = resp_tab_wrong.status_code in (401, 403)

    print()
    for k, v in results_e.items():
        print(f"  {PASS if v else FAIL}  {k}: {v}")

    if all(results_e.values()):
        print(f"\n  {PASS}: Whitespace handling correct")
        return True
    else:
        print(f"\n  {FAIL}: Unexpected whitespace behavior")
        return False


# ────────────────────────────────────────────────────────────
# Run all T6 tests
# ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    results = {
        "T6-A: Consent capture":                test_consent_capture(),
        "T6-B: Purge without key → 422":        test_purge_without_key_is_rejected(),
        "T6-C: Purge with key → rows deleted":  test_purge_with_key_deletes_old_rows(),
        "T6-D: Wrong key value → 403":          test_purge_wrong_key_rejected(),
        "T6-E: Whitespace key handling":         test_purge_whitespace_key_behavior(),
    }

    print(f"\n\n{'='*60}")
    print("  TASK 6 — FINAL RESULTS")
    print(f"{'='*60}")
    for name, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status}  |  {name}")
    all_pass = all(results.values())
    print(f"\n  Overall: {'All PASSED' if all_pass else 'SOME FAILED'}")
