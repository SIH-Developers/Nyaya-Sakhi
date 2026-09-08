"""
services/twilio_service.py — Robust Multi-Channel Notification Engine
SIH 26094 / NHAA 14566

Dispatch order (per TASK 1):
  1. WhatsApp (primary — rich media, free-form message)
  2. SMS       (fallback if WhatsApp fails or not configured)
  3. Voice     (tertiary for critical tiers, with TwiML URL auto-detection)

Demo mode:   when TWILIO_ACCOUNT_SID is empty / placeholder, prints simulated output
             and returns success=True so tests pass without credentials.

Deduplication: maintains an in-memory set of (victim_id, alert_id) pairs with a
               configurable TTL so the same alert is never re-sent within 1 hour.
"""

import os
import time
import uuid
import threading
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

# ── Credentials ────────────────────────────────────────────────────────────────
ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN", "")
FROM_NUMBER   = os.getenv("TWILIO_FROM_NUMBER", "")
WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", f"whatsapp:{FROM_NUMBER}" if FROM_NUMBER else "")
CONTENT_SID   = os.getenv("TWILIO_WHATSAPP_CONTENT_SID", "")

# URLs for voice TwiML
RENDER_URL    = os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/")
TWIML_BIN_URL = os.getenv("TWIML_BIN_URL", "")
NGROK_URL     = os.getenv("NGROK_URL", "").rstrip("/")

# ── Demo-mode guard ─────────────────────────────────────────────────────────────
def _is_configured() -> bool:
    return (
        ACCOUNT_SID.startswith("AC") and
        len(AUTH_TOKEN) >= 32 and
        FROM_NUMBER.startswith("+")
    )

def _get_client():
    from twilio.rest import Client
    return Client(ACCOUNT_SID, AUTH_TOKEN)

# ── Deduplication store ─────────────────────────────────────────────────────────
_sent_alerts: dict = {}  # key → timestamp
_dedup_lock = threading.Lock()
DEDUP_TTL_SECS = 3600  # 1 hour

def _dedup_key(victim_id: str, alert_id: str) -> str:
    return f"{victim_id}:{alert_id}"

def _already_sent(victim_id: str, alert_id: str) -> bool:
    """Return True if this alert was already dispatched within the TTL window."""
    key = _dedup_key(victim_id, alert_id)
    with _dedup_lock:
        ts = _sent_alerts.get(key)
        if ts and (time.time() - ts) < DEDUP_TTL_SECS:
            return True
    return False

def _mark_sent(victim_id: str, alert_id: str):
    key = _dedup_key(victim_id, alert_id)
    with _dedup_lock:
        _sent_alerts[key] = time.time()
        # prune old entries
        cutoff = time.time() - DEDUP_TTL_SECS
        expired = [k for k, v in _sent_alerts.items() if v < cutoff]
        for k in expired:
            del _sent_alerts[k]


# ── Channel 1: WhatsApp ─────────────────────────────────────────────────────────
def send_whatsapp(to_number: str, message: str) -> dict:
    """Send via Twilio WhatsApp sandbox or approved number."""
    to_wa = f"whatsapp:{to_number}" if not to_number.startswith("whatsapp:") else to_number

    if not _is_configured():
        print(f"[DEMO][WhatsApp] → {to_number}: {message[:80]}…")
        return {"success": True, "channel": "whatsapp", "simulated": True}

    try:
        client = _get_client()
        kwargs = {"from_": WHATSAPP_FROM, "to": to_wa}
        if CONTENT_SID:
            kwargs["content_sid"] = CONTENT_SID
        else:
            kwargs["body"] = f"🏛️ *NHAA 14566 Support*\n\n{message}\n\n_Reply anytime or call 14566_"

        msg = client.messages.create(**kwargs)
        print(f"[WhatsApp] ✅ Sent → {to_number} | SID={msg.sid} Status={msg.status}")
        return {"success": True, "channel": "whatsapp", "sid": msg.sid, "status": msg.status}
    except Exception as e:
        print(f"[WhatsApp] ❌ {e}")
        return {"success": False, "channel": "whatsapp", "error": str(e)}


# ── Channel 2: SMS ──────────────────────────────────────────────────────────────
def send_sms(to_number: str, message: str) -> dict:
    """Send via Twilio SMS (plain text)."""
    if not _is_configured():
        print(f"[DEMO][SMS] → {to_number}: {message[:80]}…")
        return {"success": True, "channel": "sms", "simulated": True}

    try:
        client = _get_client()
        msg = client.messages.create(
            body=f"[NHAA 14566] {message}",
            from_=FROM_NUMBER,
            to=to_number
        )
        print(f"[SMS] ✅ Sent → {to_number} | SID={msg.sid} Status={msg.status}")
        return {"success": True, "channel": "sms", "sid": msg.sid, "status": msg.status}
    except Exception as e:
        print(f"[SMS] ❌ {e}")
        return {"success": False, "channel": "sms", "error": str(e)}


# ── Channel 3: Voice ────────────────────────────────────────────────────────────
def _twiml_url() -> str:
    if RENDER_URL:
        return f"{RENDER_URL}/twiml"
    if TWIML_BIN_URL:
        return TWIML_BIN_URL
    if NGROK_URL:
        return f"{NGROK_URL}/twiml"
    return "http://localhost:8000/twiml"

def make_voice_call(to_number: str, spoken_message: str) -> dict:
    """Initiate an outbound TwiML voice call."""
    if not _is_configured():
        print(f"[DEMO][Voice] → {to_number}: {spoken_message[:80]}…")
        return {"success": True, "channel": "voice", "simulated": True}

    try:
        client = _get_client()
        url = _twiml_url()
        call = client.calls.create(url=url, from_=FROM_NUMBER, to=to_number)
        print(f"[Voice] ✅ Call → {to_number} | SID={call.sid} Status={call.status}")
        return {"success": True, "channel": "voice", "call_sid": call.sid, "status": call.status}
    except Exception as e:
        print(f"[Voice] ❌ {e}")
        return {"success": False, "channel": "voice", "error": str(e)}


# ── Main dispatcher: WhatsApp → SMS → Voice ────────────────────────────────────
def dispatch_notification(
    victim_id: str,
    to_number: str,
    victim_name: str,
    message: str,
    risk_tier: str = "Routine",
    alert_id: Optional[str] = None,
    force: bool = False
) -> dict:
    """
    Dispatch notification across channels with automatic fallback.

    Priority:
      1. WhatsApp (always attempted)
      2. SMS      (attempted if WhatsApp fails OR risk_tier is Urgent/Critical)
      3. Voice    (only for Urgent/Critical tier — adds human urgency)

    Deduplication: skip if same alert was sent within the last hour (override with force=True).
    """
    if alert_id is None:
        alert_id = str(uuid.uuid4())[:8]

    if not force and _already_sent(victim_id, alert_id):
        print(f"[Dispatch] ⏭  Dedup skip: alert {alert_id} already sent within 1h for {victim_id}")
        return {"skipped": True, "reason": "deduplication", "alert_id": alert_id}

    results = {"victim_id": victim_id, "alert_id": alert_id, "channels": [], "timestamp": datetime.now().isoformat()}
    is_critical = risk_tier in ("Urgent", "Critical")

    # ── 1. WhatsApp ─────────────────────────────────────────────────────────────
    wa_result = send_whatsapp(to_number, message)
    results["whatsapp"] = wa_result
    results["channels"].append("whatsapp")
    wa_failed = not wa_result.get("success")

    # ── 2. SMS (fallback if WhatsApp failed, or always for Urgent+) ──────────────
    if wa_failed or is_critical:
        sms_result = send_sms(to_number, message)
        results["sms"] = sms_result
        results["channels"].append("sms")

    # ── 3. Voice (only for critical tiers) ────────────────────────────────────
    if is_critical:
        voice_result = make_voice_call(to_number, message)
        results["voice"] = voice_result
        results["channels"].append("voice")

    _mark_sent(victim_id, alert_id)
    print(f"[Dispatch] ✅ Completed for {victim_name} ({victim_id}) via {results['channels']}")
    return results


# ── Self-test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TWILIO SERVICE SELF-TEST (DEMO MODE)")
    print("=" * 60)
    result = dispatch_notification(
        victim_id="VIC-001",
        to_number="+919876543210",
        victim_name="Test Victim",
        message="Namaste! This is an automated welfare check-in from NHAA 14566. How are you coping today?",
        risk_tier="Urgent",
        alert_id="TEST-001"
    )
    print("\nResult:", result)
