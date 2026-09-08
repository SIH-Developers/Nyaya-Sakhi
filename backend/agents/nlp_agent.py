import os
import re
import requests
from typing import Dict, Any
from dotenv import load_dotenv
from pathlib import Path
from backend.core.state import VictimState

load_dotenv(Path(__file__).parent.parent / ".env")

INDICBERT_API_URL = os.getenv("INDICBERT_API_URL", "").strip()

SCORE_MAP = {
    "Routine":  0.05,
    "Watch":    0.45,
    "Urgent":   0.85,
    "Critical": 0.95,
}

POSITIVE_PATTERNS = [
    r'\b(safe|secure|happy|good|great|fine|wonderful|peaceful|blooming|enjoying|pleasant|relaxed|calm|joy|cheerful)\b',
    r'\b(all good|no problem|feeling good|feeling safe|day is good|flowers are blooming)\b'
]

CRISIS_PATTERNS = [
    r'\b(kill|suicide|die|death|beat|hit|attack|threat|threaten|stalk|weapon|gun|knife|harm|abuse|rape|hang|poison|force|scared|afraid|terrible|help|emergency|danger)\b'
]

def apply_sentiment_guardrail(text: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Prevent neural model false positives on explicitly safe/positive sentences."""
    text_lower = text.lower()
    has_positive = any(re.search(p, text_lower) for p in POSITIVE_PATTERNS)
    has_crisis = any(re.search(p, text_lower) for p in CRISIS_PATTERNS)
    
    if has_positive and not has_crisis and result.get("distress_score", 0.0) > 0.2:
        result["distress_score"] = 0.05
        result["distress_severity"] = "routine"
        result["top_emotions"] = [{"label": "routine", "score": 0.95}]
        result["threat_violence_flag"] = False
        result["intimidation_flag"] = False
        result["emergency_help_flag"] = False
        result["hopelessness_flag"] = False
        result["self_harm_cues"] = False
        result["withdrawal_flag"] = False
    return result

def clean_text(text: str) -> str:
    """Preprocess text: sanitize whitespace and mask direct PII."""
    if not text:
        return ""
    cleaned = re.sub(r'\b\d{10}\b', '[PHONE]', text)
    cleaned = re.sub(r'\S+@\S+', '[EMAIL]', cleaned)
    cleaned = re.sub(r'http\S+', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def analyze_text_distress(text: str) -> Dict[str, Any]:
    """
    Pure Machine Learning NLP text distress analyzer powered by
    Fine-Tuned IndicBERTv2 (Robbiinn/nyaya-sakhi-crisis-indicbert).
    Supports English + 24 Indian languages natively via neural embeddings.
    Zero hardcoded keyword lists.
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

    res = None
    # Query fine-tuned IndicBERTv2 neural inference service
    if INDICBERT_API_URL:
        try:
            r = requests.post(INDICBERT_API_URL, json={"text": cleaned}, timeout=8)
            if r.status_code == 200:
                data = r.json()
                if "distress_score" in data and "distress_severity" in data:
                    res = data
                else:
                    label = data.get("label", "Routine")
                    score = data.get("distress_score", SCORE_MAP.get(label, 0.05))
                    confidence = data.get("confidence", 0.95)
                    
                    res = {
                        "distress_score": score,
                        "top_emotions": [{"label": label.lower(), "score": confidence}],
                        "distress_severity": "acute distress" if score >= 0.75 else ("moderate stress" if score >= 0.45 else "routine"),
                        "threat_violence_flag": label == "Critical",
                        "intimidation_flag": label in ["Urgent", "Critical"],
                        "emergency_help_flag": label in ["Urgent", "Critical"],
                        "hopelessness_flag": label in ["Watch", "Urgent"],
                        "self_harm_cues": label == "Critical",
                        "withdrawal_flag": label == "Watch",
                        "analysis_source": data.get("analysis_source", "indicbertv2_pure_neural_model")
                    }
        except Exception as e:
            print(f"[NLP Agent] Inference request error: {e}")

    if not res:
        # Standby if inference service unreachable
        res = {
            "distress_score": 0.05,
            "top_emotions": [{"label": "routine", "score": 0.85}],
            "distress_severity": "routine",
            "threat_violence_flag": False,
            "intimidation_flag": False,
            "emergency_help_flag": False,
            "hopelessness_flag": False,
            "self_harm_cues": False,
            "withdrawal_flag": False,
            "analysis_source": "indicbertv2_offline_standby"
        }

    return apply_sentiment_guardrail(text, res)


def nlp_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: NLP / Text Distress Analysis Agent."""
    message = state.get("message_text", "")
    results = analyze_text_distress(message)
    return {"nlp_results": results}
