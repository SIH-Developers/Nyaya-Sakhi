"""
tests/test_twilio_live.py
Live Twilio Sandbox Verification — Real API Test (Not Mocked)

PURPOSE:
  Proves the actual Twilio integration works against real Twilio infrastructure,
  not just the mocked fallback logic in test_twilio_service.py.

PRE-REQUISITES (one-time setup — do this manually before running):
  1. Log into Twilio Console → Messaging → Try it out → Send a WhatsApp message
  2. Note your Sandbox number (usually +1 415 523 8886) and your unique join code
     (e.g., "join happy-tiger")
  3. From the phone you'll use as test victim, send the join code as WhatsApp
     to the Sandbox number to opt that number in.
  4. Confirm that number shows as an active Sandbox participant in the Console.
  5. Add to your .env file:
       TWILIO_TEST_VICTIM_NUMBER=+91XXXXXXXXXX    # opted-in test number
       TWILIO_TEST_NON_OPTED_IN=+91XXXXXXXXXX     # a number NOT opted into Sandbox

RUNNING:
  # Run with real credentials active in .env:
  python -m pytest tests/test_twilio_live.py -v -s

  # Or run standalone:
  python tests/test_twilio_live.py

SKIP BEHAVIOUR:
  - Automatically skipped in CI/CD (no real creds in env) — will NOT fail loudly.
  - Run manually once now, and once before demo day (Sandbox opt-ins expire after
    inactivity — re-join if needed).

NOTE: Do NOT replace test_twilio_service.py — mocked tests run on every commit.
      This file is for real-network verification only.
"""

import os
import sys
import json
import time
import uuid
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent.parent / ".env")

from services import twilio_service as ts

# ── Test phone numbers from .env ──────────────────────────────────────────────
LIVE_NUMBER        = os.getenv("TWILIO_TEST_VICTIM_NUMBER", "").strip()
NON_OPTED_IN       = os.getenv("TWILIO_TEST_NON_OPTED_IN", "").strip()
HAS_LIVE_CREDS     = (
    os.getenv("TWILIO_ACCOUNT_SID", "").startswith("AC") and
    len(os.getenv("TWILIO_AUTH_TOKEN", "")) >= 32 and
    os.getenv("TWILIO_FROM_NUMBER", "").startswith("+")
)
HAS_LIVE_NUMBER    = bool(LIVE_NUMBER and LIVE_NUMBER.startswith("+"))
HAS_NON_OPTED_IN   = bool(NON_OPTED_IN and NON_OPTED_IN.startswith("+"))

SKIP_NO_CREDS  = pytest.mark.skipif(
    not HAS_LIVE_CREDS or not HAS_LIVE_NUMBER,
    reason="TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_TEST_VICTIM_NUMBER not configured"
)
SKIP_NO_FALLBACK = pytest.mark.skipif(
    not HAS_LIVE_CREDS or not HAS_NON_OPTED_IN,
    reason="TWILIO_TEST_NON_OPTED_IN (non-opted-in number) not configured"
)

# ─────────────────────────────────────────────────────────────────────────────
# LIVE-T1: Real WhatsApp send — message must actually arrive on the test phone
# ─────────────────────────────────────────────────────────────────────────────
@SKIP_NO_CREDS
def test_live_whatsapp_send():
    """
    LIVE-T1: Send a real WhatsApp message to the opted-in Sandbox number.
    Confirms the message leaves our server and Twilio accepts it.

    Expected outcomes:
    - result["whatsapp"]["success"] == True
    - result["whatsapp"]["simulated"] does NOT exist (real send)
    - result["whatsapp"]["sid"] starts with "SM" (real Twilio message SID)
    - A real WhatsApp message physically arrives on TWILIO_TEST_VICTIM_NUMBER
    - Twilio Console → Monitor → Logs → Messaging shows the outbound message
    """
    print(f"\n  [LIVE] Sending real WhatsApp to {LIVE_NUMBER}")

    # Use a unique alert_id so dedup doesn't block this test run
    alert_id = f"LIVE-T1-{uuid.uuid4().hex[:8].upper()}"

    ts._sent_alerts.clear()  # clear dedup state for clean test

    result = ts.dispatch_notification(
        victim_id   = "VIC-LIVE-TEST-001",
        to_number   = LIVE_NUMBER,
        victim_name = "Live Test Victim (SIH Demo)",
        message     = (
            "Namaste! This is a test welfare check-in from NHAA 14566 / Nyaya-Sakhi "
            "(SIH Problem Statement 26094). If you receive this, the Twilio integration "
            "is working correctly. Please ignore this message."
        ),
        risk_tier   = "Counselor Outreach",
        alert_id    = alert_id,
        force       = True  # bypass dedup — this is a deliberate live test
    )

    print(f"\n  Result:\n{json.dumps(result, indent=4)}")

    wa = result.get("whatsapp", {})
    print(f"\n  WhatsApp SID    : {wa.get('sid', 'N/A')}")
    print(f"  WhatsApp status : {wa.get('status', 'N/A')}")
    print(f"  Simulated?      : {wa.get('simulated', False)}")
    print(f"  Channels used   : {result.get('channels')}")

    # ── Assertions ────────────────────────────────────────────────────────────
    assert result.get("channels"), "channels list must not be empty"
    assert "whatsapp" in result["channels"], "WhatsApp must be in channels"

    assert wa.get("success") is True, (
        f"WhatsApp send must succeed. Got: {wa.get('error', 'unknown error')}"
    )
    assert wa.get("simulated") is not True, (
        "This must be a REAL send — not demo mode. Check that TWILIO_ACCOUNT_SID "
        "starts with 'AC' and credentials are valid in .env"
    )
    sid = wa.get("sid", "")
    assert sid.startswith("SM"), (
        f"Real Twilio message SID must start with 'SM', got: {sid!r}"
    )

    print(f"\n  ✅ LIVE-T1 PASS")
    print(f"  Real Twilio SID: {sid}")
    print(f"  ⚠️  Please check {LIVE_NUMBER} for the WhatsApp message physically.")
    print(f"  ⚠️  Also check Twilio Console → Monitor → Logs → Messaging for SID {sid}")


# ─────────────────────────────────────────────────────────────────────────────
# LIVE-T2: Real WhatsApp-to-SMS fallback
# Uses a number NOT opted into the Twilio Sandbox to trigger genuine rejection,
# then confirms SMS fallback fires against real Twilio infrastructure.
# ─────────────────────────────────────────────────────────────────────────────
@SKIP_NO_FALLBACK
def test_live_whatsapp_to_sms_fallback():
    """
    LIVE-T2: Force real WhatsApp rejection → SMS fallback fires for real.

    A number not joined to the Twilio Sandbox will receive a 63016/63015 error
    from Twilio's WhatsApp API ("not a valid WhatsApp number" or "opt-in required").
    The dispatcher must catch that and fall through to SMS.

    Expected outcomes:
    - result["whatsapp"]["success"] == False (genuine Twilio error, not demo)
    - result["sms"]["success"] == True
    - result["sms"]["sid"] starts with "SM"
    - An SMS physically arrives on TWILIO_TEST_NON_OPTED_IN
    - Twilio Console shows: 1 failed WhatsApp + 1 delivered SMS
    """
    print(f"\n  [LIVE] Testing WhatsApp→SMS fallback")
    print(f"  Non-opted-in number: {NON_OPTED_IN}")

    alert_id = f"LIVE-T2-{uuid.uuid4().hex[:8].upper()}"
    ts._sent_alerts.clear()

    result = ts.dispatch_notification(
        victim_id   = "VIC-LIVE-TEST-002",
        to_number   = NON_OPTED_IN,
        victim_name = "Live Fallback Test Victim",
        message     = (
            "[NHAA 14566] Test: This SMS confirms Twilio WhatsApp-to-SMS fallback "
            "is working correctly (SIH 26094 demo test). Please ignore."
        ),
        risk_tier   = "Routine",   # Routine: WhatsApp primary, SMS only on WA failure
        alert_id    = alert_id,
        force       = True
    )

    print(f"\n  Result:\n{json.dumps(result, indent=4)}")

    wa  = result.get("whatsapp", {})
    sms = result.get("sms", {})

    print(f"\n  WhatsApp success : {wa.get('success')} (expected False)")
    print(f"  WhatsApp error   : {wa.get('error', 'N/A')}")
    print(f"  SMS SID          : {sms.get('sid', 'N/A')}")
    print(f"  SMS success      : {sms.get('success')} (expected True)")
    print(f"  SMS simulated?   : {sms.get('simulated', False)} (expected False)")
    print(f"  Channels         : {result.get('channels')}")

    # ── Assertions ────────────────────────────────────────────────────────────
    assert "sms" in result.get("channels", []), (
        "SMS must appear in channels after WhatsApp failure"
    )
    assert sms.get("success") is True, (
        f"SMS fallback must succeed. Got: {sms.get('error', 'unknown')}"
    )
    assert sms.get("simulated") is not True, (
        "SMS must be a REAL send — not demo mode"
    )
    sms_sid = sms.get("sid", "")
    assert sms_sid.startswith("SM"), (
        f"Real SMS SID must start with 'SM', got: {sms_sid!r}"
    )
    # WhatsApp should have failed (can be True if Twilio accepted delivery
    # even for non-opted-in — depends on Sandbox configuration)
    if wa.get("success") is True:
        print(f"\n  ⚠️  Note: WhatsApp was accepted despite no opt-in — Sandbox may deliver anyway.")
        print(f"      Check Console to see if it actually delivered or shows queued/failed.")
    else:
        print(f"\n  WhatsApp correctly failed: {wa.get('error', '')}")

    print(f"\n  ✅ LIVE-T2 PASS")
    print(f"  Real SMS SID: {sms_sid}")
    print(f"  ⚠️  Please check {NON_OPTED_IN} for an SMS (not WhatsApp) message.")
    print(f"  ⚠️  Twilio Console → Monitor → Logs → Messaging should show:")
    print(f"      - 1× WhatsApp outbound (failed/error)")
    print(f"      - 1× SMS outbound (delivered/queued), SID: {sms_sid}")


# ─────────────────────────────────────────────────────────────────────────────
# Standalone runner (no pytest required)
# ─────────────────────────────────────────────────────────────────────────────
def _print_env_status():
    print("\n" + "=" * 60)
    print("  TWILIO LIVE TEST — ENVIRONMENT STATUS")
    print("=" * 60)
    print(f"  TWILIO_ACCOUNT_SID   : {'✅ Set (AC...)' if HAS_LIVE_CREDS else '❌ Not configured'}")
    print(f"  TWILIO_AUTH_TOKEN    : {'✅ Set (32+ chars)' if HAS_LIVE_CREDS else '❌ Not configured'}")
    print(f"  TWILIO_FROM_NUMBER   : {os.getenv('TWILIO_FROM_NUMBER','(not set)')}")
    print(f"  TWILIO_WHATSAPP_FROM : {os.getenv('TWILIO_WHATSAPP_FROM','(not set)')}")
    print(f"  TWILIO_TEST_VICTIM_NUMBER   : {LIVE_NUMBER or '(not set) → LIVE-T1 will be skipped'}")
    print(f"  TWILIO_TEST_NON_OPTED_IN    : {NON_OPTED_IN or '(not set) → LIVE-T2 will be skipped'}")
    print()


if __name__ == "__main__":
    _print_env_status()

    results = {}

    # LIVE-T1
    if HAS_LIVE_CREDS and HAS_LIVE_NUMBER:
        print("=" * 60)
        print("  LIVE-T1: Real WhatsApp Send")
        print("=" * 60)
        try:
            test_live_whatsapp_send()
            results["LIVE-T1: Real WhatsApp send"] = "PASS"
        except AssertionError as e:
            results["LIVE-T1: Real WhatsApp send"] = f"FAIL — {e}"
        except Exception as e:
            results["LIVE-T1: Real WhatsApp send"] = f"ERROR — {type(e).__name__}: {e}"
    else:
        results["LIVE-T1: Real WhatsApp send"] = "SKIPPED — missing credentials or test number"

    # LIVE-T2
    if HAS_LIVE_CREDS and HAS_NON_OPTED_IN:
        print("\n" + "=" * 60)
        print("  LIVE-T2: WhatsApp → SMS Fallback")
        print("=" * 60)
        try:
            test_live_whatsapp_to_sms_fallback()
            results["LIVE-T2: WhatsApp→SMS fallback"] = "PASS"
        except AssertionError as e:
            results["LIVE-T2: WhatsApp→SMS fallback"] = f"FAIL — {e}"
        except Exception as e:
            results["LIVE-T2: WhatsApp→SMS fallback"] = f"ERROR — {type(e).__name__}: {e}"
    else:
        results["LIVE-T2: WhatsApp→SMS fallback"] = "SKIPPED — TWILIO_TEST_NON_OPTED_IN not configured"

    # ── Final report ──────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  LIVE TWILIO TESTS — FINAL RESULTS")
    print("=" * 60)
    for name, res in results.items():
        icon = "✅" if res == "PASS" else ("⏭ " if "SKIPPED" in res else "❌")
        print(f"  {icon}  {name}: {res}")

    print("""
NEXT STEPS:
  1. Check your test phone for the WhatsApp message (LIVE-T1)
  2. Check Twilio Console → Monitor → Logs → Messaging for the real SIDs
  3. Run this again the morning of your SIH demo:
       python -m pytest tests/test_twilio_live.py -v -s
  4. If LIVE-T1 shows SKIPPED: add TWILIO_TEST_VICTIM_NUMBER to your .env
     and make sure that number has joined the Sandbox by sending the join code
     (Sandbox opt-ins can expire — re-send the join code if needed)
""")
