# Feature: Seat Management (B2)

## Quick Summary
Seat management enables admins to add and remove agent seats with automatic Stripe proration. It uses a pre-paid seats model where the billing floor is set during initial setup, and billing auto-expands when usage exceeds purchased seats.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Seat management controls how many agents an organization can have. It handles the billing relationship between seat count and Stripe subscriptions, ensuring organizations are charged correctly as they grow or shrink their team.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Add team members quickly | Auto-expands billing when inviting agents beyond purchased seats |
| Admin | Control monthly costs | Can manually reduce seat count to lower billing |
| Admin | Understand current usage | Shows used vs purchased vs available seats |
| Admin | Flexible billing | Supports monthly, annual, and 6-month billing frequencies |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)

**Adding Agents (Implicit Seat Expansion):**
1. Admin invites a new agent via Team Management
2. System counts current usage (active agents + pending agent invites)
3. If usage exceeds purchased seats → billing auto-expands
4. Stripe subscription updated with proration
5. `org.seat_count` updated to new purchased count

**Manual Seat Adjustment:**
1. Admin opens Billing Settings
2. Uses +/- buttons or quick-select to set seat count
3. System validates new count >= current usage
4. Updates Stripe with proration
5. Updates database

### State Machine

```
                    PRE-PAID SEATS MODEL
                    
┌──────────────────────────────────────────────────────┐
│                  ORGANIZATION                        │
│                                                      │
│   seat_count = 5 (billing floor)                    │
│                                                      │
│   ┌─────────────────────────────────────────────┐   │
│   │ USED SEATS (3)                              │   │
│   │  • 2 active agents                          │   │
│   │  • 1 pending agent invite                   │   │
│   ├─────────────────────────────────────────────┤   │
│   │ AVAILABLE SEATS (2)                         │   │
│   │  Can invite 2 more agents without           │   │
│   │  increasing billing                         │   │
│   └─────────────────────────────────────────────┘   │
│                                                      │
│   ⚡ If admin invites 3+ more agents:               │
│      → seat_count auto-expands to match usage       │
│      → Stripe prorated charge created               │
└──────────────────────────────────────────────────────┘
```

### Seat Count States
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Under-capacity | usedSeats < purchasedSeats | Remove agent, revoke invite, or increase seat_count | Invite more agents |
| At-capacity | usedSeats == purchasedSeats | Inviting exactly fills seats | Add or remove agents |
| Over-capacity (triggers expansion) | usedSeats > purchasedSeats | Invite agent when at capacity | System auto-expands billing |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Agent invite (role=agent) | `/api/invites/send` | Calls `/api/billing/seats` with action: "add" | May expand billing, Stripe update |
| Invite revoked | `/api/invites/revoke` | Calls `/api/billing/seats` with action: "remove" | Frees seat (no billing reduction) |
| Agent removed | `/api/agents/remove` | Soft-deletes agent, calls seats API with action: "remove" | Frees seat (no billing reduction) |
| Manual seat change | `/api/billing/update-settings` | Updates seat_count directly | Stripe subscription item update |
| Billing settings UI | Billing Settings page | Displays seat controls | Calls update-settings API |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `POST /api/billing/seats` | `apps/dashboard/src/app/api/billing/seats/route.ts` | Core seat usage tracking, auto-expansion |
| `POST /api/billing/update-settings` | `apps/dashboard/src/app/api/billing/update-settings/route.ts` | Manual seat count changes |
| `BillingSettingsClient` | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | Admin UI for seat management |
| `PaywallStep2` (seats page) | `apps/dashboard/src/app/paywall/seats/page.tsx` | Initial seat selection during signup |
| `PRICING` | `apps/dashboard/src/lib/stripe.ts` | Centralized pricing constants |

### Data Flow

```
ADMIN INVITES AGENT
    │
    ├─► POST /api/invites/send
    │   ├─► Validate: admin, email, not duplicate
    │   └─► Create invite record in DB
    │
    ├─► POST /api/billing/seats { action: "add", quantity: 1 }
    │   │
    │   ├─► Count active agents (is_active = true)
    │   │   └─► SELECT COUNT(*) FROM agent_profiles WHERE org_id = ? AND is_active = true
    │   │
    │   ├─► Count pending agent invites
    │   │   └─► SELECT COUNT(*) FROM invites WHERE org_id = ? AND role = 'agent'
    │   │       AND accepted_at IS NULL AND expires_at > NOW()
    │   │
    │   ├─► currentUsedSeats = activeAgentCount + pendingInviteCount
    │   │
    │   ├─► newUsedSeats = currentUsedSeats + quantity
    │   │
    │   ├─► IF action === "add" AND newUsedSeats > 50:
    │   │   └─► ERROR: "Maximum seat limit is 50" (400)
    │   │
    │   ├─► needsExpansion = newUsedSeats > purchasedSeats?
    │   │
    │   └─► IF needsExpansion AND stripe configured:
    │       ├─► stripe.subscriptionItems.update(item_id, {
    │       │     quantity: newUsedSeats,
    │       │     proration_behavior: "create_prorations"
    │       │   })
    │       └─► UPDATE organizations SET seat_count = newUsedSeats
    │
    └─► Response: { success, usedSeats, purchasedSeats, availableSeats, billingExpanded }

ADMIN MANUALLY CHANGES SEAT COUNT
    │
    ├─► POST /api/billing/update-settings { seatCount: 10 }
    │
    ├─► Validate: seatCount >= currentUsage
    │   └─► IF seatCount < currentUsage → ERROR "Cannot reduce below usage"
    │
    ├─► IF seatCount != org.seat_count AND stripe configured:
    │   └─► stripe.subscriptionItems.update(item_id, {
    │         quantity: seatCount,
    │         proration_behavior: "create_prorations"
    │       })
    │
    └─► UPDATE organizations SET seat_count = seatCount
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - add agent with available seats | Invite agent | Seat used, no billing change | ✅ | |
| 2 | Add agent exceeding purchased seats | Invite when at capacity | Auto-expands billing, prorated charge | ✅ | |
| 3 | Remove agent | Admin removes agent | Soft delete, seat freed, no billing reduction | ✅ | PRE-PAID model |
| 4 | Revoke pending agent invite | Admin revokes | Invite deleted, seat freed, no billing reduction | ✅ | |
| 5 | Reduce seats to current usage | Manual in billing settings | Allowed, Stripe updated | ✅ | |
| 6 | Reduce seats below usage | Manual in billing settings | ERROR: "Cannot reduce below usage" | ✅ | Clear error message |
| 7 | Add admin invite | Invite with role=admin | No seat charged | ✅ | Admin role doesn't use seats |
| 8 | Invite billing fails | Stripe error during invite | Invite rolled back (deleted) | ✅ | Transactional |
| 9 | Dev mode (no Stripe) | Any seat operation | Updates seat_count only, no Stripe | ✅ | `devMode: true` in response |
| 10 | Multiple rapid seat changes | Admin clicks +/+ quickly | Each processed independently | ⚠️ | No debounce on API |
| 11 | Invite expires | Time passes | Expired invite not counted in usage | ✅ | `expires_at > NOW()` check |
| 12 | Quick-select preset value | Click "5" in UI | Sets seat count to 5 | ✅ | |
| 13 | Set seats to 0 | Manual attempt | Clamped to minimum 1 | ✅ | `Math.max(1, seatCount)` |
| 14 | Negative seat count | Malicious input | Clamped to minimum 1 | ✅ | |
| 15 | Float seat count | `seatCount: 2.5` | Floored to 2 | ✅ | `Math.floor()` |
| 16 | Exceed 50 seat limit | Add seats when total > 50 | ERROR: "Maximum seat limit is 50" | ✅ | Enforced in seats API |
| 17 | Organization at 50 seats | Try to add more seats | Blocked with error | ✅ | Grandfathered orgs > 50 can't add more |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| "Cannot reduce below usage" | Trying to set seats < used | Error message with current usage count | Remove agents/invites first |
| "Maximum seat limit is 50" | Trying to add seats > 50 total | Error message stating limit | Stay at or below 50 seats |
| "Failed to update seats" | Stripe API error | Generic error toast | Retry, check payment method |
| "Admin access required" | Non-admin tries to change | 403 error | Must be admin role |
| "Organization not found" | Invalid org state | 404 error | Contact support |
| "User already exists" | Invite duplicate email | Specific error message | Use different email |
| "Invalid request" | Missing action/quantity | 400 error | Include required fields |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Billing Settings Page:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Admin → Settings → Billing | Load seat info from DB | ✅ | |
| 2 | View current seat usage | Shows "X in use" + "Y available" | ✅ | Clear breakdown |
| 3 | Click "-" to reduce seats | Validates against usage, shows error if too low | ✅ | Good error message |
| 4 | Click "+" to add seats | Updates Stripe, shows loading spinner | ✅ | |
| 5 | Click quick-select button (1, 2, 3, 5, 10, 20) | Sets exact seat count | ✅ | Disabled if below usage |
| 6 | View proration note | Shows explanatory text | ✅ | Clear billing explanation |

**Signup Flow (Paywall/Seats):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View seat selector | Shows counter + quick buttons | ✅ | |
| 2 | Adjust seat count | Updates price preview | ✅ | Shows trial = $0, after = $X/mo |
| 3 | Click continue | Stores in localStorage, navigates | ✅ | |

### Accessibility
- Keyboard navigation: ✅ Buttons focusable, standard form controls
- Screen reader support: ⚠️ Counter value not announced on change
- Color contrast: ✅ Standard Tailwind colors
- Loading states: ✅ Loader2 spinner during updates

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| DB queries per seat operation | 2 COUNT queries (agents + invites) | ✅ Indexed |
| Stripe API calls | Single subscriptionItems.update per change | ✅ Minimal |
| UI responsiveness | Optimistic update with rollback | ✅ Good UX |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized seat changes | Admin role check on all endpoints |
| Cross-org manipulation | org_id derived from authenticated user's profile |
| Rate limiting | No explicit rate limit ⚠️ |
| Input validation | Type coercion (number), min/max bounds |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Stripe failure during invite | Rollback: delete invite if billing fails |
| Partial state update | Stripe updated before DB for seats route |
| Dev mode operation | Graceful fallback when no STRIPE_SECRET_KEY |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - "Used/Available/Purchased" seats is intuitive
2. **Is the control intuitive?** ✅ Yes - +/- buttons and quick-select are standard patterns
3. **Is feedback immediate?** ✅ Yes - Loading spinner, instant error messages
4. **Is the flow reversible?** ✅ Yes - Can add/reduce seats (within usage bounds)
5. **Are errors recoverable?** ✅ Yes - Clear messages explain what to do
6. **Is the complexity justified?** ✅ Yes - Pre-paid model prevents billing surprises

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No API rate limiting | Could spam seat changes | 🟢 Low | Add rate limit middleware |
| No debounce on rapid clicks | Multiple Stripe calls | 🟢 Low | Add client-side debounce |
| Screen reader not announcing counter | Accessibility gap | 🟡 Medium | Add aria-live region |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Core seat API | `apps/dashboard/src/app/api/billing/seats/route.ts` | 1-119 | PRE-PAID model logic |
| Manual seat update | `apps/dashboard/src/app/api/billing/update-settings/route.ts` | 1-165 | Admin-controlled changes |
| Billing UI | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | 1-951 | Full seat management UI |
| Billing page server | `apps/dashboard/src/app/(app)/admin/settings/billing/page.tsx` | 1-100 | Seat count calculations |
| Signup seat selector | `apps/dashboard/src/app/paywall/seats/page.tsx` | 1-157 | Initial seat selection |
| Invite send (adds seat) | `apps/dashboard/src/app/api/invites/send/route.ts` | 82-111 | Calls seats API |
| Invite revoke (frees seat) | `apps/dashboard/src/app/api/invites/revoke/route.ts` | 54-63 | Calls seats API |
| Agent remove (frees seat) | `apps/dashboard/src/app/api/agents/remove/route.ts` | 66-74 | Soft delete + seats API |
| Pricing constants | `apps/dashboard/src/lib/stripe.ts` | 44-54 | PRICING object |
| DB schema | `packages/domain/src/database.types.ts` | 204-210 | seat_count, billing fields |
| Migration | `supabase/migrations/20251127800000_soft_delete_and_billing.sql` | 49-65 | Adds seat_count column |

---

## 9. RELATED FEATURES
- [Subscription Creation (B1)](./subscription-creation.md) - Sets initial seat_count during checkout
- [Billing Frequency (B3)](./billing-frequency.md) - Affects per-seat pricing
- [Pause Subscription (B4)](./pause-subscription.md) - Seats preserved during pause
- [Cancel Subscription (B5)](./cancel-subscription.md) - Cancellation includes seat count in feedback
- [Stripe Webhook Handler](../../apps/server/src/features/billing/stripe-webhook-handler.ts) - Handles subscription status updates

---

## 10. OPEN QUESTIONS
1. ~~**Should there be a maximum seat limit?**~~ **RESOLVED (TKT-022):** Maximum seat limit of 50 is now enforced in the API. Organizations already above 50 seats are grandfathered but cannot add more seats.
2. **Should seat reduction trigger immediate Stripe update or at next billing cycle?** Currently immediate with proration
3. **How to handle seat changes during trial period?** Currently no special handling - trial organizations follow same flow
4. **Should expired invites auto-free seats?** Currently they're just not counted - no explicit cleanup
5. **Is the 7-day invite expiration appropriate for all use cases?** Hardcoded, not configurable per-org



