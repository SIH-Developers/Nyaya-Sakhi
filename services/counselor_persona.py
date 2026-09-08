"""
services/counselor_persona.py
LLM-powered warm companion reply generator for the NHAA 14566 Telegram bot.

Uses Groq's free-tier API (OpenAI-compatible) with llama-3.1-8b-instant for
low-latency, natural conversational replies.  The distress pipeline runs
concurrently -- this module only shapes the *tone* of the reply based on a
fast NLP score, never leaking clinical / scoring language to the victim.
"""
from __future__ import annotations

import os
import random
import logging
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

logger = logging.getLogger("counselor_persona")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# Use the fastest available model on this Groq account tier.
# qwen3.6-27b is available and fast; fall back to gpt-oss-20b as secondary.
GROQ_MODEL   = os.getenv("GROQ_MODEL", "qwen/qwen3.6-27b")
# Fallback model order if primary is unavailable on this account
_MODEL_FALLBACKS = [
    GROQ_MODEL,
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "groq/compound-mini",
]

# ── Fallback warm replies (used when Groq is unavailable / rate-limited) -------
_FALLBACK_REPLIES = [
    "I'm here with you. Can you tell me more about what's going on?",
    "I hear you. Please don't hesitate to share — I'm listening.",
    "Thank you for reaching out. How are you feeling right now?",
    "You're not alone in this. Would you like to tell me more?",
    "I'm glad you messaged. Take your time — I'm here whenever you're ready.",
    "That sounds really difficult. I'm here to listen — please go on.",
    "Your feelings matter. I'm listening, and I won't rush you.",
]

# ── Tone instructions per distress tier ----------------------------------------
_TONE_MAP = {
    "routine": (
        "Normal warm, friendly check-in tone. Be encouraging and genuinely "
        "curious about how they are doing."
    ),
    "watch": (
        "Slightly more attentive and gentle tone. Gently ask how they are "
        "coping, notice if they seem stressed, but do not alarm them."
    ),
    "counselor outreach": (
        "Caring and concerned tone. Acknowledge that things might feel hard "
        "right now. Gently ask if they would like to speak with a real human "
        "counselor."
    ),
    "urgent": (
        "Grounding and calming tone. Acknowledge their fear or distress "
        "directly. Ask if they are safe right now. Naturally weave in the "
        "emergency helpline numbers (112 for Police / 14566 for NHAA Support) "
        "— keep it brief, steady, and human, not clinical."
    ),
    "critical": (
        "Grounding and calming tone. Acknowledge their fear or distress "
        "directly. Ask if they are safe right now. Naturally weave in the "
        "emergency helpline numbers (112 for Police / 14566 for NHAA Support) "
        "— keep it brief, steady, and human, not clinical."
    ),
}

def _tone_for(tier: str) -> str:
    return _TONE_MAP.get(tier.lower(), _TONE_MAP["routine"])


def _build_system_prompt(distress_context: dict) -> str:
    tier             = distress_context.get("current_tier", "routine")
    tone_instruction = _tone_for(tier)

    # Optional natural case-context hint (never exposes internal tier/score)
    milestone_hint = ""
    if distress_context.get("case_stage"):
        milestone_hint = (
            f"\nThis person's case is currently at: {distress_context['case_stage']}. "
            "Reference this only if naturally relevant — do not force it."
        )
    if distress_context.get("fir_number"):
        milestone_hint += " They have a registered case reference on file."

    return (
        "You are a warm, patient, supportive companion for someone who has experienced "
        "a serious social atrocity and is going through the legal process under India's "
        "SC/ST (Prevention of Atrocities) Act. You work as part of the NHAA 14566 "
        "support system.\n\n"
        "Your role:\n"
        "- Listen with genuine empathy and respond the way a caring, calm human would "
        "in a text conversation.\n"
        "- Keep replies short and natural (2-4 sentences), like real texting — not a "
        "formal document.\n"
        "- Reference what they have told you before when relevant, so the conversation "
        "feels continuous and personal.\n"
        "- Naturally and periodically (not every message) remind them that a real human "
        "counselor is always available and that this conversation supplements, not "
        "replaces, that support.\n"
        "- Write in a tone that feels warm and Indian — you can use 'Namaste' "
        "occasionally and acknowledge their emotional strength.\n\n"
        "You must NEVER:\n"
        "- Claim to be a licensed therapist, counselor, or medical professional.\n"
        "- Attempt to diagnose any mental health condition.\n"
        "- Give specific legal advice about their case (redirect to their case officer "
        "or lawyer for that).\n"
        "- Discourage them, even subtly, from seeking real human help or contacting "
        "authorities.\n"
        "- Ask for, reference, or hint at any internal scoring, risk level, monitoring "
        "system, or clinical assessment — the person must never know they are being "
        "monitored or scored.\n"
        "- Use words like: risk tier, escalation, distress score, alert, flagged, "
        "assessment, clinical.\n\n"
        f"Current conversation tone should be: {tone_instruction}"
        f"{milestone_hint}"
    )


# ── Rate-limit / fallback tracking (in-memory, for demo-day monitoring) --------
_fallback_log: List[Dict[str, Any]] = []

def _log_fallback(victim_id: str, reason: str):
    entry = {"ts": datetime.now().isoformat(), "victim_id": victim_id, "reason": reason}
    _fallback_log.append(entry)
    logger.warning("[CounselorPersona] Groq fallback — victim=%s reason=%s", victim_id, reason)
    # Keep last 200 entries
    if len(_fallback_log) > 200:
        _fallback_log.pop(0)

def get_fallback_log() -> List[Dict[str, Any]]:
    """Return recent fallback events for dashboard / monitoring."""
    return list(_fallback_log)


# ── Blocked clinical phrases — stripped to prevent leakage ---------------------
_BLOCKED_PHRASES = [
    "risk tier", "risk score", "distress score", "escalation",
    "flagged", "clinical assessment", "monitoring system",
    "i am a licensed", "i'm a licensed",
    "i am a therapist", "i'm a therapist",
    "i am a counselor", "i'm a counselor",
    "i am a professional", "i'm a professional",
]


# ── Core generation function ---------------------------------------------------
def generate_counselor_reply(
    victim_id: str,
    message: str,
    conversation_history: List[Dict[str, str]],
    distress_context: Dict[str, Any],
) -> str:
    """
    Generate a warm, LLM-powered conversational reply via Groq.

    Args:
        victim_id:             Victim's internal ID (logging only — never sent to LLM).
        message:               The incoming message text.
        conversation_history:  List of {"role": "user"/"assistant", "content": "..."}.
                               Pass the last 5-10 exchanges for natural continuity.
        distress_context:      Dict with keys:
                                 current_tier  -- "routine"/"watch"/"urgent"/"critical"
                                 case_stage    -- optional string
                                 fir_number    -- optional string

    Returns:
        A natural, warm reply string. Falls back gracefully on any Groq error.
    """
    if not GROQ_API_KEY:
        _log_fallback(victim_id, "GROQ_API_KEY_not_configured")
        return random.choice(_FALLBACK_REPLIES)

    import requests

    system_prompt = _build_system_prompt(distress_context)

    # Build messages: system + last 10 history turns + new user message
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history[-10:])
    messages.append({"role": "user", "content": message})

    payload = {
        "model":       GROQ_MODEL,       # overridden per attempt below
        "messages":    messages,
        "max_tokens":  180,
        "temperature": 0.75,
        "top_p":       0.9,
        "stream":      False,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }

    # Try each model in fallback order until one works
    for model in _MODEL_FALLBACKS:
        try:
            payload["model"] = model
            resp = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=8)

            if resp.status_code == 404:
                # This model not available on account -- try next
                continue

            if resp.status_code == 429:
                _log_fallback(victim_id, f"rate_limited_429 model={model}")
                return random.choice(_FALLBACK_REPLIES)

            if resp.status_code != 200:
                _log_fallback(victim_id, f"http_{resp.status_code} model={model}")
                return random.choice(_FALLBACK_REPLIES)

            reply = resp.json()["choices"][0]["message"]["content"].strip()

            # Post-generation safety filter -- catch any accidental leakage
            for phrase in _BLOCKED_PHRASES:
                if phrase.lower() in reply.lower():
                    _log_fallback(victim_id, f"safety_filter:{phrase}")
                    return random.choice(_FALLBACK_REPLIES)

            return reply

        except requests.Timeout:
            _log_fallback(victim_id, f"timeout_8s model={model}")
            return random.choice(_FALLBACK_REPLIES)
        except Exception as exc:
            _log_fallback(victim_id, f"exception:{type(exc).__name__} model={model}")
            return random.choice(_FALLBACK_REPLIES)

    # All models exhausted
    _log_fallback(victim_id, "all_models_exhausted")
    return random.choice(_FALLBACK_REPLIES)


# ── Self-test ------------------------------------------------------------------
if __name__ == "__main__":
    tests = [
        ("routine",  "I am managing okay. Court date is next week."),
        ("watch",    "I am feeling a little scared about going to court."),
        ("urgent",   "Someone threatened me last night."),
        ("critical", "I feel very hopeless and don't know what to do."),
    ]
    for tier, msg in tests:
        ctx = {"current_tier": tier, "case_stage": "Trial Pending", "fir_number": "FIR/2024/001"}
        print(f"\n[{tier.upper()}] User: {msg}")
        reply = generate_counselor_reply("VIC-TEST-001", msg, [], ctx)
        print(f"Bot: {reply}")
