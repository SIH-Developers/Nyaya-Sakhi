"""tests/test_webhook_local.py — Step 2: Local webhook verification"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from api import api
from database import init_db
init_db()
client = TestClient(api)

PASS = "PASS"
FAIL = "FAIL"

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"  [{status}] {label}" + (f" — {detail}" if detail else ""))
    return condition

def section(t):
    print(f"\n{'='*60}\n  {t}\n{'='*60}")

if __name__ == "__main__":
    all_results = {}

    # ─── Test 1: GET ping (Twilio sends GET to verify endpoint exists) ─────────
    section("T-WH-1: GET /webhook/whatsapp-inbound (Twilio reachability ping)")
    r1 = client.get("/webhook/whatsapp-inbound")
    print(f"  HTTP status     : {r1.status_code}")
    print(f"  Content-Type    : {r1.headers.get('content-type', 'N/A')}")
    print(f"  Body (100)      : {r1.text[:100]}")
    all_results["T-WH-1: GET ping"] = check(
        "Returns 200 with TwiML",
        r1.status_code == 200 and "text/xml" in r1.headers.get("content-type", "")
    )

    # ─── Test 2: Neutral message → info mode ───────────────────────────────────
    section("T-WH-2: POST neutral message → RAG info response")
    r2 = client.post("/webhook/whatsapp-inbound", data={
        "Body": "What is Section 15A of the SC/ST Act?",
        "From": "whatsapp:+918299248116",
        "To": "whatsapp:+14155238886",
        "MessageSid": "SM-TEST-NEUTRAL-001"
    })
    is_twiml  = r2.text.strip().startswith("<?xml") and "<Message>" in r2.text
    has_legal = any(kw in r2.text for kw in ["Section", "Act", "14566", "FIR", "counsel", "rights"])
    print(f"  HTTP status     : {r2.status_code}")
    print(f"  Content-Type    : {r2.headers.get('content-type', 'N/A')}")
    print(f"  Valid TwiML XML : {is_twiml}")
    print(f"  Legal content   : {has_legal}")
    print(f"  Body (400)      : {r2.text[:400]}")
    all_results["T-WH-2: Neutral info mode"] = check(
        "200 + TwiML + legal content",
        r2.status_code == 200 and is_twiml and has_legal
    )

    # ─── Test 3: Distress message → calming response + emergency numbers ───────
    section("T-WH-3: POST distress message → calming TwiML with 112/14566")
    r3 = client.post("/webhook/whatsapp-inbound", data={
        "Body": "I want to die. The accused attacked me with a knife. Please help me.",
        "From": "whatsapp:+918299248116",
        "To": "whatsapp:+14155238886",
        "MessageSid": "SM-TEST-DISTRESS-001"
    })
    is_twiml_d  = r3.text.strip().startswith("<?xml") and "<Message>" in r3.text
    has_safety  = "112" in r3.text or "14566" in r3.text
    has_calming = any(kw in r3.text for kw in [
        "alone", "brave", "support", "here", "safe",
        "hear you", "not okay", "with you", "protection"  # all 3 calming response variants
    ])
    print(f"  HTTP status     : {r3.status_code}")
    print(f"  Content-Type    : {r3.headers.get('content-type', 'N/A')}")
    print(f"  Valid TwiML XML : {is_twiml_d}")
    print(f"  Emergency nums  : {has_safety}")
    print(f"  Calming tone    : {has_calming}")
    print(f"  Body (500)      : {r3.text[:500]}")
    all_results["T-WH-3: Distress calming response"] = check(
        "200 + TwiML + emergency numbers + calming tone",
        r3.status_code == 200 and is_twiml_d and has_safety and has_calming
    )

    # ─── Test 4: interaction_logs row created for distress ─────────────────────
    section("T-WH-4: DB — interaction_logs row created for distress message")
    import sqlite3
    DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "distress_monitoring.db")
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT * FROM interaction_logs WHERE victim_id = 'WA-918299248116' ORDER BY timestamp DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        print(f"  DB row found    : {row}")
    else:
        print(f"  No row found for WA-918299248116")
    all_results["T-WH-4: interaction_logs row"] = check(
        "Row exists in interaction_logs", row is not None
    )

    # ─── Test 5: Empty body → TwiML fallback (not 500) ─────────────────────────
    section("T-WH-5: POST empty body → TwiML fallback (never 500)")
    r5 = client.post("/webhook/whatsapp-inbound", data={
        "Body": "",
        "From": "whatsapp:+918299248116",
        "MessageSid": "SM-TEST-EMPTY-001"
    })
    print(f"  HTTP status     : {r5.status_code}")
    print(f"  Returns TwiML   : {'<Message>' in r5.text}")
    print(f"  Body            : {r5.text[:200]}")
    all_results["T-WH-5: Empty body → TwiML fallback"] = check(
        "200 + TwiML fallback (not 500)",
        r5.status_code == 200 and "<Message>" in r5.text
    )

    # ─── Final results ──────────────────────────────────────────────────────────
    print(f"\n\n{'='*60}")
    print("  WEBHOOK LOCAL TEST — FINAL RESULTS")
    print(f"{'='*60}")
    for name, passed in all_results.items():
        print(f"  {'PASS' if passed else 'FAIL'}  |  {name}")
    print(f"\n  Overall: {'ALL PASSED' if all(all_results.values()) else 'SOME FAILED'}")
