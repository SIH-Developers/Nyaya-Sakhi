"""
Email Notification Service for SIH 26094 - Nyaya-Sakhi
Supports Direct SMTP (Gmail / Custom SMTP) for 100% custom branded emails,
with fallback to Twilio Communications Email API.
"""
import os
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASS = os.getenv("SMTP_PASS", "").replace(" ", "").strip()
FROM_NAME = os.getenv("FROM_NAME", "MoSJE • NHAA 14566 Support")
DEFAULT_ALERT_EMAIL = os.getenv("COUNSELOR_ALERT_EMAIL", "kishoriju040@gmail.com").strip()

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")

def _build_default_html(subject: str, body_text: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px; text-align: left; color: #ffffff;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">MoSJE • NHAA 14566</h1>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #93c5fd;">National Helpline Against Atrocities | Distress Prediction & Legal Protection System</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 28px;">
                <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e40af;">Official Statutory Notification • SC/ST (PoA) Act 1989</p>
                </div>
                <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">{subject}</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-line;">{body_text}</p>
                
                <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">Available Emergency Protections:</h3>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #64748b; line-height: 1.5;">
                        <li>Section 15A: Witness and Victim Protection Order</li>
                        <li>Immediate Telephonic Counselor & Medical Outreach</li>
                        <li>SC/ST PoA Statutory Rehabilitation Relief Disbursement</li>
                    </ul>
                </div>

                <div style="margin-top: 28px; text-align: center;">
                    <a href="tel:14566" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">Emergency Hotline: Call 14566</a>
                </div>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                Government of India • Ministry of Social Justice and Empowerment (MoSJE)<br>
                National Helpline Against Atrocities: Toll-Free 14566 • Active 24x7
            </td>
        </tr>
    </table>
</body>
</html>"""

def send_email_alert(
    to_email: str = "",
    subject: str = "MoSJE • NHAA 14566 Proactive Check-in & Protection Alert",
    body_text: str = "",
    html_content: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send an email via SMTP (Gmail / Custom SMTP) or fallback to Twilio Comms Email API.
    """
    dest_email = to_email.strip() if to_email and "@" in to_email else DEFAULT_ALERT_EMAIL

    if not body_text:
        body_text = (
            "Namaste,\n\n"
            "This is a proactive support and safety check-in from the National Helpline Against Atrocities (14566).\n"
            "Our multi-agent monitoring system is actively following up on your case to ensure your family's safety, "
            "legal representation, and timely compensation relief under the SC/ST PoA Act.\n\n"
            "If you are facing intimidation, threats, or require counseling support, please contact your assigned "
            "district counselor or call 14566 anytime."
        )

    if not html_content:
        html_content = _build_default_html(subject, body_text)

    # ─────────────────────────────────────────────────────────────
    # Method 1: Brevo (Sendinblue) HTTPS API — Works on Render!
    # ─────────────────────────────────────────────────────────────
    brevo_key = os.getenv("BREVO_API_KEY", "").strip()
    if brevo_key:
        try:
            brevo_payload = {
                "sender": {
                    "name": FROM_NAME,
                    "email": os.getenv("SMTP_USER", "tripathianimesh456@gmail.com").strip()
                },
                "to": [{"email": dest_email}],
                "subject": subject,
                "htmlContent": html_content,
                "textContent": body_text
            }
            resp = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json"
                },
                json=brevo_payload,
                timeout=12
            )
            if resp.status_code in [200, 201, 202]:
                print(f"[Brevo Email] OK - Delivered to {dest_email} | MessageId: {resp.json().get('messageId', 'N/A')}")
                return {"success": True, "provider": "Brevo", "to": dest_email}
            else:
                print(f"[Brevo Email] Error {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            print(f"[Brevo Email] Exception: {e}")

    # ─────────────────────────────────────────────────────────────
    # Method 2: Direct SMTP (Gmail / Custom) - Local fallback
    # ─────────────────────────────────────────────────────────────

    active_user = (os.getenv("SMTP_USER") or SMTP_USER).strip()
    active_pass = (os.getenv("SMTP_PASS") or SMTP_PASS).replace(" ", "").strip()
    active_host = os.getenv("SMTP_HOST") or SMTP_HOST
    active_port = int(os.getenv("SMTP_PORT") or SMTP_PORT)

    if active_user and active_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{FROM_NAME} <{active_user}>"
            msg["To"] = dest_email

            part_text = MIMEText(body_text, "plain", "utf-8")
            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_text)
            msg.attach(part_html)

            server = smtplib.SMTP(active_host, active_port, timeout=12)
            server.ehlo()
            server.starttls()
            server.login(active_user, active_pass)
            server.sendmail(active_user, dest_email, msg.as_string())
            server.quit()

            print(f"[SMTP Email] Delivered 100% custom email to {dest_email}")
            return {"success": True, "provider": "Direct SMTP", "to": dest_email}
        except Exception as e:
            print(f"[SMTP Email] Error: {e}")

    # ─────────────────────────────────────────────────────────────
    # Method 2: Twilio Communications Email API (Fallback)
    # ─────────────────────────────────────────────────────────────
    if ACCOUNT_SID.startswith("AC") and len(AUTH_TOKEN) >= 32:
        try:
            url = "https://comms.twilio.com/v1/Emails"
            payload = {
                "from": {
                    "address": f"{ACCOUNT_SID}@twilio.email",
                    "name": "NHAA 14566 Legal Protection"
                },
                "to": [{"address": dest_email}],
                "content": {
                    "subject": "Reminder: Your Upcoming Appointment",
                    "html": "<p><b>This is an official check-in alert from the NHAA 14566 Support Team.</b></p><h2>NHAA 14566 Support Check-in</h2><p>This is a proactive well-being check-in regarding legal protection and psychological support under the SC/ST PoA Act.</p><p><strong>Status:</strong> Active Case Monitoring</p><p>If you or your family require immediate legal aid or protection, please dial 14566 anytime.</p><p>We look forward to seeing you safe and supported!</p>"
                }
            }
            resp = requests.post(url, auth=(ACCOUNT_SID, AUTH_TOKEN), json=payload, timeout=10)
            if resp.status_code in [200, 201, 202]:
                print(f"[Twilio Email] Delivered via Twilio Comms API to {dest_email}")
                return {"success": True, "provider": "Twilio Comms Email", "to": dest_email}
        except Exception as e:
            print(f"[Twilio Email] Error: {e}")

    # ─────────────────────────────────────────────────────────────
    # Method 3: Simulation Fallback
    # ─────────────────────────────────────────────────────────────
    print(f"[Email Notification] (Simulated to {dest_email})")
    print(f"  Subject: {subject}")
    return {"success": True, "simulated": True, "to": dest_email}
