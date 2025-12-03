# Agent Credentials (GITIGNORED - DO NOT COMMIT)

> **This file contains actual login credentials for agents to use.**
> **It is gitignored and should NEVER be committed.**

---

## How Agents Use This

1. Before browser task requiring login, check this file
2. Use credentials to log in
3. If credential missing or expired, report to findings file

---

## Development & Hosting

### Vercel
- **URL:** https://vercel.com/login
- **Email:** [ADD]
- **Password:** [ADD]
- **2FA:** [Yes/No] - If yes, agent will request human help
- **Notes:** [Any special instructions]

### Railway
- **URL:** https://railway.app/login
- **Email:** [ADD]
- **Password:** [ADD]
- **2FA:** [Yes/No]
- **Notes:** 

### Supabase
- **URL:** https://app.supabase.com
- **Email:** [ADD]
- **Password:** [ADD]
- **2FA:** [Yes/No]
- **Notes:** 

### GitHub
- **URL:** https://github.com/login
- **Username:** [ADD]
- **Password:** [ADD]
- **2FA:** [Yes/No] - Usually yes, agent will need human help
- **Notes:** Consider using personal access token instead

---

## Payment & Billing

### Stripe Dashboard
- **URL:** https://dashboard.stripe.com
- **Email:** [ADD]
- **Password:** [ADD]
- **2FA:** [Yes/No]
- **Notes:** Use test mode for testing

---

## Communication

### Resend
- **URL:** https://resend.com/login
- **Email:** [ADD]
- **Password:** [ADD]
- **Notes:** 

---

## Monitoring

### Sentry
- **URL:** https://sentry.io/auth/login/
- **Email:** [ADD]
- **Password:** [ADD]
- **Notes:** 

---

## Third-Party APIs

### Deepgram
- **API Key:** [ADD]
- **Dashboard URL:** https://console.deepgram.com
- **Notes:** 

### OpenAI
- **API Key:** [ADD]
- **Dashboard URL:** https://platform.openai.com
- **Notes:** 

### Facebook Business
- **URL:** https://business.facebook.com
- **Email:** [ADD]
- **Password:** [ADD]
- **2FA:** Usually yes
- **Notes:** Agent will need human help for 2FA

---

## When Credentials Don't Work

If an agent tries a credential and it fails:
1. Agent reports to findings file with `CRED-FAILED`
2. PM alerts human
3. Human updates this file
4. Agent retries

---

## Last Updated

**Date:** [UPDATE WHEN YOU CHANGE THIS]
**By:** [YOUR NAME]

