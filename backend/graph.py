"""
LangGraph Multi-Agent Orchestration Workflow
SIH 26094: Mental Health Monitoring and Distress Prediction System
"""
from langgraph.graph import StateGraph, START, END
from backend.core.state import VictimState
from backend.agents import (
    nlp_agent_node,
    speech_agent_node,
    behavior_agent_node,
    context_agent_node,
    fusion_agent_node,
    escalation_agent_node
)

def build_triage_graph():
    """Construct and compile the multi-agent StateGraph."""
    workflow = StateGraph(VictimState)
    
    # Register All Specialized Agent Nodes
    workflow.add_node("nlp_agent", nlp_agent_node)
    workflow.add_node("speech_agent", speech_agent_node)
    workflow.add_node("behavior_agent", behavior_agent_node)
    workflow.add_node("context_agent", context_agent_node)
    workflow.add_node("fusion_agent", fusion_agent_node)
    workflow.add_node("escalation_agent", escalation_agent_node)
    
    # Parallel Fan-Out from START to individual domain agents
    workflow.add_edge(START, "nlp_agent")
    workflow.add_edge(START, "speech_agent")
    workflow.add_edge(START, "behavior_agent")
    workflow.add_edge(START, "context_agent")
    
    # Convergence: All 4 agents feed into the Fusion Node
    workflow.add_edge("nlp_agent", "fusion_agent")
    workflow.add_edge("speech_agent", "fusion_agent")
    workflow.add_edge("behavior_agent", "fusion_agent")
    workflow.add_edge("context_agent", "fusion_agent")
    
    # Fusion routes to Decision & Escalation
    workflow.add_edge("fusion_agent", "escalation_agent")
    workflow.add_edge("escalation_agent", END)
    
    return workflow.compile()

# Global compiled application
app = build_triage_graph()
