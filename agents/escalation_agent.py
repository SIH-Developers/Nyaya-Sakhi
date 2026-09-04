import uuid
from datetime import datetime
from typing import Dict, Any
from config import RISK_TIERS
from core.state import VictimState

def generate_escalation_alert(state: VictimState) -> Dict[str, Any]:
    """
    Format clinical alert for on-duty counselor/supervisor dashboard.
    Implements mandatory human acknowledgment safeguard.
    """
    victim_id = state.get("victim_id", "UNKNOWN")
    risk_tier = state.get("risk_tier", RISK_TIERS["ROUTINE"])
    score = state.get("fused_risk_score", 0.0)
    reasons = state.get("explainability_reasons", [])
    
    is_urgent = (risk_tier == RISK_TIERS["URGENT"])
    priority = "P1-CRITICAL" if is_urgent else "P2-HIGH"
    
    if is_urgent:
        recommended_action = "Immediate Direct Counselor Outreach (Within 30 mins) + Safety Protocol Check"
    else:
        recommended_action = "Proactive Counselor Follow-up Call within 24 hours"
        
    alert_payload = {
        "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
        "victim_id": victim_id,
        "timestamp": datetime.now().isoformat(),
        "priority": priority,
        "risk_tier": risk_tier,
        "fused_risk_score": score,
        "recommended_action": recommended_action,
        "clinical_reasons": reasons,
        "human_in_the_loop_status": "Awaiting Counselor Review",
        "acknowledged_by_counselor": False
    }
    
    return alert_payload

def escalation_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: Escalation & Counselor Alerting Agent."""
    risk_tier = state.get("risk_tier", RISK_TIERS["ROUTINE"])
    
    if risk_tier in [RISK_TIERS["URGENT"], RISK_TIERS["COUNSELOR_OUTREACH"]]:
        alert = generate_escalation_alert(state)
        return {
            "escalation_triggered": True,
            "escalation_alert": alert
        }
    else:
        log = {
            "log_id": f"LOG-{uuid.uuid4().hex[:8].upper()}",
            "victim_id": state.get("victim_id", "UNKNOWN"),
            "timestamp": datetime.now().isoformat(),
            "status": "Monitored - Baseline Stable",
            "risk_tier": risk_tier,
            "fused_risk_score": state.get("fused_risk_score", 0.0)
        }
        return {
            "escalation_triggered": False,
            "case_coordinator_log": log
        }
