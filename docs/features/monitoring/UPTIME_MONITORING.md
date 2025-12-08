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
| Dashboard (Vercel) | `https://greetnow.com` | HTTP 200 | 1 min |
| Signaling Server (Railway) | `https://ghost-greeterserver-production.up.railway.app/health` | HTTP 200 + JSON | 1 min |
| Supabase API | `https://sldbpqyvksdxsuuxqtgg.supabase.co/rest/v1/` | HTTP 200 | 3 min |
| Widget CDN | `https://greetnow.com/widget.js` | HTTP 200 | 3 min |

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
Check Frequency: 1 minute
Request Timeout: 30 seconds
Confirmation Period: 1 minute (wait before alerting)
HTTP Method: GET
Expected Status Code: 200

# Advanced
Regions: US East, US West, Europe (multi-region)
SSL Expiry Alert: 14 days before expiration
```

#### Monitor 2: Signaling Server Health

```
Name: Signaling Server - Health Check
URL: https://ghost-greeterserver-production.up.railway.app/health
Monitor Type: HTTP(s)
Check Frequency: 1 minute
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
Check Frequency: 1 minute
Request Timeout: 10 seconds
```

> **Note**: If Better Uptime doesn't support WebSocket monitors on free tier, skip this and rely on the HTTP health check.

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

## Incident Response

When an alert fires, follow this runbook to diagnose and resolve the issue efficiently.

### Quick Response Guide

| Alert Type | Immediate Actions | Escalate If |
|------------|-------------------|-------------|
| Dashboard Down | 1. Check Vercel dashboard for deployment status<br>2. Check DNS resolution (`dig greetnow.com`)<br>3. Review recent deploys | Down >5 min after rollback |
| Signaling Server Down | 1. Check Railway logs for errors<br>2. Verify Redis connection<br>3. Check health endpoint directly | Down >3 min or video calls failing |
| Supabase Down | 1. Check Supabase status page<br>2. Verify API key validity<br>3. Check for rate limiting | Provider issue or down >10 min |
| Widget CDN Down | 1. Check if file exists on CDN<br>2. Verify DNS/CDN configuration<br>3. Check recent widget deploys | Down >5 min or customer complaints |

### Detailed Runbooks by Service

#### Dashboard Down (greetnow.com)

**Common Causes:**
- Recent deployment failed
- Vercel platform issue
- DNS misconfiguration
- SSL certificate expired (rare with auto-renewal)

**Diagnostic Steps:**
```bash
# 1. Check if site resolves
dig greetnow.com

# 2. Check HTTP response
curl -I https://greetnow.com

# 3. Check SSL certificate expiry
echo | openssl s_client -servername greetnow.com -connect greetnow.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Resolution Steps:**
1. **If recent deployment:**
   - Go to Vercel dashboard → Deployments
   - Roll back to last known good deployment
   - Monitor for recovery (should be <2 min)

2. **If Vercel platform issue:**
   - Check [status.vercel.com](https://status.vercel.com)
   - If confirmed outage, acknowledge alert and monitor Vercel status
   - No action needed on our end

3. **If DNS issue:**
   - Verify DNS records at domain registrar
   - Check for recent DNS changes
   - Contact domain provider if needed

**Who Can Fix:** Any team member with Vercel deployment access

**When to Escalate:** If down >10 minutes and cause is unclear

---

#### Signaling Server Down (Railway)

**Common Causes:**
- Redis connection lost
- Memory/resource exhaustion
- Deployment issue
- Railway platform issue

**Diagnostic Steps:**
```bash
# 1. Check health endpoint directly
curl https://ghost-greeterserver-production.up.railway.app/health

# 2. Look for expected response
# Expected: {"status":"ok","timestamp":...,"redis":"connected","mode":"redis"}
```

**Resolution Steps:**
1. **If Redis disconnected:**
   - Check Railway dashboard → Redis service status
   - Restart Redis service if needed
   - Server should auto-reconnect within 30 seconds

2. **If server crashed:**
   - Check Railway logs for error messages
   - Look for OOM (out of memory) errors
   - Restart service via Railway dashboard
   - Consider scaling if resource limits hit

3. **If recent deployment:**
   - Roll back to previous deployment via Railway dashboard
   - Monitor logs during rollback

**Who Can Fix:** Team member with Railway admin access

**When to Escalate:**
- If video calls are actively failing for customers
- If server keeps crashing repeatedly (>3 times in 1 hour)
- If cause is unclear after 5 minutes

---

#### Supabase API Down

**Common Causes:**
- Supabase platform outage (rare)
- API key expired or revoked
- Rate limiting hit
- Database connection limit reached

**Diagnostic Steps:**
```bash
# 1. Check Supabase directly with API key
curl -H "apikey: YOUR_ANON_KEY" https://sldbpqyvksdxsuuxqtgg.supabase.co/rest/v1/

# 2. Check Supabase status page
# Visit: https://status.supabase.com
```

**Resolution Steps:**
1. **If Supabase platform issue:**
   - Check [status.supabase.com](https://status.supabase.com)
   - Acknowledge alert and monitor their status page
   - No immediate action needed - wait for Supabase to resolve

2. **If API key issue:**
   - Verify API key in Better Uptime matches Supabase dashboard
   - Regenerate key if needed (this will require updating all services)

3. **If rate limiting:**
   - Check Supabase dashboard for usage metrics
   - Identify if legitimate traffic spike or potential abuse
   - Consider upgrading plan if hitting legitimate limits

**Who Can Fix:** Team member with Supabase admin access

**When to Escalate:**
- If authentication is failing for users
- If outage >15 minutes with no Supabase status update
- If caused by unexpected traffic spike (potential attack)

---

#### Widget CDN Down

**Common Causes:**
- Recent widget deployment issue
- CDN cache problem
- DNS/routing issue
- File path changed without updating references

**Diagnostic Steps:**
```bash
# 1. Check if file exists and is valid JavaScript
curl https://greetnow.com/widget.js | head -20

# 2. Verify it contains expected code
curl -s https://greetnow.com/widget.js | grep -q "ghostGreeter" && echo "Widget code present" || echo "Widget code missing"
```

**Resolution Steps:**
1. **If file missing/corrupted:**
   - Check recent deployments to dashboard
   - Verify widget build process completed
   - Re-deploy dashboard to regenerate widget

2. **If CDN cache issue:**
   - Purge CDN cache (if using Cloudflare/similar)
   - Wait 2-3 minutes for cache to refresh
   - Test from multiple locations

3. **If deployment issue:**
   - Roll back dashboard deployment to restore working widget
   - Investigate build process for widget generation

**Who Can Fix:** Team member with dashboard deployment access

**When to Escalate:**
- If customer reports widget not loading
- If down >10 minutes and cause unclear

---

### Escalation Policy

#### When to Investigate vs. Page

**Investigate First (No Immediate Page):**
- Alert fires during normal work hours (9 AM - 6 PM)
- Service recovers within 2 minutes
- Known maintenance window
- Status page shows provider issue (Vercel, Railway, Supabase)

**Page Immediately:**
- Alert fires outside work hours AND doesn't auto-resolve within 3 minutes
- Multiple services down simultaneously
- Customer reports service unavailable
- Security-related alert (unusual traffic, breach attempt)

#### Escalation Chain

**Level 1 - First Responder (0-5 minutes):**
- On-call engineer acknowledges alert in Better Uptime
- Checks service status pages
- Reviews logs for obvious issues
- Attempts immediate fixes (rollback, restart)

**Level 2 - Technical Lead (5-15 minutes):**
- If issue not resolved or cause unclear
- Requires architectural knowledge
- Needs approval for major changes (scaling, provider failover)

**Level 3 - CTO/Founder (>15 minutes):**
- Major outage affecting all customers
- Requires vendor escalation (Railway, Supabase)
- Needs business decision (emergency scaling cost, maintenance mode)

---

### Communication Templates

#### Internal Communication (Slack)

When you start investigating an alert:
```
🔍 Investigating alert: [Service Name] down
Started: [time]
Current status: [checking logs/contacting vendor/rolling back]
ETA: [X] minutes
```

When resolved:
```
✅ Resolved: [Service Name] back online
Root cause: [brief explanation]
Fix applied: [what you did]
Downtime: [X] minutes
```

#### Customer Communication (If Needed)

For outages >10 minutes affecting customers:
```
Subject: Service Update - [Date]

We're currently experiencing an issue with [service name] that may affect [functionality].

Status: Investigating
Started: [time]
ETA: Working to resolve within [X] minutes

We'll update this thread as soon as we have more information.
```

---

### Post-Incident Checklist

After resolving any incident:

- [ ] Mark incident as resolved in Better Uptime
- [ ] Document root cause in incident notes
- [ ] If downtime >15 minutes, write brief post-mortem
- [ ] Update runbook if new issue type encountered
- [ ] Check if monitoring needs adjustment
- [ ] Create ticket for permanent fix if workaround used

---

### Common False Alarms

**Alert fires but service is actually up:**
- Better Uptime check from specific region failed
- Temporary network hiccup (<1 minute)
- SSL certificate renewal in progress (Let's Encrypt validation)

**Action:** Acknowledge alert, verify service is working from multiple locations, add note to incident

---

### Emergency Contacts

| Role | Contact | When to Use |
|------|---------|-------------|
| On-Call Engineer | [Phone/Slack] | First contact for all alerts |
| Technical Lead | [Phone/Slack] | Escalation after 10 min |
| CTO | [Phone] | Major outages >15 min |
| Railway Support | support@railway.app | Platform issues |
| Supabase Support | Via dashboard | Database issues |
| Vercel Support | Via dashboard | Dashboard deployment issues |

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

