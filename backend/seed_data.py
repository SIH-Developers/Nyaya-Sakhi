"""
Seed Realistic Victim Data and Historical Interactions for SIH 26094
Populates SQLite with multi-turn victim journeys including the 'Riya' benchmark case.
"""
import sys
import json
from datetime import datetime, timedelta

# Ensure clean UTF-8 console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from backend.database import init_db, get_connection, save_victim_turn
from backend.graph import app

def seed_database():
    print("🌱 Initializing Database Schema...")
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Clear existing records
    cursor.execute("DELETE FROM counselor_alerts")
    cursor.execute("DELETE FROM interaction_logs")
    cursor.execute("DELETE FROM victims")
    conn.commit()

    # Define Initial Victims & Legal Contexts
    victims = [
        {
            "victim_id": "VIC-RIYA-204",
            "name": "Riya Kumari",
            "caste_category": "Scheduled Caste",
            "fir_number": "FIR-2026/894",
            "police_station": "Civil Lines PS",
            "district": "Lucknow",
            "state": "Uttar Pradesh",
            "case_stage": "Trial",
            "accused_bail_status": "Granted",
            "threat_reported": 1,
            "hearing_postponed": 1,
            "compensation_status": "Pending",
            "consent_flag": 1,
            "created_at": (datetime.now() - timedelta(days=45)).isoformat()
        },
        {
            "victim_id": "VIC-AMIT-102",
            "name": "Amit Paswan",
            "caste_category": "Scheduled Caste",
            "fir_number": "FIR-2026/312",
            "police_station": "Kotwali PS",
            "district": "Patna",
            "state": "Bihar",
            "case_stage": "Charge Sheet Filed",
            "accused_bail_status": "Pending",
            "threat_reported": 1,
            "hearing_postponed": 0,
            "compensation_status": "Disbursed",
            "consent_flag": 1,
            "created_at": (datetime.now() - timedelta(days=30)).isoformat()
        },
        {
            "victim_id": "VIC-PRIYA-105",
            "name": "Priya Gond",
            "caste_category": "Scheduled Tribe",
            "fir_number": "FIR-2026/108",
            "police_station": "Ranchi Sadar PS",
            "district": "Ranchi",
            "state": "Jharkhand",
            "case_stage": "Investigation",
            "accused_bail_status": "Denied",
            "threat_reported": 0,
            "hearing_postponed": 0,
            "compensation_status": "Pending",
            "consent_flag": 1,
            "created_at": (datetime.now() - timedelta(days=60)).isoformat()
        },
        {
            "victim_id": "VIC-SURESH-108",
            "name": "Suresh Meghwal",
            "caste_category": "Scheduled Caste",
            "fir_number": "FIR-2026/552",
            "police_station": "City Kotwali",
            "district": "Jaipur",
            "state": "Rajasthan",
            "case_stage": "Trial",
            "accused_bail_status": "Denied",
            "threat_reported": 0,
            "hearing_postponed": 1,
            "compensation_status": "Pending",
            "consent_flag": 1,
            "created_at": (datetime.now() - timedelta(days=20)).isoformat()
        }
    ]

    for v in victims:
        cursor.execute("""
        INSERT INTO victims (
            victim_id, name, caste_category, fir_number, police_station,
            district, state, case_stage, accused_bail_status, threat_reported,
            hearing_postponed, compensation_status, consent_flag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            v["victim_id"], v["name"], v["caste_category"], v["fir_number"],
            v["police_station"], v["district"], v["state"], v["case_stage"],
            v["accused_bail_status"], v["threat_reported"], v["hearing_postponed"],
            v["compensation_status"], v["consent_flag"], v["created_at"]
        ))
    conn.commit()
    conn.close()
    print(f"✅ Inserted {len(victims)} victim case profiles.")

    # Multi-Turn Historical Journeys
    # 1. Riya's 4-Turn Progression (Hopeful -> Delayed -> Bail Granted / Withdrawal -> Crisis)
    riya_turns = [
        {
            "victim_id": "VIC-RIYA-204",
            "turn_id": 1,
            "timestamp": (datetime.now() - timedelta(days=28)).isoformat(),
            "channel": "chatbot",
            "message_text": "I spoke to the legal aid lawyer today, feeling hopeful that justice will be done.",
            "audio_metadata": {"pitch_variance": 32.0, "pause_ratio": 0.12, "speaking_rate_wpm": 135},
            "case_context": {"case_stage": "Investigation", "accused_bail_status": "Denied", "threat_reported": False, "engagement": {"consecutive_missed_checkins": 0, "response_latency_hours": 1.5, "baseline_latency_hours": 2.0, "days_since_last_checkin": 1}}
        },
        {
            "victim_id": "VIC-RIYA-204",
            "turn_id": 2,
            "timestamp": (datetime.now() - timedelta(days=18)).isoformat(),
            "channel": "chatbot",
            "message_text": "The hearing got postponed again. It is taking very long and I am getting stressed.",
            "audio_metadata": {"pitch_variance": 22.0, "pause_ratio": 0.20, "speaking_rate_wpm": 120},
            "case_context": {"case_stage": "Trial", "accused_bail_status": "Hearing Upcoming", "hearing_postponed": True, "threat_reported": False, "engagement": {"consecutive_missed_checkins": 1, "response_latency_hours": 5.0, "baseline_latency_hours": 2.0, "days_since_last_checkin": 3}}
        },
        {
            "victim_id": "VIC-RIYA-204",
            "turn_id": 3,
            "timestamp": (datetime.now() - timedelta(days=7)).isoformat(),
            "channel": "ivrs",
            "message_text": "The accused got bail yesterday. They were seen near my street. I am very scared.",
            "audio_metadata": {"pitch_variance": 12.0, "pause_ratio": 0.35, "speaking_rate_wpm": 95},
            "case_context": {"case_stage": "Trial", "accused_bail_status": "Granted", "threat_reported": True, "engagement": {"consecutive_missed_checkins": 2, "response_latency_hours": 18.0, "baseline_latency_hours": 2.0, "days_since_last_checkin": 5}}
        },
        {
            "victim_id": "VIC-RIYA-204",
            "turn_id": 4,
            "timestamp": datetime.now().isoformat(),
            "channel": "ivrs",
            "message_text": "I can't do this anymore. There is no point. Nobody cares what happens to me.",
            "audio_metadata": {"pitch_variance": 6.5, "pause_ratio": 0.45, "speaking_rate_wpm": 72},
            "case_context": {"case_stage": "Trial", "accused_bail_status": "Granted", "threat_reported": True, "engagement": {"consecutive_missed_checkins": 4, "response_latency_hours": 36.0, "baseline_latency_hours": 2.0, "days_since_last_checkin": 9}}
        }
    ]

    # 2. Amit's Turns (Witness Intimidation -> Escalated to Outreach)
    amit_turns = [
        {
            "victim_id": "VIC-AMIT-102",
            "turn_id": 1,
            "timestamp": (datetime.now() - timedelta(days=12)).isoformat(),
            "channel": "app",
            "message_text": "Attending the investigation officer meeting today with my family.",
            "audio_metadata": {"pitch_variance": 28.0, "pause_ratio": 0.14, "speaking_rate_wpm": 130},
            "case_context": {"case_stage": "Investigation", "accused_bail_status": "Denied", "threat_reported": False, "engagement": {"consecutive_missed_checkins": 0, "response_latency_hours": 2.0, "baseline_latency_hours": 2.0, "days_since_last_checkin": 1}}
        },
        {
            "victim_id": "VIC-AMIT-102",
            "turn_id": 2,
            "timestamp": datetime.now().isoformat(),
            "channel": "app",
            "message_text": "Some men came to our shop warning us to withdraw the SC/ST case. We feel unsafe.",
            "audio_metadata": {"pitch_variance": 48.0, "pause_ratio": 0.20, "speaking_rate_wpm": 150},
            "case_context": {"case_stage": "Charge Sheet Filed", "accused_bail_status": "Pending", "threat_reported": True, "engagement": {"consecutive_missed_checkins": 1, "response_latency_hours": 7.0, "baseline_latency_hours": 2.0, "days_since_last_checkin": 2}}
        }
    ]

    # 3. Priya's Turns (Stable Routine)
    priya_turns = [
        {
            "victim_id": "VIC-PRIYA-105",
            "turn_id": 1,
            "timestamp": datetime.now().isoformat(),
            "channel": "chatbot",
            "message_text": "Thank you for checking in. The support counselor was very helpful.",
            "audio_metadata": {"pitch_variance": 34.0, "pause_ratio": 0.10, "speaking_rate_wpm": 140},
            "case_context": {"case_stage": "Investigation", "accused_bail_status": "Denied", "threat_reported": False, "engagement": {"consecutive_missed_checkins": 0, "response_latency_hours": 1.0, "baseline_latency_hours": 1.5, "days_since_last_checkin": 1}}
        }
    ]

    all_turns = riya_turns + amit_turns + priya_turns
    print(f"🔄 Executing LangGraph Multi-Agent Pipeline for {len(all_turns)} historical turns...")

    for t in all_turns:
        state_out = app.invoke(t)
        state_out["turn_id"] = t["turn_id"]
        state_out["timestamp"] = t["timestamp"]
        state_out["channel"] = t["channel"]
        save_victim_turn(state_out)
        print(f"   Turn saved: {t['victim_id']} (Turn {t['turn_id']}) -> Risk Score: {state_out['fused_risk_score']:.2f} ({state_out['risk_tier']})")

    print("\n✅ Database Seeding Complete!")

if __name__ == "__main__":
    seed_database()
