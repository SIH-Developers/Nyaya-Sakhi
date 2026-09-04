from typing import Dict, Any, List
from core.state import VictimState

def analyze_behavioral_patterns(history: List[Dict[str, Any]], current_meta: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze behavioral anomalies, engagement drop-off, and response latency patterns.
    """
    missed_checkins = current_meta.get("consecutive_missed_checkins", 0)
    current_latency_hours = current_meta.get("response_latency_hours", 2.0)
    baseline_latency_hours = current_meta.get("baseline_latency_hours", 3.0)
    days_since_last_checkin = current_meta.get("days_since_last_checkin", 1)
    
    triggers: List[str] = []
    anomaly_score = 0.0
    disengagement_flag = False
    
    # 1. Check consecutive missed check-ins
    if missed_checkins >= 3:
        anomaly_score += 0.50
        triggers.append(f"High Disengagement: {missed_checkins} consecutive missed check-ins")
        disengagement_flag = True
    elif missed_checkins >= 1:
        anomaly_score += 0.20
        triggers.append(f"{missed_checkins} missed check-in recorded")

    # 2. Response latency jump vs baseline (e.g., usually replies in 2h, now took 24h)
    if baseline_latency_hours > 0:
        latency_ratio = current_latency_hours / baseline_latency_hours
        if latency_ratio >= 3.0 and current_latency_hours > 12:
            anomaly_score += 0.30
            triggers.append(f"Significant Response Delay ({current_latency_hours:.1f}h vs {baseline_latency_hours:.1f}h baseline)")
        elif latency_ratio >= 2.0 and current_latency_hours > 6:
            anomaly_score += 0.15
            triggers.append("Moderate Response Latency Increase")

    # 3. Prolonged silence
    if days_since_last_checkin >= 7:
        anomaly_score += 0.35
        triggers.append(f"Prolonged Inactivity ({days_since_last_checkin} days since last engagement)")
        disengagement_flag = True

    anomaly_score = min(1.0, round(anomaly_score, 3))

    return {
        "behavioral_anomaly_score": anomaly_score,
        "disengagement_flag": disengagement_flag,
        "anomaly_triggers": triggers,
        "metrics": {
            "missed_checkins": missed_checkins,
            "latency_ratio": round(current_latency_hours / max(1.0, baseline_latency_hours), 2),
            "days_since_last_checkin": days_since_last_checkin
        }
    }

def behavior_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: Behavioral Pattern & Engagement Agent."""
    history = state.get("interaction_history", [])
    # Context may pass current engagement metrics in state or within context
    current_meta = state.get("case_context", {}).get("engagement", {})
    if not current_meta and history:
        current_meta = history[-1]
        
    results = analyze_behavioral_patterns(history, current_meta)
    return {"behavioral_results": results}
