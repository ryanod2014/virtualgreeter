# Launch Checklist

## Stripe Billing
- [ ] Switch to live Stripe keys in Vercel (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- [ ] Create seat-based price in Stripe Dashboard
- [ ] Set `STRIPE_SEAT_PRICE_ID` to the live price ID
- [ ] Create separate prices for annual & 6-month billing (optional, can use same price initially)
- [ ] Create Stripe webhook handler (`/api/stripe/webhook`)
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Vercel after creating webhook endpoint
- [ ] Enable paywall redirect in signup flow (`apps/dashboard/src/app/(auth)/signup/page.tsx` line 63)

## Legal
- [ ] Create `/terms` page (Terms of Service)
- [ ] Create `/privacy` page (Privacy Policy)

## Widget
- [ ] Get widget working on mobile (visitor perspective)

## Content / Videos
- [ ] Create default videos for filming examples
- [ ] Update default video on landing page

## QA
- [ ] Test full billing flow end-to-end (signup → paywall → seats → billing → dashboard)
- [ ] Test card entry with Stripe test cards before going live
- [ ] Test subscription creation and trial period
- [ ] Test webhook receives events correctly
- [ ] Verify billing settings page shows correct data

## Domains
- [ ] Set up custom domain for Vercel (e.g., app.greetnow.com)
- [ ] Set up custom sending domain for Resend (for email deliverability)

## Resend Emails

### To Do
- [ ] Welcome email (sent immediately after signup)
- [ ] Invite accepted notification (notify admin when invitee joins)
- [ ] Trial ending reminder (3 days before trial ends)
- [ ] Payment failed notification
- [ ] Subscription paused confirmation
- [ ] Subscription resumed confirmation
- [ ] Subscription cancelled confirmation

### Onboarding Sequence (Quick Start Flow)
Drip emails to nudge users through each setup step if not completed:

- [ ] **Day 1**: "Install your widget" — Guide to Step 1 (embed code)
- [ ] **Day 2**: "Add your first agent" — Guide to Step 2 (if widget installed but no agents)
- [ ] **Day 3**: "Set up your first pool" — Guide to Step 3 (if agents added but no pools)
- [ ] **Day 4**: "Track your conversions" — Guide to Step 4 (dispositions setup)
- [ ] **Day 5**: "You're all set! Here's how to get your first call" — Final tips

*Logic: Skip emails for steps already completed. Stop sequence when all 4 steps done.*

### Ideas (Future)
- Weekly activity summary for admins (calls, conversions, agent performance)
- Monthly ROI report (calls → conversions → estimated value)
- "No agents online" alert during business hours
- Missed call digest (daily summary of missed opportunities)
- Re-engagement email if no logins for 7+ days
- Tips & best practices series (how to convert more calls, video tips, etc.)
- NPS/feedback request after X calls completed

## Optional / Nice-to-Have
- [ ] Set up Deepgram for call transcription ($0.01/min)
- [ ] Set up OpenAI for AI summaries ($0.02/min)
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring

