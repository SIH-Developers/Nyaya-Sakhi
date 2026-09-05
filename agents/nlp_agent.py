import os
import re
from typing import Dict, Any
from core.state import VictimState

# ─────────────────────────────────────────────────────────────────────────────
# Fine-tuned IndicBERTv2 Crisis Classifier
# Model  : Robbiinn/nyaya-sakhi-crisis-indicbert
# Base   : ai4bharat/IndicBERTv2-MLM-only (278M params)
# Langs  : 24 Indian languages + English + Hinglish
# Labels : Routine (0%) | Watch (45%) | Urgent (85%) | Critical (95%)
# F1     : 100% on validation set
# ─────────────────────────────────────────────────────────────────────────────

CRISIS_MODEL_ID = "Robbiinn/nyaya-sakhi-crisis-indicbert"

# Label → fused distress score mapping
CRISIS_SCORE_MAP = {
    "Routine":  0.05,
    "Watch":    0.45,
    "Urgent":   0.85,
    "Critical": 0.95,
}

# Lazy-loaded pipeline (loaded once on first call)
_crisis_pipeline = None

def _get_crisis_pipeline():
    """Load fine-tuned IndicBERTv2 pipeline once and cache it."""
    global _crisis_pipeline
    if _crisis_pipeline is None:
        try:
            from transformers import pipeline
            _crisis_pipeline = pipeline(
                "text-classification",
                model=CRISIS_MODEL_ID,
                tokenizer=CRISIS_MODEL_ID,
                truncation=True,
                max_length=128,
                device=-1,       # CPU inference (free, fast enough for text)
            )
            print(f"✅ IndicBERTv2 crisis classifier loaded: {CRISIS_MODEL_ID}")
        except Exception as e:
            print(f"⚠️  IndicBERTv2 load failed: {e} — using keyword fallback")
            _crisis_pipeline = None
    return _crisis_pipeline


def clean_text(text: str) -> str:
    """Preprocess text: remove PII-like patterns and sanitize."""
    if not text:
        return ""
    cleaned = re.sub(r'\b\d{10}\b', '[PHONE]', text)
    cleaned = re.sub(r'\S+@\S+', '[EMAIL]', cleaned)
    cleaned = re.sub(r'http\S+', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def analyze_text_distress(text: str) -> Dict[str, Any]:
    """
    Analyze victim text using fine-tuned IndicBERTv2 crisis classifier.
    Supports 24 Indian languages + English + Hinglish natively.
    Falls back to keyword heuristics if model unavailable.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return {
            "distress_score": 0.0,
            "top_emotions": [],
            "distress_severity": "none",
            "threat_violence_flag": False,
            "intimidation_flag": False,
            "emergency_help_flag": False,
            "hopelessness_flag": False,
            "self_harm_cues": False,
            "withdrawal_flag": False,
            "analysis_source": "empty_input"
        }

    # ── Primary: Fine-tuned IndicBERTv2 ─────────────────────────────────────
    pipe = _get_crisis_pipeline()
    if pipe is not None:
        try:
            result     = pipe(cleaned[:512])[0]
            label      = result["label"]       # "Routine" / "Watch" / "Urgent" / "Critical"
            confidence = round(result["score"], 3)
            score      = CRISIS_SCORE_MAP.get(label, 0.05)
            severity   = (
                "acute distress" if score >= 0.75 else
                "moderate stress" if score >= 0.45 else
                "routine"
            )
            return {
                "distress_score":       score,
                "top_emotions":         [{"label": label.lower(), "score": confidence}],
                "distress_severity":    severity,
                "threat_violence_flag": label == "Critical",
                "intimidation_flag":    label in ["Urgent", "Critical"],
                "emergency_help_flag":  label in ["Urgent", "Critical"],
                "hopelessness_flag":    label in ["Watch", "Urgent"],
                "self_harm_cues":       label == "Critical" and confidence > 0.90,
                "withdrawal_flag":      label == "Watch",
                "analysis_source":      "indicbertv2_finetuned_24lang",
            }
        except Exception as e:
            print(f"⚠️  IndicBERTv2 inference error: {e} — using keyword fallback")

    # ── Fallback: Keyword heuristics (safety net when model unavailable) ─────
    return _keyword_fallback(cleaned)


def _keyword_fallback(text: str) -> Dict[str, Any]:
    """
    Safety-net keyword heuristic when IndicBERTv2 is unavailable.
    Kept as a last resort — model is always preferred.
    """
    t = text.lower()

    # Critical threats
    critical_kw = [
        "kill me", "try to kill", "attack", "stab", "shoot", "murder",
        "kidnap", "kidnapping", "abduct", "hostage", "bachao", "maar raha",
        "jaan se", "sos", "save me", "help police", "mote marichhu",
        "konnu kalavaan", "maar te chaicche", "kolla pakkuranaa",
        "chompeyyadaaniki", "kidnap kele", "maar rehe"
    ]
    # Urgent threats
    urgent_kw = [
        "following me", "stalking", "chasing", "outside my house",
        "dhamki", "threat", "peecha kar", "ghar ke bahar", "men outside",
        "please help", "in trouble", "unsafe", "emergency"
    ]
    # Watch
    watch_kw = [
        "scared", "terrified", "panic", "afraid", "dar lag", "bhayam",
        "tension", "ghabra", "hopeless", "alone", "nobody cares",
        "neend nahi", "anxiety", "bhiti", "bayam"
    ]

    if any(kw in t for kw in critical_kw):
        score, label = 0.95, "Critical"
    elif any(kw in t for kw in urgent_kw):
        score, label = 0.85, "Urgent"
    elif any(kw in t for kw in watch_kw):
        score, label = 0.45, "Watch"
    else:
        score, label = 0.05, "Routine"

    severity = "acute distress" if score >= 0.75 else ("moderate stress" if score >= 0.45 else "routine")

    return {
        "distress_score":       score,
        "top_emotions":         [{"label": label.lower(), "score": 0.85}],
        "distress_severity":    severity,
        "threat_violence_flag": label == "Critical",
        "intimidation_flag":    label in ["Urgent", "Critical"],
        "emergency_help_flag":  label in ["Urgent", "Critical"],
        "hopelessness_flag":    label in ["Watch", "Urgent"],
        "self_harm_cues":       label == "Critical",
        "withdrawal_flag":      label == "Watch",
        "analysis_source":      "keyword_fallback",
    }


def nlp_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: NLP / Text Distress Analysis Agent."""
    message = state.get("message_text", "")
    results = analyze_text_distress(message)
    return {"nlp_results": results}
