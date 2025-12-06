# External Uptime Monitoring Setup

> **Status**: Ready to implement  
> **Provider**: Better Uptime (recommended)  
> **Last Updated**: December 2024

## Overview

External uptime monitoring detects and alerts when production services go down. This operates independently of our services - if everything crashes, we still get alerted.

### Why This Matters

Current observability gaps this addresses:
- Sentry catches errors but won't alert if server is completely unreachable
- Railway/Vercel dashboards require manual checking
- No alerting if SSL certificates expire, DNS fails, or cloud provider has outage
- No historical uptime data for SLA reporting

---

## Production Services to Monitor

| Service | URL | Check Type | Frequency |
|---------|-----|------------|-----------|
| Dashboard (Vercel) | `https://greetnow.com` | HTTP 200 | 3 min |
| Signaling Server (Railway) | `https://ghost-greeterserver-production.up.railway.app/health` | HTTP 200 + JSON | 3 min |
| Supabase API | `https://sldbpqyvksdxsuuxqtgg.supabase.co/rest/v1/` | HTTP 200 | 3 min |
| Widget CDN | `https://greetnow.com/widget.js` | HTTP 200 | 3 min |

> **Note**: All monitors use 3-minute check frequency, which is the free tier limit. Upgrading to 1-minute checks costs $20/mo.

---

## Provider: Better Uptime

### Why Better Uptime
- **Free tier**: 10 monitors, 3-minute intervals, unlimited alerts
- Clean UI with status pages included
- Slack/Email/SMS/Phone call escalations
- Incident management built-in
- No credit card required for free tier

### Alternatives
| Provider | Free Tier | Notes |
|----------|-----------|-------|
| UptimeRobot | 50 monitors, 5-min intervals | Good alternative |
| Checkly | Limited | Better for complex API checks |
| Pingdom | None | Enterprise, expensive |

---

## Implementation Steps

### Step 1: Create Better Uptime Account

1. Go to [betteruptime.com](https://betteruptime.com)
2. Sign up with GitHub (recommended) or email
3. Organization name: **GreetNow**

---

### Step 2: Configure Monitors

#### Monitor 1: Dashboard (greetnow.com)

```
Name: Dashboard - greetnow.com
URL: https://greetnow.com
Monitor Type: HTTP(s)
Check Frequency: 3 minutes
Request Timeout: 30 seconds
Confirmation Period: 1 minute (wait before alerting)
HTTP Method: GET
Expected Status Code: 200

# Advanced
Regions: US East, US West, Europe (multi-region)
SSL Expiry Alert: 14 days before expiration
```

> **Note**: 3-minute check frequency is the free tier limit.

#### Monitor 2: Signaling Server Health

```
Name: Signaling Server - Health Check
URL: https://ghost-greeterserver-production.up.railway.app/health
Monitor Type: HTTP(s)
Check Frequency: 3 minutes
Request Timeout: 10 seconds
Confirmation Period: 1 minute
HTTP Method: GET
Expected Status Code: 200

# Response validation
Expected Response Body Contains: "ok"

# OR for JSON validation:
JSON Path: $.status
Expected Value: ok
```

> **Note**: 3-minute check frequency is the free tier limit.

> **Note**: The health endpoint returns `status: "ok"` not `"healthy"`. The response includes:
> ```json
> {
>   "status": "ok",
>   "timestamp": 1701619200000,
>   "redis": "connected",
>   "mode": "redis"
> }
> ```

#### Monitor 3: Signaling Server WebSocket (Optional)

```
Name: Signaling Server - WebSocket
URL: wss://ghost-greeterserver-production.up.railway.app/socket.io/?EIO=4&transport=websocket
Monitor Type: WebSocket
Check Frequency: 3 minutes
Request Timeout: 10 seconds
```

> **Note**: 3-minute check frequency is the free tier limit. If Better Uptime doesn't support WebSocket monitors on free tier, skip this and rely on the HTTP health check.

#### Monitor 4: Supabase API

```
Name: Supabase API
URL: https://sldbpqyvksdxsuuxqtgg.supabase.co/rest/v1/
Monitor Type: HTTP(s)
Check Frequency: 3 minutes
Request Timeout: 10 seconds
HTTP Method: GET
Expected Status Code: 200

Headers:
  apikey: [YOUR-SUPABASE-ANON-KEY]
```

> **Get your anon key from**: Supabase Dashboard → Settings → API → `anon` `public` key

#### Monitor 5: Widget JavaScript

```
Name: Widget CDN - widget.js
URL: https://greetnow.com/widget.js
Monitor Type: HTTP(s)
Check Frequency: 3 minutes
Request Timeout: 10 seconds
Expected Status Code: 200
Expected Response Body Contains: ghostGreeter
```

---

### Step 3: Configure Alert Escalation

#### Escalation Policy

```
Name: Production Critical
Description: Alert for any production service down

Step 1 (Immediate):
  - Slack channel: #alerts-production
  - Email: ryan@greetnow.com (or team distribution list)

Step 2 (After 5 minutes unacknowledged):
  - SMS: +1-xxx-xxx-xxxx (on-call number)

Step 3 (After 15 minutes unacknowledged):
  - Phone call: +1-xxx-xxx-xxxx
```

#### Slack Integration

1. Better Uptime → Integrations → Slack
2. Connect to your Slack workspace
3. Select channel: `#alerts-production` (create if needed)
4. Test the integration

---

### Step 4: Create Status Page (Optional but Recommended)

Better Uptime includes free status pages:

```
Status Page URL: status.greetnow.com (or greetnow.betteruptime.com)
Name: GreetNow Status

Components:
  - Dashboard (greetnow.com)
  - Video Calling (Signaling Server)
  - Database (Supabase)
  - Widget (CDN)

Settings:
  - Show uptime percentage: Yes
  - Show response time graph: Yes
  - Allow incident subscriptions: Yes
```

#### DNS Setup (if using custom domain)

Add a CNAME record:
```
CNAME status.greetnow.com → statuspage.betteruptime.com
```

---

### Step 5: Configure Maintenance Windows

For planned deploys:

```
Name: Weekly Deploy Window
Schedule: Tuesdays 2:00 AM - 3:00 AM UTC
Affected Monitors: All
Notifications: Suppress during window
```

---

## Alert Message Templates

### Slack Alert Format

```
🔴 *INCIDENT: Dashboard Down*
━━━━━━━━━━━━━━━━━━━━━
*Monitor:* Dashboard - greetnow.com
*Status:* DOWN (HTTP 503)
*Started:* 2024-12-03 14:32 UTC
*Duration:* 2 minutes

*Check URL:* https://greetnow.com
*Response:* 503 Service Unavailable

[View Incident](https://betteruptime.com/...)
```

### Recovery Alert

```
✅ *RESOLVED: Dashboard Back Online*
━━━━━━━━━━━━━━━━━━━━━
*Monitor:* Dashboard - greetnow.com
*Status:* UP (HTTP 200)
*Downtime:* 4 minutes
*Resolved:* 2024-12-03 14:36 UTC
```

---

## Environment Variables

Add to team documentation / password manager:

```bash
# Better Uptime
BETTER_UPTIME_API_KEY=xxxx  # For API access if needed
STATUS_PAGE_URL=status.greetnow.com

# Alert Contacts
ON_CALL_PHONE=+1-xxx-xxx-xxxx
ALERT_EMAIL=alerts@greetnow.com
SLACK_ALERTS_CHANNEL=#alerts-production
```

---

## Verification Checklist

After setup, verify everything works:

- [ ] Dashboard monitor shows "UP" with green status
- [ ] Signaling server monitor shows "UP"
- [ ] Supabase monitor shows "UP"
- [ ] Widget CDN monitor shows "UP"
- [ ] Test alert sent to Slack successfully
- [ ] Test alert sent to email successfully
- [ ] Status page accessible at configured URL
- [ ] SSL expiry alerts configured (14+ days warning)

---

## Testing the Alerts

**Controlled test:**

1. Go to Better Uptime → Monitors → Dashboard
2. Click "Test" or "Pause" the monitor
3. Verify Slack/email alert arrives within 2 minutes
4. Resume monitor
5. Verify "Resolved" alert arrives

⚠️ **DO NOT test by actually breaking production.**

---

## Ongoing Maintenance

| Task | Frequency | Owner |
|------|-----------|-------|
| Review uptime reports | Weekly | On-call engineer |
| Update escalation contacts | When team changes | Admin |
| Review and close incidents | As they occur | On-call engineer |
| SSL cert renewal | Auto (Let's Encrypt) or 30 days before expiry | DevOps |

---

## Cost Analysis

### Better Uptime Free Tier ✅

- 10 monitors ✅ (we need 4-5)
- 3-minute check frequency ✅
- Unlimited alerts ✅
- 1 status page ✅
- Email + Slack integrations ✅

### Upgrade Triggers

| Feature | Cost |
|---------|------|
| 1-minute checks on all monitors | $20/mo |
| Phone call escalations | $20/mo |
| Multiple status pages | $20/mo |

---

## Quick Reference

### Production URLs

| Service | URL |
|---------|-----|
| Dashboard | https://greetnow.com |
| Signaling Server | https://ghost-greeterserver-production.up.railway.app |
| Health Check | https://ghost-greeterserver-production.up.railway.app/health |
| Supabase | https://sldbpqyvksdxsuuxqtgg.supabase.co |
| Widget | https://greetnow.com/widget.js |

### Health Check Response Format

```json
{
  "status": "ok",
  "timestamp": 1701619200000,
  "redis": "connected",
  "mode": "redis"
}
```

---

## Acceptance Criteria

- [ ] 4+ monitors configured and showing "UP"
- [ ] Slack alerts working (test verified)
- [ ] Email alerts working (test verified)
- [ ] Escalation policy configured with correct contacts
- [ ] Status page live and accessible
- [ ] Documentation updated with monitor URLs and credentials

---

## Estimated Time

| Task | Duration |
|------|----------|
| Initial setup | 30-45 minutes |
| Slack integration | 10 minutes |
| Status page | 15 minutes |
| Testing & verification | 15 minutes |
| **Total** | ~1.5 hours |

