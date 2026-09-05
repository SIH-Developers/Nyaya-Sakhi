import sys
import requests
import json
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE = "https://nyaya-sakhi-tszb.onrender.com"

print("=" * 70)
print("  NYAYA SAKHI — LIVE DEPLOYED API & MODEL TEST")
print(f"  Target: {BASE}")
print("=" * 70)

# 1. Health check
print("\n[1] Health Check (/api/health)...")
try:
    r = requests.get(f"{BASE}/api/health", timeout=15)
    print(f"    Status : {r.status_code}")
    print(f"    Payload: {r.json()}")
except Exception as e:
    print(f"    Failed : {e}")

# 2. Test Multi-lingual Crisis Detection via /api/message
test_cases = [
    ("Hello main theek hoon",                        "Routine (Hindi/Hinglish)",  "Routine"),
    ("Mujhe case ki tension hai",                     "Watch (Hinglish)",          "Watch"),
    ("Koi mera peecha kar raha hai please help",      "Urgent (Hinglish)",         "Urgent/Critical"),
    ("Bachao koi maar raha hai mujhe",                "Critical (Hindi)",          "Critical"),
    ("I am not feeling good some try to kidnap me",  "Critical (English)",        "Critical"),
    ("Enna kolla pakkuranaa save me",                 "Critical (Tamil)",          "Critical"),
    ("Amake maar te chaicche bachao",                 "Critical (Bengali)",        "Critical"),
    ("Naaku chompeyyadaaniki try chestunnadu",        "Critical (Telugu)",         "Critical"),
]

print("\n[2] Testing Multi-Lingual Crisis Classifier (/api/message)...")
print("-" * 70)

for text, desc, expected in test_cases:
    payload = {
        "victim_id": "VIC-TG-9999",
        "message_text": text,
        "channel": "test_suite"
    }
    
    print(f"\n>> Input   : \"{text}\"")
    print(f"   Context : {desc} | Expected: {expected}")
    
    t0 = time.time()
    try:
        r = requests.post(f"{BASE}/api/message", json=payload, timeout=60)
        dur = round(time.time() - t0, 2)
        if r.status_code == 200:
            data = r.json()
            fused_score = data.get("fused_risk_score", 0.0)
            risk_tier   = data.get("risk_tier", "Unknown")
            nlp_res     = data.get("nlp_results", {}) or {}
            source      = nlp_res.get("analysis_source", "unknown")
            nlp_score   = nlp_res.get("distress_score", 0.0)
            emotions    = nlp_res.get("top_emotions", [])
            
            top_label = emotions[0]["label"].upper() if emotions else "N/A"
            conf = f"{emotions[0]['score']*100:.1f}%" if emotions and "score" in emotions[0] else ""
            
            print(f"   Result  : [HTTP {r.status_code}] in {dur}s")
            print(f"   Model   : {source}")
            print(f"   NLP Eval: Label={top_label} ({conf}) | NLP Score={nlp_score}")
            print(f"   System  : Fused Risk={fused_score:.2f} | Risk Tier={risk_tier}")
        else:
            print(f"   Failed  : [HTTP {r.status_code}] in {dur}s")
            print(f"   Response: {r.text[:200]}")
    except Exception as e:
        print(f"   Error   : {e}")

print("\n" + "=" * 70)
print("  TEST RUN COMPLETE")
print("=" * 70)
