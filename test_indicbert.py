import sys
sys.stdout.reconfigure(encoding='utf-8')
from agents.nlp_agent import analyze_text_distress

tests = [
    "Hello main theek hoon",
    "Mujhe case ki tension hai",
    "Koi mera peecha kar raha hai please help",
    "Bachao koi maar raha hai mujhe",
    "I am not feeling good some try to kidnap me",
    "Enna kolla pakkuranaa save me",
    "Amake maar te chaicche bachao",
]

for t in tests:
    r = analyze_text_distress(t)
    print(f"[{int(r['distress_score']*100)}% | {r['distress_severity']:<14}] [{r['analysis_source']:<30}] {t}")
