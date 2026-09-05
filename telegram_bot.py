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

def ensure_victim_registered(chat_id: int, user_name: str) -> str:
    """Ensure real Telegram user has an active victim profile in the database."""
    victim_id = f"VIC-TG-{chat_id}"
    try:
        from database import get_victim_details, get_connection
        from datetime import datetime
        if get_victim_details(victim_id):
            return victim_id
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR IGNORE INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            compensation_status, consent_flag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            victim_id, user_name, "Scheduled Caste",
            f"FIR-2026/TG-{str(chat_id)[-4:]}", "Central Kotwali PS",
            "New Delhi / NCR", "Delhi", "Trial", "Granted", 1, "Pending",
            datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()
        print(f"👤 Auto-registered real user directly in DB: {user_name} ({victim_id})")
        return victim_id
    except Exception as e:
        print(f"Direct DB registration fallback: {e}")

    try:
        # Fallback via HTTP API
        check_res = call_api("get", f"victim/{victim_id}", timeout=5)
        if check_res.status_code == 200:
            return victim_id
        
        payload = {
            "victim_id": victim_id,
            "name": user_name,
            "caste_category": "Scheduled Caste",
            "fir_number": f"FIR-2026/TG-{str(chat_id)[-4:]}",
            "police_station": "Central Kotwali PS",
            "district": "New Delhi / NCR",
            "state": "Delhi",
            "case_stage": "Trial",
            "accused_bail_status": "Granted",
            "threat_reported": True,
            "compensation_status": "Pending"
        }
        res = call_api("post", "victims", json=payload, timeout=5)
        if res.status_code in [200, 201]:
            print(f"👤 Auto-registered user via API: {user_name} ({victim_id})")
    except Exception as e:
        print(f"API registration notice: {e}")
    return victim_id

def process_telegram_update(update: dict):
    """Route text or voice note into FastAPI & LangGraph."""
    message = update.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from", {})
    first_name = from_user.get("first_name", "")
    last_name = from_user.get("last_name", "")
    user_name = f"{first_name} {last_name}".strip() or "Telegram User"
    
    if not chat_id:
        return

    # Auto-register this real Telegram user in the system
    victim_id = ensure_victim_registered(chat_id, user_name)

    # 1. Handle /start command
    if message.get("text") == "/start":
        welcome_msg = (
            f"🙏 *Namaste {user_name}!*\n\n"
            f"You are officially registered in the *MoSJE & NHAA 14566 Atrocity Support System*.\n"
            f"• *Victim ID:* `{victim_id}`\n"
            f"• *Status:* Protected under SC/ST (PoA) Act, 1989 & DPDP Act 2023\n\n"
            "• 💬 *Text Check-in:* Send any message sharing how you are coping with your case.\n"
            "• 🎙️ *Voice Check-in:* Hold the microphone button on Telegram to send a live voice message.\n\n"
            "_Our Multi-Agent AI will analyze your voice stress & emotional cues in real time._"
        )
        send_telegram_message(chat_id, welcome_msg)
        return

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

            reply = (
                f"📊 *Distress Score:* `{score_pct}%` | *Status:* *{risk_tier}*\n\n"
                f"🔍 *Multi-Agent Analysis:*\n"
            )
            for r in reasons[:3]:
                reply += f"• {r}\n"

            if res.get("escalation_triggered"):
                reply += "\n🚨 *Alert logged on Counselor Dashboard for proactive follow-up.*"

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
