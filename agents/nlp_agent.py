import os
import re
from typing import Dict, Any, List
from huggingface_hub import InferenceClient
from config import HF_TOKEN, HF_MODELS
from core.state import VictimState

# Initialize Hugging Face Inference Client
hf_client = InferenceClient(token=HF_TOKEN) if HF_TOKEN else None

# Distress, Threat, and Hopelessness Lexicon for Multimodal Distress Prediction
DISTRESS_KEYWORDS = {
    "acute_threat_violence": [
        "kill me", "kill us", "try to kill", "attack", "stab", "shoot", "gun",
        "weapon", "murder", "hurt me", "beat", "hit me", "marne", "jaan se", "hathiyar",
        "throat", "strangle", "threaten to kill", "destroy me", "burn my",
        "kidnap", "kidnapping", "abduct", "abduction", "hostage", "bandi bana", "mar dala", "assault"
    ],
    "stalking_intimidation": [
        "following me", "stalking", "chasing", "outside my house", "threat",
        "threatening", "warned me", "dhamki", "chase", "men outside", "force me", "surrounding",
        "picha kar", "ghar ke bahar", "gunde"
    ],
    "emergency_help": [
        "please help", "save me", "in trouble", "help me", "sos", "bachao", "madad", "emergency", "police", "call police"
    ],
    "hopelessness": [
        "no point", "hopeless", "give up", "can't do this", "nothing matters",
        "lost all hope", "no future", "pointless"
    ],
    "self_harm": [
        "end it", "better off dead", "kill myself", "die", "hurt myself", "disappear", "sleep forever"
    ],
    "fear_anxiety": [
        "scared", "terrified", "panic", "unsafe", "threatened", "shaking", "danger", "afraid", "dar lag"
    ],
    "withdrawal": [
        "alone", "leave me alone", "nobody cares", "quiet", "stop checking", "isolated", "empty"
    ]
}

def clean_text(text: str) -> str:
    """Preprocess text: remove PII-like patterns and sanitize."""
    if not text:
        return ""
    # Mask phone numbers
    cleaned = re.sub(r'\b\d{10}\b', '[PHONE]', text)
    # Mask email addresses
    cleaned = re.sub(r'\S+@\S+', '[EMAIL]', cleaned)
    # Standardize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def fallback_text_analysis(text: str) -> Dict[str, Any]:
    """Rule-based clinical sentiment and distress fallback."""
    text_lower = text.lower()
    
    threat_violence_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["acute_threat_violence"])
    intimidation_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["stalking_intimidation"])
    emergency_help_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["emergency_help"])
    self_harm_cues = any(kw in text_lower for kw in DISTRESS_KEYWORDS["self_harm"])
    hopelessness_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["hopelessness"])
    fear_cues = any(kw in text_lower for kw in DISTRESS_KEYWORDS["fear_anxiety"])
    withdrawal_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["withdrawal"])
    
    # Calculate heuristic score
    distress_score = 0.05
    top_emotions = [{"label": "neutral", "score": 0.85}]
    
    if self_harm_cues or threat_violence_flag:
        distress_score = 0.95
        top_emotions = [{"label": "fear", "score": 0.95}, {"label": "despair", "score": 0.90}]
    elif intimidation_flag:
        distress_score = 0.85
        top_emotions = [{"label": "fear", "score": 0.88}, {"label": "nervousness", "score": 0.80}]
    elif emergency_help_flag:
        distress_score = 0.75
        top_emotions = [{"label": "fear", "score": 0.80}, {"label": "sadness", "score": 0.70}]
    elif hopelessness_flag:
        distress_score = 0.75
        top_emotions = [{"label": "sadness", "score": 0.82}, {"label": "grief", "score": 0.70}]
    elif fear_cues:
        distress_score = 0.65
        top_emotions = [{"label": "fear", "score": 0.80}, {"label": "nervousness", "score": 0.75}]
    elif withdrawal_flag:
        distress_score = 0.55
        top_emotions = [{"label": "sadness", "score": 0.60}]
        
    return {
        "distress_score": round(distress_score, 3),
        "top_emotions": top_emotions,
        "distress_severity": "acute distress" if distress_score >= 0.75 else ("moderate stress" if distress_score >= 0.45 else "routine"),
        "threat_violence_flag": threat_violence_flag,
        "intimidation_flag": intimidation_flag,
        "emergency_help_flag": emergency_help_flag,
        "hopelessness_flag": hopelessness_flag,
        "self_harm_cues": self_harm_cues,
        "withdrawal_flag": withdrawal_flag,
        "analysis_source": "rule_heuristic_fallback"
    }

def analyze_text_distress(text: str) -> Dict[str, Any]:
    """Analyze victim text message using Hugging Face models with safety overrides."""
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
    
    text_lower = cleaned.lower()
    threat_violence_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["acute_threat_violence"])
    intimidation_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["stalking_intimidation"])
    emergency_help_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["emergency_help"])
    self_harm_cues = any(kw in text_lower for kw in DISTRESS_KEYWORDS["self_harm"])
    hopelessness_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["hopelessness"])
    fear_cues = any(kw in text_lower for kw in DISTRESS_KEYWORDS["fear_anxiety"])
    withdrawal_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["withdrawal"])

    # Try Hugging Face Serverless Inference if available
    if hf_client:
        try:
            # 1. Multi-emotion classification via GoEmotions
            hf_res = hf_client.text_classification(
                text=cleaned,
                model=HF_MODELS["emotion_classifier"]
            )
            top_emotions = [{"label": r["label"], "score": round(r["score"], 3)} for r in hf_res[:3]]
            
            # Map high-risk emotions to distress score
            high_distress_emotions = {"sadness", "grief", "fear", "nervousness", "disappointment", "anger", "remorse"}
            distress_emotions_score = sum(r["score"] for r in hf_res if r["label"] in high_distress_emotions)
            
            # Compute composite distress score with safety floor overrides
            base_score = min(1.0, distress_emotions_score)
            if self_harm_cues or threat_violence_flag:
                base_score = max(base_score, 0.95)
            elif intimidation_flag:
                base_score = max(base_score, 0.85)
            elif emergency_help_flag:
                base_score = max(base_score, 0.75)
            elif hopelessness_flag:
                base_score = max(base_score, 0.80)
            elif fear_cues:
                base_score = max(base_score, 0.65)
            
            severity = "acute distress" if base_score >= 0.75 else ("moderate stress" if base_score >= 0.45 else "routine")
            
            return {
                "distress_score": round(base_score, 3),
                "top_emotions": top_emotions,
                "distress_severity": severity,
                "threat_violence_flag": threat_violence_flag,
                "intimidation_flag": intimidation_flag,
                "emergency_help_flag": emergency_help_flag,
                "hopelessness_flag": hopelessness_flag,
                "self_harm_cues": self_harm_cues,
                "withdrawal_flag": withdrawal_flag,
                "analysis_source": "huggingface_api"
            }
        except Exception:
            return fallback_text_analysis(cleaned)
    else:
        return fallback_text_analysis(cleaned)

def nlp_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: NLP / Text Distress Analysis Agent."""
    message = state.get("message_text", "")
    results = analyze_text_distress(message)
    return {"nlp_results": results}
