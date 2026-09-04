from typing import Dict, Any, List
from core.state import VictimState

def evaluate_case_context(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate external legal and investigative case stressors.
    Integrates with NHAA / Integrated Portal case metadata.
    """
    if not case_data:
        return {
            "context_risk_weight": 0.0,
            "high_stress_legal_trigger": False,
            "legal_triggers": [],
            "case_stage": "Unknown"
        }
    
    case_stage = case_data.get("case_stage", "FIR Filed")
    bail_status = case_data.get("accused_bail_status", "Pending")
    threat_reported = case_data.get("threat_reported", False)
    hearing_postponed = case_data.get("hearing_postponed", False)
    compensation_status = case_data.get("compensation_status", "Pending")
    
    triggers: List[str] = []
    risk_weight = 0.0
    high_stress_flag = False
    
    # 1. Accused Bail Status (Major Safety Vulnerability)
    if bail_status.lower() == "granted":
        risk_weight += 0.45
        triggers.append("Critical Case Trigger: Accused Released on Bail")
        high_stress_flag = True
    elif bail_status.lower() == "hearing upcoming":
        risk_weight += 0.15
        triggers.append("Impending Bail Hearing")

    # 2. Direct Threat or Intimidation Reported
    if threat_reported:
        risk_weight += 0.50
        triggers.append("Active Threat / Intimidation Incident Logged")
        high_stress_flag = True

    # 3. Trial Stage & Procedural Delays
    if case_stage.lower() in ["trial", "cross-examination"]:
        risk_weight += 0.20
        triggers.append(f"High-Stress Legal Stage: {case_stage}")
    
    if hearing_postponed:
        risk_weight += 0.15
        triggers.append("Court Hearing Postponed (Institutional Delay)")

    if compensation_status.lower() == "rejected":
        risk_weight += 0.20
        triggers.append("Victim Compensation Claim Rejected")

    risk_weight = min(1.0, round(risk_weight, 3))

    return {
        "context_risk_weight": risk_weight,
        "high_stress_legal_trigger": high_stress_flag,
        "legal_triggers": triggers,
        "case_stage": case_stage,
        "accused_bail_status": bail_status
    }

def context_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: Case Context Agent."""
    case_data = state.get("case_context", {})
    results = evaluate_case_context(case_data)
    return {"case_context_results": results}
