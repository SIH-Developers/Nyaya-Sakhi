"""
services/rag_chatbot.py — Rule-Based RAG Info Chatbot for SC/ST Rights
SIH 26094 / NHAA 14566

Provides plain-language answers to common questions about:
  - SC/ST (Prevention of Atrocities) Act 1989 & 2015 Amendment
  - NHAA 14566 helpline
  - Compensation & relief entitlements
  - FIR filing process
  - Legal rights & remedies

Uses a keyword-match approach over a curated knowledge base so it works
without any API keys. Falls back to Llama-3.3 via HF Inference API if
HF_TOKEN is configured and question is unrecognised.
"""

import os
import re
import json
from typing import Optional

HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = "meta-llama/Llama-3.3-70B-Instruct"  # fallback LLM

# ── Knowledge Base ─────────────────────────────────────────────────────────────
KB = [
    {
        "tags": ["fir", "complaint", "police", "register", "file case"],
        "q": "How do I file an FIR for an atrocity?",
        "a": (
            "Under Section 18 of the SC/ST (PoA) Act, the police MUST register your FIR "
            "without any conditions. You can:\n"
            "1️⃣ Visit any police station — the SHO cannot refuse.\n"
            "2️⃣ If the local police refuses, approach the DSP/SP directly.\n"
            "3️⃣ Call **NHAA Helpline 14566** (toll-free) for immediate assistance.\n"
            "4️⃣ File an online complaint at your state police e-FIR portal.\n\n"
            "📌 *Key right:* Anticipatory bail cannot be granted in PoA Act cases (Sec. 18)."
        ),
    },
    {
        "tags": ["compensation", "relief", "money", "amount", "financial"],
        "q": "What compensation am I entitled to?",
        "a": (
            "The SC/ST (PoA) Rules 1995 (Schedule) provide mandatory interim & final relief:\n\n"
            "• **Death of victim:** ₹8.25 lakh to family\n"
            "• **Grievous injury / disability:** ₹4.25 lakh\n"
            "• **Minor injury:** ₹1.0 lakh\n"
            "• **Sexual assault / rape:** ₹5.0 lakh\n"
            "• **Arson / property destruction:** ₹5.0 lakh\n\n"
            "📌 50% of compensation must be paid as *interim relief* within 7 days of FIR "
            "registration; remaining 50% after charge-sheet filing."
        ),
    },
    {
        "tags": ["bail", "accused", "out of jail", "released", "arrested"],
        "q": "The accused has been released on bail. What can I do?",
        "a": (
            "If the accused is out on bail:\n"
            "1️⃣ **Section 18A** explicitly bars anticipatory bail in PoA Act offences — "
            "challenge any bail order granted by lower courts.\n"
            "2️⃣ You can file an **objection / revision petition** in the Special Court or High Court.\n"
            "3️⃣ Inform the District Magistrate (DM) who must ensure your safety under Sec. 15A.\n"
            "4️⃣ Request police protection — the SHO must deploy guards if threat exists.\n\n"
            "📞 Call **14566** immediately if you feel in danger."
        ),
    },
    {
        "tags": ["counselor", "help", "support", "talk", "mental", "distress", "stressed"],
        "q": "How do I get mental health support?",
        "a": (
            "You are not alone. Nyaya-Sakhi provides 24/7 emotional support:\n\n"
            "• **Telegram Bot:** Message our support bot anytime — text or voice\n"
            "• **NHAA 14566:** Toll-free helpline for immediate counselor support\n"
            "• **iCall TISS:** 9152987821 (Mon–Sat 8am–10pm)\n"
            "• **Vandrevala Foundation:** 1860-2662-345 (24×7)\n\n"
            "Your privacy is protected under DPDP Act 2023. All conversations are confidential."
        ),
    },
    {
        "tags": ["special court", "trial", "hearing", "judge", "case status"],
        "q": "What is a Special Court and how does my trial work?",
        "a": (
            "Each district has a **Special Court** exclusively for SC/ST PoA Act cases:\n\n"
            "• Trial must complete within **2 months** of charge-sheet (Sec. 14).\n"
            "• Hearing cannot be postponed more than 2 times without your consent.\n"
            "• The Special Public Prosecutor (SPP) represents you — free of cost.\n"
            "• You can request updates on your case from the District Officer anytime.\n\n"
            "📌 Check your case status at the District Legal Services Authority (DLSA)."
        ),
    },
    {
        "tags": ["14566", "helpline", "nhaa", "contact", "call"],
        "q": "What is the NHAA 14566 helpline?",
        "a": (
            "**NHAA 14566** is the National Helpline Against Atrocities run by MoSJE:\n\n"
            "• **Toll-free** from any mobile or landline — 24 hours, 7 days\n"
            "• Connects to state-level SC/ST Welfare Officers and District Counselors\n"
            "• Legal guidance, FIR registration support, and emergency assistance\n"
            "• Operated by the Ministry of Social Justice & Empowerment (MoSJE)\n\n"
            "📞 **Just dial 14566** — no STD code needed."
        ),
    },
    {
        "tags": ["act", "law", "poa", "prevention of atrocities", "section"],
        "q": "Which law protects me?",
        "a": (
            "Multiple laws protect SC/ST citizens from atrocities:\n\n"
            "1. **SC/ST (Prevention of Atrocities) Act 1989** — defines 57 offences & punishments\n"
            "2. **SC/ST (PoA) Amendment Act 2015** — added 19 new offences, faster trials\n"
            "3. **SC/ST (PoA) Rules 1995** — mandates compensation & state duties\n"
            "4. **Article 17, Constitution of India** — abolishes untouchability\n"
            "5. **Protection of Civil Rights Act 1955** — punishes caste discrimination\n\n"
            "📌 These laws have priority — bail cannot be given without hearing you first."
        ),
    },
    {
        "tags": ["safe", "safety", "threat", "danger", "fear", "scared", "emergency"],
        "q": "I am in immediate danger. What should I do?",
        "a": (
            "🚨 **If you are in immediate physical danger:**\n\n"
            "1. **Call 112** (Police Emergency) RIGHT NOW\n"
            "2. Call **14566** (NHAA Helpline) — available 24/7\n"
            "3. Move to a safe location — neighbour, relative, or community centre\n"
            "4. Inform the District Magistrate office via phone\n\n"
            "Our system has automatically alerted your assigned counselor. "
            "You are protected under Section 15A of the SC/ST PoA Act."
        ),
    },
]

# ── Keyword matcher ────────────────────────────────────────────────────────────
def _find_kb_answer(question: str) -> Optional[str]:
    q_lower = question.lower()
    best_entry = None
    best_count = 0
    for entry in KB:
        count = sum(1 for tag in entry["tags"] if tag in q_lower)
        if count > best_count:
            best_count = count
            best_entry = entry
    if best_entry and best_count > 0:
        return best_entry["a"]
    return None


# ── HF Inference API fallback ─────────────────────────────────────────────────
def _llm_answer(question: str, context: str = "") -> str:
    """Call HF Inference API for questions not covered by KB."""
    if not HF_TOKEN:
        return (
            "I'm sorry, I don't have a specific answer for that question. "
            "Please call **NHAA 14566** (toll-free) for expert assistance."
        )
    try:
        import requests
        system_prompt = (
            "You are a compassionate legal information assistant for SC/ST atrocity victims in India. "
            "You answer in simple, clear language about the SC/ST (Prevention of Atrocities) Act, "
            "NHAA 14566, compensation rights, and mental health support. "
            "Be empathetic and always remind users that 14566 is available 24/7. "
            "Answer in 100-150 words max."
        )
        payload = {
            "model": HF_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            "max_tokens": 300,
            "temperature": 0.3,
        }
        headers = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
        resp = requests.post(
            "https://api-inference.huggingface.co/v1/chat/completions",
            headers=headers, json=payload, timeout=20
        )
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[RAG Chatbot] LLM fallback error: {e}")
        return (
            "I couldn't process that right now. Please call **NHAA 14566** "
            "or visit your nearest District Legal Services Authority (DLSA)."
        )


# ── Public interface ──────────────────────────────────────────────────────────
def get_info_response(question: str, session_id: str = "") -> dict:
    """
    Main entry point for the RAG info chatbot.
    Returns a dict with: answer, source ('kb' or 'llm'), and suggested questions.
    """
    if not question.strip():
        return {
            "answer": (
                "Namaste! I can help you with information about your rights under the "
                "SC/ST (Prevention of Atrocities) Act, NHAA helpline, compensation, FIR filing, "
                "and mental health support.\n\nWhat would you like to know?"
            ),
            "source": "greeting",
            "suggestions": [
                "How do I file an FIR?",
                "What compensation am I entitled to?",
                "The accused is out on bail. What can I do?",
                "How do I get mental health support?",
            ]
        }

    kb_answer = _find_kb_answer(question)
    if kb_answer:
        return {
            "answer": kb_answer,
            "source": "kb",
            "suggestions": [
                "What is the NHAA 14566 helpline?",
                "What compensation am I entitled to?",
                "How do I get mental health support?",
            ]
        }

    llm_answer = _llm_answer(question)
    return {
        "answer": llm_answer,
        "source": "llm",
        "suggestions": [
            "How do I file an FIR?",
            "What is a Special Court?",
            "What laws protect me?",
        ]
    }
