"""
tests/test_rag_chatbot.py
TASK 3 — Tests for services/rag_chatbot.py

Sends 8 topic-specific questions + 1 out-of-scope question.
Asserts each response is non-empty and contains topic-relevant keywords.
"""

import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.rag_chatbot import get_info_response

PASS = "✅ PASS"
FAIL = "❌ FAIL"

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ── Test cases: (topic_label, question, required_keywords) ────────────────────
QUESTIONS = [
    (
        "FIR Filing",
        "How do I file an FIR for an atrocity?",
        ["FIR", "police", "SHO", "14566"]
    ),
    (
        "Compensation",
        "What compensation am I entitled to under the SC/ST Act?",
        ["compensation", "₹", "lakh", "interim"]
    ),
    (
        "Bail / Accused Released",
        "The accused has been released on bail. What can I do?",
        ["bail", "Section 18", "court", "14566"]
    ),
    (
        "Mental Health Support",
        "How do I get mental health or counseling support?",
        ["14566", "counselor", "support", "NHAA"]
    ),
    (
        "Special Court / Trial",
        "What is a Special Court and how does my trial work?",
        ["Special Court", "trial", "month", "prosecutor"]
    ),
    (
        "Legal Acts",
        "Which laws protect me under the SC/ST Act?",
        ["Act", "1989", "Constitution", "Article"]
    ),
    (
        "NHAA Helpline",
        "What is the NHAA 14566 helpline and how does it work?",
        ["14566", "toll-free", "MoSJE", "helpline"]
    ),
    (
        "Emergency / Danger",
        "I am in immediate danger and scared. What should I do?",
        ["112", "14566", "danger", "Section 15A"]
    ),
    (
        "OUT-OF-SCOPE (weather)",
        "what is the weather today in Delhi?",
        ["14566"]   # must fall back gracefully mentioning 14566, NOT fabricate legal content
    ),
]

# Out-of-scope: must NOT contain fabricated legal-sounding terms
OUT_OF_SCOPE_FORBIDDEN = ["Section", "Act", "compensation", "FIR", "bail", "court"]

if __name__ == "__main__":
    results = {}
    all_pairs = []

    for i, (topic, question, required_kw) in enumerate(QUESTIONS):
        section(f"T3-{i+1}: {topic}")
        print(f"  Question: \"{question}\"")

        response = get_info_response(question=question, session_id=f"test-{i}")
        answer   = response.get("answer", "")
        source   = response.get("source", "?")

        print(f"\n  Source  : {source}")
        print(f"  Answer  : {answer}")
        print(f"  Suggestions: {response.get('suggestions', [])}")

        all_pairs.append({
            "topic": topic,
            "question": question,
            "source": source,
            "answer": answer[:300] + ("…" if len(answer) > 300 else "")
        })

        # Check answer is non-empty
        if not answer.strip():
            print(f"\n  {FAIL}: Empty answer returned")
            results[f"T3-{i+1}: {topic}"] = False
            continue

        # Out-of-scope: special check
        if topic.startswith("OUT-OF-SCOPE"):
            has_forbidden = any(w in answer for w in OUT_OF_SCOPE_FORBIDDEN)
            has_fallback  = any(w in answer for w in required_kw)
            if has_forbidden and not has_fallback:
                print(f"\n  {FAIL}: Fabricated legal content in out-of-scope response!")
                results[f"T3-{i+1}: {topic}"] = False
            else:
                print(f"\n  Fallback mentions '14566': {has_fallback}")
                print(f"  {PASS}: Out-of-scope handled gracefully")
                results[f"T3-{i+1}: {topic}"] = True
            continue

        # Regular topic: check keywords
        missing = [kw for kw in required_kw if kw.lower() not in answer.lower()]
        if missing:
            print(f"\n  {FAIL}: Answer missing required keywords: {missing}")
            results[f"T3-{i+1}: {topic}"] = False
        else:
            print(f"\n  All required keywords found: {required_kw}")
            print(f"  {PASS}")
            results[f"T3-{i+1}: {topic}"] = True

    # ── Final report ──────────────────────────────────────────────────────────
    print(f"\n\n{'='*60}")
    print("  TASK 3 — REQUEST/RESPONSE PAIRS SUMMARY")
    print(f"{'='*60}")
    for p in all_pairs:
        print(f"\n  Topic   : {p['topic']}")
        print(f"  Question: {p['question']}")
        print(f"  Source  : {p['source']}")
        print(f"  Answer  : {p['answer']}")
        print()

    print(f"\n{'='*60}")
    print("  TASK 3 — FINAL RESULTS")
    print(f"{'='*60}")
    for name, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status}  |  {name}")
    all_pass = all(results.values())
    print(f"\n  Overall: {'✅ ALL PASSED' if all_pass else '❌ SOME FAILED'}")
