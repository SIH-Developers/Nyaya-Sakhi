"""
Unit Testing Suite for Individual Agents in SIH 26094
Tests each agent independently with diverse edge cases and assertions.
"""
import sys
import json

# Ensure clean UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from agents.nlp_agent import analyze_text_distress, nlp_agent_node
from agents.speech_agent import analyze_speech_prosody, speech_agent_node
from agents.behavior_agent import analyze_behavioral_patterns, behavior_agent_node
from agents.context_agent import evaluate_case_context, context_agent_node
from agents.fusion_agent import compute_multimodal_fusion, fusion_agent_node
from agents.escalation_agent import generate_escalation_alert, escalation_agent_node
from core.state import VictimState

def test_nlp_agent():
    print("\n" + "=" * 75)
    print("🧪 1. TESTING NLP / TEXT DISTRESS AGENT")
    print("=" * 75)
    
    test_inputs = [
        ("Routine / Positive", "Thank you so much, I am feeling better today and attending the meeting."),
        ("Anxiety / Fear", "I am terrified because someone was watching my house last night."),
        ("Hopelessness / Despair", "I don't see any hope left. Everything is pointless and ruined."),
        ("Acute Self-Harm Marker", "I cannot take this pain anymore, I am going to end it all tonight.")
    ]
    
    for label, text in test_inputs:
        state = {"message_text": text}
        out = nlp_agent_node(state)
        res = out["nlp_results"]
        print(f"[{label}]")
        print(f"  Input:            \"{text}\"")
        print(f"  Distress Score:   {res['distress_score']:.3f}")
        print(f"  Severity:         {res['distress_severity']}")
        print(f"  Top Emotions:     {res['top_emotions']}")
        print(f"  Hopelessness:     {res['hopelessness_flag']} | Self-Harm: {res['self_harm_cues']}")
        print(f"  Source:           {res['analysis_source']}")
        print("-" * 75)

def test_speech_agent():
    print("\n" + "=" * 75)
    print("🧪 2. TESTING SPEECH EMOTION & TONE AGENT")
    print("=" * 75)
    
    test_audios = [
        (
            "Normal / Expressive Voice",
            {"pitch_variance": 35.0, "pause_ratio": 0.10, "speaking_rate_wpm": 140, "volume_rms": 0.06}
        ),
        (
            "Depressive Flatness / Psychomotor Slowing (Riya Case)",
            {"pitch_variance": 6.8, "pause_ratio": 0.44, "speaking_rate_wpm": 75, "volume_rms": 0.015}
        ),
        (
            "Acute Panic / Agitated Voice",
            {"pitch_variance": 62.0, "pause_ratio": 0.15, "speaking_rate_wpm": 165, "volume_rms": 0.15}
        )
    ]
    
    for label, audio in test_audios:
        state = {"audio_metadata": audio}
        out = speech_agent_node(state)
        res = out["speech_results"]
        print(f"[{label}]")
        print(f"  Tone Distress Score: {res['tone_distress_score']:.3f}")
        print(f"  Tone Label:          {res['tone_label']}")
        print(f"  Prosodic Cues:       {res['prosodic_cues']}")
        print(f"  Raw Metrics:         {res['metrics']}")
        print("-" * 75)

def test_behavior_agent():
    print("\n" + "=" * 75)
    print("🧪 3. TESTING BEHAVIORAL PATTERN & ENGAGEMENT AGENT")
    print("=" * 75)
    
    test_behaviors = [
        (
            "Active / Consistent Engagement",
            {"consecutive_missed_checkins": 0, "response_latency_hours": 1.2, "baseline_latency_hours": 2.0, "days_since_last_checkin": 1}
        ),
        (
            "Moderate Latency Jump",
            {"consecutive_missed_checkins": 1, "response_latency_hours": 8.5, "baseline_latency_hours": 2.0, "days_since_last_checkin": 2}
        ),
        (
            "Severe Disengagement & Ghosting (Riya Case)",
            {"consecutive_missed_checkins": 4, "response_latency_hours": 36.0, "baseline_latency_hours": 2.0, "days_since_last_checkin": 10}
        )
    ]
    
    for label, b_meta in test_behaviors:
        state = {"case_context": {"engagement": b_meta}}
        out = behavior_agent_node(state)
        res = out["behavioral_results"]
        print(f"[{label}]")
        print(f"  Anomaly Score:      {res['behavioral_anomaly_score']:.3f}")
        print(f"  Disengagement Flag: {res['disengagement_flag']}")
        print(f"  Detected Triggers:  {res['anomaly_triggers']}")
        print(f"  Metrics:            {res['metrics']}")
        print("-" * 75)

def test_context_agent():
    print("\n" + "=" * 75)
    print("🧪 4. TESTING CASE CONTEXT AGENT (LEGAL & NHAA TRIGGERS)")
    print("=" * 75)
    
    test_contexts = [
        (
            "Early Stage / Accused in Custody",
            {"case_stage": "FIR Filed", "accused_bail_status": "Denied", "threat_reported": False}
        ),
        (
            "Procedural Delay in Trial",
            {"case_stage": "Trial", "accused_bail_status": "Pending", "hearing_postponed": True, "threat_reported": False}
        ),
        (
            "Critical Safety Crisis: Accused Granted Bail + Intimidation",
            {"case_stage": "Trial", "accused_bail_status": "Granted", "threat_reported": True, "compensation_status": "Pending"}
        )
    ]
    
    for label, c_data in test_contexts:
        state = {"case_context": c_data}
        out = context_agent_node(state)
        res = out["case_context_results"]
        print(f"[{label}]")
        print(f"  Legal Risk Weight:   {res['context_risk_weight']:.3f}")
        print(f"  High Stress Trigger: {res['high_stress_legal_trigger']}")
        print(f"  Legal Triggers:      {res['legal_triggers']}")
        print("-" * 75)

def test_fusion_agent():
    print("\n" + "=" * 75)
    print("🧪 5. TESTING RISK SCORING & FUSION AGENT")
    print("=" * 75)
    
    scenarios = [
        (
            "Scenario A: Multi-Channel Low Risk",
            {"distress_score": 0.05, "top_emotions": [{"label": "gratitude", "score": 0.95}]},
            {"tone_distress_score": 0.10, "has_audio": True, "prosodic_cues": []},
            {"behavioral_anomaly_score": 0.0, "anomaly_triggers": []},
            {"context_risk_weight": 0.0, "legal_triggers": []}
        ),
        (
            "Scenario B: The 'Riya' Synergy (Bail Granted + Withdrawal + Hopeless Text)",
            {"distress_score": 0.85, "hopelessness_flag": True, "top_emotions": [{"label": "sadness", "score": 0.88}]},
            {"tone_distress_score": 0.75, "has_audio": True, "prosodic_cues": ["Acoustic Flatness (Reduced Pitch Variance)"]},
            {"behavioral_anomaly_score": 0.80, "disengagement_flag": True, "anomaly_triggers": ["High Disengagement: 3 missed check-ins"]},
            {"context_risk_weight": 0.95, "high_stress_legal_trigger": True, "legal_triggers": ["Critical Case Trigger: Accused Released on Bail"]}
        )
    ]
    
    for label, nlp, speech, behavior, context in scenarios:
        state = {
            "nlp_results": nlp,
            "speech_results": speech,
            "behavioral_results": behavior,
            "case_context_results": context
        }
        out = fusion_agent_node(state)
        print(f"[{label}]")
        print(f"  Fused Risk Score: {out['fused_risk_score']:.3f}")
        print(f"  Assigned Tier:    {out['risk_tier']}")
        print(f"  Explainability:")
        for r in out["explainability_reasons"]:
            print(f"    • {r}")
        print("-" * 75)

def test_escalation_agent():
    print("\n" + "=" * 75)
    print("🧪 6. TESTING ESCALATION AGENT (COUNSELOR TRIAGE)")
    print("=" * 75)
    
    # Test 1: Urgent
    state_urgent = {
        "victim_id": "VIC-RIYA-204",
        "risk_tier": "Urgent",
        "fused_risk_score": 0.92,
        "explainability_reasons": ["Accused released on bail", "3 missed check-ins", "Hopeless language"]
    }
    out_urgent = escalation_agent_node(state_urgent)
    print("[Urgent Risk Tier]")
    print(f"  Escalation Triggered: {out_urgent['escalation_triggered']}")
    alert = out_urgent['escalation_alert']
    print(f"  Alert ID:             {alert['alert_id']}")
    print(f"  Priority:             {alert['priority']}")
    print(f"  Action:               {alert['recommended_action']}")
    print(f"  Human-in-the-Loop:    {alert['human_in_the_loop_status']}")
    print("-" * 75)
    
    # Test 2: Routine
    state_routine = {
        "victim_id": "VIC-101",
        "risk_tier": "Routine",
        "fused_risk_score": 0.05,
        "explainability_reasons": ["Stable baseline"]
    }
    out_routine = escalation_agent_node(state_routine)
    print("[Routine Risk Tier]")
    print(f"  Escalation Triggered: {out_routine['escalation_triggered']}")
    log = out_routine['case_coordinator_log']
    print(f"  Log ID:               {log['log_id']}")
    print(f"  Status:               {log['status']}")
    print("=" * 75)

if __name__ == "__main__":
    test_nlp_agent()
    test_speech_agent()
    test_behavior_agent()
    test_context_agent()
    test_fusion_agent()
    test_escalation_agent()
