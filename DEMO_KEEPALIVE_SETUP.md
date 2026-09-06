# Render Cold-Start Mitigation — UptimeRobot Keep-Alive Setup
# Step 5 of the Webhook Diagnostic

## The problem
Render free tier spins down after ~15 minutes of inactivity. On demo day, if no
one has hit the server in a few minutes, the first incoming WhatsApp message will
experience a ~30-50s cold start before a reply arrives — Twilio will time out
and fall back to the generic auto-reply, making it look like the webhook doesn't work.

## Solution: UptimeRobot (free, no credit card)

1. Go to https://uptimerobot.com → Sign up (free tier allows 50 monitors)
2. Click "Add New Monitor"
3. Set:
   - Monitor Type: HTTP(s)
   - Friendly Name: Nyaya-Sakhi Render Keep-Alive
   - URL: https://nyaya-sakhi-tszb.onrender.com/api/health
   - Monitoring Interval: Every 5 minutes
4. Click "Create Monitor"

That's it. UptimeRobot pings /api/health every 5 minutes from outside,
keeping Render warm 24/7, for free.

## Demo day morning checklist

Run this in the repo:
  python -m pytest tests/test_twilio_live.py -v -s

Then manually send from your phone to the Twilio Sandbox number:
  1. "What is Section 15A?" → expect a legal rights answer
  2. "I am scared and threatened" → expect calming response + 112/14566

Check:
  - Twilio Console → Monitor → Logs → Messaging → verify both messages show
    HTTP 200 delivered to webhook, not "Webhook timeout" or "No response"
  - Render Dashboard → Logs → confirm [WA-Inbound] log lines appear for both

## Alternative: cron-job.org (if UptimeRobot is blocked)

Go to https://cron-job.org → Free account → New cronjob:
  URL: https://nyaya-sakhi-tszb.onrender.com/api/health
  Schedule: Every 10 minutes
  Method: GET

Both work equally well. Set it up at least 30 minutes before the demo starts.

## Tier status
Current Render plan: FREE TIER (spins down after inactivity)
Recommendation: Upgrade to Render Starter ($7/month) for always-on
  if this project continues beyond SIH.
