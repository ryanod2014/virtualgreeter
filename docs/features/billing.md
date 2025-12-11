# Billing & Paywall System

## Overview

Ghost-Greeter uses Stripe for subscription billing with a mandatory paywall that requires users to provide payment information before accessing the product. The system supports monthly, annual, and 6-month billing frequencies with a 7-day free trial.

---

## Paywall Timeline & Status

### Current Status (as of December 2025)

**⚠️ PAYWALL IS CURRENTLY DISABLED FOR BETA TESTING**

The paywall is temporarily bypassed to allow beta users to test the product without billing friction. This is controlled by code in `apps/dashboard/src/app/(auth)/signup/page.tsx:62`:

```typescript
// TODO: Re-enable paywall redirect once billing is set up
window.location.href = "/admin";  // Currently bypasses paywall
// Should be: window.location.href = "/paywall";
```

### Timeline for Paywall Enablement

| Phase | Status | Timeline | Action |
|-------|--------|----------|--------|
| **Beta Testing** | ✅ Current | Now | Paywall disabled, users go directly to dashboard |
| **Billing Integration Complete** | ⏳ In Progress | Q1 2025 | Stripe integration tested and verified |
| **Pre-Launch QA** | ⏳ Pending | Before public launch | Run full billing test scenarios |
| **Public Launch** | 🎯 Target | Q1 2025 | **Paywall must be enabled** |

**CRITICAL:** The paywall MUST be enabled before public launch to prevent revenue loss.

### When to Enable the Paywall

Enable the paywall when ALL of the following conditions are met:

1. ✅ **Stripe Integration Complete**
   - Stripe account configured with production keys
   - Webhook endpoint verified and tested
   - All three price IDs configured (monthly, annual, 6-month)

2. ✅ **Payment Flow Tested**
   - Card entry and validation working
   - SetupIntent creation successful
   - Subscription creation completing without errors
   - Trial period starting correctly

3. ✅ **Billing Logic Verified**
   - Seat management working correctly
   - Automatic billing expansion functioning
   - Invoice webhooks updating subscription status
   - Subscription cancellation flow tested

4. ✅ **Beta Testing Complete**
   - All beta users have been onboarded
   - Beta feedback has been incorporated
   - No critical bugs remaining in billing flow

5. ✅ **Ready for Public Launch**
   - Legal pages (Terms, Privacy Policy) published
   - Support system ready for billing questions
   - Refund policy documented
   - Team trained on billing support

---

## How to Enable the Paywall

### Step 1: Update Signup Flow

**File:** `apps/dashboard/src/app/(auth)/signup/page.tsx`

**Current Code (line 62-63):**
```typescript
// TODO: Re-enable paywall redirect once billing is set up
window.location.href = "/admin";
```

**Change To:**
```typescript
// Redirect to paywall for payment information
window.location.href = "/paywall";
```

### Step 2: Verify Environment Variables

Ensure all required environment variables are set in production:

**Dashboard (Vercel):**
```bash
# Stripe Configuration (REQUIRED)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # NOT pk_test_xxx
STRIPE_SECRET_KEY=sk_live_xxx                   # NOT sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (REQUIRED)
STRIPE_MONTHLY_PRICE_ID=price_monthly_xxx
STRIPE_ANNUAL_PRICE_ID=price_annual_xxx
STRIPE_SIX_MONTH_PRICE_ID=price_six_month_xxx

# URLs
NEXT_PUBLIC_APP_URL=https://app.ghost-greeter.com
NEXT_PUBLIC_SIGNALING_SERVER=https://api.ghost-greeter.com
```

**Server (Railway):**
```bash
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Run Pre-Launch Checklist

Before enabling the paywall, complete this checklist:

- [ ] **Stripe Account**
  - [ ] Account verified and activated for live payments
  - [ ] Bank account connected for payouts
  - [ ] Business details completed

- [ ] **Stripe Products**
  - [ ] Monthly product created ($297/seat/month)
  - [ ] Annual product created ($2,316/seat/year)
  - [ ] 6-month product created ($1,068/seat/6-months)
  - [ ] All price IDs added to environment variables

- [ ] **Webhooks**
  - [ ] Webhook endpoint configured: `https://api.ghost-greeter.com/api/webhooks/stripe`
  - [ ] Webhook secret added to environment variables
  - [ ] Test webhook delivery successful
  - [ ] All required events enabled:
    - [ ] `invoice.paid`
    - [ ] `invoice.payment_failed`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`

- [ ] **Testing**
  - [ ] Test card flow works end-to-end
  - [ ] Trial period starts correctly (7 days)
  - [ ] Subscription activates after trial
  - [ ] Failed payment handling works
  - [ ] Cancellation flow works
  - [ ] Seat management triggers billing correctly

- [ ] **Legal & Support**
  - [ ] Terms of Service published
  - [ ] Privacy Policy published
  - [ ] Refund policy documented
  - [ ] Support team trained on billing questions

- [ ] **Code Changes**
  - [ ] Signup page redirect updated (see Step 1)
  - [ ] All environment variables set in production
  - [ ] Changes deployed to production
  - [ ] Deployment verified

### Step 4: Deploy Changes

1. **Commit the change:**
   ```bash
   git add apps/dashboard/src/app/(auth)/signup/page.tsx
   git commit -m "Enable paywall for public launch"
   git push origin main
   ```

2. **Verify deployment:**
   - Vercel auto-deploys from `main` branch
   - Check deployment logs for success
   - Test signup flow in production

3. **Monitor initial signups:**
   - Watch Stripe dashboard for first payments
   - Monitor webhook delivery
   - Check for any error alerts

### Step 5: Rollback Plan

If issues are discovered after enabling:

1. **Quick Rollback (5 minutes):**
   ```bash
   # Revert the commit
   git revert HEAD
   git push origin main
   ```

2. **Temporary Bypass (Emergency):**
   - Add environment variable: `SKIP_PAYWALL=true`
   - Update code to check this variable
   - Deploy immediately

3. **Communication:**
   - Notify affected users via email
   - Post status update on dashboard
   - Provide timeline for resolution

---

## Environment Variables Reference

### Required for Paywall

| Variable | Environment | Required | Purpose |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Dashboard (Vercel) | Yes | Client-side Stripe initialization |
| `STRIPE_SECRET_KEY` | Dashboard + Server | Yes | Server-side Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | Server (Railway) | Yes | Webhook signature verification |
| `STRIPE_MONTHLY_PRICE_ID` | Dashboard (Vercel) | Yes | Monthly billing price |
| `STRIPE_ANNUAL_PRICE_ID` | Dashboard (Vercel) | Yes | Annual billing price |
| `STRIPE_SIX_MONTH_PRICE_ID` | Dashboard (Vercel) | Yes | 6-month billing price |

### Optional Variables

| Variable | Environment | Required | Purpose |
|----------|-------------|----------|---------|
| `SKIP_PAYWALL` | Dashboard (Vercel) | No | Emergency bypass flag (not implemented yet) |

---

## Monitoring & Alerts

### Key Metrics to Monitor

After enabling the paywall, monitor these metrics:

1. **Conversion Rate**
   - Signups → Paywall visits
   - Paywall visits → Payment method added
   - Payment method added → Subscription created

2. **Error Rates**
   - Failed card validations
   - Failed subscription creations
   - Webhook delivery failures

3. **Revenue Metrics**
   - Trial starts per day
   - Trial conversions to paid
   - Churn rate
   - MRR (Monthly Recurring Revenue)

### Recommended Alerts

Set up alerts in Stripe Dashboard:

- Failed payment rate > 5%
- Webhook delivery failure
- Subscription cancellation spike
- Dispute opened

---

## Related Documentation

- [Billing API (API2)](./api/billing-api.md) - API endpoints for billing operations
- [Billing Frequency (B3)](./billing/billing-frequency.md) - Switching between monthly/annual/6-month
- [Seat Management (B2)](./billing/seat-management.md) - Managing team seats
- [Subscription Creation (B1)](./billing/subscription-creation.md) - Initial subscription setup
- [Signup Flow (AUTH1)](./auth/signup-flow.md) - User signup and onboarding

---

## Troubleshooting

### Paywall Not Showing After Enablement

**Symptoms:** Users redirected to `/admin` instead of `/paywall`

**Causes:**
1. Code change not deployed
2. CDN/cache serving old version
3. Environment variable overriding behavior

**Solutions:**
1. Verify deployment completed successfully
2. Clear Vercel edge cache
3. Check for `SKIP_PAYWALL` environment variable

### Users Stuck on Paywall

**Symptoms:** Users can't proceed past payment form

**Causes:**
1. Stripe keys not configured correctly
2. SetupIntent creation failing
3. Network/CORS issues

**Solutions:**
1. Verify Stripe keys are `pk_live_*` and `sk_live_*` (not test keys)
2. Check server logs for SetupIntent errors
3. Verify CORS settings allow Stripe.js

### Subscription Not Creating

**Symptoms:** Payment accepted but subscription status stays "pending"

**Causes:**
1. Missing price IDs in environment
2. Webhook not receiving events
3. Database update failing

**Solutions:**
1. Verify all three price IDs are set
2. Test webhook endpoint manually
3. Check database RLS policies

---

## Security Considerations

### PCI Compliance

- ✅ Card data never touches our servers (Stripe Elements handles all card input)
- ✅ No card numbers stored in database
- ✅ Stripe.js served directly from Stripe CDN

### Webhook Security

- ✅ All webhooks verify signature using `STRIPE_WEBHOOK_SECRET`
- ✅ Replay attacks prevented by Stripe's signature algorithm
- ✅ Failed signature verification returns 400 error

### Access Control

- ✅ Billing operations require authentication
- ✅ Organization ID derived from user's profile (not request body)
- ✅ Admin-only operations check user role

---

## Open Questions & Future Improvements

1. **Should there be an emergency bypass flag?** Consider adding `SKIP_PAYWALL` environment variable for emergency scenarios.

2. **What about grandfathered beta users?** Should beta users get a special pricing tier or lifetime deal?

3. **Is the paywall too early in funnel?** Consider A/B testing paywall placement vs. delayed payment collection.

4. **Should we support payment plans?** Some customers may request installment payments for annual billing.

5. **What about international payments?** Stripe handles currency conversion, but pricing may need adjustment for different markets.
