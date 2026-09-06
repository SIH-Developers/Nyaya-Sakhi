"""tests/test_webhook_live_render.py — Live Render Webhook Verification"""
import requests
import sys

BASE_URL = "https://nyaya-sakhi-tszb.onrender.com"

print(f"Testing target: {BASE_URL}")

print("\n=== 1. Testing GET /api/health ===")
try:
    r_health = requests.get(f"{BASE_URL}/api/health", timeout=30)
    print(f"Status: {r_health.status_code}")
    print(f"Body: {r_health.text[:200]}")
except Exception as e:
    print(f"Health check error: {e}")

print("\n=== 2. Testing GET /webhook/whatsapp-inbound ===")
try:
    r_get = requests.get(f"{BASE_URL}/webhook/whatsapp-inbound", timeout=30)
    print(f"Status: {r_get.status_code}")
    print(f"Headers: {r_get.headers.get('content-type')}")
    print(f"Body: {r_get.text}")
except Exception as e:
    print(f"Webhook GET error: {e}")

print("\n=== 3. Testing POST /webhook/whatsapp-inbound (Info Query) ===")
try:
    data_info = {
        "Body": "What is Section 3(1)(r) of SC ST Act?",
        "From": "whatsapp:+918299248116",
        "To": "whatsapp:+14155238886",
        "MessageSid": "SM-TEST-INFO-001"
    }
    r_info = requests.post(f"{BASE_URL}/webhook/whatsapp-inbound", data=data_info, timeout=40)
    print(f"Status: {r_info.status_code}")
    print(f"Content-Type: {r_info.headers.get('content-type')}")
    print(f"TwiML XML Body:\n{r_info.text}")
except Exception as e:
    print(f"Info POST error: {e}")

print("\n=== 4. Testing POST /webhook/whatsapp-inbound (Distress Query) ===")
try:
    data_distress = {
        "Body": "I want to die. The accused attacked me with a knife.",
        "From": "whatsapp:+918299248116",
        "To": "whatsapp:+14155238886",
        "MessageSid": "SM-TEST-DISTRESS-001"
    }
    r_dist = requests.post(f"{BASE_URL}/webhook/whatsapp-inbound", data=data_distress, timeout=40)
    print(f"Status: {r_dist.status_code}")
    print(f"Content-Type: {r_dist.headers.get('content-type')}")
    print(f"TwiML XML Body:\n{r_dist.text}")
except Exception as e:
    print(f"Distress POST error: {e}")
