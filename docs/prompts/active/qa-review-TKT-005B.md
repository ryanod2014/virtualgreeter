# QA Review Assignment: TKT-005b

## Ticket Details

**ID:** TKT-005b
**Title:** Create Payment Failure Blocking Modal
**Branch:** agent/tkt-005b
**Priority:** Critical
**Vercel Preview:** https://virtualgreeter-git-agent-tkt-005b-ryanod2014.vercel.app

## Your Mission

Test the Payment Failure Blocking Modal feature. This modal should:
1. Block dashboard access when org subscription_status is 'past_due'
2. Show different UI for admins vs agents
3. Be impossible to dismiss without fixing payment

## Acceptance Criteria to Verify

1. ✅ Full-screen modal appears when org status is 'past_due'
2. ✅ Admins see 'Update Payment Method' button
3. ✅ Agents see read-only message directing them to contact admin
4. ✅ Modal cannot be dismissed without resolving payment

## STEP-BY-STEP: Create Test Account & Magic Link

### Step 1: Create Test User in Supabase

```bash
SUPABASE_URL="https://sldbpqyvksdxsuuxqtgg.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZGJwcXl2a3NkeHN1dXhxdGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzAyNDAsImV4cCI6MjA3OTk0NjI0MH0.g-RSB0IzTtNibzeE3UL-CCEYX95BzipiHSzlQeZtHw4"

# Create test user
curl -s -X POST "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-tkt-005b-v2@greetnow.test",
    "password": "QATest005bV2Pass!",
    "data": {"full_name": "QA Test TKT-005b"}
  }' | jq .

# SAVE the user.id from response!
```

### Step 2: Set Organization to past_due

After user is created and you have their org ID, set subscription_status:

```bash
# Get user's org (login once to auto-create org, or query profiles table)
# Then update the org:
curl -X PATCH "${SUPABASE_URL}/rest/v1/organizations?id=eq.<ORG_ID>" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"subscription_status": "past_due"}'
```

### Step 3: Browser Test on Vercel Preview

Test on the VERCEL PREVIEW URL (not localhost!):

```
1. Navigate to: https://virtualgreeter-git-agent-tkt-005b-ryanod2014.vercel.app
2. Login with test user: qa-tkt-005b-v2@greetnow.test / QATest005bV2Pass!
3. Verify PaymentBlocker modal appears
4. Take screenshots
5. Test edge cases (ESC key, click backdrop - should NOT dismiss)
```

### Step 4: Generate Magic Link (Use Vercel Preview URL!)

```bash
curl -X POST http://localhost:3456/api/v2/review-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-005b",
    "user_email": "qa-tkt-005b-v2@greetnow.test",
    "user_password": "QATest005bV2Pass!",
    "redirect_path": "/dashboard",
    "preview_base_url": "https://virtualgreeter-git-agent-tkt-005b-ryanod2014.vercel.app"
  }'
```

### Step 5: Submit to PM Inbox

```bash
curl -X POST http://localhost:3456/api/v2/inbox \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-005b",
    "type": "ui_review",
    "message": "PaymentBlocker Modal - Ready for PM review",
    "branch": "agent/tkt-005b",
    "files": ["apps/dashboard/src/components/PaymentBlocker.tsx"],
    "magic_url": "<MAGIC_URL_FROM_STEP_4>",
    "redirect_path": "/dashboard",
    "state_setup": "org subscription_status=past_due"
  }'
```

### Step 6: Update Ticket Status

```bash
./scripts/agent-cli.sh update-ticket TKT-005b --status needs_pm_review
```

## Files to Check

- `apps/dashboard/src/components/PaymentBlocker.tsx` - The modal component
- `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx` - Checks org status

## Edge Cases to Test

- Empty org (no subscription data) → Should NOT show blocker
- Active org → Should NOT show blocker  
- past_due org → MUST show blocker
- Modal dismissal attempts (ESC, backdrop click, back button) → Should NOT work

## Read the SOP First!

```bash
cat docs/workflow/QA_REVIEW_AGENT_SOP.md
```

Good luck! 🚀
