"""
agents/escalation_agent.py — Tier-Based Escalation & Counselor Alerting Agent
SIH 26094 / NHAA 14566

Tiers (from config.RISK_TIERS):
  ROUTINE          → Log only (no alert)
  WATCH            → Log + soft dashboard badge
  COUNSELOR_OUTREACH → Alert counselor via WhatsApp/SMS, no voice
  URGENT           → Alert counselor + SMS + Voice, auto-dispatch district officer

All dispatches go through services.twilio_service.dispatch_notification() which
provides WhatsApp→SMS→Voice fallback and deduplication.
"""

import uuid
from datetime import datetime
from typing import Dict, Any

from config import RISK_TIERS
from core.state import VictimState


def _risk_to_tier_label(risk_tier: str) -> str:
    return risk_tier or RISK_TIERS["ROUTINE"]


def generate_escalation_alert(state: VictimState) -> Dict[str, Any]:
    """
    Build a structured clinical alert payload for the dashboard.
    Includes mandatory human-in-the-loop acknowledgement field.
    """
    victim_id  = state.get("victim_id", "UNKNOWN")
    risk_tier  = _risk_to_tier_label(state.get("risk_tier"))
    score      = state.get("fused_risk_score", 0.0)
    reasons    = state.get("explainability_reasons", [])

    is_urgent   = (risk_tier == RISK_TIERS["URGENT"])
    is_outreach = (risk_tier == RISK_TIERS["COUNSELOR_OUTREACH"])

    if is_urgent:
        priority           = "P1-CRITICAL"
        recommended_action = (
            "Immediate Counselor Outreach (within 30 min) + Section 15A Safety Protocol. "
            "Notify District Magistrate if no acknowledgement in 30 min."
        )
    elif is_outreach:
        priority           = "P2-HIGH"
        recommended_action = "Proactive counselor follow-up call within 24 hours."
    else:
        priority           = "P3-WATCH"
        recommended_action = "Continue monitoring; next check-in within 48 hours."

    return {
        "alert_id":                    f"ALT-{uuid.uuid4().hex[:8].upper()}",
        "victim_id":                   victim_id,
        "timestamp":                   datetime.now().isoformat(),
        "priority":                    priority,
        "risk_tier":                   risk_tier,
        "fused_risk_score":            round(score, 4),
        "recommended_action":          recommended_action,
        "clinical_reasons":            reasons,
        "human_in_the_loop_status":    "Awaiting Counselor Review",
        "acknowledged_by_counselor":   False,
        "channel":                     state.get("channel", "unknown"),
    }


def _dispatch_twilio_alert(state: VictimState, alert: Dict[str, Any]):
    """
    Fire-and-forget Twilio notification after building the alert.
    Reads victim phone from state (if present) and calls twilio_service.
    """
    to_number = (
        state.get("victim_phone") or
        state.get("phone_number") or
        state.get("contact_number", "")
    )
    victim_name = state.get("victim_name", state.get("victim_id", "Victim"))
    risk_tier   = alert["risk_tier"]

    if not to_number:
        print(f"[EscalationAgent] No phone number for {alert['victim_id']} — skipping Twilio dispatch.")
        return

    try:
        from services.twilio_service import dispatch_notification
        msg = (
            f"NHAA 14566 Alert for {victim_name}: "
            f"Risk tier = {risk_tier} ({int(alert['fused_risk_score'] * 100)}%). "
            f"Reason: {'; '.join(alert['clinical_reasons'][:2])}. "
            f"Please call 14566 if you need immediate assistance."
        )
        dispatch_notification(
            victim_id   = alert["victim_id"],
            to_number   = to_number,
            victim_name = victim_name,
            message     = msg,
            risk_tier   = risk_tier,
            alert_id    = alert["alert_id"],
        )
    except Exception as e:
        print(f"[EscalationAgent] Twilio dispatch error: {e}")


def _persist_alert(alert: Dict[str, Any]):
    """Persist alert to the database so the dashboard can display it."""
    try:
        from database import get_connection
        conn   = get_connection()
        cursor = conn.cursor()
        import json
        cursor.execute("""
            INSERT OR IGNORE INTO escalation_alerts (
                alert_id, victim_id, timestamp, priority, risk_tier,
                fused_risk_score, recommended_action, clinical_reasons,
                human_in_the_loop_status, acknowledged, channel
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """, (
            alert["alert_id"],
            alert["victim_id"],
            alert["timestamp"],
            alert["priority"],
            alert["risk_tier"],
            alert["fused_risk_score"],
            alert["recommended_action"],
            json.dumps(alert["clinical_reasons"]),
            alert["human_in_the_loop_status"],
            alert.get("channel", "unknown"),
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[EscalationAgent] DB persist error (non-fatal): {e}")


def escalation_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: Tier-based Escalation & Counselor Alerting."""
    risk_tier = _risk_to_tier_label(state.get("risk_tier"))

    # ── ROUTINE: just log ──────────────────────────────────────────────────────
    if risk_tier == RISK_TIERS["ROUTINE"]:
        log = {
            "log_id":          f"LOG-{uuid.uuid4().hex[:8].upper()}",
            "victim_id":       state.get("victim_id", "UNKNOWN"),
            "timestamp":       datetime.now().isoformat(),
            "status":          "Monitored – Baseline Stable",
            "risk_tier":       risk_tier,
            "fused_risk_score": state.get("fused_risk_score", 0.0),
        }
        return {"escalation_triggered": False, "case_coordinator_log": log}

    # ── WATCH: dashboard badge only ────────────────────────────────────────────
    if risk_tier == RISK_TIERS["WATCH"]:
        alert = generate_escalation_alert(state)
        alert["priority"] = "P3-WATCH"
        _persist_alert(alert)
        return {
            "escalation_triggered": False,
            "escalation_alert": alert,
            "case_coordinator_log": {
                "log_id":    alert["alert_id"],
                "status":    "Watch – Dashboard Badge Set",
                "risk_tier": risk_tier,
            }
        }

    # ── COUNSELOR_OUTREACH & URGENT: alert + Twilio dispatch ──────────────────
    alert = generate_escalation_alert(state)
    _persist_alert(alert)
    _dispatch_twilio_alert(state, alert)

    return {
        "escalation_triggered": True,
        "escalation_alert":     alert,
    }
