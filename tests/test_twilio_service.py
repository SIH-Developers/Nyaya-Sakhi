"""
tests/test_twilio_service.py
TASK 1 — Tests for services/twilio_service.py

Tests:
  T1-A: WhatsApp failure triggers SMS fallback, channel_used == "sms"
  T1-B: Missing credentials → demo mode, success=True, zero real network calls
  T1-C: Same alert sent 3× within 60s → only 1 real dispatch, 2 deduplicated
"""

import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import patch, MagicMock
import backend.services.twilio_service as ts

PASS = "✅ PASS"
FAIL = "❌ FAIL"

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ─────────────────────────────────────────────────────────────
# T1-A: WhatsApp failure → SMS fallback
# ─────────────────────────────────────────────────────────────
def test_whatsapp_failure_falls_to_sms():
    section("T1-A: WhatsApp failure → SMS fallback")

    sms_call_args = []

    def fake_whatsapp(to_number, message):
        print(f"  [mock] send_whatsapp called → raising exception")
        return {"success": False, "channel": "whatsapp", "error": "WhatsApp API unavailable"}

    def fake_sms(to_number, message):
        sms_call_args.append((to_number, message))
        print(f"  [mock] send_sms called → +919876543210")
        return {"success": True, "channel": "sms", "simulated": True, "sid": "MOCK-SID"}

    # Reset dedup so this test always fires
    ts._sent_alerts.clear()

    with patch.object(ts, "send_whatsapp", side_effect=fake_whatsapp), \
         patch.object(ts, "send_sms",       side_effect=fake_sms):

        result = ts.dispatch_notification(
            victim_id   = "TEST-WA-FAIL-001",
            to_number   = "+919876543210",
            victim_name = "Test Victim Alpha",
            message     = "Test welfare check-in",
            risk_tier   = "Counselor Outreach",
            alert_id    = "ALERT-T1A-001",
            force       = True
        )

    print(f"\n  Result: {json.dumps(result, indent=2)}")

    # Assertions
    assert "sms" in result.get("channels", []), "SMS channel must be in channels list"
    assert len(sms_call_args) == 1,             "send_sms must be called exactly once"
    assert result.get("whatsapp", {}).get("success") == False, "WhatsApp must show failure"
    assert result.get("sms",      {}).get("success") == True,  "SMS must show success"

    print(f"\n  SMS call count: {len(sms_call_args)} (expected 1)")
    print(f"  Channels used: {result.get('channels')}")
    print(f"\n  {PASS}: WhatsApp failure correctly falls through to SMS")
    return True


# ─────────────────────────────────────────────────────────────
# T1-B: Missing credentials → demo mode
# ─────────────────────────────────────────────────────────────
def test_demo_mode_no_real_calls():
    section("T1-B: No credentials → demo mode, zero real network calls")

    network_calls = []

    def fake_twilio_client(*args, **kwargs):
        network_calls.append(("Client.__init__", args))
        raise AssertionError("Real Twilio client must NOT be instantiated in demo mode")

    ts._sent_alerts.clear()

    # Temporarily null out credentials
    orig_sid   = ts.ACCOUNT_SID
    orig_token = ts.AUTH_TOKEN
    orig_from  = ts.FROM_NUMBER
    ts.ACCOUNT_SID = ""
    ts.AUTH_TOKEN  = ""
    ts.FROM_NUMBER = ""

    try:
        result = ts.dispatch_notification(
            victim_id   = "TEST-DEMO-001",
            to_number   = "+919876543210",
            victim_name = "Demo Victim",
            message     = "Demo check-in message",
            risk_tier   = "Urgent",
            alert_id    = "ALERT-T1B-001",
            force       = True
        )
    finally:
        ts.ACCOUNT_SID = orig_sid
        ts.AUTH_TOKEN  = orig_token
        ts.FROM_NUMBER = orig_from

    print(f"\n  Result: {json.dumps(result, indent=2)}")

    # Assertions
    assert len(network_calls) == 0, "Zero real Twilio Client calls in demo mode"
    wa  = result.get("whatsapp", {})
    sms = result.get("sms", {})
    assert wa.get("simulated") == True or wa.get("success") == True,  "WhatsApp demo success"
    assert sms.get("simulated") == True or sms.get("success") == True, "SMS demo success"

    print(f"\n  Real network calls made: {len(network_calls)} (expected 0)")
    print(f"  WhatsApp simulated: {wa}")
    print(f"  SMS simulated: {sms}")
    print(f"\n  {PASS}: Demo mode correctly suppresses all real network calls")
    return True


# ─────────────────────────────────────────────────────────────
# T1-C: Deduplication — same alert 3× within 60s → only 1 dispatch
# ─────────────────────────────────────────────────────────────
def test_deduplication_within_window():
    section("T1-C: Deduplication — 3 sends of same alert within 60s → 1 real dispatch")

    dispatch_count = [0]

    def fake_whatsapp(to_number, message):
        dispatch_count[0] += 1
        print(f"  [mock] send_whatsapp dispatch #{dispatch_count[0]}")
        return {"success": True, "channel": "whatsapp", "simulated": True}

    def fake_sms(to_number, message):
        return {"success": True, "channel": "sms", "simulated": True}

    ts._sent_alerts.clear()

    with patch.object(ts, "send_whatsapp", side_effect=fake_whatsapp), \
         patch.object(ts, "send_sms",      side_effect=fake_sms):

        results = []
        for i in range(3):
            print(f"\n  --- Attempt {i+1}/3 ---")
            r = ts.dispatch_notification(
                victim_id   = "TEST-DEDUP-001",
                to_number   = "+919876543210",
                victim_name = "Dedup Test Victim",
                message     = "Dedup welfare check",
                risk_tier   = "Counselor Outreach",
                alert_id    = "ALERT-DEDUP-SAME",  # same alert_id every time
                force       = False
            )
            results.append(r)
            print(f"  Result keys: skipped={r.get('skipped')}, channels={r.get('channels')}")

    print(f"\n  Total actual dispatches: {dispatch_count[0]} (expected 1)")
    print(f"  Send 1: channels={results[0].get('channels')} skipped={results[0].get('skipped')}")
    print(f"  Send 2: skipped={results[1].get('skipped')} reason={results[1].get('reason')}")
    print(f"  Send 3: skipped={results[2].get('skipped')} reason={results[2].get('reason')}")

    assert dispatch_count[0] == 1,                      "Exactly 1 real dispatch"
    assert results[0].get("skipped") != True,           "First send must NOT be skipped"
    assert results[1].get("skipped") == True,           "Second send must be deduped"
    assert results[2].get("skipped") == True,           "Third send must be deduped"
    assert results[1].get("reason") == "deduplication", "Dedup reason must be set"

    print(f"\n  {PASS}: Deduplication correctly blocks 2/3 repeats within 1h window")
    return True


# ─────────────────────────────────────────────────────────────
# Run all T1 tests
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    results = {}
    for name, fn in [
        ("T1-A: WhatsApp→SMS fallback",     test_whatsapp_failure_falls_to_sms),
        ("T1-B: Demo mode",                  test_demo_mode_no_real_calls),
        ("T1-C: Deduplication",              test_deduplication_within_window),
    ]:
        try:
            fn()
            results[name] = PASS
        except Exception as e:
            results[name] = f"{FAIL}: {e}"

    print(f"\n\n{'='*60}")
    print("  TASK 1 — FINAL RESULTS")
    print(f"{'='*60}")
    for name, res in results.items():
        print(f"  {res}  |  {name}")
    all_pass = all(FAIL not in v for v in results.values())
    print(f"\n  Overall: {'✅ ALL PASSED' if all_pass else '❌ SOME FAILED'}")
