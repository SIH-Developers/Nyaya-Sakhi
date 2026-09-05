import os
import re
import requests
from typing import Dict, Any
from dotenv import load_dotenv
from pathlib import Path
from core.state import VictimState

load_dotenv(Path(__file__).parent.parent / ".env")

INDICBERT_API_URL = os.getenv("INDICBERT_API_URL", "").strip()

SCORE_MAP = {
    "Routine":  0.05,
    "Watch":    0.45,
    "Urgent":   0.85,
    "Critical": 0.95,
}

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

    # Query fine-tuned IndicBERTv2 neural inference service
    if INDICBERT_API_URL:
        try:
            r = requests.post(INDICBERT_API_URL, json={"text": cleaned}, timeout=8)
            if r.status_code == 200:
                data = r.json()
                if "distress_score" in data and "distress_severity" in data:
                    return data
                
                label = data.get("label", "Routine")
                score = data.get("distress_score", SCORE_MAP.get(label, 0.05))
                confidence = data.get("confidence", 0.95)
                
                return {
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

    # Standby if inference service unreachable
    return {
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


def nlp_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: NLP / Text Distress Analysis Agent."""
    message = state.get("message_text", "")
    results = analyze_text_distress(message)
    return {"nlp_results": results}
