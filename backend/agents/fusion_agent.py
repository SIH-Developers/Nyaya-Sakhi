from typing import Dict, Any, List
from backend.config import RISK_TIERS, THRESHOLD_URGENT, THRESHOLD_OUTREACH, THRESHOLD_WATCH
from backend.core.state import VictimState

def compute_multimodal_fusion(
    nlp: Dict[str, Any],
    speech: Dict[str, Any],
    behavior: Dict[str, Any],
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Multi-signal fusion engine combining text, speech prosody,
    behavioral engagement, and case context into a calibrated risk score.
    """
    nlp_score = nlp.get("distress_score", 0.0)
    has_audio = speech.get("has_audio", False)
    speech_score = speech.get("tone_distress_score", 0.0) if has_audio else 0.0
    behavior_score = behavior.get("behavioral_anomaly_score", 0.0)
    context_weight = context.get("context_risk_weight", 0.0)
    
    # Dynamic Weighting depending on channel availability
    if has_audio:
        weights = {"nlp": 0.35, "speech": 0.15, "behavior": 0.25, "context": 0.25}
    else:
        # Re-distribute speech weight when audio is absent
        weights = {"nlp": 0.45, "speech": 0.0, "behavior": 0.25, "context": 0.30}
    
    base_fused_score = (
        nlp_score * weights["nlp"] +
        speech_score * weights["speech"] +
        behavior_score * weights["behavior"] +
        context_weight * weights["context"]
    )
    
    reasons: List[str] = []
    
    # Extract NLP explainability
    if nlp.get("self_harm_cues"):
        reasons.append("🚨 Critical: Explicit self-harm or suicidal ideation markers detected in text.")
        base_fused_score = max(base_fused_score, 0.95)
    if nlp.get("threat_violence_flag"):
        reasons.append("🚨 Emergency Hazard: Active physical violence or life threat reported.")
        base_fused_score = max(base_fused_score, 0.95)
    elif nlp.get("intimidation_flag"):
        reasons.append("⚠️ Active Threat: Victim reports being followed, stalked, or intimidated.")
        base_fused_score = max(base_fused_score, 0.85)
    elif nlp.get("emergency_help_flag"):
        reasons.append("🆘 Immediate Help Requested: Distress call logged.")
        base_fused_score = max(base_fused_score, 0.75)
    elif nlp.get("hopelessness_flag"):
        reasons.append("⚠️ High Distress: Language indicates severe hopelessness or psychological despair.")
        base_fused_score = max(base_fused_score, 0.80)

    if nlp.get("top_emotions"):
        for emo in nlp["top_emotions"]:
            if emo["score"] >= 0.25 and emo["label"] not in ["neutral", "caring", "desire", "curiosity"]:
                reasons.append(f"Emotion detected: '{emo['label']}' (confidence: {emo['score']:.2f})")
                break

    # Extract Case Context explainability
    for trigger in context.get("legal_triggers", []):
        reasons.append(f"⚖️ Legal Factor: {trigger}")
        
    # Extract Behavioral explainability
    for b_trigger in behavior.get("anomaly_triggers", []):
        reasons.append(f"📉 Behavioral Anomaly: {b_trigger}")
        
    # Extract Speech explainability
    for s_cue in speech.get("prosodic_cues", []):
        reasons.append(f"🎙️ Prosody Cue: {s_cue}")

    # Synergy Multiplier (The "Riya" Scenario: Bail Granted + Disengagement + Rising Distress)
    if context.get("high_stress_legal_trigger") and behavior.get("disengagement_flag") and nlp_score >= 0.4:
        base_fused_score = min(1.0, base_fused_score * 1.35)
        reasons.append("⚡ Synergistic Risk Escalation: Concurrent legal crisis trigger + behavioral withdrawal detected.")

    final_score = min(1.0, round(base_fused_score, 3))
    
    # Assign Risk Tier
    if final_score >= THRESHOLD_URGENT:
        risk_tier = RISK_TIERS["URGENT"]
    elif final_score >= THRESHOLD_OUTREACH:
        risk_tier = RISK_TIERS["COUNSELOR_OUTREACH"]
    elif final_score >= THRESHOLD_WATCH:
        risk_tier = RISK_TIERS["WATCH"]
    else:
        risk_tier = RISK_TIERS["ROUTINE"]

    if not reasons:
        reasons.append("All signals within stable baseline thresholds.")

    return {
        "fused_risk_score": final_score,
        "risk_tier": risk_tier,
        "explainability_reasons": reasons,
        "weights_used": weights
    }

def fusion_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: Risk Scoring & Distress Prediction Agent (Fusion)."""
    nlp = state.get("nlp_results", {})
    speech = state.get("speech_results", {})
    behavior = state.get("behavioral_results", {})
    context = state.get("case_context_results", {})
    
    fusion_output = compute_multimodal_fusion(nlp, speech, behavior, context)
    
    return {
        "fused_risk_score": fusion_output["fused_risk_score"],
        "risk_tier": fusion_output["risk_tier"],
        "explainability_reasons": fusion_output["explainability_reasons"]
    }
