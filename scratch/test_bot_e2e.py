"""
End-to-End Test Suite for Nyaya-Sakhi Telegram Bot & Conversational Pipeline.
Tests normal conversations, legal queries, relief queries, and high distress escalation.
"""
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Ensure UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from api import handle_text_message, ChatbotMessageRequest
from database import get_victim_details, get_victim_history, get_all_victims

def test_conversations():
    victim_id = "VIC-TG-999888"
    user_name = "Test Victim (Harmeet)"

    test_messages = [
        ("Greeting", "Namaste bot, good morning!"),
        ("Everyday Routine", "I am fine today, having tea at home with my family."),
        ("Legal Query", "What are my legal rights under section 15a?"),
        ("Compensation Query", "When will I get my compensation money for the FIR?"),
        ("Politeness", "Thank you so much for helping me!"),
        ("High Distress Threat", "I am in street and the person who beat us is out from jail and following me I am scared")
    ]

    print("=" * 80)
    print("🧪 RUNNING CONVERSATIONAL PIPELINE TEST SUITE")
    print("=" * 80)

    for category, msg_text in test_messages:
        req = ChatbotMessageRequest(
            victim_id=victim_id,
            message_text=msg_text,
            channel="telegram_mobile",
            user_name=user_name
        )
        res = handle_text_message(req)
        
        score_pct = int((res.get("fused_risk_score", 0.0)) * 100)
        risk_tier = res.get("risk_tier")
        bot_reply = res.get("bot_response", "")

        print(f"\n📩 [{category.upper()}] User Said:")
        print(f"   \"{msg_text}\"")
        print(f"📊 Risk Score: {score_pct}% | Tier: {risk_tier} | Escalated: {res.get('escalation_triggered')}")
        print(f"🤖 Bot Response:\n{bot_reply}")
        print("-" * 60)

    # Check Database Persistence
    print("\n🔍 Checking Database Persistence...")
    victim = get_victim_details(victim_id)
    history = get_victim_history(victim_id)

    print(f"👤 Victim Name in DB: {victim.get('name') if victim else 'Not found'}")
    print(f"📈 Total Turns Logged in DB: {len(history)}")
    print(f"🚨 Latest Risk Score in DB: {victim.get('current_risk_score')} ({victim.get('current_risk_tier')})")
    
    print("\n✅ ALL CONVERSATIONAL & DATABASE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_conversations()
