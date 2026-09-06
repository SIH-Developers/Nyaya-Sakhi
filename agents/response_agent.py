"""
Empathetic & Legal Conversational Response Agent for SIH 26094.
Generates dynamic, helpful, and contextual responses for both routine conversations
and crisis escalation scenarios under SC/ST (PoA) Act 1989.
"""
import re
from typing import Dict, Any
from core.state import VictimState

GREETING_PATTERNS = [
    r'\b(hi|hello|namaste|hey|ssup|good morning|good afternoon|good evening|kaise ho|kaise hain|pranam|ram ram)\b'
]

THANKS_PATTERNS = [
    r'\b(thank|thanks|dhanyawad|shukriya|ok|okay|bye|good night|take care)\b'
]

LEGAL_PATTERNS = [
    r'\b(right|rights|section 15a|15a|lawyer|legal|advocate|court|judge|hearing|fir|police|poa|protection|bail)\b'
]

RELIEF_PATTERNS = [
    r'\b(compensation|relief|money|scheme|disbursement|financial|pension|fund|amount|sanction)\b'
]

POSITIVE_PATTERNS = [
    r'\b(fine|good|great|happy|safe|peaceful|resting|tea|family|all good|normal|relaxing|market|work|home)\b'
]

def generate_conversational_response(state: VictimState) -> str:
    """Generate dynamic, empathetic, and informative response tailored to state and user intent."""
    msg = state.get("message_text", "") or ""
    msg_lower = msg.lower().strip()
    risk_tier = state.get("risk_tier", "Routine")
    score_pct = int((state.get("fused_risk_score", 0.05)) * 100)
    reasons = state.get("explainability_reasons", [])
    user_name = state.get("user_name") or state.get("case_context", {}).get("victim_name") or "friend"

    # Case A: Urgent / Critical (High Distress / Threat)
    if risk_tier in ["Urgent", "Critical"]:
        reason_text = f"• {reasons[0]}" if reasons else "• High distress/threat signals detected"
        if len(reasons) > 1:
            reason_text += f"\n• {reasons[1]}"
        return (
            f"🚨 *CRITICAL SAFETY ALERT ({score_pct}% Risk)*\n\n"
            f"💙 Namaste {user_name}, please try to take a slow, deep breath. We hear your distress and you are NOT alone.\n\n"
            f"🔍 *Threat & Case Factors Detected:*\n{reason_text}\n\n"
            f"🛡️ *Immediate Safety Protocol:*\n"
            f"• Are you currently indoors or in a safe place? Is anyone with you?\n"
            f"• If you are in immediate physical danger, please call **112 (Police)** or **14566 (NHAA Helpline)** right now.\n"
            f"• An urgent high-priority ticket has been dispatched under **Section 15A (SC/ST PoA Act)** to your District Counselor and Local Police Station.\n\n"
            f"💬 *Please reply back to let us know your immediate status.*"
        )

    # Case B: Watch / Counselor Outreach (Moderate Stress)
    if risk_tier in ["Counselor Outreach", "Watch"]:
        reason_text = f"• {reasons[0]}" if reasons else "• Elevated emotional stress signals detected"
        if len(reasons) > 1:
            reason_text += f"\n• {reasons[1]}"
        return (
            f"⚠️ *Distress Assessment:* `{score_pct}%` | *Status:* *{risk_tier}*\n\n"
            f"💙 We hear you, {user_name}. It sounds like you are carrying some stress or concern today.\n\n"
            f"🔍 *Factors Identified:*\n{reason_text}\n\n"
            f"📞 *Counselor Support:* Your assigned counselor has been updated on your case status.\n"
            f"_How are you feeling right now? If you need legal guidance or someone to talk to, reply here or call **14566** anytime._"
        )

    # Case C: Routine / Normal Conversation
    # 1. Compensation / Financial Relief Queries (check first before general FIR/legal terms)
    if any(re.search(p, msg_lower) for p in RELIEF_PATTERNS):
        return (
            f"💰 *SC/ST PoA Relief & Compensation Scheme for {user_name}:*\n\n"
            f"Under SC/ST PoA Rules, victims of atrocities are entitled to structured monetary relief:\n"
            f"• 💵 *25% Disbursement:* Disbursed immediately upon FIR registration.\n"
            f"• 💵 *50% Disbursement:* Disbursed upon filing of Charge-sheet in Special Court.\n"
            f"• 💵 *25% Disbursement:* Disbursed upon final trial conviction/verdict.\n\n"
            f"If your compensation is pending, our District Counselor can escalate your file directly to the District Magistrate (DM). Reply with your FIR details to check status!"
        )

    # 2. Legal Rights & Statutory Queries
    if any(re.search(p, msg_lower) for p in LEGAL_PATTERNS):
        return (
            f"⚖️ *SC/ST (PoA) Act 1989 - Legal Rights for {user_name}:*\n\n"
            f"Under Section 15A, as a victim/witness you have guaranteed statutory rights:\n"
            f"1. 🛡️ *Complete Protection:* Mandatory police protection against any harassment, coercion, or threat.\n"
            f"2. ⚖️ *Free Legal Aid & Travel:* State-funded legal representation and travel/maintenance allowance for court dates.\n"
            f"3. 📄 *Case Information:* Right to receive copies of FIR, charge-sheet, and court proceeding updates.\n"
            f"4. 🚫 *Bail Opposition:* Right to be heard in court during bail hearings of the accused.\n\n"
            f"Would you like assistance regarding your specific FIR status or court hearing date?"
        )

    # 3. Greeting
    if any(re.search(p, msg_lower) for p in GREETING_PATTERNS):
        return (
            f"🙏 *Namaste {user_name}!*\n\n"
            f"I'm glad you reached out today. How are you and your family feeling?\n"
            f"Is everything going smoothly with your daily routine and case updates?"
        )

    # 4. Politeness / Gratitude
    if any(re.search(p, msg_lower) for p in THANKS_PATTERNS):
        return (
            f"😊 *You are very welcome, {user_name}!*\n\n"
            f"We are always here to support you 24/7 under the SC/ST PoA Support System.\n"
            f"Wishing you peace and safety—feel free to text or send a voice note anytime!"
        )

    # 5. Routine Everyday / Positive Check-in
    if any(re.search(p, msg_lower) for p in POSITIVE_PATTERNS):
        return (
            f"💚 *That's wonderful to hear, {user_name}!*\n\n"
            f"Having a peaceful day and keeping a calm mind is very important for your well-being.\n"
            f"We are keeping a quiet, protective watch in the background. If you ever need legal advice, compensation tracking, or counselor support, we are always here!"
        )

    # 6. General Fallback Response
    return (
        f"💚 *Namaste {user_name}!*\n\n"
        f"Thank you for sharing that with me. Your well-being indicators are stable (`{score_pct}%` risk - Routine).\n\n"
        f"How has the rest of your day been going? Let me know if you would like information on legal rights, compensation relief, or connecting with your assigned counselor!"
    )

def response_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: Conversational & Legal Response Generator Agent."""
    bot_response = generate_conversational_response(state)
    return {"bot_response": bot_response}
