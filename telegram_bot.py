"""
Telegram Voice & Text Channel Bot for SIH 26094
Allows victims and judges to send live text and voice notes from their mobile phone.
Integrates directly with FastAPI & LangGraph multi-agent engine.
"""
import os
import sys
import time
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv(Path(__file__).parent / ".env")

# Ensure clean UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BASE_URL = os.getenv("RENDER_EXTERNAL_URL", "http://127.0.0.1:8000").rstrip("/")
API_BASE_URL = f"{BASE_URL}/api"
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

def call_api(method: str, path: str, **kwargs):
    """Call backend API with automatic fallback between public Render URL and localhost."""
    candidate_urls = []
    ext_url = os.getenv("RENDER_EXTERNAL_URL")
    if ext_url:
        candidate_urls.append(f"{ext_url.rstrip('/')}/api/{path.lstrip('/')}")
    port = os.getenv("PORT", "8000")
    candidate_urls.append(f"http://127.0.0.1:{port}/api/{path.lstrip('/')}")
    candidate_urls.append(f"http://127.0.0.1:8000/api/{path.lstrip('/')}")

    last_err = None
    for base in candidate_urls:
        try:
            if method.lower() == "get":
                return requests.get(base, timeout=kwargs.get("timeout", 10))
            else:
                return requests.post(base, timeout=kwargs.get("timeout", 25), **{k: v for k, v in kwargs.items() if k != "timeout"})
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError(f"Could not connect to backend for {path}")

def send_telegram_message(chat_id: int, text: str):
    """Send text reply back to victim on Telegram."""
    url = f"{TELEGRAM_API}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"Error sending Telegram message: {e}")

def get_file_bytes(file_id: str) -> bytes:
    """Download audio voice note from Telegram server."""
    get_file_url = f"{TELEGRAM_API}/getFile?file_id={file_id}"
    res = requests.get(get_file_url, timeout=10).json()
    file_path = res.get("result", {}).get("file_path")
    if not file_path:
        return None
    download_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
    audio_res = requests.get(download_url, timeout=15)
    return audio_res.content

# In-memory conversational state and rate-limiting for Telegram intake
_chat_states: Dict[int, Dict[str, Any]] = {}
_lookup_attempts: Dict[int, List[float]] = {}

def _check_telegram_lookup_rate_limit(chat_id: int) -> bool:
    """Enforce max 5 reference lookup attempts per 5 minutes per Telegram chat_id."""
    now = time.time()
    cutoff = now - 300  # 5 minutes
    history = [t for t in _lookup_attempts.get(chat_id, []) if t >= cutoff]
    if len(history) >= 5:
        _lookup_attempts[chat_id] = history
        return False
    history.append(now)
    _lookup_attempts[chat_id] = history
    return True

def get_linked_victim(chat_id: int) -> Optional[Dict[str, Any]]:
    """Return victim record linked to this Telegram chat_id, if any."""
    try:
        from database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM victims WHERE telegram_chat_id = ? OR victim_id = ? LIMIT 1",
            (str(chat_id), f"VIC-TG-{chat_id}")
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"Error checking linked victim: {e}")
        return None

def complete_self_registration(chat_id: int, user_name: str, district: str, fir_filed: bool, email: Optional[str]) -> str:
    """Create a new self-registered victim record with registration_status='self_registered_pending_verification'."""
    victim_id = f"VIC-TG-{chat_id}"
    fir_label = "FIR Pending Verification" if fir_filed else "Intake (Pending FIR)"
    try:
        from database import get_connection
        from datetime import datetime
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at, telegram_chat_id,
            registration_status, email, last_channel
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'self_registered_pending_verification', ?, 'telegram_mobile')
        """, (
            victim_id, user_name, "Scheduled Caste",
            fir_label, "Helpline 14566 Intake",
            district or "Self-Reported via Telegram", "Delhi", "Helpline Intake", "None", 0, "Pending",
            datetime.now().isoformat(), str(chat_id), email
        ))
        conn.commit()
        conn.close()
        print(f"👤 Self-registered victim: {user_name} ({victim_id}) -> Pending Verification")
    except Exception as e:
        print(f"Self-registration error: {e}")
    return victim_id

def process_telegram_update(update: dict):
    """Route text or voice note into FastAPI & LangGraph with interactive onboarding."""
    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from", {})
    first_name = from_user.get("first_name", "")
    last_name = from_user.get("last_name", "")
    default_name = f"{first_name} {last_name}".strip() or "Telegram User"
    
    if not chat_id:
        return

    text_content = message.get("text", "").strip()

    # 1. Handle /start command — initiates branching flow
    if text_content == "/start":
        linked_victim = get_linked_victim(chat_id)
        if linked_victim:
            # Already linked or registered
            welcome_msg = (
                f"🙏 *Namaste {linked_victim.get('name', default_name)}!*\n\n"
                f"Welcome back to the *MoSJE & NHAA 14566 Atrocity Support System*.\n"
                f"• *Victim ID:* `{linked_victim.get('victim_id')}`\n"
                f"• *Case:* `{linked_victim.get('fir_number') or 'Intake Case'}`\n"
                f"• *Status:* *{linked_victim.get('registration_status', 'verified')}*\n\n"
                "• 💬 *Text Check-in:* Share how you are coping with your case anytime.\n"
                "• 🎙️ *Voice Check-in:* Hold the microphone button to send a live voice message."
            )
            send_telegram_message(chat_id, welcome_msg)
            _chat_states.pop(chat_id, None)
            return

        # Not linked: Ask for FIR or Linking Code
        _chat_states[chat_id] = {"step": "AWAITING_REFERENCE"}
        ask_msg = (
            "🙏 *Namaste!*\n"
            "Welcome to the *MoSJE & NHAA 14566 Legal Protection & Distress Monitoring System*.\n\n"
            "Do you already have an FIR number or a case reference code from an officer? "
            "If yes, please share it now. If not, reply '*no*' and I'll help you get started."
        )
        send_telegram_message(chat_id, ask_msg)
        return

    # 2. Handle active onboarding state
    state = _chat_states.get(chat_id)
    if state and "text" in message:
        step = state.get("step")

        # Step A: User replies to FIR / Code prompt
        if step == "AWAITING_REFERENCE":
            lower_text = text_content.lower()
            if lower_text in ["no", "n", "nahi", "nah", "no fir", "not yet", "none"]:
                # Path 2 — Self-registration
                _chat_states[chat_id] = {"step": "REG_NAME", "data": {}}
                send_telegram_message(
                    chat_id,
                    "Understood. Let's get you registered for legal protection right now.\n\n"
                    "What name (or preferred name) should we address you by?"
                )
                return
            else:
                # Path 1 — Search for FIR or 6-digit Link Code
                # Check rate limit to prevent code enumeration
                if not _check_telegram_lookup_rate_limit(chat_id):
                    send_telegram_message(
                        chat_id,
                        "⚠️ Too many lookup attempts. For security, let's get you registered directly.\n\n"
                        "What name should we address you by?"
                    )
                    _chat_states[chat_id] = {"step": "REG_NAME", "data": {}}
                    return

                from database import find_victim_by_fir_or_link, link_telegram_to_victim
                found = find_victim_by_fir_or_link(text_content)
                if found:
                    link_telegram_to_victim(found["victim_id"], chat_id)
                    _chat_states.pop(chat_id, None)
                    fir_num = found.get("fir_number") or found["victim_id"]
                    send_telegram_message(
                        chat_id,
                        f"✅ Thanks, I've found your case (FIR #{fir_num}). "
                        f"I'm here to check in with you regularly.\n\n"
                        "You can now send any text message or hold the microphone button to send a live voice note."
                    )
                    return
                else:
                    _chat_states[chat_id] = {"step": "REG_NAME", "data": {}}
                    send_telegram_message(
                        chat_id,
                        "I couldn't find that reference. Let's get you registered now instead.\n\n"
                        "What name (or how you'd like to be addressed) should we register for you?"
                    )
                    return

        # Step B: Preferred Name
        if step == "REG_NAME":
            chosen_name = text_content or default_name
            _chat_states[chat_id]["data"]["name"] = chosen_name
            _chat_states[chat_id]["step"] = "REG_DISTRICT"
            send_telegram_message(
                chat_id,
                f"Thank you, {chosen_name}. Which district and state are you located in? (e.g. Lucknow, UP)"
            )
            return

        # Step C: District / Location
        if step == "REG_DISTRICT":
            _chat_states[chat_id]["data"]["district"] = text_content
            _chat_states[chat_id]["step"] = "REG_FIR_STATUS"
            send_telegram_message(
                chat_id,
                "Has a formal Police FIR been filed for your case yet? (Reply 'yes' or 'no')"
            )
            return

        # Step D: FIR Filed Status
        if step == "REG_FIR_STATUS":
            fir_ans = text_content.lower()
            fir_filed = "yes" in fir_ans or "haan" in fir_ans or "filed" in fir_ans
            _chat_states[chat_id]["data"]["fir_filed"] = fir_filed
            _chat_states[chat_id]["step"] = "REG_EMAIL"
            send_telegram_message(
                chat_id,
                "Would you like an email added so you can check your case status online on the Patient Portal? "
                "(optional, reply with your email address or reply '*skip*' if not applicable)"
            )
            return

        # Step E: Optional Email Collection
        if step == "REG_EMAIL":
            email_val = None
            if "@" in text_content and "." in text_content and "skip" not in text_content.lower():
                email_val = text_content.strip().lower()

            reg_data = _chat_states[chat_id].get("data", {})
            user_name = reg_data.get("name") or default_name
            district = reg_data.get("district") or "Self-Reported"
            fir_filed = reg_data.get("fir_filed", False)

            victim_id = complete_self_registration(chat_id, user_name, district, fir_filed, email_val)
            _chat_states.pop(chat_id, None)

            email_note = f"\n• *Email for Portal:* `{email_val}`" if email_val else "\n• *Portal Access:* Ask an officer or counselor to link an email anytime."
            confirm_msg = (
                f"✅ *Registration Completed!*\n\n"
                f"• *Victim ID:* `{victim_id}`\n"
                f"• *Status:* ⚠️ *Pending Officer Verification*{email_note}\n\n"
                "Your profile has been prioritized on the District Officer Dashboard for review and statutory legal protection under the SC/ST (PoA) Act 1989.\n\n"
                "You can now share how you're feeling via text, or send a voice message anytime."
            )
            send_telegram_message(chat_id, confirm_msg)
            return

    # 3. Handle Regular Monitoring (Voice or Text) for linked / registered victims
    linked_victim = get_linked_victim(chat_id)
    victim_id = linked_victim.get("victim_id") if linked_victim else complete_self_registration(chat_id, default_name, "Self-Reported", False, None)
    user_name = linked_victim.get("name", default_name) if linked_victim else default_name

    # 2. Handle Live Voice Notes from Phone (Microphone)
    if "voice" in message or "audio" in message:
        voice_info = message.get("voice") or message.get("audio")
        file_id = voice_info.get("file_id")
        duration = voice_info.get("duration", 0)

        print(f"🎙️ Received Voice Note from {user_name} (Duration: {duration}s). Downloading audio...")
        send_telegram_message(chat_id, "⏳ *Analyzing your live voice with Multi-Agent Acoustic AI...*")

        audio_bytes = get_file_bytes(file_id)
        if not audio_bytes:
            send_telegram_message(chat_id, "⚠️ Failed to download voice message. Please try again.")
            return

        # Upload audio to FastAPI backend under the real user's victim_id
        try:
            files = {"audio_file": ("voice_note.ogg", audio_bytes, "audio/ogg")}
            data = {"victim_id": victim_id, "browser_transcript": f"Live voice check-in from {user_name} via Telegram."}
            res = call_api("post", "upload-audio-call", data=data, files=files, timeout=25).json()

            risk_tier = res.get("risk_tier", "Routine")
            score_pct = int((res.get("fused_risk_score", 0.0)) * 100)
            reasons = res.get("explainability_reasons", [])

            reply = (
                f"✅ *Voice Analysis Complete for {user_name}*\n\n"
                f"📊 *Dynamic Distress Score:* `{score_pct}%`\n"
                f"🏷️ *Assigned Risk Tier:* *{risk_tier}*\n\n"
                f"🔍 *Acoustic & Case Factors Detected:*\n"
            )
            for r in reasons[:3]:
                reply += f"• {r}\n"

            if res.get("escalation_triggered"):
                reply += "\n🚨 *An on-duty support counselor has been alerted to reach out to you directly.*"
            else:
                reply += "\n💚 *Everything is within safe thresholds. You can speak with us anytime.*"

            send_telegram_message(chat_id, reply)
            print(f"✅ Voice note processed for {user_name} -> Risk: {score_pct}% ({risk_tier})")
        except Exception as e:
            print(f"Error processing audio upload: {e}")
            send_telegram_message(chat_id, "⚠️ Error processing audio on server.")
        return

    # 3. Handle Regular Text Messages
    if "text" in message:
        text_content = message.get("text")
        print(f"💬 Received Text from {user_name}: \"{text_content}\"")

        try:
            payload = {
                "victim_id": victim_id,
                "message_text": text_content,
                "channel": "telegram_mobile"
            }
            res = call_api("post", "message", json=payload, timeout=20).json()

            risk_tier = res.get("risk_tier", "Routine")
            score_pct = int((res.get("fused_risk_score", 0.0)) * 100)
            reasons = res.get("explainability_reasons", [])

            if risk_tier == "Urgent":
                reply = (
                    f"🚨 *CRITICAL SAFETY ALERT ({score_pct}% - Urgent)*\n\n"
                    f"🔍 *Threat & Distress Analysis:*\n"
                )
                for r in reasons[:3]:
                    reply += f"• {r}\n"
                reply += (
                    f"\n🛡️ *Immediate Safety Protocol:*\n"
                    f"• If you are facing direct physical danger, call **112 (Police)** or toll-free **14566 (NHAA Helpline)** right now.\n"
                    f"• An urgent high-priority ticket has been dispatched to your on-duty district counselor for safety outreach under Section 15A."
                )
            elif risk_tier in ["Counselor Outreach", "Watch"]:
                reply = (
                    f"⚠️ *Distress Assessment:* `{score_pct}%` | *Status:* *{risk_tier}*\n\n"
                    f"🔍 *Factors Identified:*\n"
                )
                for r in reasons[:3]:
                    reply += f"• {r}\n"
                reply += f"\n💙 *We are here with you.* A support counselor has been updated on your case status. Call **14566** anytime."
            else:
                reply = (
                    f"💚 *Distress Assessment:* `{score_pct}%` | *Status:* *Routine / Stable*\n\n"
                    f"• {reasons[0] if reasons else 'All signals within stable baseline thresholds.'}\n\n"
                    f"Namaste {user_name}! Your well-being monitoring is active. You can reach out to your counselor or call 14566 anytime you need assistance."
                )

            send_telegram_message(chat_id, reply)
        except Exception as e:
            print(f"Error processing text message: {e}")

def run_bot():
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN_HERE":
        print("\n" + "=" * 75)
        print("⚠️ TELEGRAM BOT TOKEN REQUIRED")
        print("=" * 75)
        print("To activate the Telegram Voice Bot (100% Free, No Credit Card):")
        print("1. Open Telegram on your phone or PC and search for: @BotFather")
        print("2. Send: /newbot and choose a name (e.g., NHAA_14566_Bot)")
        print("3. Copy the token (e.g. 7123456789:AAHq...) and paste it in telegram_bot.py or .env as TELEGRAM_BOT_TOKEN")
        print("=" * 75)
        return

    print("🚀 Telegram Voice & Text Support Bot is RUNNING...")
    print(f"🔗 Bot Connected to: {API_BASE_URL}")
    offset = 0

    while True:
        try:
            url = f"{TELEGRAM_API}/getUpdates?offset={offset}&timeout=30"
            res = requests.get(url, timeout=35).json()
            updates = res.get("result", [])

            for update in updates:
                offset = update["update_id"] + 1
                process_telegram_update(update)

        except KeyboardInterrupt:
            print("\nStopping Telegram Bot.")
            break
        except Exception as e:
            time.sleep(2)

if __name__ == "__main__":
    run_bot()
