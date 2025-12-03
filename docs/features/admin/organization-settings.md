# Feature: Organization Settings (D8)

## Quick Summary
Organization Settings is the central hub for admins to manage company-level configuration including organization name, logo, account owner details, call recording/transcription preferences, country restrictions, call dispositions, and billing/subscription management.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Provides admins with a unified interface to configure all organization-level settings that affect:
- Organization branding and identity
- Account owner contact information
- Call recording, transcription, and AI summary features
- Geographic restrictions for widget visibility
- Call outcome tracking (dispositions) with optional Facebook pixel integration
- Subscription management, seat allocation, and billing frequency

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Update company branding | Change org name, upload/remove logo |
| Admin | Manage account contact info | Update email and phone number |
| Admin | Control call recording | Enable/disable recording, set retention periods |
| Admin | Enable AI features | Turn on transcription and AI call summaries |
| Admin | Restrict by geography | Block or allowlist countries |
| Admin | Track call outcomes | Define dispositions with optional conversion values |
| Admin | Optimize ad spend | Fire Facebook events on disposition selection |
| Admin | Manage subscription | Add/remove seats, change billing frequency |
| Admin | Reduce costs temporarily | Pause account without losing data |
| Admin | Cancel service | Cancel subscription with feedback collection |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to `/admin/settings`
2. Admin sees settings hub with 4 category cards: Organization, Call Recording, Country Blocklist, Billing
3. Admin clicks desired category
4. Admin modifies settings in the respective sub-page
5. Admin clicks "Save Changes"
6. System validates and persists changes to Supabase (and Stripe for billing)
7. Success feedback shown to admin

### State Machine

```
Settings Hub (/admin/settings)
     │
     ├─► Organization Settings (/admin/settings/organization)
     │   └─► Can update: org name, logo, email, phone
     │
     ├─► Call Recording (/admin/settings/recordings)
     │   └─► Can update: enabled, retention_days, transcription, AI summary
     │
     ├─► Country Restrictions (/admin/settings/blocklist)
     │   └─► Can update: mode (blocklist/allowlist), country list
     │
     ├─► Dispositions (/admin/settings/dispositions)
     │   └─► Can update: disposition list, FB integration
     │
     └─► Billing (/admin/settings/billing)
         └─► Can update: seat count, billing frequency, pause/cancel
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `viewing_hub` | Settings main page | Navigate to /admin/settings | Click any settings card |
| `editing_org` | Organization settings form | Click Organization card | Save or navigate back |
| `editing_recordings` | Recording settings form | Click Call Recording card | Save or navigate back |
| `editing_blocklist` | Country restrictions form | Click Country Blocklist card | Save or navigate back |
| `editing_dispositions` | Disposition management | Click Dispositions link | Navigate back |
| `editing_billing` | Billing management | Click Billing card | Save or navigate back |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load (settings hub) | `page.tsx` | Auth check, redirect if not admin | None |
| Page load (sub-pages) | Each `page.tsx` | Fetch org data from Supabase | None |
| Logo upload | `organization-settings-client.tsx` | Upload to Supabase storage | Updates `logo_url` in DB |
| Logo remove | `organization-settings-client.tsx` | Sets `logo_url` to null | Clears logo from org |
| Org name change | `organization-settings-client.tsx` | Updates `organizations` table | None |
| Email change | `organization-settings-client.tsx` | Updates auth + users table | Sends confirmation email |
| Phone change | `organization-settings-client.tsx` | Updates `users` table | None |
| Recording toggle | `recording-settings-client.tsx` | Updates `recording_settings` JSON | Affects call recording behavior |
| Transcription toggle | `recording-settings-client.tsx` | Updates `recording_settings.transcription_enabled` | Enables/disables transcription |
| AI summary toggle | `recording-settings-client.tsx` | Updates `recording_settings.ai_summary_enabled` | Requires transcription enabled |
| Country list change | `blocklist-settings-client.tsx` | Updates `blocked_countries` array | Affects widget visibility |
| Mode change (blocklist/allowlist) | `blocklist-settings-client.tsx` | Updates `country_list_mode` | Changes restriction behavior |
| Disposition add/edit/delete | `dispositions-client.tsx` | CRUD on `dispositions` table | Affects agent call wrap-up |
| FB settings save | `dispositions-client.tsx` | Updates `facebook_settings` JSON | Enables FB event firing |
| Seat count change | `billing-settings-client.tsx` | API call to `/api/billing/update-settings` | Updates Stripe subscription |
| Billing frequency change | `billing-settings-client.tsx` | API call to `/api/billing/update-settings` | Updates Stripe price |
| Pause account | `actions.ts` | Updates `subscription_status` to "paused" | Disables widget, preserves data |
| Resume account | `actions.ts` | Updates `subscription_status` to "active" | Re-enables widget |
| Cancel subscription | `actions.ts` | Saves feedback, updates plan to "free" | Data deletion scheduled |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `SettingsPage` | `settings/page.tsx` | Main settings hub with category cards |
| `OrganizationSettingsClient` | `organization/organization-settings-client.tsx` | Org name, logo, email, phone management |
| `RecordingSettingsClient` | `recordings/recording-settings-client.tsx` | Recording, transcription, AI summary config |
| `BlocklistSettingsClient` | `blocklist/blocklist-settings-client.tsx` | Country restriction management |
| `DispositionsClient` | `dispositions/dispositions-client.tsx` | Disposition CRUD + Facebook integration |
| `BillingSettingsClient` | `billing/billing-settings-client.tsx` | Seat/frequency management, pause/cancel |
| `submitCancellationFeedback` | `billing/actions.ts` | Server action for cancellation flow |
| `pauseAccount` | `billing/actions.ts` | Server action to pause subscription |
| `resumeAccount` | `billing/actions.ts` | Server action to resume subscription |
| `getCurrentUser` | `lib/auth/actions.ts` | Auth check, returns user + org data |
| `POST /api/billing/update-settings` | `api/billing/update-settings/route.ts` | API for seat/frequency changes |

### Data Flow

```
ORGANIZATION SETTINGS FLOW
    │
    ├─► Admin loads /admin/settings/organization
    │   ├─► getCurrentUser() → validates auth + admin role
    │   └─► Pass organization + user to client component
    │
    ├─► Admin modifies org name
    │   ├─► setName(value) → local state
    │   └─► hasChanges computed → enables Save button
    │
    ├─► Admin clicks Save
    │   ├─► handleSave()
    │   ├─► supabase.from("organizations").update({ name })
    │   └─► Show success toast, update local state
    │
    └─► Admin uploads logo
        ├─► handleLogoUpload(file)
        ├─► Validate: must be image, max 2MB
        ├─► supabase.storage.from("logos").upload()
        ├─► Get public URL with cache buster
        ├─► supabase.from("organizations").update({ logo_url })
        └─► Update local state, show success


BILLING SETTINGS FLOW
    │
    ├─► Admin loads /admin/settings/billing
    │   ├─► getCurrentUser() → validates auth + admin role
    │   ├─► Query agent_profiles for active count
    │   ├─► Query invites for pending agent count
    │   ├─► Query storage for recording usage
    │   ├─► Query usage_records for AI costs
    │   └─► Pass all data to BillingSettingsClient
    │
    ├─► Admin changes seat count
    │   ├─► handleSeatChange(newCount)
    │   ├─► Validate: newCount >= usedSeats (agents + pending invites)
    │   ├─► POST /api/billing/update-settings { seatCount }
    │   ├─► Server validates: admin role, org exists, >= current usage
    │   ├─► Server updates org.seat_count in Supabase
    │   ├─► Server updates Stripe subscription quantity (if production)
    │   └─► Client refreshes page
    │
    ├─► Admin changes billing frequency
    │   ├─► handleFrequencyChange(newFrequency)
    │   ├─► Show confirmation modal with cost explanation
    │   ├─► confirmFrequencyChange()
    │   ├─► POST /api/billing/update-settings { billingFrequency }
    │   ├─► Server validates: admin, valid frequency, six_month offer
    │   ├─► Server updates org.billing_frequency
    │   ├─► If leaving six_month → set has_six_month_offer = false
    │   ├─► Server updates Stripe price ID
    │   └─► Client refreshes page
    │
    ├─► Admin pauses account
    │   ├─► Open PauseAccountModal
    │   ├─► Select pause duration (1-3 months)
    │   ├─► handlePauseAccount(months, reason)
    │   ├─► pauseAccount() server action
    │   ├─► Update org: subscription_status = "paused", pause_ends_at
    │   ├─► Insert into pause_history
    │   └─► Show success, close modal
    │
    └─► Admin cancels subscription
        ├─► Click "Cancel Subscription" → opens PauseAccountModal first (downsell)
        ├─► Click "No, cancel and delete all my data" → opens CancelSubscriptionModal
        ├─► Step 1: Select primary reason
        ├─► Step 2: Add details, additional reasons, competitor info
        ├─► Step 3: Confirm with data deletion warning
        ├─► handleCancelSubscription(data)
        ├─► submitCancellationFeedback() server action
        ├─► Insert into cancellation_feedback
        ├─► Update org: plan = "free"
        └─► Show confirmation, close modal
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path: Update org name | Type new name, save | Updates DB, shows success | ✅ | |
| 2 | Upload valid logo | Select PNG under 2MB | Uploads to storage, updates org | ✅ | |
| 3 | Upload invalid file type | Select non-image file | Error: "Please upload an image file" | ✅ | |
| 4 | Upload oversized logo | Select image > 2MB | Error: "Logo must be less than 2MB" | ✅ | |
| 5 | Change email | Enter new email, save | Sends confirmation to new address | ✅ | Requires clicking link |
| 6 | Change to invalid email format | Enter "notanemail" | Browser validation prevents submit | ✅ | Uses input type="email" |
| 7 | Enable recording | Toggle on, save | Updates recording_settings.enabled | ✅ | |
| 8 | Enable transcription without recording | Toggle transcription | Disabled when recording is off | ✅ | UI enforces dependency |
| 9 | Enable AI summary without transcription | Toggle AI summary | Disabled when transcription is off | ✅ | UI enforces dependency |
| 10 | Set retention to "Forever" | Select -1 option | Recordings never auto-deleted | ✅ | |
| 11 | Switch from blocklist to allowlist | Click allowlist mode | Clears country list, switches mode | ✅ | Intentional UX |
| 12 | Select all countries in region | Click region quick button | All countries in region selected | ✅ | |
| 13 | Add disposition with value | Enter name + $value | Creates disposition with monetary value | ✅ | |
| 14 | Enable FB event without credentials | Try to set event | Dropdown disabled until FB configured | ✅ | |
| 15 | Save FB settings without pixel ID | Leave pixel ID empty | Can save but events won't fire | ⚠️ | No validation error shown |
| 16 | Increase seat count | Click + button | Prorated charge, immediate effect | ✅ | |
| 17 | Decrease below usage | Try to go below used seats | Error shows current usage, prevents decrease | ✅ | |
| 18 | Switch to annual billing | Select annual, confirm | Change takes effect at renewal | ✅ | |
| 19 | Leave 6-month billing | Switch to monthly/annual | Warning: 6-month offer lost forever | ✅ | |
| 20 | Pause account | Select 1-3 months, confirm | Status = paused, widget hidden | ✅ | |
| 21 | Resume paused account | Click "Resume Now" | Status = active, widget re-enabled | ✅ | |
| 22 | Cancel subscription | Complete 3-step flow | Feedback saved, plan → free | ✅ | |
| 23 | Non-admin access attempt | Agent tries to access | Redirected to /dashboard | ✅ | |
| 24 | No logo currently set | Click Remove | No button shown if logo_url is null | ✅ | |
| 25 | Drag-reorder dispositions | Drag handle to reorder | Updates display_order in DB | ✅ | Primary locked at top |
| 26 | Make disposition primary | Use dropdown menu | Moves to top, updates all orders | ✅ | |
| 27 | Delete disposition | Click trash, confirm | Removes from DB | ✅ | Confirmation required |
| 28 | AI summary custom format | Enter custom template | Saved in recording_settings JSON | ✅ | Falls back to default if empty |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Network failure on save | Connection lost | "Failed to save changes" error alert | Retry save button |
| Storage upload failed | Supabase storage error | "Failed to upload logo: [message]" | Retry upload |
| Seat count validation | Decrease below usage | "[N] seats in use. Remove agents first." | Deactivate agents/revoke invites |
| Invalid billing frequency | Tampered request | "Invalid billing frequency" | Use valid option |
| 6-month not available | No offer flag | "6-month pricing is not available" | Contact support |
| Stripe API failure | Stripe down/misconfigured | "Failed to update settings" | Retry later |
| Cancellation save failed | DB error | Error thrown, modal stays open | Retry submit |
| Auth session expired | Session timeout | Redirected to /login | Log in again |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Settings Hub:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to /admin/settings | Show 4 settings cards | ✅ | |
| 2 | See card descriptions | Each card has icon, title, description | ✅ | |
| 3 | Click card | Navigate to sub-page | ✅ | |

**Organization Settings:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | See current logo/placeholder | Shows logo or Building2 icon | ✅ | |
| 2 | Click Upload Logo | File picker opens | ✅ | |
| 3 | Select valid image | Upload progress, then preview | ✅ | |
| 4 | Edit org name | Input field, hasChanges enables Save | ✅ | |
| 5 | Edit email | Shows warning about confirmation | ✅ | Good UX |
| 6 | Click Save | Loading state, then success toast | ✅ | |

**Billing Settings:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | See current subscription | Seat count, frequency, pricing shown | ✅ | |
| 2 | Use +/- buttons for seats | Counter updates, cost recalculates | ✅ | |
| 3 | Click quick seat buttons | Instantly shows error if below usage | ✅ | |
| 4 | Select billing frequency | Radio buttons with savings % shown | ✅ | |
| 5 | Confirm frequency change | Modal explains what happens | ✅ | Good disclosure |
| 6 | See storage usage | Visual bar, GB used, cost shown | ✅ | |
| 7 | See AI usage | This period's minutes + cost | ✅ | |
| 8 | Click Cancel Subscription | Pause modal shown first (downsell) | ✅ | Good retention UX |
| 9 | Proceed to cancel | 3-step wizard with feedback collection | ✅ | |

### Accessibility
- Keyboard navigation: ✅ All interactive elements focusable
- Screen reader support: ⚠️ Some custom components may lack ARIA labels
- Color contrast: ✅ Uses theme-aware colors (primary, muted, etc.)
- Loading states: ✅ Loader2 spinners shown during async operations
- Error states: ✅ Red destructive styling with clear messages

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Logo upload size | Client-side 2MB limit before upload | ✅ Optimized |
| Country list rendering | Grouped by region, virtualized via CSS max-height | ✅ Good |
| Billing page queries | Parallel queries for counts + storage | ✅ Good |
| Disposition drag-and-drop | Uses @dnd-kit for smooth DnD | ✅ Good |

### Security
| Concern | Mitigation |
|---------|------------|
| Auth bypass | Server-side `getCurrentUser()` check on all pages |
| Role bypass | Server checks `profile.role === "admin"` |
| Org isolation | All queries filter by `organization_id` |
| Logo storage | Files stored in org-specific path: `{org_id}/logo.{ext}` |
| Stripe secrets | Server-only env vars, never exposed to client |
| FB access token | Password input type, show/hide toggle |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Save failure | Error toast with retry capability |
| Stripe sync failure | Logs error, returns 500 to client |
| Logo upload failure | Detailed error message shown |
| Session expiry | Redirected to login on 401 |
| Concurrent edits | Last-write-wins (no optimistic locking) |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Settings hub → Category → Edit → Save is intuitive
2. **Is the control intuitive?** ✅ Yes - Standard form patterns, toggles, dropdowns
3. **Is feedback immediate?** ✅ Yes - Loading states, success toasts, error alerts
4. **Is the flow reversible?** ⚠️ Mostly - Cancellation is irreversible, but has confirmation
5. **Are errors recoverable?** ✅ Yes - Can retry saves, clear messages explain issues
6. **Is the complexity justified?** ✅ Yes - Each section serves distinct purpose

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| FB settings can be saved empty | Events won't fire silently | 🟢 Low | Add validation warning |
| No org name length limit | Could overflow UI | 🟢 Low | Add maxLength to input |
| Email change requires confirmation | User might miss email | 🟢 Low | Current behavior is correct (security) |
| No undo for logo removal | Accidental delete possible | 🟢 Low | Confirmation dialog exists |
| 6-month offer loss is permanent | User regret possible | 🟡 Medium | Warning modal already exists |
| Concurrent admin edits | Last write wins | 🟢 Low | Rare scenario for small teams |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Settings hub | `apps/dashboard/src/app/(app)/admin/settings/page.tsx` | 1-127 | Four category cards |
| Organization settings page | `apps/dashboard/src/app/(app)/admin/settings/organization/page.tsx` | 1-17 | Server component, auth check |
| Organization settings UI | `apps/dashboard/src/app/(app)/admin/settings/organization/organization-settings-client.tsx` | 1-392 | Logo, name, email, phone |
| Recording settings page | `apps/dashboard/src/app/(app)/admin/settings/recordings/page.tsx` | 1-36 | Server component |
| Recording settings UI | `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | 1-427 | Recording, transcription, AI |
| Blocklist settings page | `apps/dashboard/src/app/(app)/admin/settings/blocklist/page.tsx` | 1-43 | Server component |
| Blocklist settings UI | `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | 1-733 | Country list + mode |
| Dispositions page | `apps/dashboard/src/app/(app)/admin/settings/dispositions/page.tsx` | 1-53 | Server component |
| Dispositions UI | `apps/dashboard/src/app/(app)/admin/settings/dispositions/dispositions-client.tsx` | 1-1013 | CRUD + FB integration |
| Billing settings page | `apps/dashboard/src/app/(app)/admin/settings/billing/page.tsx` | 1-101 | Server component with queries |
| Billing settings UI | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | 1-951 | Seats, frequency, pause/cancel |
| Billing server actions | `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` | 1-195 | Pause, resume, cancel |
| Billing update API | `apps/dashboard/src/app/api/billing/update-settings/route.ts` | 1-165 | Seat/frequency changes |
| Pause account modal | `apps/dashboard/src/app/(app)/admin/settings/billing/pause-account-modal.tsx` | 1-318 | Pause duration selection |
| Cancel subscription modal | `apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx` | 1-622 | 3-step cancellation wizard |
| Auth actions | `apps/dashboard/src/lib/auth/actions.ts` | 64-106 | getCurrentUser() |
| Database types | `packages/domain/src/database.types.ts` | 1-822 | Organization, RecordingSettings, etc. |
| Stripe config | `apps/dashboard/src/lib/stripe.ts` | 1-56 | Pricing constants, PRICE_IDS |

---

## 9. RELATED FEATURES
- [Routing Rules](./routing-rules.md) - Pool routing uses organization's default widget settings
- [Tiered Routing](./tiered-routing.md) - Agent pools affected by org settings
- [Agent Assignment](../platform/agent-assignment.md) - Agent seat management affects billing
- [Call Lifecycle](../platform/call-lifecycle.md) - Recording settings affect call recording behavior

---

## 10. OPEN QUESTIONS

1. **What happens to recordings when retention_days is changed?** - Currently unclear if existing recordings are retroactively affected or only new recordings follow the policy.

2. **How is timezone handled for pause_ends_at?** - The pause end date is calculated server-side using JavaScript Date, which may not align with user's local timezone for display.

3. **Is there a grace period for cancelled subscriptions?** - The code shows immediate plan downgrade to "free" but the cancel modal mentions "access will continue until the end of your current billing period" - implementation may not match UI copy.

4. **What triggers the actual Stripe cancellation?** - The current code only saves feedback and sets plan to "free" in Supabase. The actual Stripe subscription cancellation appears to be a TODO comment.

5. **Are dispositions used for billing/analytics?** - The `value` field on dispositions suggests conversion tracking, but the aggregation/reporting of these values is not implemented in the current codebase.

6. **What happens to FB events if credentials become invalid?** - No visible error handling or notification to admins if their Facebook access token expires or is revoked.



