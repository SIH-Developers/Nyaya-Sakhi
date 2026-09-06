from typing import TypedDict, Optional, List, Dict, Any

class VictimState(TypedDict, total=False):
    # Session & Identity Metadata
    victim_id: str
    turn_id: int
    timestamp: str
    channel: str  # 'chatbot' | 'ivrs' | 'app' | 'web_portal'
    
    # Raw Inputs
    message_text: str
    audio_metadata: Optional[Dict[str, Any]]
    
    # Case & Behavioral Context
    case_context: Dict[str, Any]  # {'case_stage', 'bail_status', 'threat_reported', 'hearing_postponed'}
    interaction_history: List[Dict[str, Any]]  # List of past session metadata and metrics
    
    # Individual Agent Analysis Outputs
    nlp_results: Dict[str, Any]
    speech_results: Dict[str, Any]
    behavioral_results: Dict[str, Any]
    case_context_results: Dict[str, Any]
    
    # Fusion & Risk Scoring
    fused_risk_score: float  # 0.0 to 1.0
    risk_tier: str  # 'Routine' | 'Watch' | 'Counselor Outreach' | 'Urgent'
    explainability_reasons: List[str]
    
    # Action Outputs
    escalation_triggered: bool
    escalation_alert: Optional[Dict[str, Any]]
    case_coordinator_log: Optional[Dict[str, Any]]
    user_name: Optional[str]
    bot_response: Optional[str]
