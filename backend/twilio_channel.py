"""
Twilio Channel Integration for SIH 26094 - NHAA 14566
Handles outbound SMS and Voice IVRS calls to victims' registered mobile numbers.

Setup:
  1. Go to https://console.twilio.com and copy Account SID and Auth Token.
  2. Buy a phone number (Voice + SMS capable).
  3. Fill in .env:
       TWILIO_ACCOUNT_SID=ACxxxxx
       TWILIO_AUTH_TOKEN=xxxxxxx
       TWILIO_FROM_NUMBER=+1XXXXXXXXXX
"""
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
TO_NUMBER = os.getenv("TWILIO_TO_NUMBER", "")
RENDER_URL = os.getenv("RENDER_EXTERNAL_URL", "")

def _is_configured() -> bool:
    """Return True only if real Twilio credentials are present."""
    return (
        ACCOUNT_SID.startswith("AC") and
        len(AUTH_TOKEN) >= 32 and
        FROM_NUMBER.startswith("+")
    )


# 1. Send SMS to Victim
def send_sms(to_number: str, message: str) -> dict:
    """Send a plain-text check-in SMS to victim's registered mobile number."""
    if not _is_configured():
        print(f"[Twilio SMS] Simulating send to {to_number}: {message[:60]}...")
        return {"success": False, "error": "Twilio credentials not configured"}

    try:
        from twilio.rest import Client
        client = Client(ACCOUNT_SID, AUTH_TOKEN)
        try:
            msg = client.messages.create(
                body=message,
                from_=FROM_NUMBER,
                to=to_number
            )
        except Exception as err:
            # Twilio Trial accounts require predefined template keyword for trial destinations
            if "trial" in str(err).lower() or "template" in str(err).lower():
                msg = client.messages.create(
                    body="sms_feedback_surveys",
                    from_=FROM_NUMBER,
                    to=to_number
                )
            else:
                raise err

        print(f"[Twilio SMS] Sent to {to_number} | SID: {msg.sid} | Status: {msg.status}")
        return {"success": True, "sid": msg.sid, "status": msg.status}
    except Exception as e:
        print(f"[Twilio SMS] Error: {e}")
        return {"success": False, "error": str(e)}


WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", f"whatsapp:{FROM_NUMBER}")


# 2. Send WhatsApp Message to Victim
def send_whatsapp(to_number: str, message: str) -> dict:
    """Send an official check-in message via Twilio WhatsApp."""
    if not _is_configured():
        print(f"[Twilio WhatsApp] Simulating send to {to_number}: {message[:60]}...")
        return {"success": True, "simulated": True, "note": "Credentials not set"}

    try:
        from twilio.rest import Client
        client = Client(ACCOUNT_SID, AUTH_TOKEN)
        clean_to = to_number.strip()
        if not clean_to.startswith("whatsapp:"):
            clean_to = f"whatsapp:{clean_to}"

        content_sid = os.getenv("TWILIO_WHATSAPP_CONTENT_SID", "HX9c7d19f29439078cadf810b1ab49ad83")
        try:
            msg = client.messages.create(
                content_sid=content_sid,
                from_=WHATSAPP_FROM,
                to=clean_to
            )
        except Exception:
            msg = client.messages.create(
                body=f"🏛️ *MoSJE • NHAA 14566 Support Check-in*\n\n{message}\n\n_Reply to this WhatsApp message or call 14566 anytime._",
                from_=WHATSAPP_FROM,
                to=clean_to
            )
        print(f"[Twilio WhatsApp] Sent to {to_number} | SID: {msg.sid} | Status: {msg.status}")
        return {"success": True, "sid": msg.sid, "status": msg.status}
    except Exception as e:
        print(f"[Twilio WhatsApp] Error: {e}")
        return {"success": False, "error": str(e)}


# 3. Outbound IVRS Voice Call
def make_voice_call(to_number: str, spoken_message: str, is_sos: bool = False, victim_id: str = None) -> dict:
    """
    Make an automated outbound voice call to the victim.
    Auto-detects:
      1. RENDER_EXTERNAL_URL — deployed production server on Render
      2. TWIML_BIN_URL       — hosted on Twilio's cloud
      3. NGROK_URL           — local tunnel fallback
    """
    if not _is_configured():
        print(f"[Twilio Voice] Simulating call to {to_number}: {spoken_message[:60]}...")
        return {"success": False, "error": "Twilio credentials not configured"}

    try:
        from twilio.rest import Client
        client = Client(ACCOUNT_SID, AUTH_TOKEN)

        render_url = os.getenv("RENDER_EXTERNAL_URL", "").strip()
        twiml_bin  = os.getenv("TWIML_BIN_URL", "").strip()
        ngrok_url  = os.getenv("NGROK_URL", "").strip()
        path = "/twiml/sos" if is_sos else "/twiml"

        if render_url:
            twiml_url = f"{render_url.rstrip('/')}{path}"
            print(f"[Twilio Voice] Using Render deployed URL: {twiml_url}")
        elif twiml_bin and not is_sos:
            twiml_url = twiml_bin
            print(f"[Twilio Voice] Using TwiML Bin: {twiml_url}")
        elif ngrok_url:
            twiml_url = f"{ngrok_url.rstrip('/')}{path}"
            print(f"[Twilio Voice] Using tunnel URL: {twiml_url}")
        else:
            twiml_url = f"http://localhost:8000{path}"

        if victim_id:
            join_char = "&" if "?" in twiml_url else "?"
            twiml_url = f"{twiml_url}{join_char}victim_id={victim_id}"

        call = client.calls.create(
            url=twiml_url,
            from_=FROM_NUMBER,
            to=to_number
        )
        print(f"[Twilio Voice] Call initiated to {to_number} | SID: {call.sid} | Status: {call.status}")
        return {"success": True, "call_sid": call.sid, "status": call.status}
    except Exception as e:
        error_msg = str(e)
        print(f"[Twilio Voice] Error: {error_msg}")
        return {"success": False, "error": error_msg}


# 4. Combined Multi-Channel Dispatch (Voice + SMS + WhatsApp + Email)
def dispatch_checkin(
    to_number: str,
    victim_name: str,
    message_text: str,
    send_voice: bool = False,
    send_sms_flag: bool = True,
    send_whatsapp_flag: bool = True,
    send_email_flag: bool = False,
    to_email: str = "",
    victim_id: str = None
) -> dict:
    """
    Dispatch proactive check-in across selected communication channels.
    """
    print(f"\n[NHAA 14566] Dispatching multi-channel check-in to {victim_name} ({to_number})")

    result = {"victim": victim_name, "to": to_number, "channels": []}

    # 1. SMS
    if send_sms_flag:
        sms_res = send_sms(to_number, f"[NHAA 14566] {message_text}")
        result["sms"] = sms_res
        result["channels"].append("SMS")

    # 2. WhatsApp
    if send_whatsapp_flag:
        wa_res = send_whatsapp(to_number, message_text)
        result["whatsapp"] = wa_res
        result["channels"].append("WhatsApp")

    # 3. Voice (IVRS)
    if send_voice:
        voice_res = make_voice_call(to_number, message_text, victim_id=victim_id)
        result["voice"] = voice_res
        result["channels"].append("Voice IVRS")

    # 4. Email (Twilio SendGrid)
    if send_email_flag or to_email:
        from backend.email_channel import send_email_alert
        email_res = send_email_alert(
            to_email=to_email,
            subject=f"NHAA 14566 Proactive Check-in: {victim_name}",
            body_text=message_text
        )
        result["email"] = email_res
        result["channels"].append("Email (SMTP / Alert)")

    return result


# ─────────────────────────────────────────────
# QUICK SELF-TEST (run this file directly)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TWILIO CHANNEL SELF-TEST")
    print("=" * 60)

    if not _is_configured():
        print("\n⚠️  TWILIO NOT CONFIGURED YET")
        print("Open .env and replace the placeholder values:")
        print("  TWILIO_ACCOUNT_SID=ACxxxxx   ← from console.twilio.com")
        print("  TWILIO_AUTH_TOKEN=xxxxxxx    ← from console.twilio.com")
        print("  TWILIO_FROM_NUMBER=+1XXXXXX  ← your purchased Twilio number")
    else:
        print("✅ Twilio credentials loaded!")
        print(f"  Account SID: {ACCOUNT_SID[:10]}...")
        print(f"  From Number: {FROM_NUMBER}")

        # Replace with your own test number to actually send
        TEST_NUMBER = input("\nEnter your phone number to test (e.g. +919876543210): ").strip()
        if TEST_NUMBER:
            result = dispatch_checkin(
                to_number=TEST_NUMBER,
                victim_name="Test Victim",
                message_text="Namaste! This is a test check-in from NHAA 14566. How are you feeling today?",
                also_call=True
            )
            print("\nResult:", result)
