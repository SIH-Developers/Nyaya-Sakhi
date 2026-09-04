import os
import re
from typing import Dict, Any, List
from huggingface_hub import InferenceClient
from config import HF_TOKEN, HF_MODELS
from core.state import VictimState

# Initialize Hugging Face Inference Client
hf_client = InferenceClient(token=HF_TOKEN) if HF_TOKEN else None

# Distress and Hopelessness Lexicon for Fallback / Augmentation
DISTRESS_KEYWORDS = {
    "hopelessness": ["no point", "hopeless", "give up", "can't do this", "nothing matters", "lost all hope", "no future", "pointless"],
    "self_harm": ["end it", "better off dead", "kill myself", "die", "hurt myself", "disappear", "sleep forever"],
    "fear_anxiety": ["scared", "terrified", "panic", "unsafe", "threatened", "shaking", "stalking", "danger", "afraid"],
    "withdrawal": ["alone", "leave me alone", "nobody cares", "quiet", "stop checking", "isolated", "empty"]
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
    
    hopelessness_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["hopelessness"])
    self_harm_cues = any(kw in text_lower for kw in DISTRESS_KEYWORDS["self_harm"])
    fear_cues = any(kw in text_lower for kw in DISTRESS_KEYWORDS["fear_anxiety"])
    withdrawal_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["withdrawal"])
    
    # Calculate heuristic score
    distress_score = 0.1
    top_emotions = [{"label": "neutral", "score": 0.5}]
    
    if self_harm_cues:
        distress_score = max(distress_score, 0.95)
        top_emotions = [{"label": "despair", "score": 0.95}, {"label": "fear", "score": 0.85}]
    elif hopelessness_flag:
        distress_score = max(distress_score, 0.75)
        top_emotions = [{"label": "sadness", "score": 0.82}, {"label": "grief", "score": 0.70}]
    elif fear_cues:
        distress_score = max(distress_score, 0.65)
        top_emotions = [{"label": "fear", "score": 0.80}, {"label": "nervousness", "score": 0.75}]
    elif withdrawal_flag:
        distress_score = max(distress_score, 0.55)
        top_emotions = [{"label": "sadness", "score": 0.60}]
        
    return {
        "distress_score": round(distress_score, 3),
        "top_emotions": top_emotions,
        "distress_severity": "acute distress" if distress_score > 0.7 else ("moderate stress" if distress_score > 0.4 else "routine"),
        "hopelessness_flag": hopelessness_flag,
        "self_harm_cues": self_harm_cues,
        "withdrawal_flag": withdrawal_flag,
        "analysis_source": "rule_heuristic_fallback"
    }

def analyze_text_distress(text: str) -> Dict[str, Any]:
    """Analyze victim text message using Hugging Face models with fallback."""
    cleaned = clean_text(text)
    if not cleaned:
        return {
            "distress_score": 0.0,
            "top_emotions": [],
            "distress_severity": "none",
            "hopelessness_flag": False,
            "self_harm_cues": False,
            "withdrawal_flag": False,
            "analysis_source": "empty_input"
        }
    
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
            
            # 2. Check for clinical keywords
            text_lower = cleaned.lower()
            hopelessness_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["hopelessness"])
            self_harm_cues = any(kw in text_lower for kw in DISTRESS_KEYWORDS["self_harm"])
            withdrawal_flag = any(kw in text_lower for kw in DISTRESS_KEYWORDS["withdrawal"])
            
            # Compute composite distress score
            base_score = min(1.0, distress_emotions_score)
            if self_harm_cues:
                base_score = max(base_score, 0.95)
            elif hopelessness_flag:
                base_score = max(base_score, 0.80)
            
            severity = "acute distress" if base_score >= 0.75 else ("moderate stress" if base_score >= 0.45 else "routine")
            
            return {
                "distress_score": round(base_score, 3),
                "top_emotions": top_emotions,
                "distress_severity": severity,
                "hopelessness_flag": hopelessness_flag,
                "self_harm_cues": self_harm_cues,
                "withdrawal_flag": withdrawal_flag,
                "analysis_source": "huggingface_api"
            }
        except Exception:
            # Fallback to local heuristic if token has permission issue or network timeout
            return fallback_text_analysis(cleaned)
    else:
        return fallback_text_analysis(cleaned)

def nlp_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: NLP / Text Distress Analysis Agent."""
    message = state.get("message_text", "")
    results = analyze_text_distress(message)
    return {"nlp_results": results}
