from typing import Dict, Any, List, Optional
from backend.core.state import VictimState

def analyze_speech_prosody(audio_meta: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze prosodic and acoustic cues from speech/IVRS interactions.
    Cues: pitch flatness, prolonged pause ratio, speaking rate, and vocal energy.
    """
    if not audio_meta:
        return {
            "tone_distress_score": 0.0,
            "tone_label": "No Audio Available",
            "prosodic_cues": [],
            "has_audio": False
        }
    
    # Extract prosodic metrics
    pitch_variance = audio_meta.get("pitch_variance", 25.0)  # Standard ~25-45 Hz
    pause_ratio = audio_meta.get("pause_ratio", 0.15)         # % of speech that is pause
    speaking_rate = audio_meta.get("speaking_rate_wpm", 130) # Normal ~120-160 WPM
    energy_rms = audio_meta.get("volume_rms", 0.05)
    
    prosodic_cues: List[str] = []
    distress_score = 0.1
    tone_label = "Normal / Expressive"
    
    # 1. Monotone / Flat Pitch (marker of severe depression and emotional flattening)
    if pitch_variance < 10.0:
        distress_score += 0.35
        prosodic_cues.append("Acoustic Flatness (Reduced Pitch Variance)")
        tone_label = "Flat / Withdrawn"
    elif pitch_variance < 18.0:
        distress_score += 0.15
        prosodic_cues.append("Mild Monotone Speech")

    # 2. Psychomotor Slowing (long hesitation pauses + slow speaking rate)
    if pause_ratio > 0.35 or speaking_rate < 90:
        distress_score += 0.30
        prosodic_cues.append("Psychomotor Slowing (Prolonged Pauses / Sluggish Pace)")
        if tone_label != "Flat / Withdrawn":
            tone_label = "Withdrawn / Hesitant"

    # 3. Acute Agitation / Panic (High Pitch Variance + High Vocal Tension)
    if pitch_variance > 55.0 and energy_rms > 0.12:
        distress_score += 0.40
        prosodic_cues.append("Vocal Tremor / Acute Agitation")
        tone_label = "Agitated / Distressed"
        
    distress_score = min(1.0, round(distress_score, 3))
    
    return {
        "tone_distress_score": distress_score,
        "tone_label": tone_label,
        "prosodic_cues": prosodic_cues,
        "metrics": {
            "pitch_variance_hz": pitch_variance,
            "pause_ratio": pause_ratio,
            "speaking_rate_wpm": speaking_rate
        },
        "has_audio": True
    }

def speech_agent_node(state: VictimState) -> Dict[str, Any]:
    """LangGraph Node: Speech Emotion & Tone Agent."""
    audio_meta = state.get("audio_metadata")
    results = analyze_speech_prosody(audio_meta)
    return {"speech_results": results}
