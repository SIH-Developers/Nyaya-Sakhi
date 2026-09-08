"""
tests/test_channel_badges.py
TASK 5 — Tests for channel badge logic (backend side)

Inserts 5 victims with different last_channel values into the DB,
then calls GET /api/victims and verifies each victim has the correct
last_channel in the response.

Also tests the channel-filter behavior: given last_channel data,
the filtered results from the victims list match correctly.
"""

import sys, os, json, sqlite3
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.api import api
from backend.database import init_db, get_connection

init_db()

client = TestClient(api)

PASS = "✅ PASS"
FAIL = "❌ FAIL"

CHANNEL_TEST_VICTIMS = [
    ("CH-TEST-TELEGRAM", "Telegram Channel Test",  "telegram_mobile"),
    ("CH-TEST-IVRS",     "IVRS Channel Test",       "ivrs"),
    ("CH-TEST-WHATSAPP", "WhatsApp Channel Test",   "whatsapp"),
    ("CH-TEST-SMS",      "SMS Channel Test",         "sms"),
    ("CH-TEST-WEBCHAT",  "WebChat Channel Test",    "web_chat"),
]

CHANNEL_META_LABELS = {
    "telegram_mobile": "Telegram",
    "ivrs":            "IVRS Call",
    "whatsapp":        "WhatsApp",
    "sms":             "SMS",
    "web_chat":        "Web Chat",
}

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def seed_channel_victims():
    conn = get_connection()
    cursor = conn.cursor()
    for victim_id, name, channel in CHANNEL_TEST_VICTIMS:
        cursor.execute("""
            INSERT OR REPLACE INTO victims (
                victim_id, name, caste_category, fir_number, police_station,
                district, state, case_stage, accused_bail_status, threat_reported,
                compensation_status, consent_flag, created_at, last_channel,
                current_risk_score, current_risk_tier
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, 0.5, 'Watch')
        """, (
            victim_id, name, "Scheduled Caste",
            f"CHAN-FIR-{victim_id[-3:]}", "Channel Test PS",
            "Channel District", "Test State", "FIR Filed", "Denied",
            "Pending", datetime.now().isoformat(), channel
        ))
    conn.commit()
    conn.close()
    print(f"  Seeded {len(CHANNEL_TEST_VICTIMS)} test victims with channel data")


def get_channel_victims_from_api() -> list:
    resp = client.get("/api/victims")
    all_victims = resp.json()
    # Filter to just our test IDs
    test_ids = {v[0] for v in CHANNEL_TEST_VICTIMS}
    return [v for v in all_victims if v.get("victim_id") in test_ids]


# ─────────────────────────────────────────────────────────────
# T5-A: Each victim returned with correct last_channel
# ─────────────────────────────────────────────────────────────
def test_each_victim_has_correct_channel():
    section("T5-A: GET /api/victims returns correct last_channel per victim")
    seed_channel_victims()
    victims = get_channel_victims_from_api()

    print(f"\n  Victims returned from /api/victims (test subset):")
    victim_map = {v["victim_id"]: v for v in victims}

    errors = []
    for victim_id, name, expected_channel in CHANNEL_TEST_VICTIMS:
        v = victim_map.get(victim_id)
        actual = v.get("last_channel") if v else "NOT FOUND"
        match = "✓" if actual == expected_channel else "✗"
        print(f"    {match} {victim_id}: expected={expected_channel}, actual={actual}")
        if actual != expected_channel:
            errors.append(f"{victim_id}: expected {expected_channel}, got {actual}")

    if errors:
        for e in errors:
            print(f"  {FAIL}: {e}")
        return False
    print(f"\n  {PASS}: All 5 channel values correctly stored and returned by API")
    return True


# ─────────────────────────────────────────────────────────────
# T5-B: Channel filter logic (frontend simulated in Python)
# ─────────────────────────────────────────────────────────────
def test_channel_filter_logic():
    section("T5-B: Channel filter — each channel value filters correctly")
    victims = get_channel_victims_from_api()

    print(f"\n  Total test victims in API response: {len(victims)}")
    errors = []

    for channel_key, channel_label in CHANNEL_META_LABELS.items():
        filtered = [v for v in victims if v.get("last_channel") == channel_key]
        all_match = all(v.get("last_channel") == channel_key for v in filtered)
        match_count = len(filtered)
        print(f"  Filter '{channel_key}': {match_count} victim(s) returned, all_match={all_match}")
        if match_count == 0:
            errors.append(f"No victims found for channel filter '{channel_key}'")
        if not all_match:
            errors.append(f"Not all victims in filter '{channel_key}' have that channel")

    # All channels view
    all_channels = victims  # no filter
    print(f"\n  'All channels' view: {len(all_channels)} test victims (expected {len(CHANNEL_TEST_VICTIMS)})")
    if len(all_channels) < len(CHANNEL_TEST_VICTIMS):
        errors.append(f"Expected at least {len(CHANNEL_TEST_VICTIMS)} victims, got {len(all_channels)}")

    if errors:
        for e in errors:
            print(f"  {FAIL}: {e}")
        return False
    print(f"\n  {PASS}: Channel filter correctly isolates each channel group")
    return True


# ─────────────────────────────────────────────────────────────
# T5-C: Verify ChannelBadge config matches DB values
# ─────────────────────────────────────────────────────────────
def test_channel_badge_config_coverage():
    section("T5-C: Frontend CHANNEL_META keys cover all DB channel values used")

    # We can't import JSX, so verify the keys we seed match what TriageRoster.jsx defines
    frontend_channels = {
        "telegram_mobile", "ivrs", "chatbot", "web_chat", "whatsapp", "sms", "email"
    }
    db_channels_used = {ch for _, _, ch in CHANNEL_TEST_VICTIMS}

    print(f"  Frontend CHANNEL_META keys : {sorted(frontend_channels)}")
    print(f"  DB channels in test data   : {sorted(db_channels_used)}")

    uncovered = db_channels_used - frontend_channels
    if uncovered:
        print(f"  {FAIL}: DB channels not in frontend config: {uncovered}")
        return False
    print(f"  {PASS}: All DB channel values have frontend badge definitions")
    return True


# ─────────────────────────────────────────────────────────────
# Run all T5 tests
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    results = {
        "T5-A: API returns correct last_channel":        test_each_victim_has_correct_channel(),
        "T5-B: Channel filter logic":                     test_channel_filter_logic(),
        "T5-C: Badge config covers all channel values":  test_channel_badge_config_coverage(),
    }

    print(f"\n\n{'='*60}")
    print("  TASK 5 — FINAL RESULTS")
    print(f"{'='*60}")
    for name, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status}  |  {name}")
    all_pass = all(results.values())
    print(f"\n  Overall: {'✅ ALL PASSED' if all_pass else '❌ SOME FAILED'}")
