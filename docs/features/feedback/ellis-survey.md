# Feature: Ellis Survey (F1)

## Quick Summary
The Ellis Survey is an in-app Product-Market Fit (PMF) survey based on the Sean Ellis test. It asks users "How would you feel if you could no longer use GreetNow?" with three response options, and captures optional follow-up feedback. The survey is triggered randomly during eligible user sessions and includes cooldown logic to prevent over-surveying.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [x] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Ellis Survey measures Product-Market Fit (PMF) using the Sean Ellis methodology. The theory: if 40%+ of users would be "very disappointed" without the product, you have strong PMF. This survey collects user sentiment at strategic points to track product health over time.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent/Admin | Share feedback about product value | Quick 2-click survey with optional text field |
| Platform Admin | Measure PMF across all orgs | Aggregated survey data in /platform/feedback |
| Product Team | Understand user sentiment | Quantitative + qualitative feedback collection |
| Product Team | Track PMF over time | Historical survey data with timestamps |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. User logs into dashboard
2. SurveyTrigger component checks eligibility
3. If eligible, random timer starts (5-20 minutes)
4. Timer fires → survey modal appears
5. User clicks disappointment level option
6. Follow-up text field appears (optional)
7. User submits or skips
8. Survey response saved to database
9. Cooldown updated (90 days until next survey)
10. Modal closes

### State Machine

```
[Session Start]
      │
      ▼
┌─────────────────┐
│ Check Eligibility│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Not Eligible  Eligible
    │             │
    ▼             ▼
  [End]    Start Random Timer
                  │
                  ▼ (5-20 min)
           ┌──────────────┐
           │ Show Survey  │
           │    Modal     │
           └──────┬───────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
   Select Option     (Wait - no close)
         │
         ▼
┌─────────────────┐
│ Show Follow-up  │
│ (optional text) │
└────────┬────────┘
         │
    ┌────┴────┬─────────┐
    ▼         ▼         ▼
 Submit     Skip    Dismiss
    │         │         │
    ▼         ▼         ▼
 Save to    Track    Track
  pmf_     Dismiss  Dismiss
surveys
    │         │         │
    └────┬────┴─────────┘
         ▼
  Update Cooldown
         │
         ▼
   Close Modal
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `not_loaded` | Component mounted, eligibility unknown | Page load | Eligibility check completes |
| `not_eligible` | User doesn't meet survey criteria | Failed eligibility check | N/A (end state) |
| `waiting` | Timer running, eligible for survey | Passed eligibility check | Timer fires or session ends |
| `showing` | Modal visible, no selection yet | Timer fired | User selects option |
| `follow_up` | Selection made, follow-up visible | User clicked option | Submit, skip, or dismiss |
| `submitted` | Survey saved, modal closing | User clicked Submit | Modal closes |
| `dismissed` | Dismissal tracked, modal closing | User clicked Skip/X/backdrop | Modal closes |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | SurveyTrigger mount | Check sessionStorage, start eligibility check | None |
| Eligibility pass | useSurveyEligibility | Start random timer (5-20 min) | None |
| Timer fire | SurveyTrigger | Set `showSurvey=true`, mark session shown | sessionStorage updated |
| Option click | EllisSurveyModal | Set `selectedLevel`, show follow-up UI | None |
| Submit click | EllisSurveyModal | Insert pmf_surveys row, upsert cooldown | DB writes |
| Dismiss/Skip | EllisSurveyModal | Insert pmf_surveys row (dismissed=true), upsert cooldown | DB writes |
| Modal close | EllisSurveyModal | Reset state, close modal | None |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `EllisSurveyModal` | `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | Survey modal UI with 3 options |
| `SurveyTrigger` | `apps/dashboard/src/features/surveys/survey-trigger.tsx` | Trigger logic with random timer |
| `useSurveyEligibility` | `apps/dashboard/src/features/surveys/use-survey-eligibility.ts` | Eligibility check hook |
| `PreviewSurveyPage` | `apps/dashboard/src/app/(app)/admin/preview-survey/page.tsx` | Admin preview functionality |
| `FeedbackClient` | `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | Platform admin survey viewer |

### Data Flow

```
USER SESSION STARTS
    │
    ├─► SurveyTrigger mounts
    │   └─► Check sessionStorage(SESSION_STORAGE_KEY)
    │       └─► Already shown? → Exit
    │
    ├─► useSurveyEligibility() called
    │   │
    │   ├─► Check 1: Days since signup >= 14?
    │   │   └─► No → setIsEligible(false), return
    │   │
    │   ├─► Check 2: Query survey_cooldowns table
    │   │   └─► Last survey < 90 days ago? → setIsEligible(false), return
    │   │
    │   ├─► Check 3: Query call_logs (completed, agent_id=user)
    │   │   └─► Count < 2? → setIsEligible(false), return
    │   │
    │   ├─► Check 4: Query call_logs (most recent)
    │   │   └─► Last activity > 14 days? → setIsEligible(false), return
    │   │
    │   └─► All passed → setIsEligible(true)
    │
    └─► Start random timer (5-20 minutes)
        │
        └─► Timer fires
            │
            ├─► setShowSurvey(true)
            └─► sessionStorage.setItem(SESSION_STORAGE_KEY, "true")

USER SELECTS OPTION
    │
    ├─► setSelectedLevel(level)
    └─► setShowFollowUp(true)
        └─► Follow-up UI appears

USER SUBMITS
    │
    ├─► supabase.from("pmf_surveys").insert({
    │       organization_id,
    │       user_id,
    │       user_role,
    │       disappointment_level: selectedLevel,
    │       follow_up_text: followUpText || null,
    │       triggered_by: "random",
    │       page_url: pathname,
    │       dismissed: false
    │   })
    │
    ├─► supabase.from("survey_cooldowns").upsert({
    │       user_id,
    │       last_survey_at: now(),
    │       total_surveys: 1
    │   }, { onConflict: "user_id" })
    │
    └─► onClose()

USER DISMISSES (Updated in TKT-045)
    │
    ├─► supabase.from("pmf_surveys").insert({
    │       ...same fields...
    │       disappointment_level: null, // NULL - excluded from PMF calculation
    │       dismissed: true
    │   })
    │
    ├─► supabase.from("survey_cooldowns").upsert({...})
    │
    └─► onClose()
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - full submit | Timer + user action | Survey saved with response | ✅ | |
| 2 | User dismisses without selecting | Can't happen | Close button hidden until selection | ✅ | Intentional UX |
| 3 | User selects then dismisses | Skip/X button | Saved as dismissed=true, disappointment_level=null | ✅ | TKT-045: Excluded from PMF |
| 4 | User dismisses via backdrop | Backdrop click | Same as dismiss - tracked with null level | ✅ | TKT-045: Excluded from PMF |
| 5 | New user (< 14 days) | Eligibility check | Not eligible, no survey shown | ✅ | MIN_DAYS_SINCE_SIGNUP = 14 |
| 6 | Recently surveyed (< 90 days) | Eligibility check | Not eligible, no survey shown | ✅ | MIN_DAYS_SINCE_LAST_SURVEY = 90 |
| 7 | User with 0-1 completed calls | Eligibility check | Not eligible, no survey shown | ✅ | MIN_COMPLETED_CALLS = 2 |
| 8 | Inactive user (> 14 days) | Eligibility check | Not eligible, no survey shown | ✅ | MAX_DAYS_SINCE_ACTIVITY = 14 |
| 9 | Survey already shown this session | sessionStorage check | No second survey | ✅ | SESSION_STORAGE_KEY |
| 10 | User navigates away before timer | Page navigation | Timer cleared, no survey | ✅ | useEffect cleanup |
| 11 | User refreshes during timer | Page reload | Timer resets, may show if still eligible | ⚠️ | Session might see two attempts |
| 12 | Very long follow-up text | No limit | Accepted (TEXT column in DB) | ✅ | No max length enforced |
| 13 | Submit fails (network error) | DB error | Error logged, modal still closes | ✅ | Fire-and-forget pattern |
| 14 | Cooldown upsert fails | DB error | Error logged, doesn't block | ✅ | Independent of survey save |
| 15 | Preview mode | Admin page | Mock data used, no DB writes | ✅ | Different component wrapper |
| 16 | Multiple tabs open | sessionStorage | Each tab tracks independently | ⚠️ | Could see survey in each tab |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Eligibility check fails | Supabase query error | No survey shown | Silently fails, logged to console |
| Survey insert fails | Network/DB error | Modal closes anyway | Logged to console, user unaware |
| Cooldown upsert fails | Network/DB error | Modal closes anyway | User might see survey again sooner |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Working in dashboard | Survey modal appears (5-20 min) | ✅ | Non-intrusive overlay |
| 2 | See survey question | 3 option buttons displayed | ✅ | Clear icons and labels |
| 3 | Try to close without selecting | No close button visible | ⚠️ | Might feel trapped |
| 4 | Click backdrop without selecting | Nothing happens | ⚠️ | Could confuse users |
| 5 | Select disappointment level | Option highlighted, follow-up appears | ✅ | Smooth animation |
| 6 | Type follow-up (optional) | Textarea accepts input | ✅ | Clear "optional" label |
| 7 | Click Submit | Loading state, then closes | ✅ | Good feedback |
| 8 | Click Skip | Closes immediately | ✅ | Low friction exit |

### Accessibility
- Keyboard navigation: ⚠️ Not explicitly handled (relies on native button behavior)
- Screen reader support: ⚠️ No aria-labels on modal
- Color contrast: ✅ Good contrast on all options
- Loading states: ✅ Loader2 spinner during submit

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Eligibility check on every page | Only runs once per session via sessionStorage | ✅ OK |
| Multiple DB queries for eligibility | 3 separate queries, sequential | ⚠️ Could be optimized |
| Timer memory leak | Cleanup in useEffect return | ✅ Handled |

### Security
| Concern | Mitigation |
|---------|------------|
| User submitting others' surveys | RLS: `user_id = auth.uid()` on INSERT |
| Viewing others' surveys | RLS: users see only own, platform admins see all |
| Survey spam | Cooldown table, session tracking |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Survey not saved | Fire-and-forget, but still closes modal |
| Cooldown not updated | User might see survey sooner, not critical |
| Session tracking fails | localStorage fallback could help but not implemented |

### Data Integrity (TKT-045)
| Concern | Solution |
|---------|----------|
| Dismissed surveys skewed PMF negatively | **Fixed**: Dismissal now sets `disappointment_level: null` instead of `"not_disappointed"` |
| PMF calculation accuracy | Platform feedback query: `.eq("dismissed", false).not("disappointment_level", "is", null)` |
| Excluding null responses from stats | Both filters ensure dismissed surveys don't inflate negative sentiment |

**Implementation:**
- `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx:126` - Set `null` on dismiss
- `apps/dashboard/src/app/(app)/platform/feedback/page.tsx:32` - Filter excludes `null` values

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Standard survey pattern, familiar UX
2. **Is the control intuitive?** ⚠️ Mostly - Can't dismiss until selecting is intentional but may frustrate
3. **Is feedback immediate?** ✅ Yes - Selection highlights immediately, submit shows loader
4. **Is the flow reversible?** ⚠️ Partial - Can change selection before submit, but no undo after
5. **Are errors recoverable?** ✅ Yes - Errors are silent, modal closes, life continues
6. **Is the complexity justified?** ✅ Yes - Eligibility rules prevent survey fatigue

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Cooldown documentation mismatch | Preview page says 30 days, code says 90 | 🟢 Low | Update preview page copy |
| No close button initially | User might feel trapped | 🟡 Medium | Add X button but track if clicked before selection |
| Multiple tabs issue | Could show in each tab | 🟢 Low | Use localStorage instead of sessionStorage |
| Eligibility queries sequential | Slightly slower | 🟢 Low | Could parallelize with Promise.all |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Survey modal UI | `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | 1-273 | Main component |
| Disappointment options | `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | 18-50 | Option definitions |
| Submit handler | `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | 73-117 | DB insert logic |
| Dismiss handler | `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | 119-149 | Dismissal tracking |
| Survey trigger | `apps/dashboard/src/features/surveys/survey-trigger.tsx` | 1-78 | Timer logic |
| Trigger constants | `apps/dashboard/src/features/surveys/survey-trigger.tsx` | 14-16 | MIN/MAX delay, session key |
| Eligibility hook | `apps/dashboard/src/features/surveys/use-survey-eligibility.ts` | 1-126 | All eligibility checks |
| Eligibility constants | `apps/dashboard/src/features/surveys/use-survey-eligibility.ts` | 18-21 | Days/calls thresholds |
| Preview page | `apps/dashboard/src/app/(app)/admin/preview-survey/page.tsx` | 1-97 | Admin preview |
| Platform feedback viewer | `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | 54-69 | PmfSurvey interface |
| PMF surveys table | `supabase/migrations/20251129300000_pmf_surveys.sql` | 22-38 | Schema definition |
| Survey cooldowns table | `supabase/migrations/20251129300000_pmf_surveys.sql` | 41-47 | Cooldown schema |
| RLS policies | `supabase/migrations/20251129300000_pmf_surveys.sql` | 60-116 | Access control |
| Type definitions | `packages/domain/src/database.types.ts` | 36-37 | DisappointmentLevel type |
| Table types | `packages/domain/src/database.types.ts` | 553-580 | pmf_surveys, survey_cooldowns |

---

## 9. RELATED FEATURES
- [Platform Feedback Dashboard](./feedback-dashboard.md) - Where platform admins view PMF surveys (not yet documented)
- [Cancellation Feedback](../billing/cancel-subscription.md) - Similar feedback collection during cancellation

---

## 10. OPEN QUESTIONS

1. ~~**Why is dismissal tracked as "not_disappointed"?**~~ - **RESOLVED in TKT-045**: Dismissed surveys now set `disappointment_level: null` and are excluded from PMF calculations via dual filters: `.eq("dismissed", false)` and `.not("disappointment_level", "is", null)` in the platform feedback query (page.tsx:32).

2. **Preview page says 30-day cooldown, code says 90 days** - Which is correct? Code shows `MIN_DAYS_SINCE_LAST_SURVEY = 90`.

3. **Should survey be shown to visitors?** - Currently only dashboard users see it (agents/admins). Widget visitors never see PMF survey.

4. **What triggers besides "random" exist?** - The `triggered_by` field suggests other triggers ("milestone", "post_call" in migration comments) but only "random" is implemented.

5. **Should there be a maximum follow-up text length?** - Currently unlimited, could lead to very long responses.

6. **How is the 40% PMF threshold tracked?** - Survey collects data but there's no visible dashboard showing the PMF percentage calculation.



