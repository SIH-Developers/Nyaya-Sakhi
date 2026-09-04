import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

HF_TOKEN = os.getenv("HF_TOKEN", "")

# Hugging Face Free Models Configuration
HF_MODELS = {
    "emotion_classifier": "SamLowe/roberta-base-go_emotions",
    "distress_zero_shot": "facebook/bart-large-mnli",
    "sentiment_classifier": "cardiffnlp/twitter-roberta-base-sentiment-latest",
    "asr_speech_to_text": "openai/whisper-small",
    "audio_emotion": "superb/wav2vec2-base-superb-er",
    "reasoning_llm": "meta-llama/Llama-3.2-3B-Instruct"
}

# Standard Risk Tier Vocabulary (as defined in SIH 26094 documentation)
RISK_TIERS = {
    "ROUTINE": "Routine",
    "WATCH": "Watch",
    "COUNSELOR_OUTREACH": "Counselor Outreach",
    "URGENT": "Urgent"
}

# Risk Thresholds
THRESHOLD_URGENT = 0.75
THRESHOLD_OUTREACH = 0.50
THRESHOLD_WATCH = 0.30
