# Feature: Dispositions (D10)

## Quick Summary
Dispositions are call outcome codes that agents select after each call to categorize call results. Admins can create, edit, and manage disposition codes with optional monetary values and Facebook Conversion API integration for ad tracking.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Dispositions enable organizations to:
- Categorize call outcomes for reporting and analytics
- Track conversion value of calls ($)
- Fire Facebook Conversion API events for ad attribution
- Analyze agent performance by outcome type
- Generate disposition breakdown reports

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent | Quick way to log call outcome | Modal appears after call with one-click options |
| Agent | Skip disposition if busy | Optional skip button available |
| Admin | Track what happens on calls | Disposition breakdown in call analytics |
| Admin | Measure call value | Optional $ value per disposition |
| Admin | Facebook ad attribution | Fire CAPI events when dispositions selected |
| Admin | Customize outcome codes | Create, edit, delete, reorder dispositions |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)

**Admin Setup:**
1. Admin navigates to Settings → Dispositions
2. Admin creates disposition codes (name, color, optional value, optional FB event)
3. Dispositions are saved to database, ordered by display_order

**Agent Usage:**
1. Agent completes a call
2. Post-call disposition modal appears
3. Agent clicks a disposition to categorize the call
4. Disposition ID is saved to call_logs record
5. If FB event configured, CAPI event fires
6. Modal closes after brief success animation

### State Machine

```
ADMIN FLOW:
┌──────────────┐
│  No dispositions  │
└───────┬──────┘
        │ Admin clicks "Add Disposition"
        ▼
┌──────────────┐
│  Add Form Open   │──► Name, Color, Value, FB Event
└───────┬──────┘
        │ Click "Add Disposition"
        ▼
┌──────────────┐
│ Dispositions List │──► Drag to reorder, Edit, Delete
└──────────────┘

AGENT FLOW:
┌──────────────┐
│  Call Active     │
└───────┬──────┘
        │ Call ends
        ▼
┌──────────────┐       ┌──────────────┐
│ Disposition Modal │──►│ Select option │
└───────┬──────┘       └───────┬──────┘
        │ Skip                  │ Click disposition
        ▼                       ▼
┌──────────────┐       ┌──────────────┐
│ Modal closes     │       │ Save to DB     │
│ (no disposition) │       │ Fire FB event? │
└──────────────┘       └───────┬──────┘
                               │
                               ▼
                       ┌──────────────┐
                       │ Modal closes     │
                       └──────────────┘
```

### State Definitions

| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| No dispositions | Empty state, no disposition codes exist | New org before setup | Create first disposition |
| Add form open | Form visible for creating new disposition | Click "Add Disposition" | Save or Cancel |
| Edit mode | Inline editing of existing disposition | Click "Edit" on row | Save or Cancel |
| Disposition modal | Post-call modal showing available options | Call ends | Select disposition or Skip |
| Saving | Brief saving state with spinner | Click disposition | Auto-close after 500ms |

---

## 3. DETAILED LOGIC

### Triggers & Events

| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load (admin) | `/admin/settings/dispositions` | Fetch dispositions + FB settings | Query DB |
| Add disposition | Admin clicks "Add" | Insert to `dispositions` table | Updates display_order if primary |
| Edit disposition | Admin saves edit | Update `dispositions` table | Optimistic UI update |
| Delete disposition | Admin confirms delete | Delete from `dispositions` table | `call_logs.disposition_id` set to NULL (FK constraint) |
| Drag end | Admin drops row | Update `display_order` for all affected rows | Multiple DB updates |
| Call ends | Active call terminates | Open disposition modal | Fetch active dispositions |
| Select disposition | Agent clicks option | Update `call_logs.disposition_id` | Fire FB CAPI if configured |
| Skip | Agent clicks "Skip" | Close modal | No DB update |

### Key Functions/Components

| Function/Component | File | Purpose |
|-------------------|------|---------|
| `DispositionsClient` | `apps/dashboard/src/app/(app)/admin/settings/dispositions/dispositions-client.tsx` | Main admin UI component |
| `SortableRow` | Same file | Draggable disposition row with edit mode |
| `PostCallDispositionModal` | `apps/dashboard/src/features/workbench/post-call-disposition-modal.tsx` | Agent-facing modal after calls |
| `DispositionsSettingsPage` | `apps/dashboard/src/app/(app)/admin/settings/dispositions/page.tsx` | Server component fetching data |
| `POST /api/facebook/capi` | `apps/dashboard/src/app/api/facebook/capi/route.ts` | Facebook Conversion API handler |
| `CallsClient` | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Call logs display with disposition filter |

### Data Flow

```
ADMIN CREATES DISPOSITION
    │
    ├─► DispositionsClient: handleAdd()
    │   ├─► Validate name not empty
    │   ├─► Calculate display_order (last or 0 if primary)
    │   └─► If newIsPrimary: shift all existing orders +1
    │
    ├─► Supabase: INSERT into dispositions
    │   ├─► organization_id (from auth)
    │   ├─► name, color, value, display_order, is_active=true
    │   └─► fb_event_name, fb_event_enabled (if FB configured)
    │
    └─► Update local state: setDispositions([...dispositions, newData])

AGENT SELECTS DISPOSITION
    │
    ├─► PostCallDispositionModal: handleSelect(dispositionId)
    │   ├─► setSelectedId, setIsSaving(true)
    │   └─► Update call_logs.disposition_id via Supabase
    │
    ├─► Check if FB event enabled for this disposition
    │   └─► If yes: POST to /api/facebook/capi
    │
    ├─► Facebook CAPI API Route:
    │   ├─► Validate auth
    │   ├─► Fetch disposition + FB settings
    │   ├─► Build event data (event_name, user_data, custom_data with value)
    │   └─► POST to FB Graph API v18.0
    │
    ├─► Wait 500ms (show checkmark animation)
    │
    └─► onClose() - modal closes, workbench resets

DRAG REORDER
    │
    ├─► @dnd-kit: handleDragEnd(event)
    │   ├─► Calculate new positions via arrayMove()
    │   └─► Update local state immediately (optimistic)
    │
    └─► Loop through reordered items:
        └─► Supabase: UPDATE display_order for each
```

### Database Schema

**dispositions table:**
```sql
CREATE TABLE public.dispositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    value DECIMAL(10, 2) DEFAULT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    fb_event_name TEXT,
    fb_event_enabled BOOLEAN DEFAULT false,
    fb_event_params JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);
```

**call_logs.disposition_id:**
```sql
ALTER TABLE public.call_logs 
ADD COLUMN disposition_id UUID REFERENCES dispositions(id) ON DELETE SET NULL;
```

---

## 4. EDGE CASES

### Complete Scenario Matrix

| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path (admin creates) | Click Add | Saves to DB, shows in list | ✅ | |
| 2 | Happy path (agent selects) | Click disposition | Saves to call_logs, fires FB event | ✅ | |
| 3 | Empty name | Try to add | Button disabled | ✅ | |
| 4 | Duplicate name | Save same name | DB error (unique constraint) | ✅ | Alert shown |
| 5 | No dispositions configured | Agent call ends | Modal shows "No dispositions configured" message | ✅ | |
| 6 | FB columns don't exist | Save with FB event | Retries without FB fields | ✅ | Graceful fallback |
| 7 | FB not configured | Try to set event | Dropdown disabled with helper text | ✅ | |
| 8 | Delete used disposition | Admin deletes | Disposition deleted, call_logs.disposition_id → NULL | ✅ | FK ON DELETE SET NULL |
| 9 | Agent closes browser before selecting | Browser close | No disposition saved | ⚠️ | Data loss acceptable |
| 10 | Very long call before modal | Call ends after hours | Modal appears same as always | ✅ | |
| 11 | Agent skips disposition | Click "Skip for now" | Modal closes, no update | ✅ | |
| 12 | Rapid double-click | Fast clicks | isSaving=true prevents double submit | ✅ | |
| 13 | Make non-primary primary | Click color dropdown → "Make primary" | Moves to top, reorders others | ✅ | |
| 14 | Primary disposition locked | Try to drag primary | Drag handle replaced with lock icon | ✅ | |
| 15 | FB API fails | Network error | Error logged, disposition still saves | ✅ | Non-blocking |
| 16 | Organization has no FB settings | Page load | fbSettings defaults to empty/disabled | ✅ | |
| 17 | Edit disposition value | Change $ value | Saves as DECIMAL, used in FB event | ✅ | |
| 18 | Zero-value disposition | Set value to 0 | Stored as 0.00, sent to FB | ✅ | |
| 19 | Null-value disposition | Leave value empty | Stored as NULL, not sent to FB | ✅ | |
| 20 | Inactive disposition fetched | Agent modal opens | Only is_active=true fetched | ✅ | |

### Error States

| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Duplicate name | Admin adds existing name | Alert: "Failed to add: duplicate key" | Change name |
| FB CAPI error | Facebook rejects event | Console error, disposition still saves | Check FB settings |
| Network error (admin) | Save fails | Alert with error message | Retry |
| Network error (agent) | Update fails | Console error, modal stays open | Click again or skip |
| Auth expired | Any action | 401 Unauthorized | Re-login |
| Disposition not found | FB CAPI call with invalid ID | 404 Not Found | Bug - should not happen |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Admin Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Settings → Dispositions | Page loads with list | ✅ | |
| 2 | Click "Add Disposition" | Form appears | ✅ | |
| 3 | Fill name, select color | Form updates | ✅ | |
| 4 | Optionally set value | Numeric input | ✅ | |
| 5 | Optionally set FB event | Dropdown (disabled if no FB) | ✅ | Helper text explains |
| 6 | Click "Add Disposition" | Row appears in list | ✅ | |
| 7 | Drag to reorder | Row moves, saves | ✅ | Smooth animation |
| 8 | Click Edit | Inline edit mode | ✅ | |
| 9 | Click Delete | Confirm dialog | ✅ | |

**Agent Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | End call | Modal appears | ✅ | Smooth transition |
| 2 | Read dispositions | List with colors shown | ✅ | First has trophy icon |
| 3 | Click disposition | Spinner then checkmark | ✅ | Visual feedback |
| 4 | Modal closes | Returns to bullpen | ✅ | 500ms delay feels right |
| 5 | Click Skip | Modal closes immediately | ✅ | |

### Visual Design
- **Primary disposition**: Trophy icon (🏆) + highlighted row with amber accent
- **Colors**: 10 preset colors with visual swatches
- **FB events**: Blue Zap icon (⚡) with event name badge
- **Values**: Green dollar formatting ($X.XX)
- **Drag handle**: GripVertical icon, lock icon for primary

### Accessibility
- Keyboard navigation: ⚠️ DnD library supports keyboard, but not fully tested
- Screen reader support: ⚠️ Color-only differentiation may be problematic
- Color contrast: ✅ Colors have sufficient contrast on dark background
- Loading states: ✅ Spinner during save operations

---

## 6. TECHNICAL CONCERNS

### Performance

| Concern | Implementation | Status |
|---------|----------------|--------|
| Many dispositions | Display_order index for sorting | ✅ |
| Drag reorder | Multiple sequential updates (not batched) | ⚠️ Could be optimized |
| FB CAPI calls | Fire-and-forget, non-blocking | ✅ |
| Modal fetch | Fetches on open, no caching | ✅ Acceptable |

### Security

| Concern | Mitigation |
|---------|------------|
| Admin-only management | RLS policy: role='admin' required for mutations |
| Org isolation | RLS policy: organization_id check on all queries |
| FB access token storage | Stored in organizations.facebook_settings (encrypted at rest) |
| FB token exposure | Token only used server-side in API route |
| CAPI validation | Auth required, org ownership verified |

### Reliability

| Concern | Mitigation |
|---------|------------|
| FB API downtime | Non-blocking, disposition saves regardless |
| FB columns missing | Graceful retry without FB fields |
| Concurrent edits | Last-write-wins (no optimistic locking) |
| Delete cascade | FK ON DELETE SET NULL preserves call_logs |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - "Call outcome" is universally understood
2. **Is the control intuitive?** ✅ Yes - Click to select, trophy for primary
3. **Is feedback immediate?** ✅ Yes - Spinner + checkmark animation
4. **Is the flow reversible?** ⚠️ Partially - Can't change disposition after saved
5. **Are errors recoverable?** ✅ Yes - Can retry or skip
6. **Is the complexity justified?** ✅ Yes - FB integration adds value for ad attribution

### Identified Issues

| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Can't edit disposition after selection | Agent might misclick | 🟡 Medium | Add edit option in call logs |
| Drag reorder is sequential | Slow with many items | 🟢 Low | Batch update or debounce |
| No bulk import/export | Large setups tedious | 🟢 Low | Add CSV import/export |
| No disposition categories | Flat list only | 🟢 Low | Add optional grouping |
| Dispositions are org-wide | Can't customize per pool | 🟡 Medium | Consider pool-specific dispositions |
| No disposition analytics page | Stats in call logs only | 🟢 Low | Dedicated analytics view |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Admin UI client | `apps/dashboard/src/app/(app)/admin/settings/dispositions/dispositions-client.tsx` | 1-1013 | Full admin interface |
| Admin page server | `apps/dashboard/src/app/(app)/admin/settings/dispositions/page.tsx` | 1-53 | Data fetching |
| Agent modal | `apps/dashboard/src/features/workbench/post-call-disposition-modal.tsx` | 1-227 | Post-call selection |
| FB CAPI route | `apps/dashboard/src/app/api/facebook/capi/route.ts` | 1-228 | Facebook event firing |
| Call logs display | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | 63-68, 597-608, 848-883 | Disposition filter + breakdown |
| DB schema | `supabase/migrations/20251126040000_add_call_analytics.sql` | 1-128 | Table + default seeds |
| Value column | `supabase/migrations/20251127300000_disposition_primary_value.sql` | 1-18 | DECIMAL value field |
| FB fields | `supabase/migrations/20251128000000_facebook_integration.sql` | - | FB event columns |

---

## 9. RELATED FEATURES

- [Call Logs (D7)](./call-logs.md) - Where dispositions are displayed and filtered
- [Agent Active Call (A4)](../agent/agent-active-call.md) - When disposition modal appears
- [Call Analytics (STATS3)](../stats/call-analytics.md) - Disposition breakdown statistics
- [Organization Settings (D8)](./organization-settings.md) - Facebook settings stored here

---

## 10. OPEN QUESTIONS

1. **Should disposition selection be required?** Currently optional (Skip button). Some orgs may want to enforce selection.

2. **Should agents be able to edit a call's disposition later?** Currently not possible after modal closes. Historical data could be corrected in call logs view.

3. **Should dispositions be pool-specific?** Currently org-wide. Different pools might have different outcome codes.

4. **What happens to analytics when disposition is deleted?** Currently disposition_id becomes NULL. Historical reporting loses that categorization.

5. **Should there be a "No Disposition" default option?** Currently NULL means skipped. Could add explicit "Uncategorized" disposition.

6. **Is there a limit on number of dispositions?** No hard limit. UX degrades with >10 options (scrolling required).

