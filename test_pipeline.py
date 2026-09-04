import sys
import json
from datetime import datetime

# Ensure clean UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from graph import app
from core.state import VictimState

def run_simulation():
    print("=" * 75)
    print("🚀 SIH 26094: MULTI-AGENT DISTRESS PREDICTION PIPELINE SIMULATION")
    print("=" * 75)

    test_cases = [
        {
            "title": "Scenario 1: Routine Follow-up (Stable Victim)",
            "input": {
                "victim_id": "VIC-101",
                "turn_id": 1,
                "timestamp": datetime.now().isoformat(),
                "channel": "chatbot",
                "message_text": "Thank you, the trial is progressing and I feel supported by my lawyer.",
                "audio_metadata": {
                    "pitch_variance": 32.0,
                    "pause_ratio": 0.12,
                    "speaking_rate_wpm": 135
                },
                "case_context": {
                    "case_stage": "Investigation",
                    "accused_bail_status": "Denied",
                    "threat_reported": False,
                    "engagement": {
                        "consecutive_missed_checkins": 0,
                        "response_latency_hours": 1.5,
                        "baseline_latency_hours": 2.0,
                        "days_since_last_checkin": 1
                    }
                }
            }
        },
        {
            "title": "Scenario 2: Watch Tier (Emerging Anxiety & Procedural Delay)",
            "input": {
                "victim_id": "VIC-102",
                "turn_id": 4,
                "timestamp": datetime.now().isoformat(),
                "channel": "chatbot",
                "message_text": "I am feeling quite scared about the court hearing next week. Everything is delayed.",
                "audio_metadata": {
                    "pitch_variance": 20.0,
                    "pause_ratio": 0.22,
                    "speaking_rate_wpm": 115
                },
                "case_context": {
                    "case_stage": "Trial",
                    "accused_bail_status": "Hearing Upcoming",
                    "hearing_postponed": True,
                    "threat_reported": False,
                    "engagement": {
                        "consecutive_missed_checkins": 1,
                        "response_latency_hours": 6.0,
                        "baseline_latency_hours": 2.5,
                        "days_since_last_checkin": 3
                    }
                }
            }
        },
        {
            "title": "Scenario 3: The 'Riya' Benchmark (Gradual Withdrawal + Accused Bail Granted)",
            "input": {
                "victim_id": "VIC-RIYA-204",
                "turn_id": 8,
                "timestamp": datetime.now().isoformat(),
                "channel": "ivrs",
                "message_text": "I can't do this anymore. There is no point. Nobody cares what happens to me.",
                "audio_metadata": {
                    "pitch_variance": 7.5,  # Extreme monotone flatness
                    "pause_ratio": 0.42,   # 42% silence
                    "speaking_rate_wpm": 78 # Very sluggish pace
                },
                "case_context": {
                    "case_stage": "Trial",
                    "accused_bail_status": "Granted",  # High risk legal trigger
                    "threat_reported": True,
                    "engagement": {
                        "consecutive_missed_checkins": 3, # Disengagement
                        "response_latency_hours": 28.0,
                        "baseline_latency_hours": 2.0,
                        "days_since_last_checkin": 8
                    }
                }
            }
        },
        {
            "title": "Scenario 4: Critical Acute Distress / Safety Override",
            "input": {
                "victim_id": "VIC-104",
                "turn_id": 2,
                "timestamp": datetime.now().isoformat(),
                "channel": "chatbot",
                "message_text": "I just want to end it all tonight. I am going to hurt myself.",
                "audio_metadata": None,
                "case_context": {
                    "case_stage": "FIR Filed",
                    "accused_bail_status": "Pending",
                    "threat_reported": False,
                    "engagement": {
                        "consecutive_missed_checkins": 0,
                        "response_latency_hours": 1.0,
                        "baseline_latency_hours": 1.0,
                        "days_since_last_checkin": 0
                    }
                }
            }
        }
    ]

    for idx, test in enumerate(test_cases, 1):
        print(f"\n[{idx}] RUNNING: {test['title']}")
        print("-" * 75)
        
        state_input: VictimState = test["input"]
        
        # Invoke compiled LangGraph workflow
        final_state = app.invoke(state_input)
        
        print(f"👤 Victim ID:        {final_state.get('victim_id')}")
        print(f"📝 Text Input:       \"{final_state.get('message_text')}\"")
        print(f"📊 Fused Risk Score: {final_state.get('fused_risk_score'):.3f}")
        print(f"🏷️ Assigned Tier:    {final_state.get('risk_tier')}")
        print(f"🚨 Alert Dispatched: {final_state.get('escalation_triggered')}")
        
        print("\n🔍 Explainability Reasons:")
        for r in final_state.get("explainability_reasons", []):
            print(f"   • {r}")
            
        if final_state.get("escalation_triggered"):
            alert = final_state.get("escalation_alert", {})
            print(f"\n📢 Counselor Notification Payload:")
            print(f"   Alert ID: {alert.get('alert_id')} | Priority: {alert.get('priority')}")
            print(f"   Action:   {alert.get('recommended_action')}")
            print(f"   Status:   {alert.get('human_in_the_loop_status')}")
            
        print("=" * 75)

if __name__ == "__main__":
    run_simulation()
