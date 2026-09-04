"""
Email Notification Service for SIH 26094 - Nyaya-Sakhi
Sends email check-in prompts and emergency counselor escalation alerts via Twilio SendGrid or SMTP.
"""
import os
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "helpline@nhaa14566.gov.in")
DEFAULT_ALERT_EMAIL = os.getenv("COUNSELOR_ALERT_EMAIL", "counselor.nhaa14566@gmail.com")

def send_email_alert(
    to_email: str,
    subject: str,
    body_text: str,
    html_content: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send an email via Twilio SendGrid v3 API or fallback simulation.
    """
    if not to_email:
        to_email = DEFAULT_ALERT_EMAIL

    if not html_content:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
            <div style="background-color: #1e3a8a; color: white; padding: 15px; border-radius: 6px 6px 0 0;">
                <h2 style="margin: 0;">MoSJE • National Helpline Against Atrocities (14566)</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px;">Nyaya-Sakhi Multi-Agent Support System</p>
            </div>
            <div style="background-color: white; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 15px; line-height: 1.6; color: #334155;">{body_text}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">
                    Official Statutory Communication under SC/ST (Prevention of Atrocities) Act 1989.<br />
                    Toll-Free National Helpline: <strong>14566</strong>
                </p>
            </div>
        </div>
        """

    # 1. Send via Twilio SendGrid if API Key is configured
    if SENDGRID_API_KEY.startswith("SG."):
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": FROM_EMAIL, "name": "NHAA 14566 National Helpline"},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": body_text},
                    {"type": "text/html", "value": html_content}
                ]
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            if resp.status_code in [200, 201, 202]:
                print(f"[Twilio SendGrid] Email sent successfully to {to_email}")
                return {"success": True, "provider": "Twilio SendGrid", "to": to_email}
            else:
                print(f"[Twilio SendGrid] Error {resp.status_code}: {resp.text}")
                return {"success": False, "error": resp.text, "provider": "Twilio SendGrid"}
        except Exception as e:
            print(f"[Twilio SendGrid] Exception: {e}")
            return {"success": False, "error": str(e), "provider": "Twilio SendGrid"}

    # 2. Simulation Mode (Displays formatted email in terminal & logs)
    print(f"[Email Notification] ✉️  (Twilio SendGrid Simulated)")
    print(f"  TO:      {to_email}")
    print(f"  SUBJECT: {subject}")
    print(f"  BODY:    {body_text[:120]}...")
    return {
        "success": True,
        "simulated": True,
        "provider": "Twilio SendGrid (Simulated - set SENDGRID_API_KEY in .env to send live)",
        "to": to_email,
        "subject": subject
    }
