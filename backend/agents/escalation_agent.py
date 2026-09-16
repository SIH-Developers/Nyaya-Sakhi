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

from backend.config import RISK_TIERS
from backend.core.state import VictimState


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
        from backend.services.twilio_service import dispatch_notification
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
        from backend.database import get_connection
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


# ── Manual SOS Panic Button Entry Point ───────────────────────────────────────

import time as _time
_sos_dedup: dict = {}          # victim_id → last trigger timestamp
_SOS_DEDUP_WINDOW = 300        # 5 minutes (seconds)


def trigger_manual_sos(
    victim_id: str,
    channel: str = "web_chat",
    session_id: str = None,
    triggered_by: str = "victim",
) -> dict:
    """
    Manual SOS Panic Button — skips NLP scoring entirely.

    Differences from NLP-detected escalation:
      • trigger_type = 'manual_sos'  (distinct in DB for dashboard / reports)
      • triggered_by = caller identity (victim / counselor / telegram)
      • Goes straight to P0-EMERGENCY priority
      • Calls Twilio Voice on SOS_RECIPIENT_NUMBERS (pre-verified list)
        rather than the victim's own phone
      • 5-minute deduplication window (prevents accidental double-press)
    """
    # ── Deduplication (5-min window) ──────────────────────────────────────────
    now = _time.time()
    last = _sos_dedup.get(victim_id, 0)
    if now - last < _SOS_DEDUP_WINDOW:
        remaining = int(_SOS_DEDUP_WINDOW - (now - last))
        print(f"[ManualSOS] Dedup skip for {victim_id} — retry in {remaining}s")
        return {
            "success": False,
            "deduped": True,
            "retry_in_seconds": remaining,
            "message": f"SOS already triggered. Please wait {remaining}s before re-triggering.",
        }
    _sos_dedup[victim_id] = now

    # ── Build P0 alert payload ────────────────────────────────────────────────
    alert_id = f"SOS-{uuid.uuid4().hex[:8].upper()}"
    alert = {
        "alert_id":                  alert_id,
        "victim_id":                 victim_id,
        "timestamp":                 datetime.now().isoformat(),
        "priority":                  "P0-EMERGENCY",
        "risk_tier":                 "Urgent",
        "fused_risk_score":          1.0,
        "recommended_action":        (
            "MANUAL SOS ACTIVATED — Immediate call dispatch. "
            "Contact victim within 5 minutes. Notify District Officer."
        ),
        "clinical_reasons":          ["Manual SOS panic button pressed by victim"],
        "human_in_the_loop_status":  "Awaiting Counselor Review",
        "acknowledged_by_counselor": False,
        "channel":                   channel,
        "trigger_type":              "manual_sos",
        "triggered_by":              triggered_by,
    }

    # ── Persist to escalation_alerts & victims table ───────────────────────
    try:
        from backend.database import get_connection
        import json as _json
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR IGNORE INTO escalation_alerts (
                alert_id, victim_id, timestamp, priority, risk_tier,
                fused_risk_score, recommended_action, clinical_reasons,
                human_in_the_loop_status, acknowledged, channel,
                trigger_type, triggered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        """, (
            alert["alert_id"], victim_id, alert["timestamp"],
            alert["priority"], alert["risk_tier"], alert["fused_risk_score"],
            alert["recommended_action"],
            _json.dumps(alert["clinical_reasons"]),
            alert["human_in_the_loop_status"],
            channel, "manual_sos", triggered_by,
        ))

        # Auto-upsert victim record so counselor dashboard GET /api/victims displays them immediately
        cursor.execute("SELECT victim_id FROM victims WHERE victim_id = ?", (victim_id,))
        if not cursor.fetchone():
            short_id = victim_id[-8:] if len(victim_id) >= 8 else victim_id
            cursor.execute("""
                INSERT INTO victims (
                    victim_id, name, fir_number, police_station, district, state,
                    current_risk_score, current_risk_tier, last_interaction_at, created_at,
                    last_channel
                ) VALUES (?, ?, ?, 'Central Desk', 'Emergency Cell', 'Delhi', 1.0, 'Urgent', ?, ?, ?)
            """, (
                victim_id,
                f"App Survivor ({short_id})",
                f"FIR-2026/{short_id[:4]}",
                alert["timestamp"],
                alert["timestamp"],
                channel
            ))
        else:
            cursor.execute("""
                UPDATE victims
                SET current_risk_score = 1.0,
                    current_risk_tier = 'Urgent',
                    last_interaction_at = ?,
                    last_channel = ?
                WHERE victim_id = ?
            """, (alert["timestamp"], channel, victim_id))

        conn.commit()
        conn.close()
        print(f"[ManualSOS] ✅ Alert & Victim profile persisted: {alert_id}")
    except Exception as e:
        print(f"[ManualSOS] DB persist error: {e}")

    # ── Twilio Voice — call SOS_RECIPIENT_NUMBERS (not victim's own phone) ───
    dispatch_results = []
    try:
        import os as _os
        sos_numbers_raw = _os.getenv("SOS_RECIPIENT_NUMBERS", "") or _os.getenv("TWILIO_TO_NUMBER", "") or _os.getenv("TWILIO_TEST_VICTIM_NUMBER", "")
        raw_list = [n.strip() for n in sos_numbers_raw.split(",") if n.strip()]
        sos_numbers = []
        for n in raw_list:
            formatted = n if n.startswith("+") else "+" + n
            sos_numbers.append(formatted)

        from backend.services.twilio_service import make_voice_call, send_sms
        spoken = (
            f"EMERGENCY SOS alert from NHAA 14566. "
            f"Victim ID {victim_id} has pressed the SOS panic button. "
            f"Please respond immediately."
        )
        for number in sos_numbers:
            voice_res = make_voice_call(number, spoken, is_sos=True)
            sms_res   = send_sms(number, f"🆘 NHAA 14566 MANUAL SOS — Victim {victim_id} needs immediate help. {datetime.now().strftime('%H:%M IST')}")
            dispatch_results.append({
                "number": number[-4:] + "****",   # mask for logs
                "voice": voice_res,
                "sms": sms_res,
            })
        if not sos_numbers:
            print("[ManualSOS] ⚠️  SOS_RECIPIENT_NUMBERS / TWILIO_TO_NUMBER not configured — skipping voice/SMS dispatch.")
    except Exception as e:
        print(f"[ManualSOS] Twilio dispatch error: {e}")

    print(f"[ManualSOS] 🆘 SOS triggered for {victim_id} via {channel} by {triggered_by}")
    return {
        "success": True,
        "alert_id": alert_id,
        "priority": "P0-EMERGENCY",
        "trigger_type": "manual_sos",
        "dispatched_to": len(dispatch_results),
        "dispatch_results": dispatch_results,
        "message": "SOS alert sent. A counselor will contact you very shortly. Stay safe.",
    }
