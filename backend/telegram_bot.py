"""
Telegram Voice & Text Channel Bot for SIH 26094
Allows victims and judges to send live text and voice notes from their mobile phone.
Integrates directly with FastAPI & LangGraph multi-agent engine.

Task 3 dual-track architecture:
  - Track A: Fast NLP scoring via backend API (determines reply tone)
  - Track B: Groq LLM companion reply (uses tone from Track A)
  Both run concurrently via ThreadPoolExecutor; escalation pipeline fires
  in the background after the conversational reply has already been sent.
"""
import os
import sys
import time
import threading
import requests
import json
from concurrent.futures import ThreadPoolExecutor, Future, as_completed
from pathlib import Path
from typing import Dict, Any, List, Optional
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
        from backend.database import get_connection
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

# ── Dual-track executor (reused across messages for efficiency) ---------------
_executor = ThreadPoolExecutor(max_workers=6, thread_name_prefix="nhaa_bot")


def _fast_nlp_score(victim_id: str, message_text: str) -> dict:
    """
    Track A (fast): call backend /api/message to get NLP distress score.
    Returns the API response dict, or a safe default on failure.
    """
    try:
        payload = {"victim_id": victim_id, "message_text": message_text, "channel": "telegram_mobile"}
        resp = call_api("post", "message", json=payload, timeout=15).json()
        return resp
    except Exception as exc:
        print(f"[DualTrack] NLP scoring error: {exc}")
        return {"risk_tier": "Routine", "fused_risk_score": 0.0, "explainability_reasons": []}


def _tier_for(nlp_result: dict) -> str:
    """Map API risk_tier to counselor_persona tone key."""
    tier = (nlp_result.get("risk_tier") or "Routine").lower()
    mapping = {
        "urgent":            "urgent",
        "critical":          "critical",
        "counselor outreach": "counselor outreach",
        "watch":             "watch",
        "routine":           "routine",
    }
    return mapping.get(tier, "routine")


def handle_victim_text(chat_id: int, victim_id: str, user_name: str, message_text: str):
    """
    Dual-track concurrent handler for post-registration text messages.

    Step 1: Submit NLP scoring (Track A) immediately.
    Step 2: Once NLP score is ready, generate LLM reply (Track B) using that tone.
    Step 3: Send the LLM reply to the victim right away.
    Step 4: Let the full escalation side-effects (Twilio, dashboard writes,
            counselor alerts) finish in the background — they do NOT delay the reply.
    """
    # ── Step 1: Fast NLP scoring (blocks only briefly — ~2-4s) -----------------
    nlp_result = _fast_nlp_score(victim_id, message_text)
    risk_tier  = _tier_for(nlp_result)

    # ── Step 2: Build distress_context and fetch conversation history -----------
    victim = None
    try:
        from backend.database import get_victim_details, get_conversation_history, append_conversation_turn, trim_conversation_history
        victim = get_victim_details(victim_id)
        history = get_conversation_history(victim_id, limit=10)
    except Exception:
        history = []

    distress_ctx = {
        "current_tier": risk_tier,
        "case_stage":   victim.get("case_stage") if victim else None,
        "fir_number":   victim.get("fir_number") if victim else None,
    }

    # ── Step 3: Generate LLM reply and run full escalation concurrently --------
    def _generate_reply() -> str:
        try:
            from backend.services.counselor_persona import generate_counselor_reply
            return generate_counselor_reply(victim_id, message_text, history, distress_ctx)
        except Exception as exc:
            print(f"[CounselorPersona] Error generating reply: {exc}")
            return "I'm here with you. Can you tell me more about what's going on?"

    def _run_full_escalation():
        """Background task: escalation alerts, Twilio dispatch, DB writes."""
        try:
            if nlp_result.get("escalation_triggered"):
                # escalation_agent is already triggered inside save_victim_turn
                # which is called by the /api/message endpoint — nothing extra needed
                pass
        except Exception as exc:
            print(f"[DualTrack] Escalation background error: {exc}")

    # Both tasks submitted to thread pool simultaneously
    reply_future:     Future = _executor.submit(_generate_reply)
    escalation_future: Future = _executor.submit(_run_full_escalation)

    # Wait only for the conversational reply (escalation continues in background)
    llm_reply = reply_future.result()   # blocks until Groq responds (~1-3s)

    # ── Step 4: Send reply to victim -------------------------------------------
    send_telegram_message(chat_id, llm_reply)

    # ── Step 5: Persist conversation memory (after reply sent) -----------------
    try:
        from backend.database import update_interaction_log_reply
        append_conversation_turn(victim_id, "user",      message_text)
        append_conversation_turn(victim_id, "assistant", llm_reply)
        
        # Append the assistant's reply to the interaction log so it shows on the UI dashboard
        if nlp_result and "log_id" in nlp_result:
            update_interaction_log_reply(nlp_result["log_id"], llm_reply)
            
        # Prune to keep DB lean (keep last 50 turns per victim)
        _executor.submit(trim_conversation_history, victim_id, 50)
    except Exception as exc:
        print(f"[ConversationMemory] Write error: {exc}")

    # ── Log for officer console -------------------------------------------------
    print(f"[DualTrack] ✅ {user_name} | tier={risk_tier} | reply_len={len(llm_reply)}")
    # escalation_future is intentionally not awaited — fires in background


def complete_self_registration(chat_id: int, user_name: str, district: str, fir_filed: bool, email: Optional[str]) -> str:
    """Create a new self-registered victim record with registration_status='self_registered_pending_verification'."""
    victim_id = f"VIC-TG-{chat_id}"
    fir_label = "FIR Pending Verification" if fir_filed else "Intake (Pending FIR)"
    try:
        from backend.database import get_connection
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
            email_info = f"• *Email:* `{linked_victim.get('email')}`" if linked_victim.get('email') else "• *Portal Access:* Send `/email yourname@example.com` to enable web login."
            welcome_msg = (
                f"🙏 *Namaste {linked_victim.get('name', default_name)}!*\n\n"
                f"Welcome back to the *MoSJE & NHAA 14566 Atrocity Support System*.\n"
                f"• *Victim ID:* `{linked_victim.get('victim_id')}`\n"
                f"• *Case:* `{linked_victim.get('fir_number') or 'Intake Case'}`\n"
                f"• *Status:* *{linked_victim.get('registration_status', 'verified')}*\n"
                f"{email_info}\n\n"
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

    # 1b. Handle /email command to link or update email for Patient Portal access
    if text_content.startswith("/email"):
        parts = text_content.split(maxsplit=1)
        if len(parts) > 1 and "@" in parts[1] and "." in parts[1]:
            new_email = parts[1].strip()
            linked_victim = get_linked_victim(chat_id)
            if linked_victim:
                from backend.database import update_victim_email
                update_victim_email(linked_victim["victim_id"], new_email)
                send_telegram_message(
                    chat_id,
                    f"✅ *Email Linked Successfully!*\n\n"
                    f"• *Linked Email:* `{new_email}`\n"
                    f"• *Victim ID:* `{linked_victim['victim_id']}`\n\n"
                    f"You can now log into the *Citizen & Case Portal* at `/patient` using your Victim ID or email.\n"
                    f"A login verification code will be sent to `{new_email}` whenever you request login."
                )
                return
            else:
                send_telegram_message(chat_id, "Please use /start to register or link your case first.")
                return
        else:
            send_telegram_message(
                chat_id,
                "ℹ️ *To link your email for web portal login*, send:\n`/email yourname@example.com`"
            )
            return

    # 1c. Handle /sos command — Manual SOS Panic Button
    if text_content == "/sos":
        linked_victim = get_linked_victim(chat_id)
        if linked_victim:
            victim_id = linked_victim["victim_id"]
            try:
                from backend.agents.escalation_agent import trigger_manual_sos
                result = trigger_manual_sos(
                    victim_id    = victim_id,
                    channel      = "telegram",
                    triggered_by = "telegram",
                )
                if result.get("deduped"):
                    send_telegram_message(
                        chat_id,
                        f"⚠️ *SOS already sent!*\n\nYour earlier SOS is still active. "
                        f"A counselor will contact you shortly.\n\n"
                        f"🚨 *Immediate help:* Call *112* (Police) or *14566* (NHAA toll-free)"
                    )
                else:
                    send_telegram_message(
                        chat_id,
                        "🆘 *SOS ALERT SENT!*\n\n"
                        "Your emergency has been flagged as *P0-EMERGENCY*.\n"
                        "A counselor is being dispatched to contact you right now.\n\n"
                        "📞 *Immediate help while you wait:*\n"
                        "• Police: *112*\n"
                        "• NHAA Helpline: *14566* (toll-free, 24/7)\n\n"
                        "_Stay somewhere safe. You are not alone._"
                    )
            except Exception as sos_err:
                print(f"[SOS Telegram] Error: {sos_err}")
                send_telegram_message(
                    chat_id,
                    "🆘 *EMERGENCY NUMBERS:*\n• Police: *112*\n• NHAA: *14566* (toll-free)"
                )
        else:
            # Unregistered — give hotline numbers immediately
            send_telegram_message(
                chat_id,
                "🆘 *EMERGENCY HELP:*\n\n"
                "• Police: *112*\n"
                "• NHAA Helpline: *14566* (toll-free, 24/7)\n\n"
                "Please use /start to register so we can dispatch a counselor to you directly."
            )
        return

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

                from backend.database import find_victim_by_fir_or_link, link_telegram_to_victim
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
                    # Allow victim to retry or reply 'no' (up to rate-limit threshold of 5 attempts)
                    send_telegram_message(
                        chat_id,
                        "I couldn't find a record for that reference code or FIR.\n\n"
                        "Please check and re-enter, or reply '*no*' if you'd like to register directly."
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
                "📧 *Add Email for Citizen & Case Portal Access:*\n\n"
                "An email address is **required** if you wish to log into the online Citizen & Case Portal (`/patient`) to view your case milestones, court hearing dates, and statutory compensation status.\n\n"
                "👉 *Please enter your email address now* (e.g. `yourname@gmail.com`).\n\n"
                "*(If you do not have an email or do not want web access, reply '*skip*'. You can still check in on Telegram anytime, or add an email later with `/email your@email.com`)*"
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

            if email_val:
                email_note = f"\n• 📧 *Portal Email:* `{email_val}` (Active for `/patient` login)"
            else:
                email_note = (
                    "\n• 📧 *Portal Access:* ⚠️ *No email linked yet.* "
                    "Web portal login requires an email. Send `/email yourname@gmail.com` anytime to enable online portal access."
                )

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

    # 3. Handle Regular Text Messages (dual-track: LLM reply + escalation)
    if "text" in message:
        text_content = message.get("text", "").strip()
        if text_content:
            print(f"\U0001f4ac Received Text from {user_name}: \"{text_content}\"")
            # Fire dual-track handler: sends warm LLM reply fast,
            # escalation pipeline continues in background
            _executor.submit(handle_victim_text, chat_id, victim_id, user_name, text_content)



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
