# Credentials Agents May Need

> **This file is CHECKED INTO GIT** - it lists what credentials exist, not the actual values.
> **Actual credentials are in `credentials.md`** which is GITIGNORED.

---

## How This Works

1. **Agents check `credentials.md`** for login info before browser tasks
2. **If credential is missing**, agent adds to findings file:
   ```
   ### CRED-NEEDED: [Platform]
   **Blocking:** [Ticket ID]
   **What's needed:** [login/API key/etc]
   ```
3. **PM alerts human** to add the credential
4. **Human adds to `credentials.md`**, PM notifies agent to continue

---

## Credentials Inventory

### Development & Hosting

| Platform | Type | Status | Used For |
|----------|------|--------|----------|
| Vercel | Login | ⬜ Not Added | Dashboard deployment, env vars |
| Railway | Login | ⬜ Not Added | Server deployment |
| Supabase | Login | ⬜ Not Added | Database management |
| GitHub | Login | ⬜ Not Added | Repo access, PRs |

### Payment & Billing

| Platform | Type | Status | Used For |
|----------|------|--------|----------|
| Stripe Dashboard | Login | ⬜ Not Added | Payment testing, webhook config |

### Communication

| Platform | Type | Status | Used For |
|----------|------|--------|----------|
| Resend | Login | ⬜ Not Added | Email service config |

### Monitoring

| Platform | Type | Status | Used For |
|----------|------|--------|----------|
| Sentry | Login | ⬜ Not Added | Error tracking |

### Third-Party APIs

| Platform | Type | Status | Used For |
|----------|------|--------|----------|
| Deepgram | API Key | ⬜ Not Added | Transcription |
| OpenAI | API Key | ⬜ Not Added | AI summaries |
| Facebook Business | Login | ⬜ Not Added | CAPI, pixel config |

---

## Status Key

- ⬜ Not Added - Credential not in `credentials.md` yet
- ✅ Available - Credential exists and is current
- ⚠️ Expired - Needs refresh
- 🔒 2FA Required - Human must complete 2FA

---

## To Add a New Credential

1. Add entry to this file (the inventory above)
2. Add actual credential to `credentials.md`
3. Update status to ✅

## Security Notes

- `credentials.md` is gitignored - NEVER commit it
- Rotate credentials if you suspect exposure
- Use app-specific passwords where possible
- For 2FA platforms, agents will request human help

