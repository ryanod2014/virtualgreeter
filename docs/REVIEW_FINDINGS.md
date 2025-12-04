# Review Findings

> **Purpose:** Review agents report findings here. PM reviews and presents to Human for decisions.
> **Status:** Ready for first review sprint

---

## How This Works

1. **Review Agents** scan docs and append findings below
2. **PM** reviews findings and presents to Human
3. **Human** makes decisions (approve/reject/modify)
4. **PM** creates tickets in `TICKET_BACKLOG.md` for approved items
5. **PM** marks findings as processed

---

## Decision Legend

| Status | Meaning |
|--------|---------|
| ⏳ PENDING | Awaiting human decision |
| ✅ APPROVED | Human approved - ticket created |
| ❌ REJECTED | Human rejected - not a real issue |
| 🔄 MODIFIED | Human modified the suggestion |
| 📋 TICKET | Ticket ID reference |

---

## Findings

<!-- Review agents append findings below this line -->



#### 9. 5-Minute Cache TTL Trade-off Not Quantified
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Documentation asks "Is 5-minute cache TTL optimal? Trade-off between freshness and DB load could be tuned." However, there's no data on actual query volume or cache hit rates to inform this decision. The 5-minute value appears arbitrary.
- **Suggested Fix:** Add monitoring for cache hit rate and DB query frequency. Document expected query volumes at different traffic levels to inform TTL selection. Consider making TTL configurable per-environment.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 9
- **Critical:** 0
- **High:** 0
- **Medium:** 3
- **Low:** 6

---

## A-cobrowse-viewer - Co-Browse Viewer

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/cobrowse-viewer.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-cobrowse-viewer.md`

### Findings

#### 1. Password Fields Captured in DOM Snapshots
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 6 (Security), Section 7 (Identified Issues), Section 10 (Open Question #1), Special Focus section
- **Issue:** Password field values are captured in DOM snapshots and transmitted to agents. The documentation explicitly flags this multiple times as 🔴 High risk: "Passwords typed into `<input type="password">` are in HTML". While the field visually obscures the password, the `value` attribute may be present in the serialized DOM depending on how the site handles it.
- **Suggested Fix:** Implement the documented recommendation: sanitize password inputs by replacing values with mask characters (`••••••••`) before serialization. Code sample already provided in doc.
- **Human Decision:** ⏳ PENDING

#### 2. Credit Card and Other Sensitive Data Also Captured
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Special Focus section "Security considerations (passwords, sensitive data)"
- **Issue:** Beyond passwords, the documentation identifies additional security gaps: "Credit card fields: Same issue as passwords", "Personal data: Any visible data on page is captured", "Session tokens: If displayed on page, captured". These represent PCI compliance risks and privacy violations.
- **Suggested Fix:** Extend sanitization to mask `input[type="tel"]`, `input[autocomplete="cc-number"]`, and elements marked with `data-sensitive="true"`. Consider opt-in allowlisting instead of blocklisting for sensitive field detection.
- **Human Decision:** ⏳ PENDING

#### 3. No Visitor Opt-Out for Co-Browse
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 10 (Open Question #2)
- **Issue:** Documentation explicitly asks "Should there be a 'co-browse disabled' option?" noting "Some visitors might prefer privacy during calls" and "No toggle currently exists - cobrowse is automatic." Visitors have no control over screen sharing during calls, which may violate privacy expectations or regional regulations.
- **Suggested Fix:** Add visitor-side toggle "Allow screen viewing" that defaults to enabled but can be disabled. Or add organization-level setting to disable co-browse entirely.
- **Human Decision:** ⏳ PENDING

#### 4. No Loading State for Agent Viewer
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 (UI/UX Review, Accessibility), Section 7 (Identified Issues)
- **Issue:** Multiple documentation sections flag this: "Could show loading state" (Section 5), "Loading states | ⚠️ | No explicit 'Loading DOM...' state" (Accessibility), and "No loading state | Agent sees stale/blank before first snapshot | 🟡 Medium" (Section 7). Agent may see a blank or stale view with no indication that co-browse is initializing.
- **Suggested Fix:** Add "Loading visitor's screen..." placeholder with spinner while waiting for first snapshot. Show skeleton UI or previous snapshot with "Updating..." indicator during subsequent refreshes.
- **Human Decision:** ⏳ PENDING

#### 5. Screen Reader Accessibility Not Implemented
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 (Accessibility)
- **Issue:** Documentation explicitly notes "Screen reader | ⚠️ | Could add aria-label for viewer". The co-browse viewer component lacks ARIA attributes, making it inaccessible to agents using assistive technology. This is a WCAG compliance gap.
- **Suggested Fix:** Add aria-label to the viewer container describing its purpose, aria-live region for status updates (loading, connected, disconnected), and descriptive text for the cursor position and selection indicators.
- **Human Decision:** ⏳ PENDING

#### 6. Iframe Content Not Captured
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 (Edge Case #4), Section 7 (Identified Issues), Section 10 (Open Question #3), Special Focus section
- **Issue:** Documentation flags this as a known limitation across multiple sections. Embedded iframe content (payment forms, embedded apps, third-party widgets) appears as empty boxes in the agent's view. This significantly reduces the utility of co-browse when visitors interact with iframe-embedded content.
- **Suggested Fix:** For same-origin iframes, attempt recursive DOM capture. For cross-origin iframes, show clear visual indicator "Embedded content - not visible to agent" instead of blank space. Document limitation prominently in admin setup.
- **Human Decision:** ⏳ PENDING

#### 7. Canvas Elements Appear Blank
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 (Edge Case #5), Section 7 (Identified Issues), Section 10 (Open Question #4), Special Focus section
- **Issue:** Charts, graphs, and other canvas-rendered content show as blank boxes in the agent view. Documentation notes "Canvas state not captured" and asks "Should canvas elements be converted to images?" This limitation affects data visualization-heavy sites.
- **Suggested Fix:** Use `canvas.toDataURL()` to capture canvas state as image and inject as `<img>` replacement in the snapshot. Accept increased payload size trade-off for important visual context.
- **Human Decision:** ⏳ PENDING

#### 8. Large DOM Snapshots May Cause Latency
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 (Edge Case #2), Section 6 (Performance)
- **Issue:** Documentation notes "Large DOM (>1MB) | Complex page | Sent as-is, may lag | ⚠️ | No compression or chunking" and "Large DOM snapshots | No compression | 🟡 Medium". Complex pages may experience significant latency or dropped updates, degrading the agent experience.
- **Suggested Fix:** Implement gzip compression for DOM payloads. Consider chunked transmission for very large DOMs. Add DOM size monitoring to identify problematic pages.
- **Human Decision:** ⏳ PENDING

#### 9. No Delta/Diff Encoding for Updates
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 (Performance), Section 7 (Identified Issues)
- **Issue:** Documentation notes "Memory in iframe | New iframe content each snapshot | 🟡 Medium" and "No delta encoding | Large payloads | 🟢 Low". Every 2 seconds, the entire DOM is re-serialized and transmitted even if only minor changes occurred. This creates unnecessary bandwidth usage and may cause visual flickering on the agent side.
- **Suggested Fix:** Implement mutation-based delta encoding that sends only changed DOM nodes. Use virtual DOM diffing or MutationObserver records to compute minimal patches.
- **Human Decision:** ⏳ PENDING

#### 10. Snapshot Interval Not Configurable
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 (Open Question #5)
- **Issue:** Documentation asks "Is 2-second snapshot interval optimal?" and notes "Trade-off between freshness and bandwidth" and "Could be org-configurable in the future." Different use cases may require different trade-offs - fast-paced sales may want sub-second updates while bandwidth-constrained scenarios may want longer intervals.
- **Suggested Fix:** Add org-level setting for snapshot interval (500ms - 5000ms range) with 2000ms default. Document bandwidth implications for each setting.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 2
- **High:** 1
- **Medium:** 5
- **Low:** 2


## D4 - Agent Management

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/agent-management.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-agent-management.md`

### Findings

#### 1. Agent Removal Doesn't End Active Calls
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 (Edge Case #10), Section 7 (Identified Issues), Section 10 (Open Question #1)
- **Issue:** When an admin removes an agent who is currently in a video call, the call continues until it naturally ends. This creates a confusing state where a "removed" agent is still actively serving a visitor. The visitor experience is maintained, but system state becomes inconsistent (agent marked as removed while still in `in_call` status).
- **Suggested Fix:** Emit `call:end` event when removing an agent who is `in_call` status, with graceful handling for the visitor (e.g., "Agent has ended the call" message rather than abrupt disconnect).
- **Human Decision:** ⏳ PENDING

#### 2. Cannot Re-invite Previously Removed Users
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 (Edge Case #21), Section 7 (Identified Issues), Section 10 (Open Question #2)
- **Issue:** The system blocks re-inviting email addresses that belong to users with inactive `agent_profile` records. Error shown is "User already exists in this organization." This prevents admins from bringing back former team members through the normal invite flow.
- **Suggested Fix:** Add a "Reactivate" option for inactive agents in the UI, OR modify invite logic to check `is_active` status and allow re-invitation for deactivated users.
- **Human Decision:** ⏳ PENDING

#### 3. Email Send Failure Is Silent
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 4 (Edge Case #20), Section 6 (Reliability), Section 7 (Identified Issues), Section 10 (Open Question #3)
- **Issue:** If the Resend API fails to send the invite email, the invite record is still created in the database but the failure is only logged to console. The admin has no visibility that the invitee never received their email. The invitee is stuck waiting for an email that never arrives.
- **Suggested Fix:** Either (a) rollback invite creation on email failure, OR (b) add retry mechanism with admin notification, OR (c) show warning toast "Invite created but email may not have sent - check with invitee."
- **Human Decision:** ⏳ PENDING

#### 4. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 (Accessibility)
- **Issue:** Documentation explicitly notes screen reader support as "⚠️ Not explicitly verified." The agent management page includes interactive modals, form inputs, and status indicators that may not be accessible to users relying on assistive technology.
- **Suggested Fix:** Conduct accessibility audit with screen reader (NVDA/VoiceOver). Ensure ARIA labels on modal triggers, proper focus management, and status announcements for async operations.
- **Human Decision:** ⏳ PENDING

#### 5. Missing Reactivation Flow for Non-Admin Users
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 2 (Flows), Section 4 (Edge Cases)
- **Issue:** The "Add Myself (reactivate)" flow documents how an admin can reactivate their own agent profile after removal. However, there's no documented flow for an admin to reactivate a DIFFERENT user who was previously removed. Combined with Finding #2, this means there's no way to bring back former agents.
- **Suggested Fix:** Add "Reactivate" button/flow for inactive agents, similar to "Add Myself (reactivate)" but for other users. Would need to handle billing seat addition.
- **Human Decision:** ⏳ PENDING

#### 6. Stripe Downtime Lacks Retry Mechanism
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 (Reliability), Section 10 (Open Question #5)
- **Issue:** If Stripe is unavailable during invite creation, the invite fails and is rolled back. No retry mechanism exists. During Stripe outages, all agent invitations would fail even though the core invite functionality doesn't depend on Stripe.
- **Suggested Fix:** Consider queuing billing updates for retry, or allow invite creation with "billing_pending" flag that syncs when Stripe recovers.
- **Human Decision:** ⏳ PENDING

#### 7. Deactivated Agents Not Visible for Audit
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 (Open Question #6)
- **Issue:** Deactivated (removed) agents are completely filtered out of the UI. Admins cannot see historical team members, which may be useful for audit purposes, understanding call history attribution, or deciding whether to reactivate someone.
- **Suggested Fix:** Add optional "Show inactive" toggle or separate "Former Team Members" section.
- **Human Decision:** ⏳ PENDING

#### 8. Invite Expiration Period Hardcoded
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 (Open Question #4)
- **Issue:** The 7-day invite expiration is hardcoded in the database default. Different organizations may have different needs (e.g., enterprise might want longer windows for HR processes, small teams might want shorter for security).
- **Suggested Fix:** Add org-level setting for invite expiration period, with 7 days as default.
- **Human Decision:** ⏳ PENDING

#### 9. No Bulk Invite Capability
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 (Identified Issues)
- **Issue:** Admins must invite agents one at a time. For organizations onboarding many agents simultaneously (e.g., enterprise customers, call center teams), this creates significant friction.
- **Suggested Fix:** Add CSV upload option for bulk invitations with validation preview.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 9
- **Critical:** 0
- **High:** 2
- **Medium:** 4
- **Low:** 3

---

## D-call-logs - Call Logs

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/call-logs.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-call-logs.md`

### Findings

#### 1. No Server-Side Pagination Limits Historical Data Access
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues table, row 1
- **Issue:** Documentation explicitly states "No server-side pagination | 500 record limit cuts off data". Users cannot access historical data beyond the most recent 500 calls in any date range, which is a significant limitation for organizations with high call volumes.
- **Suggested Fix:** Implement cursor-based pagination as already suggested in the doc.
- **Human Decision:** ⏳ PENDING

#### 2. URL Filter is Client-Side Only
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues table, row 2
- **Issue:** Documentation states "URL filter is client-side | Can't search >500 calls by URL". The URL filter only works on already-fetched data, meaning users cannot reliably search for calls by URL across their full history.
- **Suggested Fix:** Move URL filtering to server-side query as suggested in the doc.
- **Human Decision:** ⏳ PENDING

#### 3. Missing Data Retention Policy
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions, item 1
- **Issue:** Documentation asks "No explicit retention period found in code. Call logs appear to be kept indefinitely. Should there be automatic cleanup for older records?" This represents both a storage cost concern and potential GDPR/privacy compliance gap.
- **Suggested Fix:** Define and implement a data retention policy with configurable retention periods per organization.
- **Human Decision:** ⏳ PENDING

#### 4. No Real-Time Updates on Call Logs Page
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions, item 3
- **Issue:** Documentation notes "Call logs page does not update in real-time. User must refresh to see new calls." For active monitoring during business hours, this creates a poor admin experience.
- **Suggested Fix:** Add polling interval or websocket subscription for new call notifications.
- **Human Decision:** ⏳ PENDING

#### 5. Cancelled Calls Have No Audit Trail
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 2 - State Machine, "pending --> [*]: Visitor cancels (record deleted)" and Section 4, Edge Case #4
- **Issue:** When a visitor cancels during ring, the call record is deleted entirely. This prevents admins from understanding visitor behavior patterns (e.g., how often do visitors cancel while waiting?). The deletion leaves no audit trail for debugging or analytics.
- **Suggested Fix:** Consider soft-delete with status "cancelled" instead of hard delete, or at minimum log cancellation events separately.
- **Human Decision:** ⏳ PENDING

#### 6. Table Rows Not Keyboard Navigable
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, "Keyboard navigation: ⚠️ Table rows not focusable"
- **Issue:** Users who rely on keyboard navigation cannot focus or interact with table rows. Only filter inputs are focusable. This is an accessibility barrier.
- **Suggested Fix:** Add tabindex and keyboard handlers to table rows, or implement a proper data grid component with ARIA grid roles.
- **Human Decision:** ⏳ PENDING

#### 7. Icons Lack Aria Labels
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility, "Screen reader support: ⚠️ Icons lack aria-labels in some places"
- **Issue:** Icons used in the interface do not have aria-labels, making them invisible to screen reader users.
- **Suggested Fix:** Add aria-label attributes to all interactive icons (play button, expand transcription, etc.).
- **Human Decision:** ⏳ PENDING

#### 8. No Loading States During Page Transitions
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility, "Loading states: ⚠️ No loading spinner during page transitions (server components)"
- **Issue:** When filters are applied and the page reloads, there's no visual feedback that data is being fetched. Users may think the interface is frozen.
- **Suggested Fix:** Add loading skeleton or spinner during server component transitions.
- **Human Decision:** ⏳ PENDING

#### 9. CSV Export May Freeze Browser
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Performance, "CSV generation | Client-side, may block UI | ⚠️ Large exports may freeze"
- **Issue:** CSV generation happens client-side and can block the UI thread for large exports. This creates a poor user experience and may cause the browser to show "page unresponsive" warnings.
- **Suggested Fix:** Move CSV generation to a web worker or server-side endpoint that streams the download.
- **Human Decision:** ⏳ PENDING

#### 10. Client-Side URL Filtering Could Be Slow
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Performance, "Client-side filtering | URL conditions filtered after fetch | ⚠️ Could be slow with 500 records"
- **Issue:** URL filtering happens on already-fetched data client-side. With 500 records, this filtering could cause noticeable UI lag.
- **Suggested Fix:** Move to server-side filtering (related to finding #2).
- **Human Decision:** ⏳ PENDING

#### 11. Deleted Pool Shows Orphaned Reference
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases, row 10
- **Issue:** Documentation shows ⚠️ for scenario where pool is deleted: "pool_id remains in call record". This means historical calls reference a pool that no longer exists, which could cause display issues or confusing data in reports.
- **Suggested Fix:** Either soft-delete pools or display "Deleted Pool" with the original name if available.
- **Human Decision:** ⏳ PENDING

#### 12. No Sorting Options for Call Table
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues table, row 3
- **Issue:** Documentation states "No sorting options | Can't sort by duration, etc." Users cannot reorder the call table by duration, answer time, or other columns, limiting analysis capabilities.
- **Suggested Fix:** Add column sorting with ascending/descending options.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 6
- **Low:** 6

---

## D-blocklist-settings - Blocklist Settings

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/blocklist-settings.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-blocklist-settings.md`

### Findings

#### 1. ip-api.com Rate Limit Risk at Scale
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 6 - Technical Concerns, Performance table row 4; Section 7 - Identified Issues
- **Issue:** The geolocation service uses ip-api.com free tier which has a 45 requests/minute limit. Documentation flags this as a concern but no mitigation plan is documented. At scale (45+ unique visitors per minute), geolocation will fail and all visitors will be allowed through (fail-safe), bypassing blocklist entirely.
- **Suggested Fix:** Document a concrete plan for scaling: either migrate to MaxMind/paid ip-api tier, or implement IP-based rate limiting with fallback handling.
- **Human Decision:** ⏳ PENDING

#### 2. Empty Allowlist Behavior Could Be Confusing
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 2 - State Machine, "ALLOWLIST MODE" box; Section 10 - Open Questions #6
- **Issue:** Empty allowlist allows all visitors (lenient default), but admin might intuitively expect empty allowlist = "allow nobody" (block everyone). Open Question #6 already flags this as potentially confusing.
- **Suggested Fix:** Add explicit warning in UI when admin has empty allowlist: "Your allowlist is empty. All visitors are currently allowed. Add countries to restrict access."
- **Human Decision:** ⏳ PENDING

#### 3. Unknown Country Handling Differs Between Modes
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 2 - State Machine
- **Issue:** When geolocation fails, behavior differs by mode: Blocklist mode → ALLOWED (fail-safe), Allowlist mode → BLOCKED. This asymmetry could surprise admins. An allowlist admin might not realize that geolocation failures will block legitimate visitors from allowed countries.
- **Suggested Fix:** Document this behavior prominently in the UI info box, especially for allowlist mode: "Note: Visitors whose location cannot be determined will be blocked in allowlist mode."
- **Human Decision:** ⏳ PENDING

#### 4. Accessibility - Dropdown Requires Mouse Interaction
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, row 1
- **Issue:** Documentation explicitly flags that "Dropdown requires mouse interaction" for keyboard navigation. Users who rely on keyboard navigation (accessibility requirement) cannot use the country selector.
- **Suggested Fix:** Implement keyboard navigation for the dropdown: arrow keys to navigate, Enter to select, Escape to close, Tab to move between regions/countries.
- **Human Decision:** ⏳ PENDING

#### 5. Accessibility - Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, row 2
- **Issue:** Documentation states "Screen reader support: ⚠️ Not verified". This is a potential compliance issue (WCAG) and affects users who rely on assistive technology.
- **Suggested Fix:** Audit the component with a screen reader (VoiceOver, NVDA). Ensure proper ARIA labels on mode selection, country dropdown, selected country badges, and action buttons.
- **Human Decision:** ⏳ PENDING

#### 6. Mode Change Clears Country List Without Confirmation
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 2 - Triggers & Events, "Mode change" row; Section 4 - Edge Cases #9 and #12
- **Issue:** Switching between Blocklist and Allowlist modes clears the entire country list. While there's a "clear warning in UI" mentioned, if an admin accidentally clicks the wrong mode, they lose their entire list of selected countries. There's no confirmation dialog or undo functionality.
- **Suggested Fix:** Add confirmation dialog when switching modes if list is non-empty: "Switching modes will clear your current list of X countries. Continue?" Or implement undo functionality.
- **Human Decision:** ⏳ PENDING

#### 7. Cache Invalidation Delay Not Communicated to Admin
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, "Cache invalidation" row; Section 10 - Open Questions #2
- **Issue:** Changes take 60s (dev) / 5min (prod) to take effect due to cache TTL. Admin sees "success" message but changes may not be immediately enforced. This could be confusing if admin tests immediately after saving.
- **Suggested Fix:** Add note to success message: "Changes saved. May take up to 5 minutes to take full effect."
- **Human Decision:** ⏳ PENDING

#### 8. No Persistent Logging of Blocked Connection Attempts
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Blocked connection attempts are only logged to console (server logs). There's no persistent record for analytics, compliance auditing, or troubleshooting. Admins cannot see how many visitors are being blocked or from which countries.
- **Suggested Fix:** Consider adding a blocked attempts counter to the admin dashboard, or store blocked attempts in a log table for compliance/analytics purposes.
- **Human Decision:** ⏳ PENDING

#### 9. VPN Bypass Limitation Documented But No Detection
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #11; Section 7 - Identified Issues, "VPN bypass" row
- **Issue:** Documentation correctly notes that VPN users can bypass country restrictions. While this is documented in the info box, it's a fundamental limitation that reduces the effectiveness of the feature for security-focused use cases.
- **Suggested Fix:** Already documented appropriately. Consider future integration with VPN detection service if this becomes a significant issue for customers.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 9
- **Critical:** 0
- **High:** 1
- **Medium:** 5
- **Low:** 3

---

## D-widget-settings - Widget Settings

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/widget-settings.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-widget-settings.md`

### Findings

#### 1. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, "Screen reader support: ⚠️ Not explicitly verified"
- **Issue:** Documentation explicitly flags that screen reader support has not been verified. The Widget Settings UI includes multiple interactive elements (dropdowns, sliders, toggles, preview component) that need proper ARIA labels and announcements for accessibility compliance.
- **Suggested Fix:** Conduct accessibility audit with screen readers (VoiceOver, NVDA). Ensure ARIA labels on all form controls, proper live regions for preview updates, and role attributes for the visual preview component.
- **Human Decision:** ⏳ PENDING

#### 2. DEFAULT_WIDGET_SETTINGS Defined in Multiple Files
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 3 - Key Functions/Components, row 4: "DEFAULT_WIDGET_SETTINGS | Multiple files"
- **Issue:** The DEFAULT_WIDGET_SETTINGS constant is defined in multiple files rather than having a single source of truth. This creates risk of divergence if one file is updated and others are not, leading to inconsistent fallback behavior between server and widget.
- **Suggested Fix:** Define DEFAULT_WIDGET_SETTINGS once in `packages/domain/src/types.ts` alongside the WidgetSettings type definition, and import it everywhere else.
- **Human Decision:** ⏳ PENDING

#### 3. Pool Settings Don't Support Partial Overrides
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Documentation explicitly asks "Should pool settings support partial overrides?" Currently pool settings fully replace org defaults, meaning an admin must re-configure ALL settings for a pool even if they only want to change one (e.g., different position but same theme). This creates maintenance burden and risk of divergence.
- **Suggested Fix:** Implement merge strategy where pool settings can specify only the fields to override, with unspecified fields falling back to org defaults. Use null or undefined for "inherit from org" semantics.
- **Human Decision:** ⏳ PENDING

#### 4. Cache Not Invalidated on Settings Save
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 1; Section 3 - Data Flow; Section 10 - Open Questions #1
- **Issue:** When admin saves widget settings, the cache is NOT immediately invalidated. Settings may take up to 5 minutes to propagate to visitors. This creates a confusing admin experience where changes appear saved but don't take effect immediately.
- **Suggested Fix:** Add cache invalidation endpoint that can be called on save, or implement pub/sub pattern where server listens for settings changes. At minimum, add UI feedback: "Changes saved. May take up to 5 minutes to apply to all visitors."
- **Human Decision:** ⏳ PENDING

#### 5. No Live Site Preview for Widget Settings
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Documentation notes "Should there be a settings preview on the live site? Admins can only see preview in dashboard, not on actual customer site." The dashboard preview may not perfectly match real-world behavior due to CSS conflicts, z-index issues, or responsive behavior on the actual website.
- **Suggested Fix:** Consider adding "Preview on your site" feature that opens widget in preview mode on admin's actual URL, or provide guidance on testing changes before saving.
- **Human Decision:** ⏳ PENDING

#### 6. No Pool Settings Visual Preview
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 2
- **Issue:** Documentation states "No preview for all themes in pool settings | Pool settings harder to visualize". Unlike org-level settings which have a live preview component, pool-level overrides don't show a visual preview, making it harder for admins to configure pool-specific appearances.
- **Suggested Fix:** Add WidgetPreview component to pool settings UI, similar to org settings page.
- **Human Decision:** ⏳ PENDING

#### 7. hasHadCall Flag Silently Overrides Admin Setting
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #18
- **Issue:** When `show_minimize_button=false` is set by admin, but the visitor has had a previous call (`hasHadCall=true`), the minimize button is shown anyway. While this may be intentional UX (visitors who've interacted deserve minimize option), it means the admin setting is silently ignored, which could be confusing.
- **Suggested Fix:** Document this behavior more prominently in the UI: "Note: Minimize button will always appear for visitors who have completed a call, regardless of this setting." Or make this a separate toggle: "Always show after call."
- **Human Decision:** ⏳ PENDING

#### 8. Position "center" Behavior Not Documented
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 2 - State Definitions, position row
- **Issue:** Position includes "center" as an option, but there's no documentation of how it behaves with trigger delays (where does it animate from?), auto-hide (where does it go?), or whether it conflicts with certain size options. The center position is also unusual for a chat widget and may have UX implications.
- **Suggested Fix:** Document center position behavior, including animation directions and any size restrictions. Consider whether center is a valid production use case.
- **Human Decision:** ⏳ PENDING

#### 9. 5-Minute Cache TTL Trade-off Not Quantified
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Documentation asks "Is 5-minute cache TTL optimal? Trade-off between freshness and DB load could be tuned." However, there's no data on actual query volume or cache hit rates to inform this decision. The 5-minute value appears arbitrary.
- **Suggested Fix:** Add monitoring for cache hit rate and DB query frequency. Document expected query volumes at different traffic levels to inform TTL selection. Consider making TTL configurable per-environment.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 9
- **Critical:** 0
- **High:** 0
- **Medium:** 3
- **Low:** 6
---

## A-agent-stats-dashboard - Agent Stats Dashboard

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/agent-stats-dashboard.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-agent-stats-dashboard.md`

### Findings

#### 1. 500 Call Limit Prevents Access to Full History
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #5 (⚠️ flag), Section 6 - Performance, Section 7 - Identified Issues, Section 10 - Open Question #1
- **Issue:** High-volume agents cannot access calls beyond the most recent 500 in any date range. The system shows "(limit reached)" message but provides no way to access older calls. This is particularly problematic for date ranges spanning months where an agent may have thousands of calls.
- **Suggested Fix:** Implement cursor-based pagination to allow agents to load additional calls beyond the initial 500.
- **Human Decision:** ⏳ PENDING

#### 2. URL Filtering is Client-Side Only
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 3 - Data Flow (URL Condition Filtering), Section 6 - Performance (⚠️), Section 10 - Open Question #2
- **Issue:** URL conditions filtering happens after 500 calls are fetched. Agents cannot reliably search their full call history by URL patterns. For example, if an agent wants to find calls from a specific landing page but those calls are beyond the 500-call limit, they won't appear in results.
- **Suggested Fix:** Move URL filtering to server-side query to filter before the 500 limit is applied.
- **Human Decision:** ⏳ PENDING

#### 3. No Loading Indicator During Data Fetch
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility (⚠️ "Loading states"), Section 7 - Identified Issues ("No loading state")
- **Issue:** When the agent changes the date range or applies filters, there's no visual feedback that data is being refetched. The user may not realize the page is loading new data, leading to confusion or repeated clicks.
- **Suggested Fix:** Add a loading spinner or skeleton state during server component refetch.
- **Human Decision:** ⏳ PENDING

#### 4. Keyboard Navigation Not Fully Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, row 1
- **Issue:** Documentation explicitly states keyboard navigation is "⚠️ Not fully verified". Interactive elements like the date picker, filter dropdowns, recording play buttons, and expandable rows may not be fully accessible to keyboard-only users.
- **Suggested Fix:** Audit and fix keyboard navigation: ensure Tab order is logical, Enter/Space activate buttons, Escape closes dropdowns, Arrow keys navigate within dropdowns.
- **Human Decision:** ⏳ PENDING

#### 5. Screen Reader Support May Need ARIA Labels
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, row 2
- **Issue:** Documentation notes "Screen reader support: ⚠️ Table structure helps, but interactive elements may need ARIA". The StatCards, expandable transcription/summary badges, and audio player controls may not announce properly to screen reader users.
- **Suggested Fix:** Add appropriate ARIA labels: aria-label on icon buttons (play, download), aria-expanded on expandable rows, aria-live regions for dynamic stat updates.
- **Human Decision:** ⏳ PENDING

#### 6. Video Modal May Not Trap Focus
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, row 5
- **Issue:** Documentation flags "Focus management: ⚠️ Modal should trap focus". When the video recording modal opens, focus may not be trapped inside it, allowing keyboard users to tab to elements behind the modal, which is both confusing and an accessibility violation.
- **Suggested Fix:** Implement focus trap in video modal: focus first focusable element on open, cycle focus within modal on Tab, return focus to trigger on close.
- **Human Decision:** ⏳ PENDING

#### 7. No Data Export Capability
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues ("No data export")
- **Issue:** Agents cannot export their call history for external analysis, record-keeping, or sharing with supervisors. This limits the utility of the stats dashboard for performance reviews or personal tracking.
- **Suggested Fix:** Add CSV export button similar to admin call logs feature.
- **Human Decision:** ⏳ PENDING

#### 8. No Real-Time Updates for New Calls
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues ("No real-time updates")
- **Issue:** New calls require a page refresh to appear in the dashboard. An agent who just finished a call won't see it reflected in their stats until they manually refresh.
- **Suggested Fix:** Consider polling interval (every 30s) or websocket subscription for new call notifications, with visual indicator when new calls arrive.
- **Human Decision:** ⏳ PENDING

#### 9. Inconsistency: Agent Stats vs Admin Stats Permission Boundary Unclear
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 9 - Related Features references "Agent Stats (STATS1)" which is admin view
- **Issue:** Documentation references `../stats/agent-stats.md` as "Admin view of agent stats (different from agent's self-view)" but doesn't clarify what an admin can see vs. what an agent can see. For example, can admins see the same transcriptions and AI summaries? Are there privacy implications?
- **Suggested Fix:** Clarify in both documents what data is visible to each role and whether there are any privacy-sensitive fields that differ between views.
- **Human Decision:** ⏳ PENDING

#### 10. Missing "Today" Quick Filter
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #4
- **Issue:** Documentation asks "Should there be a 'today' quick view?". Many agents primarily care about today's calls and currently must manually adjust the date picker each day or default to viewing 30 days of data when they only need today.
- **Suggested Fix:** Add quick filter buttons: "Today", "This Week", "This Month", "Last 30 Days" alongside the date picker.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 5

---

## D-organization-settings - Organization Settings

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/organization-settings.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-organization-settings.md`

### Findings

#### 1. Stripe Cancellation Not Implemented
- **Category:** Technical Debt
- **Severity:** Critical
- **Location:** Section 10 - Open Questions, #4
- **Issue:** The documentation states "The current code only saves feedback and sets plan to 'free' in Supabase. The actual Stripe subscription cancellation appears to be a TODO comment." This means users who cancel may still be charged by Stripe even though the UI shows cancellation was successful.
- **Suggested Fix:** Implement actual Stripe subscription cancellation via `stripe.subscriptions.cancel()` or `stripe.subscriptions.update()` with `cancel_at_period_end: true` in the `submitCancellationFeedback` server action.
- **Human Decision:** ⏳ PENDING

#### 2. Cancellation Grace Period Mismatch
- **Category:** Inconsistency
- **Severity:** Critical
- **Location:** Section 10 - Open Questions, #3; Section 3 - Data Flow, "Cancel subscription"
- **Issue:** The cancel modal UI copy mentions "access will continue until the end of your current billing period" but the implementation immediately downgrades the plan to "free" (`Update org: plan = "free"`). This creates a mismatch between user expectation and actual behavior - users may lose access immediately despite being told they have time remaining.
- **Suggested Fix:** Either update the UI copy to reflect immediate downgrade, or implement proper grace period logic that maintains access until `current_period_end` from Stripe subscription.
- **Human Decision:** ⏳ PENDING

#### 3. Recording Retention Policy Change Behavior Unclear
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 10 - Open Questions, #1
- **Issue:** Documentation does not specify whether existing recordings are affected when `retention_days` is changed. If an admin reduces retention from 90 days to 30 days, it's unclear if recordings older than 30 days are immediately deleted or if the new policy only applies to new recordings.
- **Suggested Fix:** Document the expected behavior explicitly. If retroactive deletion is intended, add a confirmation warning. If only new recordings are affected, document this clearly for admin understanding.
- **Human Decision:** ⏳ PENDING

#### 4. Timezone Handling for Pause End Date
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions, #2
- **Issue:** The `pause_ends_at` date is calculated server-side using JavaScript Date which uses UTC. When displayed to the user, this may not align with their local timezone, causing confusion about when the pause actually ends (e.g., "Your account resumes on Dec 15" might resume on Dec 14 or Dec 16 depending on timezone).
- **Suggested Fix:** Either store and display dates in the organization's configured timezone, or clearly show the timezone in the UI (e.g., "Dec 15, 2025 at 12:00 AM UTC").
- **Human Decision:** ⏳ PENDING

#### 5. Facebook Events Silent Failure on Invalid Credentials
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions, #6
- **Issue:** There is no error handling or admin notification when Facebook access tokens expire or are revoked. Admins may think their conversion tracking is working when events are silently failing, leading to incorrect analytics and wasted ad spend.
- **Suggested Fix:** Implement credential validation on save, periodic health checks, and admin notifications when FB API calls start failing.
- **Human Decision:** ⏳ PENDING

#### 6. Disposition Conversion Values Not Aggregated
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions, #5
- **Issue:** Dispositions have a `value` field for conversion tracking, but the documentation notes "the aggregation/reporting of these values is not implemented in the current codebase." Admins can set monetary values but cannot see total conversion value or ROI metrics anywhere.
- **Suggested Fix:** Add a reporting view that aggregates disposition values by time period, agent, and disposition type to provide conversion analytics.
- **Human Decision:** ⏳ PENDING

#### 7. Facebook Settings Can Be Saved Without Pixel ID
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #15
- **Issue:** Edge case #15 is marked with ⚠️: "Save FB settings without pixel ID - Leave pixel ID empty - Can save but events won't fire - No validation error shown". This allows admins to configure event mappings that will never work, without any feedback that their setup is incomplete.
- **Suggested Fix:** Add validation that requires Pixel ID when any Facebook event mappings are configured, or show a warning banner indicating events won't fire without Pixel ID.
- **Human Decision:** ⏳ PENDING

#### 8. No Organization Name Length Limit
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** The organization name input field has no character limit. Extremely long names could overflow UI elements throughout the application where the org name is displayed (headers, dropdowns, reports, etc.).
- **Suggested Fix:** Add `maxLength={100}` (or appropriate limit) to the org name input field and add server-side validation.
- **Human Decision:** ⏳ PENDING

#### 9. Concurrent Admin Edits - Last Write Wins
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability, "Concurrent edits"
- **Issue:** Documentation notes "Last-write-wins (no optimistic locking)" for concurrent edits. In organizations with multiple admins, changes could be silently overwritten without either party knowing. While noted as "Rare scenario for small teams," larger organizations could encounter this frequently.
- **Suggested Fix:** Implement optimistic locking with version numbers, or at minimum show a warning when the data has changed since page load.
- **Human Decision:** ⏳ PENDING

#### 10. Accessibility - Custom Components Missing ARIA Labels
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Screen reader support: ⚠️ Some custom components may lack ARIA labels". This affects users relying on assistive technologies.
- **Suggested Fix:** Audit all custom components (dropdowns, modals, toggles) and add appropriate ARIA labels, roles, and live regions for state changes.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 2
- **High:** 1
- **Medium:** 4
- **Low:** 3
---

## A-agent-call-logs - Agent Call Logs

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/agent-call-logs.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-agent-call-logs.md`

### Findings

#### 1. No Server-Side Pagination Limits Data Access
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 10 - Open Question #5
- **Issue:** Documentation states "No server-side pagination | 500 record limit cuts off data". Agents with high call volumes cannot access their historical data beyond the most recent 500 calls in any date range. The "(limit reached)" message appears but provides no way to access older data.
- **Suggested Fix:** Implement cursor-based pagination as already suggested in the doc.
- **Human Decision:** ⏳ PENDING

#### 2. Data Retention Policy Undefined
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Question #2
- **Issue:** Documentation asks "Data retention for old calls? No explicit retention period found. Call logs appear to be kept indefinitely. Should there be limits for agent view?" This represents potential storage cost concerns and possible GDPR/privacy compliance gaps.
- **Suggested Fix:** Define and implement data retention policy with configurable periods.
- **Human Decision:** ⏳ PENDING

#### 3. Table Rows Not Keyboard Navigable
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Keyboard navigation: ⚠️ Table rows not focusable, filter inputs are". Users who rely on keyboard navigation cannot interact with table rows to expand transcriptions, play recordings, or view call details.
- **Suggested Fix:** Add tabindex and keyboard handlers to table rows, or implement a proper data grid component with ARIA grid roles.
- **Human Decision:** ⏳ PENDING

#### 4. No CSV Export for Agents (Inconsistent with Admin)
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Question #1
- **Issue:** Documentation notes "Admins can export, agents cannot". This is inconsistent with the Admin Call Logs feature (D7) which has CSV export. Agents may want to export their own call data for personal performance tracking or records.
- **Suggested Fix:** Add agent export option for their own call data.
- **Human Decision:** ⏳ PENDING

#### 5. URL Filter is Client-Side Only
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 6 - Performance
- **Issue:** Documentation states "URL filter is client-side | Can't search >500 calls by URL" and "Client-side URL filtering... Could be slow with 500 records". Agents cannot reliably search for calls by URL across their full history.
- **Suggested Fix:** Move URL filtering to server-side query.
- **Human Decision:** ⏳ PENDING

#### 6. No Real-Time Updates
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Question #3
- **Issue:** Documentation notes "Must refresh to see new calls". After completing a call, the agent must manually refresh to see it appear in their call logs. This creates a disjointed experience when reviewing just-completed calls.
- **Suggested Fix:** Add polling or websocket subscription for new call notifications.
- **Human Decision:** ⏳ PENDING

#### 7. No Column Sorting Options
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Documentation states "No sorting options | Can't sort by duration, etc." Agents cannot reorder calls by duration, answer time, or other columns, limiting their ability to identify patterns in their performance.
- **Suggested Fix:** Add column sorting with ascending/descending options.
- **Human Decision:** ⏳ PENDING

#### 8. Icons Lack Aria-Labels for Screen Readers
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation flags "Screen reader support: ⚠️ Icons lack aria-labels in some places". Icons used for status indicators, playback controls, and badges may be invisible to screen reader users.
- **Suggested Fix:** Add aria-label attributes to all interactive icons.
- **Human Decision:** ⏳ PENDING

#### 9. No Loading States During Page Transitions
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Loading states: ⚠️ No loading spinner during page transitions (server components)". When filters are applied and the page reloads, there's no visual feedback that data is being fetched.
- **Suggested Fix:** Add loading skeleton or spinner during server component transitions.
- **Human Decision:** ⏳ PENDING

#### 10. No Pool Filter for Multi-Pool Agents
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #6
- **Issue:** Documentation asks "Why no pool filter for agents? Agents in multiple pools can't filter by pool." Agents who work across multiple pools cannot segment their call history by pool, making it harder to track performance per team or assignment.
- **Suggested Fix:** Add optional pool filter for agents assigned to multiple pools.
- **Human Decision:** ⏳ PENDING

#### 11. No Call Notes Feature
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #4
- **Issue:** Documentation asks "Call notes/internal comments? No field for agents to add private notes to calls." Agents cannot annotate their call history with personal notes for follow-up or learning purposes.
- **Suggested Fix:** Consider adding optional private notes field per call for agent's personal use.
- **Human Decision:** ⏳ PENDING

#### 12. Deleted Pool Creates Orphaned Reference
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases, row 5
- **Issue:** Documentation shows ⚠️ for scenario "Call from deleted pool": "Call still shows, pool_id orphaned". While the doc notes "pool_id not used in agent view anyway", this could cause display issues if pool data is ever added to the agent view.
- **Suggested Fix:** Either soft-delete pools or handle orphaned pool_id gracefully with "Deleted Pool" indicator.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 3
- **Low:** 9



- **Human Decision:** ⏳ PENDING

#### 6. Drag Reorder Makes Sequential DB Updates (Not Batched)
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Performance table, "Drag reorder" row
- **Issue:** Documentation flags "Multiple sequential updates (not batched) | ⚠️ Could be optimized". When admin reorders N dispositions, N separate UPDATE queries are executed. With many dispositions, this creates unnecessary DB round-trips.
- **Suggested Fix:** Batch display_order updates into single RPC call or use upsert with multiple rows.
- **Human Decision:** ⏳ PENDING

#### 7. No Concurrency Control for Concurrent Edits
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability table, "Concurrent edits" row
- **Issue:** Documentation notes "Last-write-wins (no optimistic locking)". If two admins edit the same disposition simultaneously, one's changes will be silently overwritten without warning.
- **Suggested Fix:** Either (a) add `updated_at` optimistic locking check before updates, or (b) use Supabase realtime subscriptions to refresh UI when another user edits.
- **Human Decision:** ⏳ PENDING

#### 8. No Limit on Number of Dispositions
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #6
- **Issue:** Documentation asks "Is there a limit on number of dispositions? No hard limit. UX degrades with >10 options (scrolling required)." Agents may become overwhelmed with too many choices, slowing down post-call workflow and increasing misclicks.
- **Suggested Fix:** Add soft limit warning at 10 dispositions ("More than 10 options may slow down agents"). Consider adding disposition groups/categories for larger sets.
- **Human Decision:** ⏳ PENDING

#### 9. Disposition Selection Is Optional - No Required Mode
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #1
- **Issue:** Documentation asks "Should disposition selection be required? Currently optional (Skip button). Some orgs may want to enforce selection." Organizations that rely on disposition data for reporting may have incomplete data if agents frequently skip.
- **Suggested Fix:** Add org-level setting: "Require disposition after calls" (toggle). When enabled, hide Skip button from agent modal.
- **Human Decision:** ⏳ PENDING

#### 10. No Explicit "Uncategorized" Default Option
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Documentation asks "Should there be a 'No Disposition' default option? Currently NULL means skipped. Could add explicit 'Uncategorized' disposition." The distinction between "skipped" (agent chose not to categorize) vs "uncategorized" (agent couldn't find appropriate option) is lost.
- **Suggested Fix:** Consider adding system-level "Uncategorized" disposition that appears last in list, allowing agents to explicitly mark calls they couldn't categorize vs simply skipping.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 5

---

## D-tiered-routing - Tiered Agent Assignment

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/tiered-routing.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-tiered-routing.md`

### Findings

#### 1. Algorithm May Select Busy Agent Over Idle Agent
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Appendix: Algorithm Pseudocode, `findBestAgentInTier()` function (lines 347-377)
- **Issue:** The pseudocode shows two selection strategies: round-robin for idle agents (via `oldestOrder`) and least-connections for busy agents (via `lowestLoad`). However, both paths update the same `bestAgent` variable. If an idle agent is processed first (updating `bestAgent`), then a busy agent with `load=1` is processed later, the condition `load < lowestLoad` (1 < Infinity) is true and overwrites `bestAgent` with the busy agent. This means an idle agent could lose to a busy agent despite being preferable.
- **Suggested Fix:** Prefer idle agents by only entering the least-connections path if no idle agents were found: `if (!bestAgent && load < lowestLoad)` or track `hasIdleCandidate` flag.
- **Human Decision:** ⏳ PENDING

#### 2. Empty Pool Falls Back to Any Agent - May Violate Pool Intent
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, row 10
- **Issue:** Documentation flags with ⚠️ that when a pool has no agents, the system "Falls back to any agent (null poolId)" which "May violate pool intent." For example, an Enterprise visitor routed to a pool with no agents could be assigned to a Sales pool agent, breaking the admin's intended segmentation.
- **Suggested Fix:** Either (a) show "no agents available" for strict routing, or (b) add admin toggle for "strict pool routing" vs "fallback allowed", or (c) at minimum log when cross-pool fallback occurs for audit purposes.
- **Human Decision:** ⏳ PENDING

#### 3. Database Slowness Causes Silent Degradation
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 4 - Error States table, "Database fetch fails" row
- **Issue:** Documentation notes: "Database slow: Agent connects without pool memberships, may miss routed leads." When `fetchAgentPoolMemberships()` fails or times out, the agent connects but isn't properly added to pool routing. This is logged but otherwise silent - neither the agent nor admin knows there's a problem.
- **Suggested Fix:** Add visible indicator to agent UI when pool memberships failed to load: "Pool routing unavailable - please reconnect." Consider retry mechanism with exponential backoff.
- **Human Decision:** ⏳ PENDING

#### 4. Cascade Risk When All Primary Agents Leave
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #2
- **Issue:** Documentation notes that when all Primary agents go away simultaneously (e.g., team meeting), "Visitors are reassigned, respecting tiered routing. May cascade to lower tiers quickly." This could result in all visitors being served by Backup-tier agents during scheduled events, which may not align with business expectations.
- **Suggested Fix:** Consider adding scheduled "coverage mode" feature where admins can pre-designate temporary coverage tiers, or document this as expected behavior with guidance on staggering breaks.
- **Human Decision:** ⏳ PENDING

#### 5. No Tier Utilization Analytics
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 2; Section 10 - Open Questions #3
- **Issue:** Documentation explicitly flags "No tier statistics - Admins can't see tier utilization" as Low severity issue. Without analytics, admins cannot evaluate whether their tier configuration is effective (e.g., are Backup agents ever used? Are Primary agents overloaded?).
- **Suggested Fix:** Add tier utilization metrics to pool dashboard: leads per tier, average wait time per tier, overflow frequency.
- **Human Decision:** ⏳ PENDING

#### 6. Round-Robin Counter Is Global Not Per-Pool
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 1
- **Issue:** Documentation notes "Round-robin is global, not per-pool. Agent in 2 pools uses same order in both." This could cause slightly unfair distribution if an agent is in multiple pools - their assignment order in Pool A affects their order in Pool B.
- **Suggested Fix:** Track `lastAssignmentOrder` per (agentId, poolId) pair instead of just agentId. Low priority since impact is minor.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 6
- **Critical:** 0
- **High:** 0
- **Medium:** 3
- **Low:** 3

---

## D-sites-setup - Sites Setup

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/sites-setup.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-sites-setup.md`

### Findings

#### 1. No Domain Validation - Anyone Can Use Any Org's Embed Code
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Security ("Domain spoofing" row); Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Documentation explicitly notes "Domain spoofing | No validation - any domain can use any org's code" in Security concerns. Any website owner could embed another organization's widget, potentially using their agent resources or skewing their analytics. The Open Questions section asks "Should there be an allowed_origins feature?"
- **Suggested Fix:** Add optional `allowed_origins` setting in organization settings. When configured, server validates `pageUrl` origin against whitelist before allowing connection.
- **Human Decision:** ⏳ PENDING

#### 2. Infinite Verification Polling Without Backoff
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #15; Section 7 - Identified Issues; Section 10 - Open Questions #7
- **Issue:** Dashboard polls every 5 seconds indefinitely until widget is verified. Quote from Edge Case #15: "Polls forever until verified" with ⚠️ flag. Open Question #7: "Is infinite verification polling acceptable? Dashboard polls every 5 seconds forever until verified. Consider exponential backoff or a 'check again' button after timeout."
- **Suggested Fix:** Implement exponential backoff after 5 minutes (5s → 10s → 30s → 60s), then stop polling and show "Click to check again" button.
- **Human Decision:** ⏳ PENDING

#### 3. Pageview Tracking Requires Agent Online
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #8; Section 7 - Identified Issues; Section 10 - Open Questions #5
- **Issue:** Edge Case #8 states: "No agents online | Widget loads, no agent available | Pageview not tracked (agent_id required) | ⚠️ | Missed opportunity tracked instead". This means organizations without 24/7 agent coverage will have inaccurate pageview counts. Open Question #5 confirms: "pageview count may be inaccurate for orgs without 24/7 coverage."
- **Suggested Fix:** Allow pageview recording without agent_id (make it nullable) OR track "unassigned pageviews" separately for accurate install verification.
- **Human Decision:** ⏳ PENDING

#### 4. HTTPS Site with HTTP ServerUrl Causes Mixed Content Block
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #20
- **Issue:** Edge Case #20: "HTTPS site with HTTP serverUrl | Protocol mismatch | Mixed content warning/block | ⚠️ | Must use HTTPS in prod". If admin copies embed code from a dev environment with HTTP serverUrl and pastes it on a production HTTPS site, the widget will be blocked by the browser's mixed content policy. Admin gets no clear error message about why widget isn't working.
- **Suggested Fix:** Add validation to embed code generation: if dashboard is on HTTPS, ensure serverUrl also uses HTTPS. Display warning if mismatch detected.
- **Human Decision:** ⏳ PENDING

#### 5. Widget Blocked by Ad Blocker - No Admin Notification
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #6; Error States table ("SCRIPT_BLOCKED" row)
- **Issue:** Edge Case #6: "Widget blocked by ad blocker | Browser extension | Widget fails silently | ⚠️ | No admin notification". Error States confirms: "SCRIPT_BLOCKED | Ad blocker active | Nothing (widget hidden)". Admin has no way to know if visitors aren't seeing the widget due to ad blockers, and visitors may not realize they need to whitelist the domain.
- **Suggested Fix:** Document this limitation prominently in the setup instructions. Consider adding FAQ entry about ad blockers. Optionally track "widget load attempts" server-side to identify discrepancies.
- **Human Decision:** ⏳ PENDING

#### 6. No Installation Test Mode
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #6
- **Issue:** Section 7 identifies: "No installation test mode | Must deploy to verify | 🟢 Low | Add 'test widget' button". Open Question #6: "Should there be a 'test widget' button? Currently admins must deploy to production to verify the widget works. A preview/test mode could help validate settings before going live."
- **Suggested Fix:** Add "Test Widget" button that opens a test page showing the widget with current settings, without requiring production deployment.
- **Human Decision:** ⏳ PENDING

#### 7. Stale/Inactive Sites Cannot Be Removed
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #16; Section 7 - Identified Issues; Section 10 - Open Questions #2
- **Issue:** Edge Case #16: "Detected site no longer active | Widget removed | Still shows in list (historical data) | ⚠️ | last_seen shows staleness". Section 7: "No 'remove domain' option | Can't clean up old sites | 🟢 Low | Add archive/delete for domains". Admins cannot clean up their detected sites list.
- **Suggested Fix:** Add "Archive" or "Remove" option for domains in the detected sites list. Archived domains could be hidden but retained for historical records.
- **Human Decision:** ⏳ PENDING

#### 8. Subdomains Treated as Separate Domains
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #5; Section 7 - Identified Issues; Section 10 - Open Questions #3
- **Issue:** Edge Case #5: "`www.site.com` vs `site.com` | Tracked as separate origins | ⚠️ | URL.origin differentiates". Section 7: "Subdomain treated as separate domain | Confusing for admins | 🟢 Low | Group by root domain option". Open Question #3 asks if subdomains should be grouped.
- **Suggested Fix:** Add option to group by root domain (strip www prefix at minimum), or display both under a parent domain entry.
- **Human Decision:** ⏳ PENDING

#### 9. Screen Reader Support for Code Block Not Verified
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Screen reader support: ⚠️ Code block may need aria-label". The embed code block is a key interactive element that users need to copy. Without proper accessibility labels, screen reader users may struggle to identify or interact with the code block.
- **Suggested Fix:** Add `aria-label="Embed code snippet - press Enter to copy"` to the code block container. Add `aria-live="polite"` announcement when code is copied.
- **Human Decision:** ⏳ PENDING

#### 10. No CSP Whitelist Guidance in Dashboard
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #9; Error States table ("CSP_VIOLATION" row)
- **Issue:** Edge Case #9: "Page with CSP headers | Strict Content-Security-Policy | May block widget script | ⚠️ | Admin must whitelist CDN". Error States: "CSP_VIOLATION | Strict CSP policy | Console error | Add CDN to script-src directive". While the fix is documented, there's no guidance in the dashboard UI for admins who encounter this issue.
- **Suggested Fix:** Add troubleshooting section or FAQ link on the Sites page explaining CSP requirements. Include the required CSP directive: `script-src 'self' https://cdn.ghost-greeter.com`.
- **Human Decision:** ⏳ PENDING

#### 11. Domain Ownership Transfer Creates Orphaned Data
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #17
- **Issue:** Edge Case #17: "Domain ownership transfer | Different customer uses same domain | Previous org still tracks that domain | ⚠️ | No domain validation". If a website changes ownership and new owners use GreetNow with their own org, the previous org's analytics still show that domain's historical data, creating confusion and potential data isolation concerns.
- **Suggested Fix:** This is partially mitigated by "no domain validation" finding. If allowed_origins is implemented, historical data should remain but new pageviews would fail validation for the old org.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 6

---

## D-routing-rules - Routing Rules

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/routing-rules.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-routing-rules.md`

### Findings

#### 1. No Manual Rule Priority Reordering in UI
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review, Step 7; Section 7 - Identified Issues, row 1
- **Issue:** Documentation explicitly states "Admin reorders rules | Not supported | ❌ | Priority is set but manual reorder isn't exposed". Admins cannot easily adjust rule priority order through drag-and-drop or visual controls, despite priority being the critical factor in determining which rule matches first.
- **Suggested Fix:** Add drag-and-drop reorder in UI as documented in Section 7.
- **Human Decision:** ⏳ PENDING

#### 2. Pool Fallback Ignores Routing Intent
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #10; Section 7 - Identified Issues, row 3; Section 10 - Open Questions #2
- **Issue:** When all agents in the matched pool are busy, the system falls back to ANY available agent from any pool. Quote: "All agents in matched pool busy | Falls back to ANY available agent | ⚠️ | Design choice". This breaks admin's routing intent - a visitor routed to "Enterprise Pool" could end up with a "Sales Pool" agent.
- **Suggested Fix:** Add option for strict pool enforcement (no fallback) as documented. Show "no agents available" if strict mode is enabled and pool is empty.
- **Human Decision:** ⏳ PENDING

#### 3. SPA Navigation Doesn't Update Pool Routing
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #4
- **Issue:** Documentation asks "How to handle SPA navigation? If visitor navigates within an SPA without page reload, `pageUrl` doesn't update unless widget explicitly re-joins." Visitors who navigate from /home to /pricing within a SPA remain routed to the pool that matched /home, even if /pricing has different routing rules.
- **Suggested Fix:** Document this limitation prominently, or implement URL change listener in widget that triggers re-routing when pathname changes.
- **Human Decision:** ⏳ PENDING

#### 4. Unclear Error Message When Adding Rule to Catch-All Pool
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review, Step 6
- **Issue:** Documentation notes when admin tries to add rule to catch-all pool: "Database error | ⚠️ | Error message could be clearer". The database trigger prevents the insert, but the error message shown to the user doesn't clearly explain why rules cannot be added to catch-all pools.
- **Suggested Fix:** Catch this specific error and display user-friendly message: "Routing rules cannot be added to the catch-all pool. This pool automatically receives all visitors not matched by other rules."
- **Human Decision:** ⏳ PENDING

#### 5. Invalid URL Falls Back to Treating Input as Path
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #4; Notes section
- **Issue:** Edge Case #4 shows "Invalid URL format | Visitor sends malformed URL | Treated as path, may not match | ⚠️". The parseUrlContext() function's try/catch fallback means malformed URLs are treated as paths, which could cause unexpected routing (or no routing match) for visitors with unusual browser configurations or proxy setups.
- **Suggested Fix:** Log malformed URL occurrences for debugging. Consider adding URL validation warning in dashboard if pageUrl patterns in call logs frequently show malformed values.
- **Human Decision:** ⏳ PENDING

#### 6. No Catch-All Pool Returns Null
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #9
- **Issue:** Edge Case #9 documents "No catch-all pool exists | Org missing catch-all | Returns `null`, agent from any pool | ⚠️ | Rare - auto-created". While catch-all is auto-created, if it's accidentally deleted or missing due to data migration issues, the null return could cause undefined behavior in agent assignment.
- **Suggested Fix:** Add defensive check that recreates catch-all pool if missing, or return explicit error state that triggers clear user messaging.
- **Human Decision:** ⏳ PENDING

#### 7. OR Logic Between Conditions Not Exposed in UI
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 2; Section 10 - Open Questions #1
- **Issue:** Documentation notes "OR logic requires multiple rules | Admin wanting 'path = /a OR path = /b' must create 2 rules | 🟢 Low". The database supports `condition_groups` for OR logic (Section Appendix), but it's not exposed in the UI, forcing admins to create multiple rules for simple OR scenarios.
- **Suggested Fix:** Consider exposing condition_groups in UI as suggested, allowing OR logic within a single rule.
- **Human Decision:** ⏳ PENDING

#### 8. No Rule Testing Tool
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 4
- **Issue:** Documentation explicitly identifies "No rule testing tool | Admin can't test 'which pool would /xyz match?' | 🟢 Low". Admins must deploy rules to production and test with real visitors to verify routing behavior, creating risk of misconfiguration.
- **Suggested Fix:** Add test URL input with preview of matched pool in the UI.
- **Human Decision:** ⏳ PENDING

#### 9. Server Sync on Every Save
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 5
- **Issue:** Documentation notes "Server sync on every save | Each save POSTs to signaling server | 🟢 Low | Works but could batch". Multiple rapid rule changes create unnecessary network overhead.
- **Suggested Fix:** Implement debouncing/batching for config sync operations.
- **Human Decision:** ⏳ PENDING

#### 10. Encoded URL Characters May Need Normalization
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #12
- **Issue:** Edge Case #12 flags "Encoded URL characters | `/pricing%20page` | Depends on how URL is constructed | ⚠️ | May need normalization". URL encoding inconsistencies between how the URL is sent by the widget vs. how rules are configured could cause matching failures.
- **Suggested Fix:** Normalize URLs (decode then re-encode consistently) before matching, or document URL encoding requirements for rule configuration.
- **Human Decision:** ⏳ PENDING

#### 11. Empty Query Param Value Edge Case
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #6
- **Issue:** Edge Case #6 notes "Query param with empty value | `?utm_source=` | Matches if rule value is empty string | ⚠️ | Edge case". This behavior is technically correct but may surprise admins - a rule checking for `utm_source=google` won't match `?utm_source=` (empty), but a rule with empty value would match.
- **Suggested Fix:** Document this behavior in UI help text, or add validation warning when admin creates rule with empty condition value.
- **Human Decision:** ⏳ PENDING

#### 12. Rules Must Be Re-Synced After Server Restart
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability
- **Issue:** Documentation states "Server restart: Rules must be re-synced via `setOrgConfig()` call. Dashboard triggers this on page load." If no admin loads the dashboard after a server restart, routing rules remain unloaded in memory until a dashboard page load occurs.
- **Suggested Fix:** Add server startup hook that loads all org configs from database on boot, or implement lazy loading with Redis persistence as noted for redis-pool-manager.ts.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 6
- **Low:** 6

---

## D8 - Organization Settings

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/organization-settings.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-organization-settings.md`

### Findings

#### 1. Stripe Cancellation May Not Actually Cancel Subscription
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 10 - Open Questions #4
- **Issue:** Documentation explicitly states: "What triggers the actual Stripe cancellation? The current code only saves feedback and sets plan to 'free' in Supabase. The actual Stripe subscription cancellation appears to be a TODO comment." If users "cancel" but Stripe subscription isn't cancelled, they will continue to be charged. This is a billing and trust issue.
- **Suggested Fix:** Implement actual Stripe subscription cancellation via `stripe.subscriptions.cancel()` or `stripe.subscriptions.update({ cancel_at_period_end: true })` when user confirms cancellation.
- **Human Decision:** ⏳ PENDING

#### 2. Cancellation UI Copy Doesn't Match Implementation
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 10 - Open Questions #3; Section 3 - Data Flow (Cancel subscription flow)
- **Issue:** The cancel modal tells users "access will continue until the end of your current billing period" but the code shows immediate plan downgrade to "free". Quote: "The code shows immediate plan downgrade to 'free' but the cancel modal mentions 'access will continue until the end of your current billing period' - implementation may not match UI copy." Users are being misled about service continuity.
- **Suggested Fix:** Either (a) implement actual grace period until billing period end, or (b) update UI copy to reflect immediate cancellation. The former is industry standard and more user-friendly.
- **Human Decision:** ⏳ PENDING

#### 3. Recording Retention Policy Change - Unclear Retroactive Behavior
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1
- **Issue:** Documentation asks: "What happens to recordings when retention_days is changed? Currently unclear if existing recordings are retroactively affected or only new recordings follow the policy." This ambiguity could lead to unexpected data deletion (if retroactive) or storage cost surprises (if not).
- **Suggested Fix:** Document and implement explicit policy: recommend retroactive application with background job, but show warning to admin: "Changing retention to X days will delete recordings older than X days within 24 hours."
- **Human Decision:** ⏳ PENDING

#### 4. Timezone Handling for Pause End Date May Confuse Admins
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Quote: "How is timezone handled for pause_ends_at? The pause end date is calculated server-side using JavaScript Date, which may not align with user's local timezone for display." Admin in PST might expect pause to end midnight their time, but it ends midnight UTC.
- **Suggested Fix:** Store pause_ends_at in UTC, but display in user's local timezone with explicit timezone indicator: "Pause ends Dec 15, 2025 at 12:00 AM PST"
- **Human Decision:** ⏳ PENDING

#### 5. Disposition Values Not Used for Analytics
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5
- **Issue:** Documentation notes: "Are dispositions used for billing/analytics? The `value` field on dispositions suggests conversion tracking, but the aggregation/reporting of these values is not implemented in the current codebase." This is a half-built feature - admins configure values but can't see aggregated conversion data anywhere.
- **Suggested Fix:** Either (a) implement disposition value reporting in call analytics, or (b) remove the value field if not planned for use, to avoid confusing admins.
- **Human Decision:** ⏳ PENDING

#### 6. Facebook Credential Expiration Not Handled
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #6
- **Issue:** Quote: "What happens to FB events if credentials become invalid? No visible error handling or notification to admins if their Facebook access token expires or is revoked." Facebook access tokens expire regularly. Events will silently fail, and admins tracking conversions won't know their data is incomplete.
- **Suggested Fix:** Add periodic validation of FB credentials (on settings page load), and display warning if token is expired/invalid. Consider email notification when FB events start failing.
- **Human Decision:** ⏳ PENDING

#### 7. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation flags "Screen reader support: ⚠️ Some custom components may lack ARIA labels". Organization settings includes multiple complex forms (logo upload, toggles, dropdowns) that need proper ARIA labels and announcements for accessibility compliance.
- **Suggested Fix:** Audit all settings pages with screen reader. Ensure ARIA labels on: logo upload zone, save buttons, toggle switches, dropdown menus, and modal dialogs.
- **Human Decision:** ⏳ PENDING

#### 8. FB Settings Can Be Saved Without Pixel ID
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Case #15; Section 7 - Identified Issues
- **Issue:** Quote: "Save FB settings without pixel ID | Leave pixel ID empty | Can save but events won't fire | ⚠️ | No validation error shown". Admin thinks FB tracking is configured, but events silently fail due to missing pixel ID.
- **Suggested Fix:** Add validation warning on save: "Warning: Facebook Pixel ID is empty. No events will be sent until configured."
- **Human Decision:** ⏳ PENDING

#### 9. No Organization Name Length Limit
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Quote: "No org name length limit | Could overflow UI". Very long organization names could break layouts in headers, navigation, and reports where org name is displayed.
- **Suggested Fix:** Add maxLength={100} to org name input with character counter.
- **Human Decision:** ⏳ PENDING

#### 10. Concurrent Admin Edits Cause Silent Data Loss
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability
- **Issue:** Documentation states "Concurrent edits | Last-write-wins (no optimistic locking)". If two admins edit settings simultaneously, one admin's changes are silently overwritten without warning. While rare in small teams, this can cause confusion and lost configuration.
- **Suggested Fix:** Document as known limitation, OR implement optimistic locking with version field and "Settings were modified by another user. Refresh to see latest." warning.
- **Human Decision:** ⏳ PENDING

#### 11. 6-Month Offer Loss May Not Be Fully Understood
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 4 - Edge Case #19
- **Issue:** When leaving 6-month billing, users see a warning but may not fully understand the permanence: "Warning: 6-month offer lost forever". The offer is a promotional rate that cannot be recovered once abandoned.
- **Suggested Fix:** Enhance warning modal with explicit pricing comparison: "You currently pay $X/month. After switching to annual, you'll pay $Y/month. This promotional rate cannot be recovered if you switch."
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 1
- **High:** 1
- **Medium:** 5
- **Low:** 4

---

## D-recording-settings - Recording Settings

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/recording-settings.md`
**Review Agent:** `docs/prompts/active/review-agent-admin-recording-settings.md`

### Findings

#### 1. No Visitor Consent Notification During Calls
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 7 - Identified Issues row 2; Section 10 - Open Questions #2
- **Issue:** Documentation explicitly notes "No recording indicator for visitors" with Medium severity, and Open Question #2 asks "Is there visitor consent notification? Only admin-side privacy warning; no automatic visitor notification." This is a significant compliance risk for GDPR, CCPA, and two-party consent states/countries. Visitors are being recorded without any indication.
- **Suggested Fix:** Add visible "This call may be recorded" indicator to the visitor widget when recording is enabled. Consider audio announcement at call start.
- **Human Decision:** ⏳ PENDING

#### 2. Recording Lost on Agent Page Refresh
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #20; Section 6 - Reliability; Section 7 - Identified Issues row 1
- **Issue:** Documentation explicitly flags: "Agent refreshes during recording → Recording lost → ⚠️ No recovery mechanism". Edge Case #20 confirms this with warning status. If an agent accidentally refreshes or experiences a browser crash mid-call, the entire recording is lost with no recovery path.
- **Suggested Fix:** Implement periodic chunk upload to storage (as suggested in doc) or use browser's beforeunload event to warn agents during active recording.
- **Human Decision:** ⏳ PENDING

#### 3. No Maximum Recording File Size Limit
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1
- **Issue:** Documentation notes "No explicit limit found; depends on call duration and bitrate (~300MB/hour at 2.5Mbps)". Very long calls (2+ hours) could produce recordings exceeding 600MB with no safeguards against storage exhaustion or upload failures for extremely large files.
- **Suggested Fix:** Consider adding maximum recording duration (e.g., 4 hours) or file size warning, especially for organizations with high call volumes.
- **Human Decision:** ⏳ PENDING

#### 4. No GDPR-Compliant Data Export for Recordings
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #7
- **Issue:** Documentation explicitly states "No dedicated export functionality" for GDPR-compliant data export. Under GDPR Article 20, data subjects have the right to receive their personal data in a portable format. Visitors have no way to request copies of their recorded calls.
- **Suggested Fix:** Implement data subject access request (DSAR) workflow, or at minimum document how admins can manually fulfill recording export requests.
- **Human Decision:** ⏳ PENDING

#### 5. Org Deletion Recording Cascade Unverified
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #6
- **Issue:** Documentation asks "What happens to recordings when an org is deleted? Cascade delete via foreign key (needs verification)." The actual behavior is uncertain. If recordings are NOT deleted, orphaned files accumulate in storage. If they ARE deleted, there may be compliance issues (some regulations require retention periods).
- **Suggested Fix:** Verify cascade behavior. Document explicitly. Consider soft-delete for orgs with retention period for recordings to meet compliance requirements.
- **Human Decision:** ⏳ PENDING

#### 6. Screen Reader Support Lacks Explicit ARIA Labels
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Screen reader support: ⚠️ Role='switch' added, but no explicit ARIA labels". The recording settings page includes multiple toggles (recording, transcription, AI summary) and interactive elements that lack descriptive ARIA labels for users relying on assistive technology.
- **Suggested Fix:** Add aria-label attributes to all toggle switches (e.g., "Enable call recording", "Enable transcription at $0.01 per minute"). Add aria-describedby linking toggles to their cost indicators.
- **Human Decision:** ⏳ PENDING

#### 7. No Manual Re-Transcription Button
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 3
- **Issue:** Documentation flags "Can't retry failed transcriptions" as a Low severity issue. When transcription fails (e.g., Deepgram API error), admins have no way to retry. The call log shows "Failed" badge but offers no action.
- **Suggested Fix:** Add "Retry Transcription" button in call logs detail view for calls with transcription_status = "failed".
- **Human Decision:** ⏳ PENDING

#### 8. No Cost Estimation Before Enabling
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 4
- **Issue:** Documentation notes "Unexpected bills possible" with Low severity. Admins enable transcription ($0.01/min) and AI summary ($0.02/min) without any estimate of monthly costs based on their call volume. This could lead to bill shock.
- **Suggested Fix:** Add estimated monthly cost calculator based on average call duration × call volume × selected features.
- **Human Decision:** ⏳ PENDING

#### 9. Recordings Not Accessible to Non-Admin Agents
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Documentation asks "How are recordings accessed by agents (non-admin)? Not currently accessible to non-admin roles." Agents may need to review their own call recordings for self-improvement or dispute resolution, but have no access path.
- **Suggested Fix:** Consider adding agent-role access to their own recordings via Agent Call Logs feature, or document this as an intentional admin-only access control.
- **Human Decision:** ⏳ PENDING

#### 10. No Batch Transcription for Historical Recordings
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Documentation states "No batch processing endpoint exists" for transcribing old recordings. If an organization enables transcription after already having many recordings, there's no way to transcribe historical calls.
- **Suggested Fix:** Add "Transcribe All Untranscribed" button or background job for batch processing historical recordings.
- **Human Decision:** ⏳ PENDING

#### 11. Cannot Request Transcription On-Demand
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #8
- **Issue:** Documentation confirms "No, it's automatic when enabled" for on-demand transcription. Organizations that only want to transcribe specific calls (e.g., escalated issues, training examples) must enable transcription for all calls, incurring costs for calls they don't need transcribed.
- **Suggested Fix:** Consider per-call transcription toggle in call logs, allowing admins to selectively transcribe specific recordings.
- **Human Decision:** ⏳ PENDING

#### 12. Agents Cannot Pause/Resume Recording
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Documentation states "No, recording is fully automatic when enabled." Agents cannot pause recording when visitors need to share sensitive information (e.g., credit card numbers, SSNs), creating potential compliance and privacy issues.
- **Suggested Fix:** Add pause/resume recording controls to agent dashboard. When paused, display indicator to both agent and visitor.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 1
- **Medium:** 5
- **Low:** 6

---

## A-agent-call-logs - Agent Call Logs

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/agent-call-logs.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-agent-call-logs.md`

### Findings

#### 1. No Server-Side Pagination Limits Historical Data Access
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues table, row 2
- **Issue:** Documentation explicitly states "No server-side pagination | 500 record limit cuts off data | 🟡 Medium". Agents with high call volumes cannot access historical data beyond the most recent 500 calls within any date range. This creates a significant limitation for agents trying to review older calls or search across their full history.
- **Suggested Fix:** Add cursor-based pagination as already suggested in the documentation.
- **Human Decision:** ⏳ PENDING

#### 2. Table Rows Not Keyboard Navigable
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, "Keyboard navigation" bullet
- **Issue:** Documentation explicitly flags "⚠️ Table rows not focusable, filter inputs are". Agents who rely on keyboard navigation cannot focus or navigate through the call table rows. Only filter inputs are accessible via keyboard, making the primary data display inaccessible to keyboard-only users.
- **Suggested Fix:** Add `tabindex="0"` to table rows, implement keyboard navigation handlers (arrow keys), and add visible focus indicators. Consider using proper ARIA grid roles.
- **Human Decision:** ⏳ PENDING

#### 3. Icons Lack Aria Labels
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, "Screen reader support" bullet
- **Issue:** Documentation notes "⚠️ Icons lack aria-labels in some places". The call logs table includes status icons, action buttons (play, download), and stat card icons that are not properly labeled for screen reader users. This is an accessibility compliance issue.
- **Suggested Fix:** Add aria-label attributes to all interactive icons (e.g., play button: "Play recording", status icons: "Status: Completed"). Add sr-only text alternatives for decorative icons with meaning.
- **Human Decision:** ⏳ PENDING

#### 4. No Loading States During Page Transitions
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility, "Loading states" bullet
- **Issue:** Documentation flags "⚠️ No loading spinner during page transitions (server components)". When agents apply filters, the page reloads via URL params with no visual feedback that data is being fetched. Agents may think the interface is frozen, especially on slower connections.
- **Suggested Fix:** Add loading skeleton or Suspense boundary during server component transitions. Alternatively, show a subtle loading indicator when filters are applied.
- **Human Decision:** ⏳ PENDING

#### 5. No Real-Time Updates for New Calls
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues table, row 1
- **Issue:** Documentation notes "No real-time updates | Must refresh to see new calls | 🟢 Low". After an agent completes a call, they must manually refresh the page to see it in their call logs. This creates a disconnect where the agent just finished a call but doesn't see it listed.
- **Suggested Fix:** Consider polling interval or websocket subscription for new call notifications, as suggested in the documentation.
- **Human Decision:** ⏳ PENDING

#### 6. URL Filter is Client-Side Only
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues table, row 3; Section 6 - Performance
- **Issue:** Documentation states "URL filter is client-side | Can't search >500 calls by URL | 🟢 Low". Section 6 also notes "Client-side URL filtering | URL conditions filtered after fetch | ⚠️ Could be slow with 500 records". Agents cannot reliably search for calls by URL across their full history, and filtering 500 records client-side may cause noticeable lag.
- **Suggested Fix:** Move URL filtering to server-side query as suggested in the documentation.
- **Human Decision:** ⏳ PENDING

#### 7. No CSV Export for Agents
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues table, row 4
- **Issue:** Documentation explicitly notes "No CSV export for agents | Admins can export, agents cannot | 🟢 Low". While admins can export call data, agents have no way to export their own call history for personal records, performance tracking, or record keeping.
- **Suggested Fix:** Add agent export option as suggested in the documentation. Export should be limited to agent's own calls only.
- **Human Decision:** ⏳ PENDING

#### 8. No Sorting Options for Call Table
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues table, row 5
- **Issue:** Documentation states "No sorting options | Can't sort by duration, etc. | 🟢 Low". Agents cannot reorder their call table by duration, answer time, or other columns, limiting their ability to analyze their performance patterns (e.g., "show me my longest calls").
- **Suggested Fix:** Add column sorting with ascending/descending options for key columns (date, duration, status).
- **Human Decision:** ⏳ PENDING

#### 9. No Data Retention Policy for Old Calls
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #2
- **Issue:** Documentation asks "Data retention for old calls? No explicit retention period found. Call logs appear to be kept indefinitely. Should there be limits for agent view?" The lack of retention policy could lead to performance issues over time and potential GDPR/privacy compliance gaps for historical data.
- **Suggested Fix:** Define and document data retention policy. Consider adding configurable retention periods per organization, or at minimum document the indefinite retention as a feature.
- **Human Decision:** ⏳ PENDING

#### 10. No Pool Filter for Agents in Multiple Pools
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #6
- **Issue:** Documentation notes "Why no pool filter for agents? Agents in multiple pools can't filter by pool. Is this intentional to simplify the UI?" Agents working across multiple pools (e.g., Sales and Support) cannot filter their call logs by pool, making it harder to analyze performance by business unit.
- **Suggested Fix:** Consider adding pool filter for agents who are members of multiple pools. If intentionally omitted, document the design decision.
- **Human Decision:** ⏳ PENDING

#### 11. Call In Progress Shows Without Duration
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #17
- **Issue:** Edge Case #17 notes "Call in progress (accepted) | Currently on call | Appears with status 'Accepted', no duration | ✅ | Real-time not updated". While marked as correct, if an agent opens their call logs in a new tab during a call, they see an "Accepted" call with no duration that never updates until page refresh. This could be confusing.
- **Suggested Fix:** Consider adding visual indicator for "ongoing" calls (e.g., pulsing icon, "In Progress" badge) or filtering out currently active calls from the historical view.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 0
- **Medium:** 3
- **Low:** 8

---

## A-idle-timer - Idle Timer

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/idle-timer.md`
**Review Agent:** docs/prompts/active/review-agent-agent-idle-timer.md

### Findings

#### 1. Screen Reader Accessibility Gap
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review, Accessibility subsection
- **Issue:** Documentation notes "Screen reader support: ⚠️ Notification may not be announced". Browser notifications may not be properly announced to screen reader users, creating an accessibility barrier for visually impaired agents who may be marked away without audible warning.
- **Suggested Fix:** Add ARIA live region announcement when idle warning is triggered, or provide accessible alternative to browser notification for screen reader users.
- **Human Decision:** ⏳ PENDING

#### 2. Multiple Tab Activity Not Synchronized
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #10, Section 7 - Identified Issues, Section 10 - Open Question #4
- **Issue:** Documentation explicitly flags this: "Each tab has own timer" and "Only focused tab resets on activity". Agents with multiple dashboard tabs open will only have the focused tab's timer reset on activity. An agent working in Tab A could go idle in Tab B and be marked away unexpectedly.
- **Suggested Fix:** As doc suggests, implement SharedWorker or localStorage sync to coordinate activity across tabs. Alternatively, document this limitation prominently in agent onboarding.
- **Human Decision:** ⏳ PENDING

#### 3. Mobile Browser Worker Suspension
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #14, Section 7 - Identified Issues, Section 10 - Open Question #6
- **Issue:** Documentation notes "iOS/Android background - Browser may suspend Worker - ⚠️ Mobile behavior varies". Mobile browsers may suspend Web Workers when backgrounded, causing idle detection to fail or delay. Server heartbeat staleness (2-min delay) is the only fallback.
- **Suggested Fix:** Document mobile limitations clearly for agents. Consider implementing Service Worker or Push Notification based idle detection for mobile. Accept 2-min detection delay on mobile as known limitation.
- **Human Decision:** ⏳ PENDING

#### 4. Notification Easily Missed
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review Step 4, Section 7 - Identified Issues
- **Issue:** Documentation flags "Notification easily missed" in quiet environments or when agent is focused elsewhere. The notification is visual-only (Section 10, Q5 asks about audio). Agents in noisy call centers may not notice the browser notification within the 60-second grace period.
- **Suggested Fix:** As doc suggests, add optional audio alert with the notification. Could be a configurable setting per agent.
- **Human Decision:** ⏳ PENDING

#### 5. No Configurable Timeout Per Organization
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, Section 10 - Open Question #2
- **Issue:** Documentation asks "Should idle timeout be configurable per organization? Currently fixed at 5 minutes." Different organizations have different workflows - a consulting firm may want 15-minute timeout while a fast-paced sales team may want 3 minutes.
- **Suggested Fix:** Add organization-level setting for idle timeout with sensible defaults and min/max bounds (e.g., 2-30 minutes).
- **Human Decision:** ⏳ PENDING

#### 6. Co-browse Iframe Activity Not Tracked
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Question #3
- **Issue:** Documentation asks "Should idle timer track activity in iframe preview? Agent viewing co-browse iframe is 'active' but not moving mouse in main window." Agents actively reviewing a visitor's co-browse screen may trigger idle timeout because mouse activity in the iframe doesn't reset the timer in the parent window.
- **Suggested Fix:** Add postMessage communication from co-browse iframe to parent window to reset idle timer on iframe activity, or treat iframe focus as activity.
- **Human Decision:** ⏳ PENDING

#### 7. Inconsistent State/Status Terminology
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 2 (states: Active/IdleWarning/Away), Section 3 (status: "idle"), Section 5 (status: "idle")
- **Issue:** The state machine uses "Active", "IdleWarning", and "Away" as idle timer states. But Section 3 Data Flow shows server checking "if agent.status === 'idle'" and Section 5 says "Status restored to idle". This mixes idle timer states with server-side agent statuses without clarifying the relationship. "Idle" in agent status context means "available/waiting for calls" but could be confused with the idle timer concept.
- **Suggested Fix:** Add terminology clarification section: Idle Timer States (Active/IdleWarning/Away) vs Agent Statuses (online/idle/away/busy). Clarify that "idle" status means "available for routing" while "Away" state means "marked unavailable".
- **Human Decision:** ⏳ PENDING

#### 8. Missing Notification Permission Request Flow
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Throughout document - assumes notifications are available
- **Issue:** The documentation covers what happens when notification permission is granted vs denied (Edge Case #3 and #4), but doesn't document when or how the app requests notification permission from the agent. First-time agent experience with notification permission prompt is not documented.
- **Suggested Fix:** Document the notification permission request flow: When is it triggered? What UI does the agent see? What happens if they defer? Add this to the High-Level Flow or create a new "First-Time Setup" section.
- **Human Decision:** ⏳ PENDING

#### 9. Alternative Grace Period Path Unclear in State Diagram
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 2 - State Machine diagram vs Edge Case #4
- **Issue:** The state diagram shows tab hidden → notification → 60s grace period → Away. But Edge Case #4 describes an alternative path when notification permission is denied: "60s visibility grace period - Waits for tab to become visible". This fallback path isn't shown in the state diagram, making the logic incomplete.
- **Suggested Fix:** Update state diagram to show the conditional branch: IdleWarning with notification vs IdleWarning without notification (visibility-only grace period).
- **Human Decision:** ⏳ PENDING

#### 10. Hardcoded Line Numbers in Code References
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 8 - Code References
- **Issue:** Code references include specific line numbers (e.g., "socket-handlers.ts:1505-1533", "useIdleTimer.ts:157-204"). These line numbers will become outdated as code changes, making the documentation misleading. Already flagged in other reviews but particularly extensive here with 14 line-number references.
- **Suggested Fix:** Remove or generalize line numbers. Use function/component names as anchors instead. Consider linking to git permalinks if specific code versions matter.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 5

---

## A-agent-active-call - Agent Active Call

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/agent-active-call.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-agent-active-call.md`

### Findings

#### 1. Recording URLs Are Potentially Guessable (Security Risk)
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 6 - Technical Concerns, Security bullet #4
- **Issue:** Documentation states "Recording uploads go to public Supabase bucket - URLs are guessable if you know the pattern." This means anyone who can guess the URL pattern could potentially access call recordings without authentication, creating a significant privacy and compliance risk (HIPAA, GDPR).
- **Suggested Fix:** Move recordings to a private bucket with signed URLs that expire, or implement access control at the storage layer. Consider adding randomized UUIDs to paths rather than predictable patterns.
- **Human Decision:** ⏳ PENDING

#### 2. No WebRTC Reconnection on ICE Failure
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 - Edge Cases #2 (marked ⚠️) and Section 7 - Identified Issues row 1
- **Issue:** Documentation explicitly flags "Error state shown, connection retry not automatic" for WebRTC failures and suggests "Add ICE restart mechanism." When WebRTC connection fails mid-call (network glitch, NAT timeout), the agent must manually end the call and start a new one - potentially losing the customer.
- **Suggested Fix:** Implement ICE restart mechanism per RTCPeerConnection.restartIce() API. Add automatic retry with exponential backoff before showing failure state.
- **Human Decision:** ⏳ PENDING

#### 3. Recording May Be Lost on Agent Disconnect
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #5 (marked ⚠️) and Section 7 - Identified Issues row 3
- **Issue:** Documentation notes "recording may be incomplete" if agent disconnects mid-call. The recording upload only happens at call end, so if the agent's browser crashes or closes, the entire recording may be lost.
- **Suggested Fix:** Consider chunked upload during call (every N minutes) or background service worker to queue uploads. At minimum, document the risk for agents handling sensitive calls.
- **Human Decision:** ⏳ PENDING

#### 4. Both Parties Screen Sharing - Untested Edge Case
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #10 (marked ❓)
- **Issue:** Documentation explicitly marks this as "Untested edge case" with behavior listed as "Agent sees visitor share, visitor sees agent share." Since WebRTC renegotiation is involved for both streams simultaneously, there's potential for race conditions or undefined behavior.
- **Suggested Fix:** Test this scenario and document expected behavior. Consider UI to indicate when both parties are sharing, or block simultaneous shares if it causes issues.
- **Human Decision:** ⏳ PENDING

#### 5. No Aria-Labels on Control Buttons
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - Accessibility (marked ⚠️) and Section 7 - Identified Issues row 4
- **Issue:** Documentation states "Screen reader support - buttons have no aria-labels." Agents using screen readers cannot understand what the mute, video, screen share, or end call buttons do.
- **Suggested Fix:** Add descriptive aria-labels: "Mute microphone", "Turn off camera", "Share your screen", "End call". Include current state: "Microphone muted - click to unmute".
- **Human Decision:** ⏳ PENDING

#### 6. No Keyboard Shortcuts for Common Actions
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - Accessibility (marked ❌) and Section 7 - Identified Issues row 2
- **Issue:** Documentation notes "No keyboard shortcuts for common actions (mute, video toggle)." This is both an accessibility gap and a power-user feature gap - agents can't quickly mute with a key combo during a call.
- **Suggested Fix:** Add keyboard shortcuts as suggested in doc: Ctrl+M for mute, Ctrl+E for video toggle. Show tooltips with shortcut hints.
- **Human Decision:** ⏳ PENDING

#### 7. Very Long Call Recording Memory Unknown
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open question asks "How does recording handle very long calls? MediaRecorder chunking (1s) may help but memory?" With max call duration at 120 minutes default, the recording could accumulate significant memory. No testing or documentation of memory behavior for extended calls.
- **Suggested Fix:** Test 2-hour call recording to measure memory usage. Consider periodic chunk flushing or streaming upload rather than accumulating all data in memory.
- **Human Decision:** ⏳ PENDING

#### 8. No ICE Renegotiation Mid-Call
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open question states "Is there a mechanism to renegotiate if ICE fails mid-call? Doesn't appear to be." This confirms the lack of reconnection capability - if network conditions change mid-call, there's no graceful recovery.
- **Suggested Fix:** Implement iceConnectionState monitoring with automatic ICE restart when state transitions to "disconnected" or "failed". This is related to Finding #2 but specifically about mid-call failures.
- **Human Decision:** ⏳ PENDING

#### 9. Shadow DOM Co-browse Compatibility Unknown
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open question asks "Does co-browse work with Shadow DOM? Need to verify DOMSerializer handles it." Modern web components use Shadow DOM, and if co-browse doesn't capture these, agents may see incomplete or broken visitor pages.
- **Suggested Fix:** Test co-browse with a page using Shadow DOM components. Document limitations if any exist.
- **Human Decision:** ⏳ PENDING

#### 10. TURN Credentials Delivery Could Be Improved
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 5
- **Issue:** Documentation notes "TURN credentials in client code - Security audit finding" with suggestion to "Move to API endpoint (metered.ca supports this)." While the current credentials are for a metered.ca TURN service and not a direct security risk, delivering them via API would be cleaner.
- **Suggested Fix:** Implement TURN credential endpoint that returns short-lived credentials on demand, as metered.ca supports this pattern.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 2
- **Medium:** 6
- **Low:** 2

---

## P-visitor-reassignment - Visitor Reassignment

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/platform/visitor-reassignment.md`
**Review Agent:** `docs/prompts/active/review-agent-platform-visitor-reassignment.md`

### Findings

#### 1. Pool Routing Ignored During Reassignment
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 6 - Technical Concerns, "Known Issue: Pool Routing Ignored in Reassignment"
- **Issue:** Documentation explicitly flags that `reassignVisitors()` calls `findBestAgent()` without passing a pool ID. A visitor originally matched to "Sales Pool" via URL routing could be reassigned to an agent in "Support Pool" when their original agent becomes unavailable. This defeats the purpose of pool-based routing and could result in visitors speaking to agents without the right expertise.
- **Suggested Fix:** Change to `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)` which respects pool routing and falls back to any agent if no pool agents available. Logged as Q-1202-001 in doc.
- **Human Decision:** ⏳ PENDING

#### 2. Mid-Call Disconnect Ends Call Permanently with No Reconnection Option
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 7 - First Principles Review, Identified Issues row 2; Section 10 - Open Questions #2
- **Issue:** When an agent disconnects mid-call (browser crash, network drop), the call ends immediately with no grace period or reconnection attempt. Visitor sees "Call ended" and must manually refresh and restart the entire call flow. Open Question #2 asks "Should mid-call agent disconnect have a grace period?" but this is currently not implemented. This creates a poor visitor experience especially for important conversations.
- **Suggested Fix:** Add 10-second grace period for mid-call disconnects (matching pre-call behavior). If agent reconnects within window, resume call. If not, then end call with appropriate messaging.
- **Human Decision:** ⏳ PENDING

#### 3. Inconsistent Pool Routing Behavior Across Triggers
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 11 - Session Summary, "Reassignment Triggers" table
- **Issue:** The table at the end of the document shows that CALL_REJECT and RNA Timeout "respect" pool routing while 5 other triggers (Agent Away, Agent Offline, Agent Disconnect, Agent Accepts Call, Heartbeat Stale) do NOT. This creates inconsistent behavior - a visitor's reassignment outcome depends on HOW the original agent became unavailable rather than the visitor's routing requirements.
- **Suggested Fix:** All reassignment paths should consistently respect pool routing. Unify the routing logic so visitors get consistent treatment regardless of trigger type.
- **Human Decision:** ⏳ PENDING

#### 4. No Cascade Protection for Multiple Sequential Agent Unavailability
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - Edge Cases #10 (marked ⚠️); Section 7 - Identified Issues row 3
- **Issue:** If all 5 agents in a pool go away in sequence, a visitor could receive 5 separate handoff messages ("Agent A got pulled away... Agent B got pulled away... etc."). Documentation notes "Could chain-reassign same visitor multiple times" with LOW severity but the UX impact of multiple interruptions seems more significant.
- **Suggested Fix:** Add cooldown or batch reassignment logic. Consider a "final" message after N reassignment attempts or implement debouncing to batch rapid reassignments.
- **Human Decision:** ⏳ PENDING

#### 5. Widget State After AGENT_UNAVAILABLE is Permanent Until Page Refresh
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 4 - Visitor UX During Reassignment, "What the Visitor Sees" table
- **Issue:** When no agent is available, the widget hides and remains hidden "until refresh" as documented. The visitor has no way to retry or check if agents have become available again - they must manually refresh the entire page, potentially losing any form data or context they had entered.
- **Suggested Fix:** Consider adding a "Check again" button or auto-polling mechanism after AGENT_UNAVAILABLE. At minimum, show a clear message that refreshing the page will allow retry.
- **Human Decision:** ⏳ PENDING

#### 6. Transparency Gap in "Got Pulled Away" Messaging
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - First Principles Review, point 3 (marked ⚠️ Partial); Section 10 - Open Questions #4
- **Issue:** Documentation notes transparency is only "Partial" because visitor knows agent "got pulled away" but not why. Open Question #4 asks "Should visitor be notified of rejection reason?" Currently the same generic message is shown whether agent rejected the call, timed out on RNA, manually went away, or disconnected. This could frustrate visitors who want to understand what happened.
- **Suggested Fix:** Consider differentiating messages: "Agent is with another customer" (for capacity), "Agent stepped away" (for manual away), "Connection lost" (for disconnect). This provides more context without being too technical.
- **Human Decision:** ⏳ PENDING

#### 7. HANDOFF_MESSAGE_DURATION Not Configurable
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 4
- **Issue:** The handoff message ("Sarah got pulled away. John is taking over.") displays for exactly 3 seconds with no configuration option. For organizations with specific branding or accessibility requirements, this fixed duration may be too short (users with reading difficulties) or too long (fast-paced environments).
- **Suggested Fix:** Make duration configurable via widget settings, with 3 seconds as default. Range: 1-10 seconds.
- **Human Decision:** ⏳ PENDING

#### 8. Pre-Call vs Mid-Call Recovery Asymmetry Not Clearly Justified
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 2 - How It Works, "Pre-Call vs Mid-Call: Key Difference" table
- **Issue:** Documentation explains that pre-call visitors get seamless reassignment while mid-call visitors get abrupt call termination. The justification given is "Can't leave visitor in broken call" but this doesn't fully explain why a grace period couldn't work mid-call. The asymmetric handling may confuse developers and could lead to questions about why mid-call gets worse treatment.
- **Suggested Fix:** Add clearer rationale for why mid-call requires immediate termination (e.g., WebRTC peer connection state, media stream continuity requirements). If there's a valid technical reason, document it. If not, consider adding mid-call grace period.
- **Human Decision:** ⏳ PENDING

#### 9. Edge Case #12 References "excludeVisitorId" Without Full Explanation
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 5 - Edge Cases #12
- **Issue:** Row 12 states "Two visitors same agent, one in call" behavior is "Only non-calling visitor reassigned" and notes "`excludeVisitorId` parameter" - but the main reassignment algorithm in Section 3 doesn't clearly show where this parameter comes from or how the calling visitor is identified. This makes the logic flow harder to follow.
- **Suggested Fix:** Add a note in the Reassignment Algorithm section explaining how the system identifies which visitor is in the active call and passes that as excludeVisitorId.
- **Human Decision:** ⏳ PENDING

#### 10. Missing Metric/Logging for Reassignment Events
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Throughout document - no mention of metrics
- **Issue:** The documentation covers reassignment logic thoroughly but doesn't mention any metrics, logging, or analytics for reassignment events. Admins would benefit from knowing: how often reassignments occur, success rate of finding replacements, average time between trigger and reassignment, and which triggers are most common.
- **Suggested Fix:** Document existing metrics if any, or flag as enhancement: add reassignment_count, reassignment_success_rate, and trigger_type metrics to call logs or a dedicated analytics table.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 2
- **Medium:** 4
- **Low:** 4

---

## A-agent-stats-dashboard - Agent Stats Dashboard

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/agent-stats-dashboard.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-agent-stats-dashboard.md`

### Findings

#### 1. Accessibility Not Fully Verified - Keyboard Navigation
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review - Accessibility
- **Issue:** Documentation explicitly marks keyboard navigation as "⚠️ Not fully verified". This is a significant accessibility gap as agents who rely on keyboard navigation may not be able to effectively use the dashboard.
- **Suggested Fix:** Conduct accessibility audit and document keyboard navigation paths. Ensure all interactive elements (filters, play buttons, expandable rows) are keyboard accessible.
- **Human Decision:** ⏳ PENDING

#### 2. Modal Focus Trapping Not Implemented
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review - Accessibility
- **Issue:** Documentation notes "Focus management: ⚠️ Modal should trap focus". The video recording modal does not trap focus, which is an accessibility violation (WCAG 2.4.3). Users using screen readers or keyboard navigation could tab out of the modal into the page behind it.
- **Suggested Fix:** Implement focus trapping in the video modal component. Focus should move to the modal on open and return to the trigger element on close.
- **Human Decision:** ⏳ PENDING

#### 3. No Loading Indicator During Data Refetch
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - First Principles Review, question 3
- **Issue:** Documentation states "Is feedback immediate? ⚠️ Mostly - No loading spinner on date change" and Section 7 Identified Issues confirms "No loading state | User may not know refetch is happening". When agents change date ranges or apply filters, there's no visual feedback that data is being fetched, leading to potential confusion.
- **Suggested Fix:** Add loading skeleton or spinner overlay when refetching data. Consider using React Suspense boundaries or a loading state in the server component.
- **Human Decision:** ⏳ PENDING

#### 4. 500 Call Limit May Cause Data Loss for High-Volume Agents
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #5, Section 7 - Identified Issues, Section 10 - Open Question #1
- **Issue:** Multiple sections flag this concern. Edge Case #5 shows "500+ calls in range | High volume agent | Limited to 500 calls | ⚠️ | Shows '(limit reached)' message". High-volume agents selecting longer date ranges will have incomplete data and statistics. The "(limit reached)" message only partially mitigates this as agents still cannot access all their data.
- **Suggested Fix:** Implement pagination to allow agents to access all their calls. Alternatively, provide a stats-only endpoint that calculates stats across ALL calls (not just the limited 500) so at least the statistics are accurate.
- **Human Decision:** ⏳ PENDING

#### 5. Client-Side URL Filtering Is Inefficient for Large Datasets
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Technical Concerns - Performance, row 2
- **Issue:** Documentation notes "URL conditions filtered after fetch | ⚠️ Could filter server-side for large datasets". Currently, all 500 calls are fetched from the server, then URL condition filtering happens client-side. This means bandwidth and processing are wasted on calls that don't match the filter.
- **Suggested Fix:** Move URL condition filtering to the server-side query using SQL LIKE/ILIKE clauses or pg_trgm extension for pattern matching.
- **Human Decision:** ⏳ PENDING

#### 6. Answer Rate Calculation May Be Misleading When Including Rejected Calls
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 3 - Data Flow, calculateAgentStats function
- **Issue:** The formula shows "answerPercentage = (totalAnswers / totalRings) * 100" where totalRings includes rejected calls. If an agent intentionally rejects calls (e.g., going on break), their answer rate is penalized. This may not reflect true performance since intentional rejections are different from missed calls.
- **Suggested Fix:** Consider whether answer rate should be "answers / (answers + missed)" excluding rejected, or provide both metrics. Document the calculation methodology clearly for agents.
- **Human Decision:** ⏳ PENDING

#### 7. Filtered Stats May Confuse Agents About True Performance
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 2 - State Definitions, "Filtered View" row
- **Issue:** When filters are applied, "Stats recalculated for filtered calls only". An agent filtering by "completed" calls only would see a 100% answer rate. The documentation doesn't indicate if there's clear messaging that these are filtered stats, not overall performance.
- **Suggested Fix:** Add visual indicator when viewing filtered stats (e.g., "Showing stats for X of Y total calls" or "Filtered view" badge on stat cards).
- **Human Decision:** ⏳ PENDING

#### 8. ARIA Support for Interactive Elements Not Verified
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - UI/UX Review - Accessibility
- **Issue:** Documentation states "Screen reader support: ⚠️ Table structure helps, but interactive elements may need ARIA". The expandable transcription rows, AI summary toggles, and multi-select dropdowns may not have proper ARIA attributes for screen reader users.
- **Suggested Fix:** Audit interactive elements for proper ARIA roles (aria-expanded, aria-controls, aria-selected). Ensure the call log table uses proper table semantics.
- **Human Decision:** ⏳ PENDING

#### 9. No Data Export Capability
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 3
- **Issue:** Documentation identifies "No data export | Cannot export call history | 🟢 Low | Add CSV export". Agents may need to export their call history for personal tracking, performance reviews, or integration with external tools.
- **Suggested Fix:** Add CSV export button that exports currently filtered/visible calls with key columns (date, status, duration, disposition, page URL).
- **Human Decision:** ⏳ PENDING

#### 10. URL Filter Complexity May Confuse Users
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 4
- **Issue:** Documentation notes "URL filter complexity | Advanced feature may confuse some users | 🟢 Low | Add help tooltip". The URL condition builder with domain/path/query_param matching and five match types (is_exactly, contains, etc.) is powerful but may overwhelm non-technical agents.
- **Suggested Fix:** Add help tooltip with examples. Consider adding preset filters for common patterns (e.g., "Pricing page calls", "Homepage calls").
- **Human Decision:** ⏳ PENDING

#### 11. No Real-Time Updates for New Calls
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 5
- **Issue:** Documentation notes "No real-time updates | New calls require page refresh | 🟢 Low | Consider websocket updates". Agents who complete a call and then open their stats dashboard won't see the new call until they manually refresh.
- **Suggested Fix:** Consider adding real-time subscription for new calls, or at minimum add a "Refresh" button with visual indicator when new calls are available.
- **Human Decision:** ⏳ PENDING

#### 12. 30-Day Default Period May Not Suit All Use Cases
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3 and #4
- **Issue:** Open questions ask "Is 30-day default the right period?" and "Should there be a 'today' quick view?". Many agents may only care about today's calls or weekly performance, yet must navigate through a 30-day view by default.
- **Suggested Fix:** Add quick date preset buttons (Today, This Week, This Month, Last 30 Days) alongside the date range picker for faster navigation.
- **Human Decision:** ⏳ PENDING

#### 13. No Notification When Transcription Completes
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open question asks "Should completed transcriptions trigger notifications?". Agents may want to review transcriptions of specific calls but have no way to know when processing completes without manually checking the dashboard.
- **Suggested Fix:** Consider in-app notification or email when transcription/AI summary completes for a call, especially for calls over a certain duration threshold.
- **Human Decision:** ⏳ PENDING

#### 14. Mobile 2-Column Layout May Be Too Dense
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #15
- **Issue:** Edge case #15 indicates "Mobile viewport | Small screen | 2-column grid layout | ✅ | Responsive grid". However, displaying 8 stat cards in a 2x4 grid on mobile could be visually overwhelming and difficult to scan quickly.
- **Suggested Fix:** Consider single-column layout for very small screens, or collapsible stat groups. Prioritize showing the most important stats (e.g., answer rate, total calls) prominently.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 14
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 10

---

## P-transcription-service - Transcription Service

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/platform/transcription-service.md`
**Review Agent:** `docs/prompts/active/review-agent-platform-transcription-service.md`

### Findings

#### 1. State Machine Inconsistency - "pending" vs "null"
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 2 - State Machine diagram vs State Definitions table
- **Issue:** The state machine diagram shows `[pending] ───► [processing]` as the initial flow, but the State Definitions table shows `null` (not "pending") as the initial state with description "Transcription not started". These don't match - is the initial state `null` or `pending`?
- **Suggested Fix:** Align terminology. If initial state is `null`, update state machine diagram to show `[null] ───► [processing]`. Or clarify that "pending" represents the `null` state conceptually.
- **Human Decision:** ⏳ PENDING

#### 2. No Retry Button in UI for Failed Transcriptions
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 5 - UI/UX Review, Admin Call Logs step 6; Section 7 - Identified Issues table row 1
- **Issue:** Documentation explicitly notes "No retry button" for failed transcriptions in the UI. When transcription fails (Deepgram error, timeout, etc.), users have no way to retry from the interface. They must wait for next recording or require "manual intervention" (not defined). This is confirmed in Section 7: "Failed transcriptions stuck" with suggested fix "Add Retry button in UI".
- **Suggested Fix:** Add a "Retry Transcription" button on the call log row when `transcription_status = "failed"`. Button should call the same `/api/transcription/process` endpoint.
- **Human Decision:** ⏳ PENDING

#### 3. Fire-and-Forget Pattern Loses Failures
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Issue 2; Section 3 - Triggers & Events table row 1
- **Issue:** Documentation acknowledges: "The transcription trigger from `use-call-recording.ts` is fire-and-forget. If the API call fails, no record of the failure exists." This means a network glitch during the POST to `/api/transcription/process` results in a permanently untranscribed call with no indication of failure.
- **Suggested Fix:** Either implement a queue/retry mechanism as suggested, or add a background job that identifies calls with recordings but no transcription status after X minutes.
- **Human Decision:** ⏳ PENDING

#### 4. No Search Capability for Transcriptions
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 6 - Issue 3; Section 7 - Identified Issues row 2
- **Issue:** Documentation states: "Transcriptions are stored as text but there's no UI to search across transcriptions." For organizations with many calls, finding specific conversations requires manually expanding each call log.
- **Suggested Fix:** Add full-text search on `call_logs.transcription` field as suggested in doc.
- **Human Decision:** ⏳ PENDING

#### 5. No Manual Trigger for Historical Recordings
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues row 4; Section 10 - Open Question #5
- **Issue:** Documentation notes: "Currently only auto-triggered after new recordings. Manual trigger would help." Old recordings that were made before transcription was enabled cannot be transcribed - there's no "Transcribe" button.
- **Suggested Fix:** Add "Transcribe" button for calls with `recording_url` but `transcription_status = null`.
- **Human Decision:** ⏳ PENDING

#### 6. Rate Limit Handling Undefined
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Question #2
- **Issue:** Open question states: "No - each transcription is processed immediately on request. High volume could hit Deepgram rate limits." However, there's no documented behavior for what happens when rate limits are hit. Edge case matrix doesn't cover "Deepgram rate limit exceeded" scenario.
- **Suggested Fix:** Document expected behavior when Deepgram rate limits are hit. Consider adding rate limiting on our side or queuing for high-volume orgs.
- **Human Decision:** ⏳ PENDING

#### 7. Supabase Outage During Processing Undocumented
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Question #6
- **Issue:** Open question asks: "What happens if Supabase is down during processing?" but provides no answer. If Deepgram succeeds but the database write fails, transcription is lost with no retry. This scenario is not in the edge case matrix.
- **Suggested Fix:** Add to edge case matrix. Consider idempotent retry logic or at minimum log the successful transcription response before DB write.
- **Human Decision:** ⏳ PENDING

#### 8. Accessibility Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility subsection
- **Issue:** Documentation explicitly marks "Keyboard navigation: ⚠️ Not verified" and "Screen reader support: ⚠️ Not verified". This is a gap in accessibility testing for the transcription-related UI elements (expand/collapse, status badges, etc.).
- **Suggested Fix:** Conduct accessibility audit of call logs transcription UI. Add keyboard shortcuts for expand/collapse. Ensure status badges have proper aria-labels.
- **Human Decision:** ⏳ PENDING

#### 9. AI Summary Cost Calculation May Be Inaccurate
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 3 - Data Flow, AI Summary Processing section
- **Issue:** Documentation shows AI summary cost is calculated as `duration_minutes * $0.02`. However, OpenAI charges by tokens (input + output), not by audio duration. A 5-minute call with verbose conversation would have vastly different token counts than a 5-minute call with short exchanges, yet they'd be billed the same. This could lead to under- or over-charging.
- **Suggested Fix:** Calculate actual token usage from OpenAI response (`usage.prompt_tokens` + `usage.completion_tokens`) and apply per-token pricing.
- **Human Decision:** ⏳ PENDING

#### 10. Maximum Audio Length Behavior Contradictory
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 10 - Open Question #1
- **Issue:** Documentation states: "Deepgram has no hard limit, but cost scales linearly. Very long calls (4+ hours) may timeout." This is contradictory - "no hard limit" but then "may timeout" implies there is effectively a limit. Users/admins have no guidance on expected behavior for very long calls.
- **Suggested Fix:** Test actual behavior with 4+ hour audio file. Document the practical limit or expected timeout threshold. Consider chunked processing for very long audio.
- **Human Decision:** ⏳ PENDING

#### 11. Failed Transcription Reason Not Visible to Users
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 3 - Data Flow (On Failure section); Section 5 - UI/UX Review
- **Issue:** When transcription fails, the error is stored in `transcription_error` field (per Data Flow section). However, Section 5 UI/UX shows users only see "Red warning badge" - there's no indication that users can see WHY the transcription failed. Without knowing the reason (bad audio, API timeout, etc.), they can't take corrective action.
- **Suggested Fix:** Show error message on hover or in expanded view when transcription fails. E.g., "Failed: No transcription returned - audio may be empty or corrupted".
- **Human Decision:** ⏳ PENDING

#### 12. Audio Quality Issues Marked But No Mitigation Documented
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases matrix, rows 18-20
- **Issue:** Three scenarios are marked ⚠️: Background noise ("Accuracy may vary"), Non-English audio (Nova-2 multilingual), and Technical jargon ("No custom vocabulary"). These are acknowledged limitations but the documentation offers no guidance on setting user expectations or workarounds.
- **Suggested Fix:** Add user-facing help text about transcription accuracy expectations. Consider documenting how to enable custom vocabulary with Deepgram if domain-specific accuracy is needed.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 1
- **Medium:** 6
- **Low:** 5

---

## A-agent-stats-detail - Agent Stats Detail

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/agent-stats-detail.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-agent-stats-detail.md`

### Findings

#### 1. Ambiguous "Affected Users" Description for Agents
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section "Affected Users", line 8
- **Issue:** Documentation states "Agent (can view their own stats if admin)" with checkbox marked. This wording is misleading - it implies agents have conditional access to their own stats. However, Section 4 Error States shows "Non-admin accessing page | Redirect to /dashboard" and Open Question #4 asks "Should agents view their own stats? Currently admin-only." The affected users section suggests agents CAN view stats, but the feature is actually admin-only.
- **Suggested Fix:** Change to "Agent: ❌ No access (admin-only)" or clarify "Agent with admin role: ✅ (as admin, not as agent)".
- **Human Decision:** ⏳ PENDING

#### 2. Conflicting Status on Deactivated Agent Stats Access
- **Category:** Inconsistency
- **Severity:** Medium
- **Location:** Section 4 Edge Case #6 vs Section 10 Open Questions #6
- **Issue:** Edge Case #6 marks "Stats for deactivated agent | Page returns 404" as "✅ Correct". However, Open Question #6 asks "Should deactivated agents retain accessible historical stats?" If this is an open question, it shouldn't be marked as ✅ correct in edge cases - it should be marked with ⚠️ pending decision.
- **Suggested Fix:** Either resolve Open Question #6 with a definitive answer, or change Edge Case #6 status from ✅ to ⚠️ with note "Pending policy decision".
- **Human Decision:** ⏳ PENDING

#### 3. No Loading State on Date Range Change
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 1; Section 5 - Accessibility
- **Issue:** Documentation explicitly flags "No loading state on date change | User may think click didn't register | 🟢 Low" and Section 5 notes "Loading states: ⚠️ No explicit loading spinner during date change (full page navigation)". Users may repeatedly click the date picker thinking their selection didn't register.
- **Suggested Fix:** Add a loading overlay or skeleton state during date range transitions. Even with full-page navigation, cursor change or subtle indicator would help.
- **Human Decision:** ⏳ PENDING

#### 4. Large Date Range Performance Degradation
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 Edge Case #12; Section 6 Performance concerns; Section 7 Identified Issues row 4
- **Issue:** Multiple sections flag this: Edge Case #12 warns "All data loaded, may be slow | ⚠️ | No pagination implemented", Section 6 notes "No pagination, fetches all calls/sessions in range | ⚠️ May be slow for >1000 records", and Identified Issues mentions "Large date ranges slow | Performance degrades with >1000 calls | 🟡 Medium". High-volume agents could have thousands of calls, causing significant slowdown.
- **Suggested Fix:** Implement server-side pagination, or add a maximum date range limit (e.g., 90 days) with guidance to use shorter ranges for detailed analysis.
- **Human Decision:** ⏳ PENDING

#### 5. Keyboard Navigation and Screen Reader Support Unverified
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation flags "Keyboard navigation: ⚠️ Not fully verified" and "Screen reader support: ⚠️ Not fully verified". For a data-heavy page with tabs, date pickers, and tables, accessibility is critical for compliance and usability.
- **Suggested Fix:** Conduct accessibility audit. Ensure tab order is logical, stat cards have appropriate ARIA labels, tab switcher is keyboard accessible, and session table is properly marked up for screen readers.
- **Human Decision:** ⏳ PENDING

#### 6. No Export Functionality for Stats Data
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 2
- **Issue:** Documentation notes "No export functionality | Cannot download data for external analysis | 🟢 Low". Admins analyzing agent performance often need to share data with HR, export for reports, or perform external analysis.
- **Suggested Fix:** Add CSV/PDF export buttons for performance metrics, activity data, and session logs.
- **Human Decision:** ⏳ PENDING

#### 7. Utilization Formula Question Already Answered in Implementation
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 asks "Should utilization exclude away time?" but Section 3 Data Flow already documents "activeSeconds = idle + in_call (NOT away)" and "utilization = (in_call / active) * 100". The implementation decision has already been made (excludes away time) but it's still listed as an open question.
- **Suggested Fix:** Remove from Open Questions or rephrase as "Current implementation excludes away time - is this correct?" to clarify it's seeking validation, not defining behavior.
- **Human Decision:** ⏳ PENDING

#### 8. Active Session Duration Handling Could Confuse Users
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #9
- **Issue:** Edge Case #9 states "Agent in active session | Session has ended_at = null | Session shown with 'Active' badge in green | ✅ | Duration not counted in averages". While technically correct, if an agent is currently logged in for 4 hours, the Activity tab's "Average Session Length" won't include that time. This could create confusion about why session averages seem low while viewing during an active session.
- **Suggested Fix:** Add tooltip or note explaining "averages based on completed sessions only" or consider real-time calculation for current session.
- **Human Decision:** ⏳ PENDING

#### 9. No Team Comparison/Benchmark Metrics
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 5; Section 10 Open Questions #5
- **Issue:** Documentation notes "No team average comparison | Cannot see how agent compares to team | 🟢 Low" and Open Question #5 asks "Are team comparison metrics needed?" Without benchmarks, admins can't quickly assess if an agent is performing above or below team average without manual comparison.
- **Suggested Fix:** Add optional benchmark indicators showing team average for key metrics (e.g., "Your answer rate: 85% | Team avg: 78%").
- **Human Decision:** ⏳ PENDING

#### 10. Stats Caching Question Unresolved
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #1
- **Issue:** Documentation asks "Should stats be cached? Currently all queries hit DB fresh on each page load. Consider caching for performance with high-volume agents." This is related to the performance concerns in Finding #4 but represents a separate caching decision that could improve response times.
- **Suggested Fix:** Evaluate caching strategy. Options include: short-term cache (5-10 min) for date ranges older than today, or background pre-computation of common date ranges (last 7d, 30d, 90d).
- **Human Decision:** ⏳ PENDING

#### 11. Max Date Range Limit Undefined
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #2
- **Issue:** Documentation asks "What's the max supported date range? No explicit limit - very long ranges may be slow." Combined with the performance concerns, this creates an undefined upper bound that could cause issues for users selecting multi-year date ranges.
- **Suggested Fix:** Define and enforce a maximum date range (e.g., 365 days), with clear messaging if user tries to exceed it.
- **Human Decision:** ⏳ PENDING

#### 12. Duplicate/Overlapping Feature Documentation with STATS1
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 9 - Related Features
- **Issue:** Related Features lists "Agent Stats (STATS1)" in `stats/agent-stats.md` as "Same feature from stats category perspective". Having two documents for the same feature creates maintenance burden and potential for inconsistencies. If changes are made to one doc, the other may not be updated.
- **Suggested Fix:** Consider consolidating into a single canonical document, or clearly define the scope difference between A6 (agent perspective) and STATS1 (admin analytics perspective) with cross-references to keep them in sync.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 8

---

## A-incoming-call - Incoming Call

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/incoming-call.md`
**Review Agent:** `docs/prompts/active/review-agent-agent-incoming-call.md`

### Findings

#### 1. Critical UI/Server Mismatch on Countdown Timer
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 3 - Timing Configuration, line 134; Section 5 - UX Audit row 2
- **Issue:** The modal displays a hardcoded 30-second countdown ("Request expires in 25s" shown in wireframe), but the actual RNA timeout fires at 15 seconds (or org-configured value). Agents are misled into thinking they have more time than they actually do. When the countdown shows "15 seconds remaining," the RNA timeout may have already fired, marking them away unexpectedly.
- **Suggested Fix:** Fetch the org's actual RNA timeout value from `organizations.recording_settings.rna_timeout_seconds` and use that as the countdown duration in `incoming-call-modal.tsx`. Display a synchronized, accurate countdown.
- **Human Decision:** ⏳ PENDING

#### 2. UI Countdown Duration Hardcoded (Root Cause of #1)
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 3 - Timing Configuration table, "UI Countdown Display" row
- **Issue:** Documentation explicitly states "UI Countdown Display | 30 seconds | ❌ No | Hardcoded in `incoming-call-modal.tsx`". The countdown is not configurable and doesn't sync with the org's RNA timeout setting. This is the root cause of the countdown mismatch issue.
- **Suggested Fix:** Make the countdown dynamically read from the org's RNA timeout configuration passed in the `call:incoming` payload.
- **Human Decision:** ⏳ PENDING

#### 3. Multiple Tabs Behavior May Cause Agent Confusion
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases row 8; Section 10 - Open Question #2
- **Issue:** When an agent has multiple dashboard tabs open, both tabs receive the incoming call notification. Documentation flags "Accepting on one clears both" with a ⚠️ warning. If an agent accidentally accepts on the wrong tab (e.g., one with a stale state), they might experience confusion. The doc explicitly asks: "Should we only show on 'primary' tab?"
- **Suggested Fix:** Consider implementing primary tab detection, or clearly document expected multi-tab behavior in agent onboarding materials.
- **Human Decision:** ⏳ PENDING

#### 4. First-Time AudioContext Initialization Has No User Prompt
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases row 10; Section 7 - Identified Issues table
- **Issue:** Documentation notes "AudioContext requires interaction" and agents on first load won't hear the ringtone until they click/interact with the page. The doc suggests "Add 'Enable audio' prompt in bullpen" but this is not implemented. Agents could miss calls due to silent notifications on their first session.
- **Suggested Fix:** Add an audio initialization prompt when agent enters bullpen for the first time, or auto-initialize on any user interaction with clear feedback.
- **Human Decision:** ⏳ PENDING

#### 5. No "Snooze" or "Hold" Option for Incoming Calls
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #3
- **Issue:** Documentation explicitly asks: "Should there be a 'snooze' option? Agent might want to finish something before taking call but not reject entirely." Currently agents have only Accept or Reject - no middle ground. An agent who needs 10 seconds to finish typing might reject a call they would otherwise take.
- **Suggested Fix:** Consider adding a "Hold" button that extends the RNA timeout by X seconds (once per call) while signaling the visitor that "agent is preparing."
- **Human Decision:** ⏳ PENDING

#### 6. Reject Action Irreversibility Not Communicated in UI
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 7 - First Principles Review, question 4
- **Issue:** Documentation notes "Is the flow reversible? ❌ No - Reject is final for that call (but visitor gets rerouted)". The modal shows "Decline" button but doesn't indicate this is irreversible. An agent who accidentally clicks Decline cannot undo - that specific visitor is gone. There's no confirmation dialog.
- **Suggested Fix:** Consider adding confirmation for Decline ("Are you sure? This visitor will be routed to another agent.") or making the Decline button require deliberate action (e.g., hold-to-decline).
- **Human Decision:** ⏳ PENDING

#### 7. RNA Timeout May Be Too Short for Some Organizations
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Question #4
- **Issue:** Documentation asks: "Is 15s RNA timeout appropriate for all use cases? Some orgs might want longer timeouts during high-volume periods." The default 15-second timeout is configurable, but there's no guidance on appropriate values for different business contexts (e.g., high-complexity sales calls vs quick support).
- **Suggested Fix:** Add recommended timeout ranges in admin settings UI with context (e.g., "15s recommended for support, 25-30s for complex sales").
- **Human Decision:** ⏳ PENDING

#### 8. Date Typo in Session Summary
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section - Session Summary, "Date" field
- **Issue:** The Session Summary states "Date: 2024-12-02" but based on the sprint context, this should likely be "2025-12-02". This is a minor documentation typo.
- **Suggested Fix:** Update date to "2025-12-02".
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 8
- **Critical:** 0
- **High:** 1
- **Medium:** 1
- **Low:** 6

---

## A-cobrowse-viewer - Co-Browse Viewer

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/cobrowse-viewer.md`
**Review Agent:** docs/prompts/active/review-agent-agent-cobrowse-viewer.md

### Findings

#### 1. Password Fields Captured in DOM Snapshots
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 6 - Technical Concerns > Security, Section 10 - Open Questions #1
- **Issue:** Documentation explicitly flags that password input values are captured in DOM snapshots, creating a security/privacy risk. The doc notes: "CRITICAL: Password fields are currently captured. The DOM snapshot includes form input values." This is marked with 🔴 High risk in the Security table. While a code fix is recommended in the doc, no evidence this fix has been implemented.
- **Suggested Fix:** Implement the sanitization code already proposed in the documentation to mask password inputs before snapshot.
- **Human Decision:** ⏳ PENDING

#### 2. Credit Card and Sensitive Fields Not Sanitized
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 6 - Technical Concerns > Security Gaps, lines 377-381
- **Issue:** Security section identifies that credit card fields, personal data, and session tokens may be visible in DOM snapshots, but the recommended mitigations only show password masking. The comment "Consider also masking: input[type='tel'], input[autocomplete='cc-number'], Elements with data-sensitive='true']" is incomplete - no implementation for these is provided.
- **Suggested Fix:** Extend sanitization to include credit card inputs, telephone inputs, and any elements marked with a data-sensitive attribute.
- **Human Decision:** ⏳ PENDING

#### 3. No Loading State Before First Snapshot
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review > Accessibility, Section 7 - Identified Issues
- **Issue:** Documentation identifies that there is no explicit "Loading DOM..." state. Agent sees stale or blank viewer before first snapshot arrives. Section 5 notes "Loading states | ⚠️ | No explicit 'Loading DOM...' state" and Section 7 lists this as 🟡 Medium severity.
- **Suggested Fix:** Add "Loading visitor's screen..." placeholder until first snapshot received.
- **Human Decision:** ⏳ PENDING

#### 4. Missing Screen Reader Accessibility
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review > Accessibility
- **Issue:** Accessibility table shows "Screen reader | ⚠️ | Could add aria-label for viewer". No ARIA labels or roles are documented for the co-browse viewer, which could make it difficult for agents using assistive technology to understand the interface.
- **Suggested Fix:** Add aria-label="Visitor's screen view" and appropriate ARIA roles to the CobrowseViewer component.
- **Human Decision:** ⏳ PENDING

#### 5. Iframes Not Captured - No User Indication
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #4, Section 10 - Open Questions #3
- **Issue:** Documentation notes iframes are not captured (marked ⚠️) and Open Questions asks "How should iframe content be handled?" The agent sees an empty iframe box with no indication of why content is missing. This could be confusing when visitors are on pages with embedded content.
- **Suggested Fix:** Either document this limitation visibly to agents (placeholder message in blank iframe areas) or implement same-origin iframe recursive capture.
- **Human Decision:** ⏳ PENDING

#### 6. Canvas Elements Show Blank - No User Indication
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #5, Section 10 - Open Questions #4
- **Issue:** Canvas elements appear blank to agents (marked ⚠️). This affects viewing of charts, graphs, and interactive visualizations. The visitor might be looking at a chart that's central to the conversation, but the agent sees nothing. No placeholder or indication that content exists but cannot be displayed.
- **Suggested Fix:** Consider implementing canvas.toDataURL() capture, or at minimum display a placeholder indicating "Canvas content not available".
- **Human Decision:** ⏳ PENDING

#### 7. No Privacy Opt-Out for Visitors
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open Questions asks "Should there be a 'co-browse disabled' option?" Documentation notes "Some visitors might prefer privacy during calls. No toggle currently exists - cobrowse is automatic." This could be a privacy/compliance concern depending on jurisdiction (GDPR, etc.).
- **Suggested Fix:** Consider adding visitor-side toggle to disable screen sharing, or at minimum document that cobrowse is mandatory and ensure terms of service reflect this.
- **Human Decision:** ⏳ PENDING

#### 8. Large DOM Snapshots Not Compressed
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #2, Section 6 - Technical Concerns > Performance
- **Issue:** Edge case #2 notes large DOMs (>1MB) are "Sent as-is, may lag" (marked ⚠️). Performance section shows "Large DOM snapshots | No compression | 🟡 Medium" with recommendation to "Consider gzip or delta encoding". High-bandwidth pages could cause noticeable lag in co-browse updates.
- **Suggested Fix:** Implement gzip compression for snapshot payloads or delta-based updates.
- **Human Decision:** ⏳ PENDING

#### 9. No Stale View Indication on Snapshot Failure
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Error States
- **Issue:** Error States table shows "Snapshot capture fails | JS error in DOM clone | Console error, no update | Next interval retries". The agent sees the last valid snapshot with no indication it's stale. If multiple snapshots fail, the agent could be looking at an outdated view without knowing.
- **Suggested Fix:** Add visual indicator (timestamp badge or staleness warning) when snapshot hasn't updated for longer than expected interval.
- **Human Decision:** ⏳ PENDING

#### 10. "Significant Change Filter" Undefined
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #3
- **Issue:** Edge Case #3 mentions "Debouncing via significant change filter" for frequent DOM changes, but the document doesn't define what qualifies as a "significant change". This makes it unclear how the system behaves during React app re-renders or rapid DOM mutations.
- **Suggested Fix:** Document the criteria for what the MutationObserver considers a "significant" change worth capturing (e.g., minimum node count change, specific mutation types).
- **Human Decision:** ⏳ PENDING

#### 11. Code Reference Line Numbers May Become Stale
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 8 - Code References
- **Issue:** Section 8 contains specific line number references (e.g., "37-122", "127-139", "1287-1369"). As code evolves, these line numbers will become inaccurate, leading to documentation drift. This is a maintenance burden.
- **Suggested Fix:** Consider using function/method names as primary references instead of line numbers, or implement automated tooling to verify line numbers during CI.
- **Human Decision:** ⏳ PENDING

#### 12. Memory Leak Potential in Iframe Updates
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 6 - Technical Concerns > Performance
- **Issue:** Performance table notes "Memory in iframe | New iframe content each snapshot | 🟡 Medium | Could diff and patch". Writing new content to iframe every 2 seconds could accumulate memory, especially on long calls with complex pages.
- **Suggested Fix:** Implement DOM diffing/patching instead of full replacement, or ensure proper cleanup of old content before writing new.
- **Human Decision:** ⏳ PENDING

#### 13. Document Footer Has Incorrect Year
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Document Footer (line 401)
- **Issue:** Footer states "Last updated: 2024-12-03" but current date is December 2025. This appears to be a typo (2024 instead of 2025).
- **Suggested Fix:** Correct year to 2025.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 13
- **Critical:** 1
- **High:** 1
- **Medium:** 6
- **Low:** 5

---

## B-subscription-creation - Subscription Creation

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/billing/subscription-creation.md`
**Review Agent:** `docs/prompts/active/review-agent-billing-subscription-creation.md`

### Findings

#### 1. Screen Reader Accessibility Not Verified for Stripe Elements
- **Category:** UX Concern
- **Severity:** High
- **Location:** Section 5 - UI/UX Review > Accessibility
- **Issue:** Documentation explicitly states "Screen reader support: ⚠️ Not fully verified for Stripe Elements". This is a significant accessibility gap for a critical payment flow. Users with visual impairments may be unable to complete subscription creation.
- **Suggested Fix:** Conduct accessibility audit with screen readers (NVDA, VoiceOver) on the Stripe Elements integration. Document any issues found and implement fixes. Add automated accessibility testing to CI.
- **Human Decision:** ⏳ PENDING

#### 2. Price ID Fallback Silently Downgrades to Monthly Pricing
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 4 - Edge Cases #18, Section 10 - Open Questions #6
- **Issue:** When annual or 6-month price IDs aren't configured in environment, the system "falls back to monthly price ID with a console warning". This means a user explicitly selecting annual billing could be charged monthly rates without clear notification - a potential billing dispute issue and trust violation.
- **Suggested Fix:** Make missing price ID a hard error that blocks subscription creation. Show user-facing error: "Annual billing temporarily unavailable. Please contact support or select monthly billing."
- **Human Decision:** ⏳ PENDING

#### 3. 6-Month Popup Logic Creates Unexpected Behavior
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #4
- **Issue:** Documentation asks: "If user selects annual, changes to monthly, they see the popup. Is this intended?" This suggests the popup trigger logic may fire unexpectedly. The `exitPopupShown` ref prevents re-showing, but the document is unclear if this edge case was intentionally designed.
- **Suggested Fix:** Clarify intended behavior in documentation. If unintended, fix logic to only show popup on initial monthly selection, not after changing from annual.
- **Human Decision:** ⏳ PENDING

#### 4. Race Condition Risk Between API Response and Webhook
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1
- **Issue:** Documentation flags: "What happens if webhook arrives before API response?" While it notes the handler is "idempotent (won't downgrade trialing to trialing)", the concern is documented as "worth monitoring" without a concrete monitoring strategy.
- **Suggested Fix:** Add explicit logging when webhook arrives before API response completes. Consider adding a small delay in webhook processing or using a state lock to prevent race conditions.
- **Human Decision:** ⏳ PENDING

#### 5. Dev Mode Could Mask Production Integration Bugs
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5, Section 4 - Edge Cases #17
- **Issue:** Dev mode allows "subscription flow without Stripe" which is convenient but the documentation asks "How long should dev mode be supported?" This mode could mask critical Stripe integration issues until production deployment.
- **Suggested Fix:** Add mandatory Stripe integration tests in staging environment before production deploys. Consider requiring Stripe test mode credentials for local development instead of pure dev mode bypass.
- **Human Decision:** ⏳ PENDING

#### 6. Card Information Lost on Back Navigation
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 7 - First Principles Review #4
- **Issue:** Documentation notes flow is only "Partial" reversible: "Can go back in browser, but card info must be re-entered if leaving paywall". Users who navigate away and return must re-enter sensitive payment information, creating friction and potential abandonment.
- **Suggested Fix:** Cache SetupIntent clientSecret in sessionStorage to allow card reuse if user returns to /paywall within same session. Display "Card saved ✓" message when returning.
- **Human Decision:** ⏳ PENDING

#### 7. SetupIntent Created Fresh on Every Page Load
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 10 - Open Questions #2
- **Issue:** Documentation asks: "Should SetupIntent be reused if user returns to Step 1?" Currently creates new SetupIntent on each page load. Combined with Edge Case #12 (SetupIntent orphaned if user leaves), this could accumulate unused Stripe resources.
- **Suggested Fix:** Cache clientSecret in sessionStorage. On page load, check for existing valid SetupIntent before creating new one.
- **Human Decision:** ⏳ PENDING

#### 8. No Explicit Back Buttons in Paywall Flow
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues table, row 3
- **Issue:** Documentation explicitly identifies: "No explicit 'back' buttons - Relies on browser back". This is a UX gap as users expect navigation controls within the application, especially in a multi-step wizard.
- **Suggested Fix:** Add "← Back" links in Step 2 (seats) and Step 3 (billing) that navigate to previous steps. Style consistently with existing UI.
- **Human Decision:** ⏳ PENDING

#### 9. "Overpaying" Messaging May Feel Aggressive
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - UI/UX Review > Step 3 #3, Section 7 - Identified Issues table, row 2
- **Issue:** When user selects monthly billing, a "red 'overpaying' callout" is shown. Documentation flags this as "Slightly aggressive" and notes it "May feel pressured". This could damage trust and conversions.
- **Suggested Fix:** Soften language to focus on savings opportunity rather than user "error". Example: "Save 35% with annual billing" instead of "You're overpaying".
- **Human Decision:** ⏳ PENDING

#### 10. localStorage Seat Count Vulnerable to Clearing
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues table, row 4
- **Issue:** Documentation notes "localStorage seats lost on clear - Must re-select seats". If user clears browser data mid-funnel or uses private browsing, seat selection is lost and must be repeated.
- **Suggested Fix:** Consider using sessionStorage instead of localStorage, or store seat selection server-side after Step 2 completion.
- **Human Decision:** ⏳ PENDING

#### 11. Funnel Step Order Not A/B Tested
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Documentation questions: "Current flow is Card → Seats → Billing. Some funnels do Card → Billing → Seats. Worth A/B testing which converts better." No plan exists to validate the current step order optimizes conversions.
- **Suggested Fix:** Implement A/B test infrastructure to compare Card → Seats → Billing vs Card → Billing → Seats conversion rates.
- **Human Decision:** ⏳ PENDING

#### 12. SetupIntent Orphaning Acknowledged But No Cleanup
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #12, Section 7 - Identified Issues table, row 1
- **Issue:** Edge Case #12 notes "SetupIntent may be orphaned" when user leaves /paywall mid-flow. While documentation says "Stripe auto-expires unused intents", there's no proactive cleanup or tracking of orphaned intents.
- **Suggested Fix:** Consider tracking SetupIntent creation in DB. Run periodic cleanup job or rely on Stripe's automatic expiration. Add monitoring for orphan rate.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 2
- **Medium:** 4
- **Low:** 6

---

## B-seat-management - Seat Management

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/billing/seat-management.md`
**Review Agent:** review-agent-billing-seat-management.md

### Findings

#### 1. Maximum Seat Limit Enforced Inconsistently Between UI and API
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 10 - Open Questions #1
- **Issue:** Documentation explicitly states "Currently capped at 50 in signup UI (`Math.min(prev + 1, 50)`) but not enforced in API". This creates a security and consistency gap where direct API calls could set arbitrarily high seat counts, potentially causing billing issues or system strain.
- **Suggested Fix:** Enforce maximum seat limit (50 or configurable per plan) in the API endpoints `/api/billing/seats` and `/api/billing/update-settings`. Return validation error if exceeded.
- **Human Decision:** ⏳ PENDING

#### 2. Stripe-to-DB Update Not Atomic - Partial State Risk
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 6 - Reliability: "Stripe updated before DB for seats route"
- **Issue:** Documentation acknowledges "Stripe updated before DB for seats route". If Stripe subscription update succeeds but the subsequent database update (`UPDATE organizations SET seat_count = ...`) fails, the system enters an inconsistent state where Stripe charges for seats not reflected in the app.
- **Suggested Fix:** Implement compensating transaction pattern: if DB update fails, roll back Stripe change. Or use a two-phase approach with pending state. Add monitoring/alerting for DB write failures post-Stripe update.
- **Human Decision:** ⏳ PENDING

#### 3. Trial Period Seat Changes Not Documented
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open question states "How to handle seat changes during trial period? Currently no special handling - trial organizations follow same flow". This leaves critical questions unanswered: Does adding seats during trial create prorated charges? Does it affect trial end date? What does the user see?
- **Suggested Fix:** Document explicit behavior: either (a) seat changes during trial are free and only applied after trial ends, or (b) seat changes trigger immediate billing and end trial early, or (c) seat changes are blocked during trial.
- **Human Decision:** ⏳ PENDING

#### 4. Invite Rollback on Billing Failure May Not Be Atomic
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #8
- **Issue:** Edge case #8 states invite is "rolled back (deleted)" if billing fails, marked as "Transactional". However, if the Stripe call fails and the subsequent invite deletion also fails (DB error, connection timeout), the system could end up with an orphaned invite that was never billed for. No retry mechanism is documented.
- **Suggested Fix:** Document the exact error handling flow. Consider: (1) creating invite in "pending_billing" state first, (2) updating to "active" only after billing succeeds, (3) background cleanup job for orphaned pending invites.
- **Human Decision:** ⏳ PENDING

#### 5. Screen Reader Counter Announcements Missing
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - Accessibility, Section 7 - Identified Issues
- **Issue:** Document explicitly flags "Screen reader support: ⚠️ Counter value not announced on change" and lists it as a Medium severity issue in Section 7. When admins use +/- buttons to adjust seat count, screen reader users receive no feedback that the value changed.
- **Suggested Fix:** Add `aria-live="polite"` region around the seat counter or use `aria-atomic` with role="status" to announce value changes.
- **Human Decision:** ⏳ PENDING

#### 6. No API Rate Limiting on Seat Operations
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 6 - Security, Section 7 - Identified Issues
- **Issue:** Document explicitly flags "No explicit rate limit ⚠️" under Security concerns. Malicious or buggy clients could spam seat change requests, causing excessive Stripe API calls and potential billing issues.
- **Suggested Fix:** Add rate limit middleware to `/api/billing/seats` and `/api/billing/update-settings` endpoints (e.g., 10 requests per minute per org).
- **Human Decision:** ⏳ PENDING

#### 7. No Client-Side Debounce on Rapid Seat Changes
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #10, Section 7 - Identified Issues
- **Issue:** Edge case #10 notes "Multiple rapid seat changes | Admin clicks +/+ quickly | Each processed independently | ⚠️ No debounce on API". This is also listed in Section 7 as Low severity. Rapid clicking creates multiple Stripe API calls and prorated charges.
- **Suggested Fix:** Add 300-500ms debounce on the +/- button handlers in `BillingSettingsClient` before calling the API.
- **Human Decision:** ⏳ PENDING

#### 8. Expired Invites Not Cleaned Up
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open question asks "Should expired invites auto-free seats?" with note "Currently they're just not counted - no explicit cleanup". Expired invites accumulate in the database indefinitely, which could lead to data bloat and potential confusion when viewing invite history.
- **Suggested Fix:** Implement a scheduled job (daily CRON) to delete or archive invites where `expires_at < NOW() - interval '30 days'`. Document retention policy.
- **Human Decision:** ⏳ PENDING

#### 9. Invite Expiration Period Hardcoded
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Documentation states "Is the 7-day invite expiration appropriate for all use cases? Hardcoded, not configurable per-org". Enterprise organizations with slower onboarding processes may need longer invite windows.
- **Suggested Fix:** Add `invite_expiration_days` field to organizations table with default of 7. Allow admins to configure in Organization Settings.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 9
- **Critical:** 0
- **High:** 2
- **Medium:** 3
- **Low:** 4

---

## B-billing-frequency - Billing Frequency

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/billing/billing-frequency.md`
**Review Agent:** docs/prompts/active/review-agent-billing-billing-frequency.md

### Findings

#### 1. No Grace Period for Permanent 6-Month Offer Loss
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 7 - Identified Issues, and Section 10 - Open Question #1
- **Issue:** When a customer switches away from the 6-month billing plan, the `has_six_month_offer` flag is immediately and permanently set to `false`. There is no grace period, undo window, or confirmation delay. An accidental click followed by a confirmation could permanently lose a customer their 40% discount with no recourse. The document flags this as "🟡 Medium" but the permanent, irreversible nature makes this a significant customer satisfaction risk.
- **Suggested Fix:** Implement a 24-48 hour grace period where the offer loss can be reverted, or require a secondary confirmation (e.g., email confirmation) before the offer is permanently removed.
- **Human Decision:** ⏳ PENDING

#### 2. Confusing Edge Case Note: "Still Loses 40% Rate"
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #5
- **Issue:** Edge Case #5 states "6-month → Annual: Warning: loses 6-month offer ✅ Still loses 40% rate". The note "Still loses 40% rate" is ambiguous - it's unclear if this means the customer loses the 40% discount (going to annual's 35%) or if there's some other implication. The warning should clarify they're moving from 40% to 35% savings, not that they're losing discount entirely.
- **Suggested Fix:** Clarify note to: "Moves from 40% discount (6-month) to 35% discount (annual)".
- **Human Decision:** ⏳ PENDING

#### 3. No Rate Limiting on Frequency Changes
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 6 - Technical Concerns > Security, and Section 7 - Identified Issues
- **Issue:** Documentation explicitly notes "No explicit rate limiting ⚠️ Could add" for the frequency change API endpoint. While the UI prevents rapid changes via modal, a malicious actor could directly call the API endpoint repeatedly.
- **Suggested Fix:** Add rate limiting (e.g., max 5 frequency changes per hour) or cooldown period between changes.
- **Human Decision:** ⏳ PENDING

#### 4. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section marks "Screen reader support: ⚠️ Not verified". For a billing feature where users are making financial decisions, accessibility is critical. Users with visual impairments must be able to understand pricing, discounts, and the permanent consequences of their choices.
- **Suggested Fix:** Conduct screen reader testing with NVDA/VoiceOver and ensure all pricing information, warnings (especially the 6-month offer loss warning), and confirmation modals are properly announced.
- **Human Decision:** ⏳ PENDING

#### 5. Modal Focus Trap Missing
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility and Section 7 - Identified Issues
- **Issue:** Documentation notes "Focus management: ⚠️ Modal should trap focus". The confirmation modal for billing frequency changes doesn't trap keyboard focus, allowing users to Tab outside the modal. This is both an accessibility issue and a potential source of user confusion.
- **Suggested Fix:** Add focus trap hook to the confirmation modal component to ensure keyboard navigation stays within the modal while it's open.
- **Human Decision:** ⏳ PENDING

#### 6. Paused Account Frequency Change Behavior Ambiguous
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #9 and Section 10 - Open Question #5
- **Issue:** Edge Case #9 states "Frequency change while paused: Works - frequency stored ⚠️ Takes effect when resumed". This is flagged as a concern but not fully resolved. Open Question #5 asks "Should paused accounts be able to change frequency?" The expected behavior is unclear - users might be confused if they change frequency while paused and don't see immediate effect.
- **Suggested Fix:** Either: (a) Disable frequency changes while paused with clear messaging, or (b) Allow changes but show clear UI indication: "This change will take effect when your subscription resumes."
- **Human Decision:** ⏳ PENDING

#### 7. Stripe Price ID Fallback Behavior May Be Incorrect
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #11
- **Issue:** Edge Case #11 states "Stripe price ID not configured: Falls back to monthly price ID ⚠️ Logs warning". If an admin selects annual billing but the annual price ID is misconfigured, silently falling back to monthly pricing is incorrect behavior - the customer expects annual pricing but gets charged monthly rates. This could cause billing disputes.
- **Suggested Fix:** Instead of silent fallback, fail the request with a clear error and alert operations team. The fallback masks a configuration error that should be caught immediately.
- **Human Decision:** ⏳ PENDING

#### 8. 6-Month Offer Not Available for Re-subscribers - Business Logic Undocumented
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Question #6
- **Issue:** Open Question #6 asks "Is the 6-month offer available for re-subscribers? Currently: No." This is a significant business decision that affects win-back campaigns and customer re-acquisition. The behavior is implemented but the business rationale is not documented. Additionally, Edge Cases section doesn't cover the re-subscription scenario at all.
- **Suggested Fix:** Document the business decision explicitly in the feature doc and add edge case row for "Re-subscriber attempts 6-month selection" with expected behavior.
- **Human Decision:** ⏳ PENDING

#### 9. No Email Notification on Frequency Change
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues and Section 10 - Open Question #3
- **Issue:** Documentation notes "No email notification: Change not confirmed via email 🟢 Low" and Open Question #3 asks if frequency changes should trigger emails. For billing changes, email confirmation is standard practice for audit trail and customer communication. Users may not remember they changed frequency when they see a different charge amount.
- **Suggested Fix:** Send confirmation email on frequency change including: old frequency, new frequency, effective date, and new pricing.
- **Human Decision:** ⏳ PENDING

#### 10. Seat Addition Pricing During Pending Frequency Change Unclear in UI
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases Row #13 and Section 10 - Open Question #4
- **Issue:** Edge Case #13 states "Add seats after frequency change: Seats charged at current (old) rate ✅ Until renewal" and Open Question #4 asks "is this documented clearly enough in UI?" The document doesn't specify if/how users are informed that new seats will be charged at the old rate until renewal. This could cause billing confusion.
- **Suggested Fix:** Add clear UI messaging on seat addition: "New seats will be billed at [old frequency] rate ($X/seat) until your next renewal on [date], then switch to [new frequency] rate."
- **Human Decision:** ⏳ PENDING

#### 11. Proration Behavior Not Fully Explained
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Edge Cases Row #12
- **Issue:** Edge Case #12 states "Change near billing date: Proration calculated by Stripe ✅ create_prorations behavior". The document doesn't explain what this means for the customer - will they get a credit, be charged extra, or nothing? The Data Flow section shows `proration_behavior: 'create_prorations'` but doesn't explain the user-facing impact.
- **Suggested Fix:** Add explanation of proration behavior: "When upgrading mid-cycle, customer is charged prorated difference. When downgrading, credit is applied to next invoice."
- **Human Decision:** ⏳ PENDING

#### 12. Stripe Price ID Update Requires Deployment
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 10 - Open Question #2
- **Issue:** Open Question #2 states "What happens if Stripe price IDs change? Currently hardcoded in environment. Would need deployment to update." This creates operational friction if Stripe prices need to be updated (e.g., price increase, new promotion). Environment variable changes still require deployment.
- **Suggested Fix:** Consider storing Stripe Price IDs in database with admin UI for updates, or document the deployment process clearly in runbook.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 1
- **Medium:** 6
- **Low:** 5

---

## A-bullpen-states - Bullpen & Agent States

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/bullpen-states.md`
**Review Agent:** review-agent-agent-bullpen-states.md

### Findings

#### 1. No Warning Before Idle Timeout in Visible Tab
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #3, Section 5 - UX Review step 4, Section 7 - Identified Issues row 1
- **Issue:** Documentation explicitly flags this: "5 min idle → (If visible) Immediately goes away" with ⚠️. When an agent is in a visible tab and becomes idle for 5 minutes, they are immediately marked as away with no warning. This can be jarring and lead to missed calls if the agent was expecting to still be available. The doc suggests "Show countdown toast at 4:30 (30s warning)" as a fix.
- **Suggested Fix:** Implement a 30-second countdown toast warning before auto-away triggers in visible tabs, matching the notification-based grace period behavior for background tabs.
- **Human Decision:** ⏳ PENDING

#### 2. `in_simulation` Status Terminology Unclear to Agents
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 2, Section 10 - Open Questions Q-A1-002
- **Issue:** The `in_simulation` status displays as "Broadcasting" in the UI, but documentation notes "Agent may not understand 'Broadcasting'". This is flagged as an open question: "Is this the right label? Alternatives: Live, Active, Streaming." The internal state name (`in_simulation`) vs UI text ("Broadcasting") vs actual meaning (visitor watching pre-recorded video) creates a semantic gap.
- **Suggested Fix:** Consider user testing to determine best label. "Visitor Watching" or "Pre-Call" might be clearer than "Broadcasting" since the agent isn't actually broadcasting - visitors are watching pre-recorded content.
- **Human Decision:** ⏳ PENDING

#### 3. Page Refresh During Active Call Ends Call Immediately
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #7, Section 7 - Identified Issues row 3
- **Issue:** Documentation states: "Page refresh while in call | F5 / reload | Call ends immediately | ⚠️ | No grace period for active calls". While idle agents get a 10-second grace period on refresh (via `pendingDisconnects` map), agents in active calls do not. An accidental F5 or browser refresh terminates the call instantly. The doc references "Q-1202-004" for adding call recovery grace period.
- **Suggested Fix:** Add call recovery grace period similar to the existing 10-second disconnect grace for idle agents. Allow brief reconnection window for in-call state.
- **Human Decision:** ⏳ PENDING

#### 4. Screen Reader Status Changes Not Announced
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation explicitly flags "⚠️ Screen reader support: Status changes not announced". When agent status changes (idle→away, away→idle, etc.), the change is not announced to screen reader users, making the application less accessible for visually impaired agents.
- **Suggested Fix:** Add ARIA live regions for status changes. Use `aria-live="polite"` to announce status transitions to assistive technology users.
- **Human Decision:** ⏳ PENDING

#### 5. Staleness Check Has O(n) Performance Concern
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Technical Concerns, Performance
- **Issue:** Documentation notes "⚠️ Staleness check runs every 60s on server - linear scan of agents map". For large organizations with many agents, this linear scan every 60 seconds could become a performance bottleneck. The check iterates through all agents to find those with stale heartbeats.
- **Suggested Fix:** Consider using a sorted data structure (heap/priority queue) based on `lastActivityAt` timestamp, allowing O(log n) staleness detection. Alternatively, document acceptable scale limits.
- **Human Decision:** ⏳ PENDING

#### 6. Worker Fallback May Throttle in Background
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Technical Concerns, Reliability
- **Issue:** Documentation states "⚠️ If worker terminates unexpectedly, falls back to setTimeout (may throttle)". If the Web Worker for idle/heartbeat detection crashes, the fallback to setTimeout is subject to Chrome's background tab throttling, potentially causing missed staleness detection or delayed auto-away.
- **Suggested Fix:** Add worker health monitoring and automatic restart on failure. Consider using SharedWorker for better reliability, or document this as a known limitation with recommended browser settings.
- **Human Decision:** ⏳ PENDING

#### 7. Multiple Tabs Cause Socket Takeover Without Warning
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #14
- **Issue:** Edge case states: "Multiple tabs open | Open dashboard in 2 tabs | Second tab takes over socket | ⚠️ | First tab shows disconnected". When an agent opens the dashboard in a second tab, it silently takes over the socket connection, leaving the first tab in a disconnected state. This can confuse agents who have multiple tabs open.
- **Suggested Fix:** Either prevent second tab from connecting (show "Already connected in another tab" message), or implement tab synchronization to keep both tabs aware of the shared state.
- **Human Decision:** ⏳ PENDING

#### 8. Idle Timeout Not Configurable Per Organization
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions Q-A1-003
- **Issue:** Open question asks: "Should the idle timeout be configurable per organization? Currently hardcoded to 5 minutes in `TIMING.AGENT_IDLE_TIMEOUT`." Different organizations may have different needs - a sales team might want shorter timeouts (2 min) while a support team might need longer (10 min). Currently all orgs use the same 5-minute timeout.
- **Suggested Fix:** Add organization-level setting for idle timeout. Provide reasonable default (5 min) but allow admin override within bounds (e.g., 1-30 minutes).
- **Human Decision:** ⏳ PENDING

#### 9. State Diagram Shows Ambiguous `in_call` to `offline` Transition
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 2 - State Machine diagram
- **Issue:** The state diagram shows "in_call → offline: Agent disconnects mid-call" but doesn't show what happens to the visitor in this case. Does the visitor see an error? Is the call automatically ended? Is there any reconnection attempt? This transition's visitor-side behavior isn't documented in this feature doc.
- **Suggested Fix:** Add clarification for visitor experience when agent disconnects mid-call, or add cross-reference to the relevant visitor/platform feature doc that covers this scenario.
- **Human Decision:** ⏳ PENDING

#### 10. setAway Retry Fallback Assumes Success
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #16, Section 4 - Error States
- **Issue:** Edge case #16 states: "setAway fails (network) | Emit fails | Retry 3x with exponential backoff | ✅ | Falls back to local state". Error state also says "setAway ack timeout... then assume success, Local state updated". If all 3 retries fail and the system assumes success, the local state shows "away" but the server still thinks agent is "idle". This state desync could cause visitors to be routed to an agent who thinks they're away.
- **Suggested Fix:** After retry exhaustion, show explicit error state to agent ("Could not update status - you may still receive calls") rather than assuming success. Consider periodic state reconciliation on reconnect.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 6

---

## B-pause-subscription - Pause Subscription

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/billing/pause-subscription.md`
**Review Agent:** review-agent-billing-pause-subscription.md

### Findings

#### 1. No Stripe Integration - Billing Continues During Pause
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 6 - Known Implementation Gaps, Issue 1
- **Issue:** The `pauseAccount()` and `resumeAccount()` actions update the database but do NOT interact with Stripe. Documentation explicitly states "Impact: 🔴 High - Customers will still be billed during 'pause'". Code comments at `actions.ts:127-131` indicate this is TODO. This defeats the core purpose of the pause feature.
- **Suggested Fix:** Implement Stripe `subscription.pause_collection` with `behavior: void` or one of the alternative approaches listed in Open Questions.
- **Human Decision:** ⏳ PENDING

#### 2. No Auto-Resume Functionality
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 6 - Known Implementation Gaps, Issue 2; Section 2 - State Machine
- **Issue:** There is no cron job, scheduled task, or webhook to automatically resume subscriptions when `pause_ends_at` is reached. State diagram explicitly marks auto-resume as "(NOT YET IMPLEMENTED)". The database has an index (`idx_organizations_pause_ends_at`) ready for this query, but no scheduler exists. Subscriptions will stay paused indefinitely.
- **Suggested Fix:** Implement scheduled task using Supabase Edge Function, Railway cron, or Vercel cron as suggested in Open Questions.
- **Human Decision:** ⏳ PENDING

#### 3. Widget Not Disabled During Pause
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 6 - Known Implementation Gaps, Issue 3; Section 4 - Edge Case #16
- **Issue:** Edge case #16 explicitly states "Widget visibility during pause | Visitor loads site | **Widget still shows** - server doesn't check pause status | ❌ | TODO in code comments". The VISITOR_JOIN handler in `socket-handlers.ts:97-209` does not check `subscription_status` before assigning agents. Paused organizations can still receive calls, negating the purpose of pausing.
- **Suggested Fix:** Add `subscription_status` check in VISITOR_JOIN handler to reject/hide widget for paused organizations.
- **Human Decision:** ⏳ PENDING

#### 4. No Email Notifications Implemented
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Known Implementation Gaps, Issue 4; Section 3 - Data Flow
- **Issue:** Code comments in Data Flow section indicate emails should be sent for: (1) Pause confirmation, (2) 7-day reminder before resume, (3) Resume confirmation. None of these are implemented. This creates poor customer communication about their account status.
- **Suggested Fix:** Implement transactional emails for all three notification types using existing email infrastructure.
- **Human Decision:** ⏳ PENDING

#### 5. Pause Allowed During Trial Period
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #8
- **Issue:** Edge case #8 states "Pause during trial period | Admin pauses while trialing | Allowed - no validation against trial | ⚠️ | May cause billing issues". No business rule prevents trial users from pausing, which could create confusing billing scenarios when combined with trial-to-paid transitions.
- **Suggested Fix:** Either block pausing during trial, or document explicit behavior for trial pause scenarios. Consider if remaining trial days should be preserved (Open Question #5).
- **Human Decision:** ⏳ PENDING

#### 6. No UI Debounce on Pause Button
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #11
- **Issue:** Edge case #11 notes "Multiple consecutive pause requests | Rapid clicks | Second click proceeds | ⚠️ | No debounce on UI button". This could lead to duplicate database operations or confusing state if user rapidly clicks the pause button.
- **Suggested Fix:** Add debounce to the "Pause for X Months" button or disable button after first click while request is pending.
- **Human Decision:** ⏳ PENDING

#### 7. Active Call Behavior During Pause is Unclear
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #6; Section 10 - Open Question #2
- **Issue:** Edge case #6 states "Pause requested during active call | Admin pauses mid-call | Pause proceeds immediately | ⚠️ | Call may continue until ended; widget behavior unclear". Open Question #2 asks whether active calls should end immediately or complete naturally. There's no defined behavior for this scenario.
- **Suggested Fix:** Define and document explicit behavior: either (a) allow current calls to complete naturally, or (b) gracefully end calls with notification to participants.
- **Human Decision:** ⏳ PENDING

#### 8. Admin Access Loss Leaves Org Stranded
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #13
- **Issue:** Edge case #13 states "Admin loses access during pause | Admin deleted while paused | Org remains paused, no one can resume | ⚠️ | Edge case; needs platform admin intervention". If the sole admin is deleted while organization is paused, there's no self-service recovery path.
- **Suggested Fix:** Either prevent deleting the last admin of a paused org, or document clear platform admin intervention process for this scenario.
- **Human Decision:** ⏳ PENDING

#### 9. Pause Near Billing Cycle End May Still Charge
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #9
- **Issue:** Edge case #9 states "Pause near end of billing cycle | Admin pauses day before renewal | Pause proceeds; Stripe NOT updated | ⚠️ | May still be charged". Since Stripe integration is missing, pausing right before a billing cycle doesn't prevent the upcoming charge.
- **Suggested Fix:** This will be resolved by implementing Stripe integration (Finding #1), but should be explicitly tested as an edge case.
- **Human Decision:** ⏳ PENDING

#### 10. Accessibility Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Section 5 lists "Keyboard navigation: ⚠️ Modal focus trap not verified" and "Screen reader support: ⚠️ Not verified; needs aria-labels review". Core accessibility requirements for the pause modal have not been validated.
- **Suggested Fix:** Verify modal has proper focus trap, aria-labels, and keyboard navigation. Test with screen reader.
- **Human Decision:** ⏳ PENDING

#### 11. No Rate Limiting on Pause/Resume Actions
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Security
- **Issue:** Security table states "Rate limiting | No explicit rate limit on pause/resume actions". While the risk is low since only authenticated admins can trigger these, repeated pause/resume could create database churn and confuse audit history.
- **Suggested Fix:** Consider adding basic rate limit (e.g., max 5 pause/resume actions per hour).
- **Human Decision:** ⏳ PENDING

#### 12. No Agent Notification When Org Paused
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #3
- **Issue:** Open Question #3 asks "Should agents be notified when org is paused? Currently no notification - agents might not know why they can't log in (if widget disabled)." If the widget is eventually disabled during pause, agents have no way to know why they suddenly can't receive calls.
- **Suggested Fix:** Send notification to all org agents when pause begins, explaining the pause and expected resume date.
- **Human Decision:** ⏳ PENDING

#### 13. No Limit on Number of Pauses
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Case #17; Section 7 - Identified Issues
- **Issue:** Edge case #17 states "Multiple pauses in sequence | Pause → Resume → Pause | Works, all events logged to history | ✅ | No pause limit enforced". Section 7 lists this as a Low severity issue with suggestion to "Consider adding yearly pause limit". Unlimited pauses could be abused to avoid billing indefinitely.
- **Suggested Fix:** Consider implementing business rule limiting pauses (e.g., max 2 pauses per year, max 6 months total pause time per year).
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 13
- **Critical:** 2
- **High:** 1
- **Medium:** 8
- **Low:** 2

---

## B-payment-failure - Payment Failure

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/billing/payment-failure.md`
**Review Agent:** `docs/prompts/active/review-agent-billing-payment-failure.md`

### Findings

#### 1. TypeScript Type Missing `past_due` Status
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 7 - Identified Issues, Section 8 - Code References, Section 10 - Open Questions #6
- **Issue:** Documentation explicitly identifies that `packages/domain/src/database.types.ts` line 39 is missing `past_due` in the `SubscriptionStatus` type. The database migration adds `past_due` to the constraint, but the TypeScript type hasn't been updated. This will cause type errors when handling payment failures and could lead to runtime issues.
- **Suggested Fix:** Update `packages/domain/src/database.types.ts` line 39 to: `export type SubscriptionStatus = "active" | "paused" | "cancelled" | "trialing" | "past_due";`
- **Human Decision:** ⏳ PENDING

#### 2. Zero User Feedback on Payment Failure
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 5 - UI/UX Review, Section 7 - First Principles Review
- **Issue:** Documentation clearly states that when payment fails: "Admin unaware of payment issue", "No notification, email, or banner", "User never knew there was an issue". Error States table shows all user-facing responses as "**NOTHING**". First Principles Review shows 5 out of 6 criteria failed (❌). This is a fundamental UX failure where users have no idea their subscription is at risk.
- **Suggested Fix:** Implement at minimum: (1) Dashboard banner showing past-due status, (2) Email notification on `invoice.payment_failed`, (3) Toast/alert on login when `past_due`.
- **Human Decision:** ⏳ PENDING

#### 3. No Self-Service Payment Method Update
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 1 - User Goals, Section 4 - Edge Case #7, Section 5 - UI/UX Step 4
- **Issue:** User Goals table shows "Update payment method | ❌ NOT IMPLEMENTED - No self-service flow". Edge Case #7 is marked ❌ incorrect behavior. Users "Must contact support or use Stripe portal" but there's no documented path to the Stripe billing portal for customers. This prevents users from recovering from payment failures on their own.
- **Suggested Fix:** Add Stripe Customer Portal integration or implement custom payment method update flow in dashboard settings.
- **Human Decision:** ⏳ PENDING

#### 4. Seat Addition During Past-Due May Cause Inconsistency
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 - Edge Case #8, Section 10 - Open Questions #7
- **Issue:** Edge case #8 notes "seats still added in DB" when payment fails during seat addition, marked ⚠️ with note "Seats may be inconsistent with Stripe quantity". Open Questions #7 confirms this needs investigation. If admin adds seats, payment fails, and seats remain in DB but Stripe has different quantity, billing and access could be inconsistent.
- **Suggested Fix:** Either: (1) Don't add seats to DB until Stripe invoice succeeds, or (2) Implement reconciliation on `invoice.payment_failed` to roll back seat changes.
- **Human Decision:** ⏳ PENDING

#### 5. No Service Restrictions During Past-Due
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #9, Section 5 - UI/UX Step 3, Section 10 - Open Questions #3
- **Issue:** Edge Case #9 shows service access during `past_due` provides "Full access continues" marked ⚠️. UI/UX Step 3 shows adding seats "Works normally" with note "Should probably be blocked". Open Questions #3 lists three options but no decision. The documentation itself suggests current behavior is incorrect but no specification exists for what restrictions should apply.
- **Suggested Fix:** Define policy for past-due restrictions (e.g., block seat additions, show warning on widget, etc.) and implement.
- **Human Decision:** ⏳ PENDING

#### 6. Undefined Grace Period
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open Questions #2 asks "What is the intended grace period?" and states "Not defined. Currently no restrictions during `past_due` at all." Without a defined grace period, there's no clear policy on when (or if) service should be degraded or terminated for non-payment.
- **Suggested Fix:** Define business policy for grace period (e.g., 7 days full access, then warning-only mode, then widget disabled after 14 days).
- **Human Decision:** ⏳ PENDING

#### 7. Edge Case: Payment Succeeds After Cancellation Not Handled
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #14
- **Issue:** Edge case #14 "Subscription cancelled then payment succeeds" shows current behavior as "Depends on timing" and is marked ⚠️ with note "Edge case not explicitly handled". If `invoice.paid` arrives after `subscription.deleted`, the final subscription state could be incorrect. This is a race condition.
- **Suggested Fix:** Add explicit handling: if subscription is already `cancelled` when `invoice.paid` arrives, either ignore the payment event or log it for manual review.
- **Human Decision:** ⏳ PENDING

#### 8. Related Features Reference Non-Existent Documentation
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 9 - Related Features
- **Issue:** Section 9 references three related feature docs that don't exist: `subscription-creation.md` (NOT YET DOCUMENTED), `subscription-cancellation.md` (NOT YET DOCUMENTED), `account-pause.md` (NOT YET DOCUMENTED). This creates broken cross-references and prevents understanding the full billing lifecycle.
- **Suggested Fix:** Either create these documentation files or update references to point to existing billing docs (e.g., `cancel-subscription.md`, `pause-subscription.md`).
- **Human Decision:** ⏳ PENDING

#### 9. No Dunning Email Strategy Defined
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Section 10 - Open Questions #4
- **Issue:** Identified Issues lists "No dunning emails" as 🔴 High severity. Open Questions #4 asks "Should we send emails or rely on Stripe emails?" with note that Stripe can send automated emails. No decision is documented on whether to supplement with custom dunning sequence. This leaves a critical communication gap undefined.
- **Suggested Fix:** Document decision: (A) Enable Stripe's built-in dunning emails, or (B) Implement custom email sequence, or (C) Use both. If custom, specify timing (e.g., immediate, day 3, day 7).
- **Human Decision:** ⏳ PENDING

#### 10. Missing Migration File Reference
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 8 - Code References
- **Issue:** Code References table lists migration file as `supabase/migrations/20251204200000_expand_subscription_status.sql` with date "20251204" (Dec 4, 2025). However, current date is Dec 3, 2025, meaning this migration hasn't been created yet or the filename/date is incorrect.
- **Suggested Fix:** Verify migration file exists and update reference if filename differs.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 1
- **High:** 3
- **Medium:** 4
- **Low:** 2

---

## P-agent-assignment - Agent Assignment Algorithm

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/platform/agent-assignment.md`
**Review Agent:** `docs/prompts/active/review-agent-platform-agent-assignment.md`

### Findings

#### 1. reassignVisitors() Bypasses Pool-Based Routing
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Technical Concerns, Section 7 - Identified Issues, Section 8 - Code References (lines 767-806)
- **Issue:** Documentation explicitly identifies this issue: "reassignVisitors() calls findBestAgent() with no poolId, which bypasses pool-based routing. This means a visitor originally matched to 'Sales Pool' could be reassigned to an agent in 'Support Pool'." The code excerpt in Section 6 confirms `this.findBestAgent()` is called without any pool context.
- **Suggested Fix:** Pass visitor's `orgId` + `pageUrl` and use `findBestAgentForVisitor()` instead of `findBestAgent()` during reassignment. Alternatively, store `matchedPoolId` on the visitor and use that during reassignment.
- **Human Decision:** ⏳ PENDING

#### 2. No Default Pool Falls Back to Any Agent (Wrong Pool Risk)
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #13
- **Issue:** Edge case table marks this with ⚠️: "No default pool configured | Org has no default pool | Falls back to any agent (poolId=null) | ⚠️ | May route to wrong pool". When an organization hasn't configured a default pool and no routing rules match, visitors are routed to any available agent regardless of pool assignment, defeating the purpose of pool-based specialization.
- **Suggested Fix:** Require default pool configuration during org setup, or show admin warning when routing rules exist but no default pool is set. At minimum, emit a warning event when this fallback occurs for monitoring.
- **Human Decision:** ⏳ PENDING

#### 3. Ambiguous Away-Agent Fallback Behavior
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Documentation asks: "What's the intended behavior when all Tier 1 agents are 'away' but have capacity? Currently they're skipped. Should they be included as last resort before Tier 2?" This creates ambiguity: an admin might expect that an "away" senior agent with capacity would still receive overflow rather than routing to a junior agent in Tier 2.
- **Suggested Fix:** Document the design decision explicitly. If "away" always skips regardless of tier, document this as intentional. If overflow should include away agents, implement and document that behavior with clear admin guidance.
- **Human Decision:** ⏳ PENDING

#### 4. Global Round-Robin May Cause Uneven Per-Pool Distribution
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #4
- **Issue:** Documentation notes: "Should round-robin track per-pool or globally? Currently it's global (lastAssignmentOrder is per-agent, not per-pool). Agent in multiple pools gets same order everywhere." An agent in both Sales and Support pools who just received a Sales call will be deprioritized in Support, even if they haven't received a Support call in hours.
- **Suggested Fix:** Consider implementing per-pool assignment tracking for agents in multiple pools, or document this as intentional behavior with rationale (e.g., "global tracking ensures overall workload balance across all pools").
- **Human Decision:** ⏳ PENDING

#### 5. No Tiebreaker for Identical Assignment Order
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 2
- **Issue:** Documentation explicitly flags: "No tiebreaker for same-order agents | Arbitrary selection if two agents have identical assignment order | 🟢 LOW". This could occur when two agents are initialized simultaneously or haven't received assignments. The selection becomes non-deterministic.
- **Suggested Fix:** Add secondary tiebreaker as suggested (e.g., agentId string comparison) to ensure deterministic selection for testing and debugging.
- **Human Decision:** ⏳ PENDING

#### 6. maxSimultaneousSimulations Hardcoded to 25
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues row 3
- **Issue:** Documentation identifies: "maxSimultaneousSimulations hardcoded to 25 | Can't customize per org/agent | 🟢 LOW". Different organizations may have different capacity requirements - a call center might want 5, while a self-service demo page might want 50.
- **Suggested Fix:** Make this configurable at the organization level (with reasonable bounds, e.g., 1-100), and optionally per-agent for specialized roles.
- **Human Decision:** ⏳ PENDING

#### 7. No Maximum Tier Count Documented for Admin UI
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Documentation asks: "Is there a maximum number of tiers supported? Code handles any number, but is there a UX limit in the admin UI?" If admins can create unlimited tiers, the UI may become unwieldy and the routing logic harder to reason about.
- **Suggested Fix:** Document recommended tier limits (e.g., 3-5 tiers) in admin help text. Consider soft validation in UI with warning if exceeding recommended maximum.
- **Human Decision:** ⏳ PENDING

#### 8. Server Restart Requires Full Visitor Reconnection
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability
- **Issue:** Documentation notes: "Server restart: Visitors must reconnect, re-trigger assignment." This means a server deploy or restart interrupts all active visitor sessions and requires full re-assignment. For a production system with continuous deploys, this could cause visitor experience degradation.
- **Suggested Fix:** Consider implementing Redis-backed state persistence or a graceful handoff mechanism during restarts. At minimum, document expected frequency of restarts and impact on visitor experience.
- **Human Decision:** ⏳ PENDING

#### 9. Agent Disconnect Grace Period May Cause Brief Agent Unavailability
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Case #10
- **Issue:** Edge case shows: "Agent disconnects right after selection | Socket disconnects post-assignment | 10s grace period, then reassign | ✅". While marked as correct, during the 10-second grace period, the visitor is assigned to an unreachable agent. If the visitor tries to initiate a call during this window, the experience may be confusing.
- **Suggested Fix:** Consider emitting a "connecting to agent" or "waiting for agent" state to the visitor during the grace period rather than showing the agent as fully available.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 9
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 5

---

## B-cancel-subscription - Cancel Subscription

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/billing/cancel-subscription.md`
**Review Agent:** review-agent-billing-cancel-subscription.md

### Findings

#### 1. Stripe Subscription Not Actually Cancelled
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 6 - Technical Concerns > Potential Issues Found > Issue 1
- **Issue:** The document explicitly states that the code contains TODO comments and does NOT call Stripe API to cancel subscriptions. Current behavior only downgrades plan to "free" while Stripe subscription may continue billing. Quote: "Current behavior: Only downgrades plan to 'free', does NOT call Stripe API. Impact: Stripe subscription may continue billing."
- **Suggested Fix:** Implement Stripe API call to cancel the subscription before/after downgrading the plan. This should be the highest priority fix as it causes financial harm to customers.
- **Human Decision:** ⏳ PENDING

#### 2. Data Deletion Claims Are Misleading
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 6 - Technical Concerns > Potential Issues Found > Issue 2
- **Issue:** The UI shows a deletion warning listing "All call recordings", "Call logs & history", "Analytics & stats", "Agent configurations", and "Routing rules" as being permanently deleted. However, actual behavior just sets plan to "free" with no data deletion occurring. This is a trust issue and potential compliance concern.
- **Suggested Fix:** Either implement actual data deletion with appropriate scheduling/retention, OR update the UI copy to accurately reflect that data is retained but access is limited.
- **Human Decision:** ⏳ PENDING

#### 3. No Grace Period Implementation
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 6 - Technical Concerns > Potential Issues Found > Issue 4
- **Issue:** The UI mentions "access continues until end of billing period" but there is no implementation: no `subscription_ends_at` field tracked, no access gating based on billing period end, and immediate downgrade to "free" plan occurs. Users expect to retain access until their paid period ends.
- **Suggested Fix:** Track `subscription_ends_at`, schedule the actual downgrade for end of billing period, and gate access appropriately during the grace period.
- **Human Decision:** ⏳ PENDING

#### 4. No Confirmation Email Sent
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Technical Concerns > Potential Issues Found > Issue 3
- **Issue:** Document explicitly notes "No cancellation confirmation email" is sent. This is poor UX and may cause confusion, especially since users may want a receipt/confirmation for their records and to verify the action completed.
- **Suggested Fix:** Implement email notification for cancellation confirmation including: confirmation message, effective date, data retention policy, and reactivation instructions.
- **Human Decision:** ⏳ PENDING

#### 5. Agents Not Notified on Cancellation
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Technical Concerns > Potential Issues Found > Issue 3; Section 4 Edge Case #15
- **Issue:** When an organization cancels, agents receive no notification and are not logged out. Edge Case #15 states "Agents not notified/logged out" with ⚠️ flag. The Identified Issues table also notes: "Agents confused when widget stops."
- **Suggested Fix:** Implement agent notification (email or in-app) when organization is cancelled, and gracefully terminate agent sessions.
- **Human Decision:** ⏳ PENDING

#### 6. Plan Update May Fail Silently
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases > Error States table
- **Issue:** The Error States table shows that when "Plan update fails" on DB error, it is "Logged but not thrown". This means feedback is saved but the plan update could fail silently, leaving the user believing they cancelled but still being charged.
- **Suggested Fix:** Make the plan update transactional with feedback save, or ensure explicit error handling and user notification if plan update fails.
- **Human Decision:** ⏳ PENDING

#### 7. In-Progress Calls Not Handled
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #7
- **Issue:** Open question asks "What happens to in-progress calls during cancellation?" but no handling is documented. If an admin cancels while an agent is mid-call, behavior is undefined. This could cause abrupt disconnection and poor visitor experience.
- **Suggested Fix:** Document expected behavior (e.g., allow active calls to complete, then apply cancellation) and implement appropriate guards.
- **Human Decision:** ⏳ PENDING

#### 8. No Proration or Refund Logic
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open question notes code doesn't handle: mid-period cancellations, unused time credits, or annual plan partial refunds. This creates unclear expectations about what happens to already-paid funds.
- **Suggested Fix:** Define and document refund policy. Implement Stripe proration API integration if partial refunds are to be offered.
- **Human Decision:** ⏳ PENDING

#### 9. Accessibility Not Tested
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review > Accessibility
- **Issue:** Document explicitly notes keyboard navigation, screen reader support, and focus management in modals are "⚠️ Not explicitly tested". For a critical destructive action like cancellation, accessibility is important to ensure all users can complete the flow.
- **Suggested Fix:** Perform accessibility audit on cancel flow: verify keyboard navigation, screen reader announcements for step changes and warnings, and proper focus trapping in modals.
- **Human Decision:** ⏳ PENDING

#### 10. Trial Cancellation Has No Special Handling
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #8
- **Issue:** Edge Case #8 shows "Cancel during trial" scenario with ⚠️ flag, noting "No special trial handling visible". Trial users may have different expectations (e.g., immediate cancellation with no data, no billing impact).
- **Suggested Fix:** Define and implement trial-specific cancellation behavior, potentially with simplified flow since no billing is involved.
- **Human Decision:** ⏳ PENDING

#### 11. Pause Modal May Confuse Users
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - UI/UX Review > Pause Modal Flow Step 1; Section 7 - First Principles Review
- **Issue:** When user clicks "Cancel Subscription", a Pause Modal appears first (not a cancel modal). Document notes this "May confuse users expecting cancel flow" and is marked with ⚠️. The First Principles Review also flags "Pause downsell first may confuse."
- **Suggested Fix:** Consider A/B testing flow order, or add clear messaging in pause modal that this is an alternative to cancellation.
- **Human Decision:** ⏳ PENDING

#### 12. Partial Input Lost on Modal Re-open
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #14
- **Issue:** Edge Case #14 notes that if a user encounters an error and re-opens the cancel modal, they get a "Fresh state, no pre-filled data" with ⚠️ flag. This means users must re-enter all feedback if submission fails.
- **Suggested Fix:** Preserve partial form input in component state or localStorage so users can resume after an error without re-entering all information.
- **Human Decision:** ⏳ PENDING

#### 13. Free Plan Capabilities Not Defined
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open question asks "Should cancelled users retain read-only access? Current behavior is unclear on what 'free' plan includes." Users cancelling don't know what access they'll have post-cancellation.
- **Suggested Fix:** Document and communicate what the "free" plan includes (e.g., read-only access to historical data, no agent functionality, etc.) and display this in the cancellation confirmation screen.
- **Human Decision:** ⏳ PENDING

#### 14. GDPR Compliance Gap for Feedback Data
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 10 - Open Questions #8
- **Issue:** Open question notes: "Should cancellation feedback be anonymizable? For GDPR compliance, might need to handle user_id in feedback after full account deletion." If a user requests full data deletion under GDPR, the feedback record with user_id may need special handling.
- **Suggested Fix:** Implement feedback anonymization process that can strip user_id while retaining aggregated analytics value. Document data retention policy for cancellation feedback.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 14
- **Critical:** 2
- **High:** 1
- **Medium:** 7
- **Low:** 4

---

## SA-retargeting-analytics - B2B Retargeting Pixel

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/superadmin/retargeting-analytics.md`
**Review Agent:** review-agent-superadmin-retargeting-analytics.md

### Findings

#### 1. Silent Toggle Failure with No User Feedback
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 - Edge Cases, Row #13; Section 4 - Error States, "Org toggle failure"
- **Issue:** When an org toggle fails due to network error, the documentation states: "Error logged, UI not updated" (⚠️ flagged) and Error States shows "Toggle reverts (silently)". The admin has no indication the toggle failed - they believe the org is enabled for B2B tracking when it's not, leading to missed retargeting events.
- **Suggested Fix:** Show error toast when org toggle fails and ensure UI reflects actual state. Consider optimistic UI with rollback + error notification.
- **Human Decision:** ⏳ PENDING

#### 2. No Way to Verify Events Are Firing
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Row 2; Section 10 - Open Questions #3, #7
- **Issue:** Multiple places flag this concern: "Admin can't verify events firing" (🟡 Medium), "Is there a test event flow in the UI? Test Event Code field exists but no 'send test' button", and "How are events verified working? Admin must manually check FB Events Manager". This creates a poor admin experience and debugging difficulty.
- **Suggested Fix:** Add a "Send Test Event" button next to the Test Event Code field that fires a test event and shows confirmation (or error) inline.
- **Human Decision:** ⏳ PENDING

#### 3. Silent CAPI Failures with No Monitoring
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Row 5; Section 4 - Error States, "CAPI request failed"
- **Issue:** Document flags "Silent CAPI failures - Events may not fire without notice" (🟡 Medium) and Error States shows "CAPI request failed" results in "Nothing (server-side)". The platform has no visibility into whether events are successfully reaching Facebook, meaning retargeting campaigns could be ineffective without anyone knowing.
- **Suggested Fix:** Add error monitoring/alerting for CAPI failures. Consider logging event success rates to a dashboard or Sentry.
- **Human Decision:** ⏳ PENDING

#### 4. No Retry Logic for Failed Events
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Row 6; Section 6 - Reliability
- **Issue:** Document explicitly flags "No retry logic - Failed events are lost" (🟡 Medium). Reliability section confirms "Events skip, no retries" for database unavailable scenario. This means transient network issues or Facebook API hiccups cause permanent loss of retargeting data.
- **Suggested Fix:** Implement a simple queue/retry mechanism for failed CAPI events, at minimum for transient failures (5xx errors, timeouts).
- **Human Decision:** ⏳ PENDING

#### 5. Cache Delay After Settings Change
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases, Row #15; Section 7 - Identified Issues, Row 3; Section 10 - Open Questions #5, #6
- **Issue:** Multiple flags: Edge Case #15 shows "Old settings used (up to 5min)" (⚠️), Identified Issues flags "Cache delay after changes" (🟢 Low), and Open Questions ask "Should cache be invalidated on save?" and "Is `clearRetargetingCaches()` exposed anywhere? Function exists but not used in UI." Admin makes changes but they don't take effect for 5 minutes.
- **Suggested Fix:** Add cache clear endpoint callable on settings save, or expose clearRetargetingCaches() via API and call it when saving pixel settings.
- **Human Decision:** ⏳ PENDING

#### 6. Potential Rate Limiting at Scale
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #14; Section 4 - Error States, "Rate limiting"; Section 10 - Open Questions #4
- **Issue:** Edge Case #14 shows "Very high traffic org - Events fire serially" (⚠️), Error States shows rate limiting causes "Some events dropped", and Open Question asks "What happens at scale? Facebook rate limits could affect high-volume orgs". No mitigation or monitoring for rate limits exists.
- **Suggested Fix:** Document Facebook rate limits, add monitoring for 429 responses, consider batching events for high-traffic orgs.
- **Human Decision:** ⏳ PENDING

#### 7. No Pagination for Organizations Table
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 6 - Performance, Row 4; Section 7 - Identified Issues, Row 4
- **Issue:** Performance section shows "Large org list rendering - All orgs loaded at once" (⚠️) and Identified Issues flags "No pagination for orgs - Could slow on 1000+ orgs" (🟢 Low). As the platform grows, this page will become slow and unusable.
- **Suggested Fix:** Implement server-side pagination with page size of ~50 orgs, add loading states for table.
- **Human Decision:** ⏳ PENDING

#### 8. Missing Call Site Documentation
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1, #2
- **Issue:** Open Questions explicitly ask: "Where exactly is `trackWidgetView` called? - Need to trace call site in widget/server code" and "Where exactly is `trackCallStarted` called? - Need to trace call site in signaling handlers". The documentation describes these functions but doesn't document where they're actually invoked, making it hard to understand the full event flow.
- **Suggested Fix:** Trace and document the exact call sites - likely in widget lifecycle handlers and call signaling handlers. Add references in Section 9 (Related Features).
- **Human Decision:** ⏳ PENDING

#### 9. Keyboard Navigation Not Verified
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section notes "Keyboard navigation: ⚠️ Not verified (toggle buttons may need focus states)". Toggle buttons are critical UI elements in this feature; if they're not keyboard accessible, platform admins using keyboard navigation cannot enable/disable org retargeting.
- **Suggested Fix:** Test and verify keyboard navigation works for all toggles, add visible focus states if missing.
- **Human Decision:** ⏳ PENDING

#### 10. Feedback for Event Firing is Invisible
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - First Principles Review #3, #5
- **Issue:** First Principles Review flags: "Is feedback immediate? ⚠️ Partial - Save shows success, but event firing is invisible" and "Are errors recoverable? ⚠️ Partial - Save errors shown, but CAPI errors silent". Admins have no visibility into whether their configuration is actually working.
- **Suggested Fix:** Consider adding a "Recent Events" mini-dashboard or status indicator showing last successful event timestamp.
- **Human Decision:** ⏳ PENDING

#### 11. Server-Side Data Fetch Could Be Optimized
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Performance, Row 3
- **Issue:** Performance section shows "Server-side data fetch - Parallel queries for orgs, calls, pageviews" (⚠️ Could be optimized). While queries run in parallel, there may be opportunity for query optimization or caching at the page level.
- **Suggested Fix:** Profile queries to identify bottlenecks; consider denormalizing pageview/call counts or caching aggregated data.
- **Human Decision:** ⏳ PENDING

#### 12. Event Volume Monitoring Not Available
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #8
- **Issue:** Open Question asks "Should there be event volume monitoring? - No visibility into event success rates." The platform has no internal view of how many events are being sent, success rates, or trends - all must be checked in Facebook Events Manager.
- **Suggested Fix:** Add basic event counters/logging that can be viewed in platform dashboard (even if FB Events Manager remains the source of truth for detailed analytics).
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 1
- **Medium:** 5
- **Low:** 6

---

## SA-cancellations-dashboard - Cancellations Dashboard

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/superadmin/cancellations-dashboard.md`
**Review Agent:** `docs/prompts/active/review-agent-superadmin-cancellations-dashboard.md`

### Findings

#### 1. Churn Rate Uses ALL Cancellations Instead of Filtered
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Section 10 - Open Questions #1
- **Issue:** Documentation explicitly identifies: "Churn rate uses ALL cancellations | Not filtered by date | 🟡 Medium | Should use filtered count for consistency". Open Question #1 also asks: "Should the churn rate use filtered cancellations? Currently uses ALL cancellations divided by total orgs, even when date filter is applied. This could be confusing." This creates misleading metrics - if admin filters to last 7 days, they expect churn rate to reflect that period, not all-time.
- **Suggested Fix:** Calculate churn rate using `filteredCancellations.length / totalOrganizations * 100` to maintain consistency with the selected date range. Alternatively, clearly label the metric as "All-Time Churn Rate" vs "Period Churn Rate".
- **Human Decision:** ⏳ PENDING

#### 2. No Pagination on List View for High Volume
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #5, Section 7 - Identified Issues, Section 10 - Open Questions #3
- **Issue:** Documentation flags three times: Edge case #5 shows "Very high cancellation volume | Many cancellations | All rendered in list view | ⚠️ | No pagination implemented". Identified Issues lists "No pagination on list view | Slow with many cancellations | 🟡 Medium". Open Question #3 asks: "Should there be pagination?" With hundreds or thousands of cancellations, the list view will become unresponsive.
- **Suggested Fix:** Implement virtual scrolling (e.g., react-window or Tanstack Virtual) or server-side pagination with cursor-based navigation. Consider 50-100 items per page default.
- **Human Decision:** ⏳ PENDING

#### 3. Keyboard Navigation Not Accessible
- **Category:** UX Concern
- **Severity:** High
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states: "Keyboard navigation: ⚠️ Tab buttons are not keyboard-focusable". This means users who rely on keyboard navigation (including screen reader users and those with motor impairments) cannot switch between the four view modes (Overview, Responses, Cohorts, All Cancellations). This is an accessibility compliance issue.
- **Suggested Fix:** Use proper `<button>` elements or add `tabIndex={0}` and `onKeyDown` handlers to the tab controls. Consider using a headless UI library like Radix Tabs for full accessibility.
- **Human Decision:** ⏳ PENDING

#### 4. Screen Reader Support Missing
- **Category:** UX Concern
- **Severity:** High
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states: "Screen reader support: ⚠️ No ARIA labels on interactive elements". The dashboard has many interactive elements (tabs, date picker, clickable rows, modal) without proper ARIA attributes. Screen reader users cannot understand the current state or navigate effectively.
- **Suggested Fix:** Add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` to tabs. Add `aria-label` to date picker. Add `role="row"` and descriptive labels to clickable cancellation rows. Ensure modal has `role="dialog"` and `aria-modal="true"`.
- **Human Decision:** ⏳ PENDING

#### 5. No Loading State or Skeleton UI
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility, Section 7 - Identified Issues
- **Issue:** Accessibility section notes "Loading states: ⚠️ No loading skeleton during SSR fetch". Identified Issues lists "No loading state | Flash of empty content | 🟢 Low | Add skeleton UI". Users may see a blank screen or flash of empty content while server-side data is being fetched.
- **Suggested Fix:** Add loading skeleton components that match the layout of stats row, reason chart, and list view. Use React Suspense boundaries if applicable.
- **Human Decision:** ⏳ PENDING

#### 6. No User-Facing Error UI
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Reliability
- **Issue:** Error States table shows "Database fetch error | Supabase unavailable | Console error, empty data | Page refresh". Users see empty data with no indication that an error occurred or how to recover. Recovery path is just "Page refresh" which the user must discover on their own.
- **Suggested Fix:** Implement error boundary with user-friendly message: "Unable to load cancellation data. Please try refreshing the page or contact support if the issue persists." Include a "Retry" button.
- **Human Decision:** ⏳ PENDING

#### 7. No Retry Mechanism for Failed Loads
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - First Principles Review, Question 5
- **Issue:** First Principles Review asks "Are errors recoverable?" with answer "⚠️ Partial - No retry mechanism for failed loads". If the initial data fetch fails, users cannot retry without manually refreshing the page. This is suboptimal UX for a dashboard that may experience transient network issues.
- **Suggested Fix:** Add a "Retry" button when data fetch fails. Consider implementing automatic retry with exponential backoff (e.g., retry 3 times with 1s, 2s, 4s delays).
- **Human Decision:** ⏳ PENDING

#### 8. Cohort Analysis Missing Denominator for True Churn Rate
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5
- **Issue:** Documentation asks: "Should cohort analysis include total signups per cohort? Currently only shows churned count, not the denominator for calculating true cohort churn rate." Without knowing how many organizations signed up in each cohort month, the absolute churn numbers are misleading - 10 churns from 100 signups (10%) is very different from 10 churns from 1000 signups (1%).
- **Suggested Fix:** Query total signups per month from organizations table (`GROUP BY DATE_TRUNC('month', created_at)`). Display both "X churned / Y total" and calculate percentage. Add visual indicator for cohort health (e.g., green <5%, yellow 5-10%, red >10%).
- **Human Decision:** ⏳ PENDING

#### 9. Route Protection Verification Not Confirmed
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Security
- **Issue:** Security section shows "Platform admin only | Route protection via middleware (presumed)". The word "presumed" indicates this security control has not been verified. If the middleware protection is missing or misconfigured, non-platform admins could access sensitive cancellation data across all organizations.
- **Suggested Fix:** Verify middleware protection exists and is correctly configured. Update documentation to confirm: "Route protection via middleware - verified in [file:line]". Add to test suite if not already tested.
- **Human Decision:** ⏳ PENDING

#### 10. Involuntary vs Voluntary Cancellations Not Distinguished
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #6
- **Issue:** Documentation asks: "Is there a need to track involuntary cancellations separately? Payment failure cancellations vs voluntary cancellations may need different analysis." Currently, a customer who churned due to failed payment (often recoverable) is mixed with customers who actively chose to leave. This conflates two different problems requiring different solutions (dunning vs product improvement).
- **Suggested Fix:** Add a `cancellation_type` field to `cancellation_feedback` table: `voluntary` (user-initiated) vs `involuntary` (payment failure). Add filter in UI to view each type separately. Display breakdown in stats row.
- **Human Decision:** ⏳ PENDING

#### 11. Four Separate DB Queries on Page Load
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 6 - Performance, Section 7 - Identified Issues
- **Issue:** Performance section shows "Multiple DB queries | 4 separate queries on page load | ⚠️ Could be combined". Identified Issues lists "Four separate DB queries | Slower page load | 🟢 Low | Combine into single query with joins". Each round-trip adds latency, especially under load.
- **Suggested Fix:** Combine into single query using JOINs: `SELECT cf.*, o.name as org_name, o.plan, o.created_at as org_created_at, u.email, u.full_name FROM cancellation_feedback cf LEFT JOIN organizations o ON cf.org_id = o.id LEFT JOIN users u ON cf.user_id = u.id ORDER BY cf.created_at DESC`.
- **Human Decision:** ⏳ PENDING

#### 12. No Export Functionality for External Analysis
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, Section 10 - Open Questions #2
- **Issue:** Identified Issues lists "No export functionality | Can't analyze data externally | 🟢 Low | Add CSV export button". Open Question #2 asks: "Is there a need for data export? Platform admins may want to export cancellation data to CSV for external analysis or reporting." Platform admins often need to share churn analysis with executives or analyze in external tools.
- **Suggested Fix:** Add "Export CSV" button that exports filtered cancellations with all fields. Consider also adding PDF report export for executive summaries.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 2
- **Medium:** 5
- **Low:** 5

---

## SA-feedback-dashboard - Feedback Dashboard

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/superadmin/feedback-dashboard.md`
**Review Agent:** `docs/prompts/active/review-agent-superadmin-feedback-dashboard.md`

### Findings

#### 1. Modal Not Keyboard-Trapped - Accessibility Violation
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation explicitly flags: "Keyboard navigation: ⚠️ Tab navigation works, but modal not keyboard-trapped". When a detail modal is open, users can tab outside the modal to elements behind it, which violates WCAG 2.1 modal accessibility guidelines. This is particularly problematic for screen reader users who may lose context of where they are in the page.
- **Suggested Fix:** Implement focus trapping in the detail and survey modals using a focus-trap library or custom implementation. Ensure focus returns to the triggering element when modal closes.
- **Human Decision:** ⏳ PENDING

#### 2. Missing ARIA Labels for Screen Readers
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes: "Screen reader support: ⚠️ Limited - missing ARIA labels". Interactive elements like tabs, status badges, priority indicators, and the search input lack proper ARIA labels. Screen reader users cannot understand the purpose or current state of these elements.
- **Suggested Fix:** Add `aria-label` to tabs (e.g., "Bug Reports tab, 15 items"), `aria-current="true"` to active tab, `role="status"` to badge elements, and `aria-describedby` to connect filters with result counts.
- **Human Decision:** ⏳ PENDING

#### 3. No Loading Indicator During Initial Data Fetch
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility and Section 7 - First Principles Review
- **Issue:** Documentation identifies: "Loading states: ⚠️ No loading indicator during data fetch" and "Is feedback immediate? ⚠️ Mostly - No loading spinner during initial fetch". Users see nothing while server fetches all feedback items, which could take seconds with high volume. This creates uncertainty about whether the page is working.
- **Suggested Fix:** Add a skeleton loading state or spinner during the initial server-side data fetch. Consider using Next.js loading.tsx convention for consistent loading UX.
- **Human Decision:** ⏳ PENDING

#### 4. No Pagination - Performance Degrades with Volume
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 4 - Edge Cases row 16 and Section 6 - Performance
- **Issue:** Documentation explicitly flags multiple times: "High volume (many items) | Scroll list | All items rendered | ⚠️ No virtualization" and "All feedback fetched at once | No pagination | ⚠️ Could be slow with many items". As the platform grows, fetching all feedback items on every page load will cause increasing latency and memory pressure. This is marked as a medium issue in Identified Issues but given the cumulative nature, severity should be higher.
- **Suggested Fix:** Implement server-side pagination with limit/offset. Add "Load more" or infinite scroll pattern. For immediate mitigation, add list virtualization (e.g., react-virtual) for client-side rendering.
- **Human Decision:** ⏳ PENDING

#### 5. Admin Response Fields Exist But UI Doesn't Support Responding
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Documentation asks: "Should platform admins be able to respond to feedback? Database has `admin_response`, `admin_responded_at`, `admin_responded_by` fields but UI doesn't use them." The database schema was designed for admin responses, but this capability was never implemented in the UI. Users submitting feedback never receive acknowledgment from admins.
- **Suggested Fix:** Either implement response functionality (add text input + save in detail modal) or document that responses happen through external channels. If never planned, consider deprecating unused database columns.
- **Human Decision:** ⏳ PENDING

#### 6. No Content Moderation for Offensive Feedback
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases row 17 and Section 10 - Open Questions #3
- **Issue:** Documentation explicitly identifies: "Offensive content | View item | Content shown as-is | ⚠️ No content moderation" and asks "Is there any content moderation needed?" Feedback text, including potentially offensive or inappropriate content, is displayed without filtering. While platform admins can handle such content, there's no mechanism to flag, hide, or filter it.
- **Suggested Fix:** Add a "flag as inappropriate" action that hides content behind a warning. Consider basic profanity filter option. At minimum, add visual warning for flagged content.
- **Human Decision:** ⏳ PENDING

#### 7. No Aggregate PMF Score Calculation
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues and Section 10 - Open Questions #1
- **Issue:** Documentation notes: "No PMF analytics | No aggregate scores | 🟡 Medium" and asks "Should there be aggregate PMF metrics?". The PMF (Product-Market Fit) score is a standard calculation: (% "very disappointed" responses). Individual responses are shown but the key metric is never calculated. This defeats the purpose of collecting PMF survey data.
- **Suggested Fix:** Add a summary card at the top of PMF Surveys tab showing: total responses, PMF score (% very disappointed), and trend over time. Consider adding a simple chart showing distribution of disappointment levels.
- **Human Decision:** ⏳ PENDING

#### 8. No Data Export Functionality
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Documentation identifies: "No export | Can't extract data | 🟢 Low". Platform admins cannot export feedback data for external analysis, reporting, or sharing with stakeholders. All analysis must be done within the dashboard interface.
- **Suggested Fix:** Add CSV export button for each tab (bugs, features, PMF surveys). Include all visible columns plus full description text. Consider date range filter applying to export.
- **Human Decision:** ⏳ PENDING

#### 9. No Real-Time Updates - Stale Data Displayed
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues and Section 10 - Open Questions #4
- **Issue:** Documentation notes: "No real-time updates | Stale data possible | 🟢 Low". Feedback is fetched once on page load. If a user submits new feedback while an admin has the dashboard open, the admin won't see it until they refresh. For a monitoring dashboard, this could mean missing time-sensitive bug reports.
- **Suggested Fix:** Add polling interval (e.g., every 30-60 seconds) to refresh data. Alternatively, show "New feedback available" banner when new items detected, with refresh button. WebSocket overkill for this use case.
- **Human Decision:** ⏳ PENDING

#### 10. Feedback Notifications Table Not Used
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #7
- **Issue:** Documentation asks: "Should there be notification alerts for critical bugs? Database has `feedback_notifications` table but not used in this dashboard." The database schema includes infrastructure for feedback notifications, but this feature was never connected to the dashboard. Critical bugs may go unnoticed until an admin manually checks.
- **Suggested Fix:** Document whether the notifications table is intended for this dashboard or another feature. If intended here, add alert configuration for critical priority bugs (email or in-app notification).
- **Human Decision:** ⏳ PENDING

#### 11. Invalid Date Range Shows Empty Instead of Error
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Error States
- **Issue:** Documentation states: "Invalid date range | to < from | Still renders but empty results | Correct the date range". When a user selects a "to" date before the "from" date, the system silently shows no results instead of alerting the user to the invalid selection. This could cause confusion as users may think there's genuinely no data.
- **Suggested Fix:** Add validation in DateRangePicker that prevents selecting an end date before start date, or show an inline error message explaining the issue.
- **Human Decision:** ⏳ PENDING

#### 12. Dismissed PMF Surveys Completely Hidden - No Audit Trail
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Edge Cases row 13 and Section 10 - Open Questions #8
- **Issue:** Documentation shows: "PMF survey dismissed=true | Page load | Excluded from results | ✅" but then asks "How should dismissed PMF surveys be handled? Currently excluded from view - should they be visible with a 'dismissed' flag?" Dismissed surveys are filtered server-side with no option to view them. If surveys can be dismissed, there's no way for admins to audit or review what was dismissed.
- **Suggested Fix:** Add a toggle or filter to "Show dismissed surveys". Display dismissed surveys with a visual indicator (strikethrough or badge). Consider adding dismissal reason and who dismissed.
- **Human Decision:** ⏳ PENDING

#### 13. No Error Recovery Mechanism
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 7 - First Principles Review
- **Issue:** Documentation notes: "Are errors recoverable? ⚠️ Partial - No retry mechanism, page refresh needed". When the Supabase fetch fails, errors are logged but users see an empty list with no indication of failure or way to retry without a full page refresh.
- **Suggested Fix:** Add error boundary that catches fetch failures and displays an error state with a "Retry" button. This provides better UX than silent failure or forcing browser refresh.
- **Human Decision:** ⏳ PENDING

#### 14. Route Auth Assumed - Not Verified
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Security
- **Issue:** Documentation states: "Platform admin only access | Route under /platform/ (assumed auth)". The security model relies on the assumption that `/platform/` routes are protected, but this isn't verified or documented. If the middleware or auth check is misconfigured, sensitive feedback data from all organizations could be exposed to non-platform-admins.
- **Suggested Fix:** Explicitly document the auth mechanism (middleware route matching, role check, etc.). Add a comment in the page component referencing the auth requirement. Consider adding explicit role check in the server component as defense-in-depth.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 14
- **Critical:** 0
- **High:** 1
- **Medium:** 6
- **Low:** 7

---

## SA-funnel-analytics - Funnel Analytics

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/superadmin/funnel-analytics.md`
**Review Agent:** `docs/prompts/active/review-agent-superadmin-funnel-analytics.md`

### Findings

#### 1. Landing Page Tracking Not Implemented
- **Category:** Missing Scenario
- **Severity:** High
- **Location:** Section 10 - Open Questions #7; Section 2 - Funnel Stages
- **Issue:** Open Question 7 explicitly states: "Should the landing page tracker be added? Currently no `landing` events visible in tracked pages." The funnel diagram shows LANDING PAGE as the first step, but the Code References section shows no landing page tracking implementation. This means the funnel cannot show true landing→signup conversion rates or landing page drop-off.
- **Suggested Fix:** Implement landing page tracking on the marketing site to capture the true top-of-funnel metrics and calculate accurate drop-off between landing and signup.
- **Human Decision:** ⏳ PENDING

#### 2. Platform Admin Route Protection Only "Assumed"
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 6 - Technical Concerns > Security
- **Issue:** The security section states "Platform admin only (route protection assumed)" without verification. This is a critical analytics dashboard containing sensitive conversion and revenue data. Route protection should be explicitly verified, not assumed.
- **Suggested Fix:** Verify and document the exact route protection mechanism (middleware, component check, RLS policy) that restricts `/platform/funnel` to platform admins only.
- **Human Decision:** ⏳ PENDING

#### 3. No Cross-Device User Linking
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #6; Section 7 - Identified Issues
- **Issue:** Documentation explicitly notes: "Same user on phone then desktop" results in "Different visitor_ids, counted as separate users" with a ⚠️ warning flag. Open Question 1 asks: "Should visitor_id be linked to user_id after signup?" This means users who start signup on mobile and complete on desktop are counted as two separate funnels.
- **Suggested Fix:** After signup_complete, update previous funnel_events for that visitor_id to associate with the new user_id, enabling cross-session attribution.
- **Human Decision:** ⏳ PENDING

#### 4. Direct URL Access Creates Data Gaps
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #4
- **Issue:** When users access funnel pages directly via URL (bookmarks, links, returning users), documentation notes: "Missing intermediate events, funnel shows gaps" with a ⚠️ flag marked "Data accuracy affected". This undermines funnel accuracy as conversion rates become misleading.
- **Suggested Fix:** Consider back-filling missing pageview events when a conversion event occurs, or add visual indicators in the dashboard when data gaps are detected.
- **Human Decision:** ⏳ PENDING

#### 5. Incognito Mode Over-Counts Unique Visitors
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #7
- **Issue:** Edge case explicitly notes that users in incognito/private mode get "New visitor_id each session" with ⚠️ flag and "Over-counts unique visitors" impact. This inflates unique visitor counts and deflates conversion rates.
- **Suggested Fix:** Document this limitation prominently in the dashboard or consider fingerprinting alternatives that work in incognito mode while respecting privacy.
- **Human Decision:** ⏳ PENDING

#### 6. No Pagination for Event Data at Scale
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Technical Concerns > Performance; Section 10 - Open Questions #2
- **Issue:** Performance section notes "Full table scan" with ⚠️ flag: "No pagination, fetches all events. May need pagination at scale." Open Question 2 explicitly asks: "Is pagination needed for funnel_events at scale?" As the product grows, this will cause dashboard loading issues.
- **Suggested Fix:** Implement server-side pagination or aggregation for funnel_events, with pre-computed daily/weekly rollups for historical data.
- **Human Decision:** ⏳ PENDING

#### 7. Accessibility Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review > Accessibility
- **Issue:** Documentation explicitly flags: "Keyboard navigation: ⚠️ Not verified (date picker may need testing)" and "Screen reader support: ⚠️ Tables have headers but may need ARIA labels". For a platform admin tool, accessibility should be verified.
- **Suggested Fix:** Conduct accessibility audit on the funnel dashboard, particularly the date picker component and data tables. Add ARIA labels where needed.
- **Human Decision:** ⏳ PENDING

#### 8. Duplicate Events From Rapid Clicks
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #11; Section 7 - Identified Issues
- **Issue:** Edge case notes that double-clicks on "Continue" buttons result in "Duplicate events in DB" with ⚠️ flag "No client-side debounce". Identified Issues section confirms: "Potential duplicate events - No client-side debounce" with severity Low.
- **Suggested Fix:** Add 1-second debounce on trackFunnelEvent() calls or server-side deduplication based on visitor_id + step + timestamp window.
- **Human Decision:** ⏳ PENDING

#### 9. UTM Attribution Data Collected But Not Displayed
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #3
- **Issue:** The Identified Issues section notes: "No attribution tracking - UTM params stored but not displayed" and Open Question 3 asks: "Should UTM attribution be displayed in the dashboard? Data is collected but not shown." UTM parameters are being tracked and stored but provide no value without a UI.
- **Suggested Fix:** Add a UTM attribution breakdown view to the dashboard showing conversion by source/medium/campaign.
- **Human Decision:** ⏳ PENDING

#### 10. No Data Retention Policy Defined
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 10 - Open Questions #6
- **Issue:** Open Question 6 explicitly asks: "How far back should historical data be retained? No data retention policy defined." Without a policy, the funnel_events table will grow indefinitely, impacting query performance and storage costs.
- **Suggested Fix:** Define data retention policy (e.g., 24 months rolling) and implement automated archival/deletion for aged funnel events.
- **Human Decision:** ⏳ PENDING

#### 11. No Time-to-Conversion Metrics
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #5; Section 7 - Identified Issues; Section 10 - Open Questions #4
- **Issue:** Multiple sections flag this: Edge Case #5 notes "Same visitor_id links events, time not tracked", Identified Issues includes "No time-to-conversion metric - Can't see how long users take between steps", and Open Question 4 asks "Should time-to-conversion metrics be added?"
- **Suggested Fix:** Add timestamp delta calculations between funnel steps and display average/median time-to-conversion in the dashboard.
- **Human Decision:** ⏳ PENDING

#### 12. Silent Tracking Failures Invisible to Admins
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #12; Section 4 - Error States
- **Issue:** When tracking fails due to network or API errors, the system uses "fire-and-forget" pattern with "Silent failure, console.error logged". While this correctly doesn't block users, platform admins have no visibility into tracking failure rates which could silently corrupt funnel data.
- **Suggested Fix:** Add a tracking health metric or error rate indicator to the funnel dashboard, or log failures to a monitoring system.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 2
- **Medium:** 5
- **Low:** 5

---

## SA-organizations-manager - Organizations Manager

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/superadmin/organizations-manager.md`
**Review Agent:** `docs/prompts/active/review-agent-superadmin-organizations-manager.md`

### Findings

#### 1. Platform Admin Route Protection Unclear
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 10 - Open Questions #1; Section 6 - Security
- **Issue:** Open question explicitly asks "Is there route protection for platform admins?" The documentation notes "Page appears to be under `/platform/` route but access control not visible in code." Security section only mentions "Platform admin route protection (assumed)" without verification. This is a potential security gap - if route protection is missing, any authenticated user could access organization data.
- **Suggested Fix:** Verify and document the middleware/auth guard that restricts `/platform/*` routes to platform admins only. If missing, implement it immediately.
- **Human Decision:** ⏳ PENDING

#### 2. No Pagination for Large Organization Lists
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #9; Section 6 - Performance; Section 7 - Identified Issues
- **Issue:** Multiple sections flag this: Edge Case #9 notes "All orgs fetched server-side ⚠️ No pagination visible"; Section 6 Performance shows "All fetched at once ⚠️ No pagination"; Section 7 explicitly lists "No pagination | Performance issues at scale | 🟡 Medium". As the platform grows, loading all organizations in a single query will degrade performance significantly.
- **Suggested Fix:** Implement server-side pagination with cursor-based navigation, or add virtual scrolling for client-side performance at scale.
- **Human Decision:** ⏳ PENDING

#### 3. Coverage Rate Division by Zero Edge Case
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 2 - Data Aggregation Flow; Section 4 - Edge Cases #4
- **Issue:** Coverage Rate formula is defined as `pageviews_with_agent / total_pageviews`. Edge Case #4 states "Org with no pageviews | Inactive widget | Coverage = 100% (not a problem) | ✅". However, if total_pageviews = 0, this is mathematically a division by zero. Setting this to 100% may mask real issues where the widget isn't even loading or is misconfigured - showing 100% coverage when there's actually no coverage to measure is potentially misleading.
- **Suggested Fix:** Display "N/A" or "No data" for coverage when total_pageviews = 0, rather than implying 100% coverage. This provides clearer feedback to super admins about which orgs need investigation.
- **Human Decision:** ⏳ PENDING

#### 4. Activity Score Formula Inconsistency
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 3 - Health Score Calculation; Section 4 - Edge Cases #3
- **Issue:** Section 3 states Activity Score logic as "100 if ≤1 day, down to 10 if >30 days". However, Edge Case #3 states "Org with no calls ever | New org | Activity score = 20". If an org has never had a call, days_since_last_call would be infinite/undefined, which according to the formula should result in score of 10 (not 20). This is a documentation inconsistency.
- **Suggested Fix:** Clarify the Activity Score calculation for orgs with no calls ever. Document: "For organizations with no call history, Activity Score defaults to 20" if that's the intended behavior.
- **Human Decision:** ⏳ PENDING

#### 5. Keyboard Navigation Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation explicitly states "Keyboard navigation: ⚠️ Not verified (interactive elements may need focus states)". The organizations table has multiple interactive elements (sort headers, filter dropdowns, tabs, cards) that should be keyboard-accessible for accessibility compliance.
- **Suggested Fix:** Conduct keyboard accessibility audit and ensure all interactive elements have proper focus states, tab order, and keyboard activation.
- **Human Decision:** ⏳ PENDING

#### 6. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Screen reader support: ⚠️ Not verified". Given the data-dense nature of this dashboard (health scores, risk levels, trends with visual indicators), screen reader users may have difficulty understanding the content without proper ARIA labels and announcements.
- **Suggested Fix:** Add ARIA labels to visual indicators (shields, trend arrows, color-coded badges). Ensure table headers are properly associated with data cells. Test with screen readers.
- **Human Decision:** ⏳ PENDING

#### 7. No Loading State for Server-Rendered Page
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility; Section 7 - Identified Issues
- **Issue:** Documentation notes "Loading states: ⚠️ No explicit loading state visible (server-rendered)" and Section 7 lists "No explicit loading state | User unsure if loading | 🟢 Low". While server-side rendering handles initial load, the page may appear frozen during data fetching, especially with many organizations.
- **Suggested Fix:** Add loading skeleton or spinner for the data table while server component fetches organization data.
- **Human Decision:** ⏳ PENDING

#### 8. Organization Rows Not Clickable
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #6
- **Issue:** Section 7 lists "No click-through to org | Can't access org details | 🟡 Medium" and Open Question #6 asks "Should clicking an org row navigate to org details? Currently rows are not clickable." Super admins viewing the dashboard have no way to drill down into a specific organization for more details.
- **Suggested Fix:** Make organization rows clickable to navigate to a detailed view of that organization, or add an explicit "View Details" action button.
- **Human Decision:** ⏳ PENDING

#### 9. Database Errors Show Empty State Only
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #12; Section 4 - Error States; Section 7 - Identified Issues
- **Issue:** Edge Case #12 states "Database query failure | Network/DB issue | Error logged, empty data ⚠️ | No user-facing error message". Section 7 confirms "Database error not shown | User sees empty state only | 🟢 Low". Super admins seeing an empty list have no way to distinguish between "no organizations exist" and "database error occurred".
- **Suggested Fix:** Add error boundary or error toast to inform users when data fetch fails. Display a different UI state for errors vs. empty results.
- **Human Decision:** ⏳ PENDING

#### 10. Impersonation Feature Not Implemented
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #3
- **Issue:** Section 7 lists "No impersonation | Can't act as org user | 🟡 Medium" and Open Question #3 asks "Should super admins be able to impersonate users? Mentioned in requirements but not implemented." If impersonation is a requirement, it represents a missing feature.
- **Suggested Fix:** Clarify if impersonation is a required feature. If yes, implement secure impersonation with audit logging. If no, remove from requirements.
- **Human Decision:** ⏳ PENDING

#### 11. Activity Log Feature Not Visible
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 asks "Is there an activity log for org actions? Mentioned in requirements but not visible." If activity logging is required for audit trails or debugging, this is a missing feature that may have compliance implications.
- **Suggested Fix:** Clarify requirements for activity logging. If needed, implement audit log for super admin actions (viewed org, exported data, etc.).
- **Human Decision:** ⏳ PENDING

#### 12. At-Risk MRR Threshold Not Defined
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open Question #5 states "What is the threshold for 'at risk' MRR alerts? Currently shows any at-risk MRR, no threshold." Without a threshold, super admins may receive constant alerts even for minimal MRR at risk, reducing the signal-to-noise ratio for actionable insights.
- **Suggested Fix:** Define business threshold for at-risk MRR alerts (e.g., only highlight when at-risk MRR > $1000 or > 5% of total MRR).
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 1
- **Medium:** 5
- **Low:** 6

---

## D-pool-management - Pool Management

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/pool-management.md`
**Review Agent:** review-agent-admin-pool-management.md

### Findings

#### 1. No Delete Confirmation for Pools
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 - Edge Cases #5; Section 5 - UI/UX Review Step 6; Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Multiple sections document that pools are deleted immediately without confirmation. Edge Case #5 states "Pool removed immediately (no confirmation)" with ⚠️ warning. Section 7 lists "No delete confirmation | Accidental deletion possible | 🟡 Medium". Open Question #1 explicitly asks "Should there be a delete confirmation?" This creates significant risk of accidental data loss, especially since deletion cascades to all pool members and routing rules.
- **Suggested Fix:** Add confirmation modal before pool deletion. Modal should clearly state what will be deleted (pool name, X routing rules, X agent assignments).
- **Human Decision:** ⏳ PENDING

#### 2. Cannot Edit or Rename Pool Names
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #11; Section 5 - UI/UX Review Step 11; Section 7 - Identified Issues; Section 10 - Open Questions #2
- **Issue:** Documentation confirms pool names cannot be edited after creation. Edge Case #11 states "Cannot edit pool name after creation" with ⚠️ warning. Section 5 shows "Admin tries to edit pool name | No option available | ❌ Feature missing". Section 7 lists "No pool rename/edit | Admin must delete and recreate to rename | 🟡 Medium". Open Question #2 asks if this is intentional or an oversight. This forces admins to delete and recreate pools to fix typos or update naming conventions.
- **Suggested Fix:** Add inline edit capability for pool name. Double-click or edit icon on pool name to enable editing.
- **Human Decision:** ⏳ PENDING

#### 3. Silent Failures for Database and Server Operations
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 - Error States; Section 7 - Identified Issues
- **Issue:** Error States table documents multiple silent failure modes: "Database save fails | Network error on any save | Error in console (silent fail)", "Server sync fails | Signaling server unreachable | Console warning only", "RLS permission denied | Non-admin tries to modify | Operation fails silently". Section 7 confirms "Silent failures | Admin may not know save failed | 🟡 Medium". Admins have no feedback when critical operations fail.
- **Suggested Fix:** Implement toast notifications for all save/delete operations. Show success confirmation and error messages with retry options.
- **Human Decision:** ⏳ PENDING

#### 4. Empty Pool Falls Back to Any Available Agent
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #9; Section 7 - Identified Issues; Section 10 - Open Questions #3
- **Issue:** Edge Case #9 states "Pool with no agents | Visitor routed to empty pool | Falls back to ANY available agent ⚠️ | May get agent from different pool". Section 7 lists "Empty pool fallback | Visitors may get wrong agent | 🟡 Medium". Open Question #3 asks if there should be "strict pool routing" option. This behavior may violate routing intent - a visitor matched to "Enterprise Support" pool could be routed to a Sales agent if Enterprise pool is empty.
- **Suggested Fix:** Add pool-level setting for "strict routing" mode. When enabled, show "no agents available" instead of falling back to random agent.
- **Human Decision:** ⏳ PENDING

#### 5. Pools Cannot Be Reordered
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #4
- **Issue:** Section 7 lists "Cannot sort/reorder pools | Pools shown in creation order | 🟢 Low". Open Question #4 asks "Should pool order be customizable? Pools are currently shown with catch-all first, then by creation date." Admins cannot organize pools in a logical order (e.g., by importance or usage frequency).
- **Suggested Fix:** Add drag-and-drop reordering for pools, or alphabetical sort option.
- **Human Decision:** ⏳ PENDING

#### 6. No Pool Statistics Displayed
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open Question #5 states "Should there be pool statistics? The UI shows agent count and rule count, but not visitor/call counts per pool." Admins cannot see how many visitors or calls are routed to each pool, making it difficult to assess pool effectiveness or optimize routing.
- **Suggested Fix:** Add pool statistics showing visitors routed, calls completed, and average wait time per pool over configurable time period.
- **Human Decision:** ⏳ PENDING

#### 7. Config Sync Could Be Batched for Performance
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Technical Concerns - Performance
- **Issue:** Performance table states "Config sync on every change | Debounced via useEffect | ⚠️ Could batch". Currently every individual change triggers a server sync. Rapid changes (e.g., adding multiple agents) could create unnecessary server load.
- **Suggested Fix:** Implement explicit "Save" action or batch multiple changes within a time window before syncing.
- **Human Decision:** ⏳ PENDING

#### 8. RLS Permission Denial Fails Silently
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 4 - Error States
- **Issue:** Error States table shows "RLS permission denied | Non-admin tries to modify | Operation fails silently". This is a security-adjacent concern - if a non-admin somehow accesses the pool management UI (via direct URL or race condition), they get no feedback that their actions are being blocked.
- **Suggested Fix:** Add explicit error handling that redirects non-admins away from the page with a clear access denied message.
- **Human Decision:** ⏳ PENDING

#### 9. No Undo for Pool Actions
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 7 - First Principles Review #4
- **Issue:** Section 7 asks "Is the flow reversible?" and answers "⚠️ Partial - Can delete pools but no undo. Cannot rename pools." Once a pool is deleted, there's no way to recover it. This is especially problematic given the lack of delete confirmation.
- **Suggested Fix:** Implement soft delete with "Undo" toast for 10-15 seconds after deletion, or add an "Archive" feature instead of hard delete.
- **Human Decision:** ⏳ PENDING

#### 10. Strict Pool Routing Option Missing
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 states "What should happen when all agents in a pool are offline? Currently falls back to any available agent. Should there be an option for 'strict pool routing' that shows 'no agents available' instead?" Some organizations may require visitors only be routed to specific pool agents for compliance, training, or specialization reasons.
- **Suggested Fix:** Add toggle per pool: "Strict routing - Only route to agents in this pool". When enabled, show appropriate message if no pool agents available.
- **Human Decision:** ⏳ PENDING

#### 11. Pool Description Not Visible in Collapsed View
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 1 - Purpose; Appendix - Database Schema
- **Issue:** Database schema shows pools have a `description TEXT` field and Section 1 mentions "Admin enters pool name and optional description". However, there's no mention in the UI/UX review of where or how descriptions are displayed. Admins may not see helpful context about pool purpose without expanding each pool.
- **Suggested Fix:** Show pool description (truncated) in collapsed pool header, or show on hover.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 2
- **Medium:** 5
- **Low:** 4

---

## D-dispositions - Dispositions

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/dispositions.md`
**Review Agent:** review-agent-admin-dispositions.md

### Findings

#### 1. Keyboard Navigation Not Fully Tested
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation explicitly flags "Keyboard navigation: ⚠️ DnD library supports keyboard, but not fully tested". Drag-and-drop reordering of dispositions may not be accessible to keyboard-only users, creating an accessibility barrier for admins with motor impairments.
- **Suggested Fix:** Test and document keyboard-based reordering flow. Ensure drag-and-drop library (dnd-kit) keyboard support works correctly. Add alternative controls (up/down buttons) if keyboard DnD proves problematic.
- **Human Decision:** ⏳ PENDING

#### 2. Color-Only Differentiation for Screen Readers
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Screen reader support: ⚠️ Color-only differentiation may be problematic". Dispositions are distinguished primarily by color, which is inaccessible to blind users and users with color blindness. The trophy icon (🏆) for primary helps, but other dispositions rely solely on color.
- **Suggested Fix:** Add text labels or unique icons per disposition that screen readers can announce. Ensure color is not the only distinguishing characteristic.
- **Human Decision:** ⏳ PENDING

#### 3. Cannot Edit Disposition After Agent Selection
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 7 - First Principles Review #4
- **Issue:** Section 7 lists "Can't edit disposition after selection | Agent might misclick | 🟡 Medium" and First Principles #4 flags "Is the flow reversible? ⚠️ Partially - Can't change disposition after saved". If an agent accidentally selects the wrong disposition, there's no way to correct it, leading to inaccurate call outcome data.
- **Suggested Fix:** Add edit option in call logs view for agents/admins to correct disposition assignments. Could require admin approval or time limit (e.g., editable within 24 hours).
- **Human Decision:** ⏳ PENDING

#### 4. Dispositions Are Org-Wide Instead of Pool-Specific
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #3
- **Issue:** Section 7 lists "Dispositions are org-wide | Can't customize per pool | 🟡 Medium" and Open Question #3 asks "Should dispositions be pool-specific? Currently org-wide. Different pools might have different outcome codes." Organizations with multiple products/services handled by different pools cannot have tailored disposition lists.
- **Suggested Fix:** Add optional pool_id column to dispositions table. Allow admins to assign dispositions to specific pools or keep as org-wide. Filter agent modal based on current call's pool.
- **Human Decision:** ⏳ PENDING

#### 5. Drag Reorder Uses Sequential Database Updates
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Performance; Section 3 - Data Flow (DRAG REORDER)
- **Issue:** Section 6 Performance notes "Drag reorder | Multiple sequential updates (not batched) | ⚠️ Could be optimized". Section 3 Data Flow shows "Loop through reordered items: → Supabase: UPDATE display_order for each". With many dispositions, reordering could be slow and prone to partial failure.
- **Suggested Fix:** Batch updates into single transaction or use a stored procedure to update all display_order values atomically.
- **Human Decision:** ⏳ PENDING

#### 6. Concurrent Edits Have No Optimistic Locking
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability
- **Issue:** Documentation states "Concurrent edits | Last-write-wins (no optimistic locking)". If two admins edit the same disposition simultaneously, one admin's changes will silently overwrite the other's without warning.
- **Suggested Fix:** Add optimistic locking using updated_at timestamp comparison. Notify admin if disposition was modified since they started editing.
- **Human Decision:** ⏳ PENDING

#### 7. Agent Browser Close Causes Data Loss
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #9
- **Issue:** Edge case #9 flags "Agent closes browser before selecting | Browser close | No disposition saved | ⚠️" with note "Data loss acceptable". While documented as acceptable, this could lead to incomplete analytics data if agents frequently close browsers before selecting dispositions.
- **Suggested Fix:** Consider auto-assigning "No Response" disposition after timeout, or prompting agents to select disposition before allowing browser close (onbeforeunload handler).
- **Human Decision:** ⏳ PENDING

#### 8. Agent Network Error Leaves Modal Stuck Open
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Error States
- **Issue:** Error States table shows "Network error (agent) | Update fails | Console error, modal stays open | Click again or skip". If agent has intermittent network issues, the modal may stay open with no clear indication of what went wrong (error only in console).
- **Suggested Fix:** Show user-visible error toast when disposition save fails. Add explicit retry button. Consider auto-retry with exponential backoff.
- **Human Decision:** ⏳ PENDING

#### 9. Disposition Selection Optional vs Required Undefined
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1
- **Issue:** Open Question #1 asks "Should disposition selection be required? Currently optional (Skip button). Some orgs may want to enforce selection." The system has no configuration to make disposition selection mandatory, which may result in incomplete data for organizations that need 100% call categorization.
- **Suggested Fix:** Add org/pool-level setting "Require disposition selection" that hides Skip button when enabled. Consider timeout auto-disposition if required but agent doesn't select.
- **Human Decision:** ⏳ PENDING

#### 10. Analytics Lost When Disposition Deleted
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #4; Section 4 - Edge Cases #8
- **Issue:** Open Question #4 asks "What happens to analytics when disposition is deleted? Currently disposition_id becomes NULL. Historical reporting loses that categorization." Edge case #8 confirms "Delete used disposition | Disposition deleted, call_logs.disposition_id → NULL". Deleting a disposition destroys historical categorization data, making trend analysis inaccurate.
- **Suggested Fix:** Implement soft delete (is_deleted flag) instead of hard delete. Keep deleted dispositions visible in historical reports but hidden from agent selection modal. Alternatively, warn admin about affected call count before deletion.
- **Human Decision:** ⏳ PENDING

#### 11. No Hard Limit on Number of Dispositions
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 10 - Open Questions #6
- **Issue:** Open Question #6 states "Is there a limit on number of dispositions? No hard limit. UX degrades with >10 options (scrolling required)." Agent modal with too many dispositions could slow down call wrap-up and increase cognitive load, reducing productivity.
- **Suggested Fix:** Add soft limit warning when admin creates more than 10 dispositions. Consider disposition categories/groups for organizations with many codes. Provide UX guidance in admin UI.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 0
- **Medium:** 6
- **Low:** 5

---

## D4 - Agent Management

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/agent-management.md`
**Review Agent:** docs/prompts/active/review-agent-admin-agent-management.md

### Findings

#### 1. Agent Removal Doesn't End Active Calls
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 - Edge Cases #10; Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Multiple sections flag this: Edge Case #10 marks "Remove agent in call" with ⚠️ warning noting "Call continues until natural end". Section 7 explicitly lists "Agent removal doesn't end active calls | Call continues after agent 'removed' | 🟡 Medium". Open Question #1 states "Should removing an agent terminate their active call? Currently soft delete doesn't emit any call:end event." This could lead to confusing state where a "removed" agent continues in an active call, and call logs may reference an agent that appears deleted.
- **Suggested Fix:** Emit call:end event during agent removal to gracefully terminate active calls, or explicitly document the business decision that calls should complete naturally.
- **Human Decision:** ⏳ PENDING

#### 2. Cannot Re-invite Previously Removed Users
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #21; Section 7 - Identified Issues; Section 10 - Open Questions #2
- **Issue:** Edge Case #21 marks "Re-invite removed user" with ⚠️ warning stating "Can't re-invite (by design)". Section 7 lists "Can't re-invite removed users | Users with inactive agent_profile can't be re-invited | 🟡 Medium". Open Question #2 asks about how to handle this. The current behavior returns "User already exists" error, preventing admins from bringing back former team members through the normal invite flow.
- **Suggested Fix:** Implement a reactivation flow for previously removed users, or add a "Reinvite" option that bypasses the user existence check for deactivated users.
- **Human Decision:** ⏳ PENDING

#### 3. Email Send Failure Is Silent
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #20; Section 7 - Identified Issues; Section 10 - Open Questions #3
- **Issue:** Edge Case #20 marks "Email send fails" with ⚠️ warning noting "Console warning only". Section 7 states "Email send failure silent | Invite created but invitee never notified | 🟡 Medium". Open Question #3 asks "Should email failures be more visible?" The invite is created, billing seat is consumed, but the invitee never receives the email. Admin has no indication of delivery failure.
- **Suggested Fix:** Add retry mechanism for email delivery, or display warning to admin if email send fails. Consider rollback of invite if email cannot be sent after retries.
- **Human Decision:** ⏳ PENDING

#### 4. Revoked Invite State Definition Inconsistency
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 2 - State Definitions
- **Issue:** In the State Definitions table, the "revoked" state says "How to Exit: N/A (record deleted)" - implying the invite record is deleted when revoked. However, the state machine diagram shows "Revoked" as a terminal state alongside "Accepted" and "Expired". This is contradictory: if the record is deleted, it's not in a "revoked" state - it simply doesn't exist. The Revoke invite trigger in Section 3 confirms "Deletes invite, credits seat" but lists it as going to a "revoked" state.
- **Suggested Fix:** Clarify whether revoked invites are soft-deleted (status changed to 'revoked') or hard-deleted (record removed). Update state machine and definitions to be consistent.
- **Human Decision:** ⏳ PENDING

#### 5. Admin vs Agent Billing Timing Inconsistency
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #13-15
- **Issue:** Edge Case #13 states that inviting an admin creates an invite with "no seat charge". Edge Cases #14-15 show that seat charge only happens at accept time if the admin chooses to take calls. However, for agent role invites, Edge Case #3 shows billing is charged at invite time (when exceeding purchased seats). This creates different billing timing: agents are charged when invited, but admins who take calls are charged when they accept. This inconsistency may confuse users about when billing impacts occur.
- **Suggested Fix:** Document this intentional difference prominently in the UI cost preview, or unify billing timing across roles (either both at invite time or both at accept time).
- **Human Decision:** ⏳ PENDING

#### 6. No Bulk Invite Functionality
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 explicitly lists "No bulk invite | Must invite one at a time | 🟢 Low | Add CSV upload for enterprise". For organizations onboarding large teams, inviting agents one-by-one is tedious and time-consuming. This may be a friction point for enterprise customers.
- **Suggested Fix:** Consider implementing CSV upload or bulk email input for enterprise-tier organizations. Low priority for current scale.
- **Human Decision:** ⏳ PENDING

#### 7. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation explicitly states "Screen reader support: ⚠️ Not explicitly verified". The agents page contains status indicators (colors), pending invite badges, seat allocation displays, and action buttons that may not have proper ARIA labels for screen reader users.
- **Suggested Fix:** Conduct screen reader accessibility audit. Add ARIA labels to status colors, seat counts, and pending invite sections. Verify form labels in invite modal.
- **Human Decision:** ⏳ PENDING

#### 8. Orphaned Billing Seat on Email Failure
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Reliability
- **Issue:** Section 6 Reliability lists "Orphaned billing seat | Email failure doesn't rollback invite (invite exists)". When email send fails, the invite record is created and the billing seat is consumed, but the invitee never receives notification. This results in paying for a seat that cannot be used until admin notices and revokes the invite manually.
- **Suggested Fix:** Either rollback the invite on email failure, implement email retry queue, or alert the admin immediately when email fails so they can resend or revoke.
- **Human Decision:** ⏳ PENDING

#### 9. Invite Expiration Not Configurable
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 states "Is 7-day invite expiration appropriate? Hardcoded in DB default. Should it be configurable per-org?" Some organizations may need longer invite windows (e.g., new hires who won't start for 2+ weeks) or shorter windows for security compliance.
- **Suggested Fix:** Consider making invite expiration configurable at organization level, with 7 days as default. Low priority enhancement.
- **Human Decision:** ⏳ PENDING

#### 10. No Stripe Downtime Retry Mechanism
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5; Section 4 - Edge Cases #19
- **Issue:** Open Question #5 asks "What happens if Stripe is down during invite? Currently fails and rolls back invite. Should there be a retry mechanism?" Edge Case #19 confirms that billing API failure causes invite deletion (rollback). This is correct for transactional integrity but poor for user experience - the admin must manually retry. During Stripe outages, no invites can be sent.
- **Suggested Fix:** Consider queuing invites for retry during temporary Stripe failures, with notification to admin of pending status. Alternatively, document expected behavior clearly in error message.
- **Human Decision:** ⏳ PENDING

#### 11. Deactivated Agents Not Visible to Admins
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #6
- **Issue:** Open Question #6 states "Should admins be able to see deactivated agents? Currently filtered out entirely. May be useful for audit/history." Admins have no way to see former team members, making it difficult to audit team changes over time or verify who previously had access.
- **Suggested Fix:** Consider adding "Show deactivated agents" toggle or separate "Former Team Members" tab for audit purposes.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 1
- **Medium:** 6
- **Low:** 4

---

## A-rna-timeout - RNA (Ring-No-Answer) Timeout & Auto-Reassignment

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/rna-timeout.md`
**Review Agent:** review-agent-agent-rna-timeout.md

### Findings

#### 1. No Maximum Reassignment Attempts Limit
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section "Edge Cases & Race Conditions" - ⚠️ POTENTIAL ISSUE
- **Issue:** Document explicitly flags that there is "No limit on reassignment attempts." While the doc argues this is "likely not a problem in practice," in edge cases (e.g., agents rapidly toggling back from away), the system could create an excessive chain of call_log entries and waste server resources with repeated routing attempts.
- **Suggested Fix:** Implement a maximum reassignment count (e.g., 3-5 attempts) with fallback to AGENT_UNAVAILABLE. Add configurable org setting if needed.
- **Human Decision:** ⏳ PENDING

#### 2. Server Restart Loses In-Flight RNA Timeouts
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section "Edge Cases & Race Conditions" - ⚠️ POTENTIAL ISSUE
- **Issue:** Document acknowledges that server restart during RNA period causes in-memory `rnaTimeouts` Map to be lost. The visitor is left confused with no notification. The mitigation stated ("server restart clears all pending calls anyway") doesn't address the visitor experience during the window.
- **Suggested Fix:** Consider persisting pending call requests to Redis with TTL, or emit a "reconnecting" event to visitors on server recovery so they know to retry.
- **Human Decision:** ⏳ PENDING

#### 3. No "Finding Another Agent" Message for Visitor
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section "What Each Party Sees" - Visitor subsection
- **Issue:** Document states "No explicit 'finding another agent' message currently." During reassignment, the visitor continues seeing "Connecting..." with no feedback that the original agent didn't answer. This could cause confusion if the wait time exceeds visitor expectations.
- **Suggested Fix:** When RNA timeout fires and reassignment begins, emit a widget message like "Our first agent is unavailable, connecting you to another..." to set visitor expectations.
- **Human Decision:** ⏳ PENDING

#### 4. Configuration Fallback Precedence Not Clear
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section "Configuration"
- **Issue:** Two timeout values are documented: `RNA_TIMEOUT` constant (15,000ms) and `rna_timeout_seconds` in database. The code snippet shows `getCallSettings()` is used, but doesn't explain what happens if `rna_timeout_seconds` is null/undefined. Does it fall back to the constant? This could cause inconsistent behavior across orgs.
- **Suggested Fix:** Clarify in documentation: "If `rna_timeout_seconds` is not set for an org, the system defaults to `TIMING.RNA_TIMEOUT` (15s)."
- **Human Decision:** ⏳ PENDING

#### 5. Missing Scenario - Agent Disconnects During RNA Period
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section "Edge Cases & Race Conditions"
- **Issue:** The document handles "Accept vs Timeout Race" but doesn't address what happens if the agent's socket disconnects during the RNA period (e.g., browser crash, network drop). Does the RNA timeout still fire correctly? Is the visitor notified immediately or must they wait the full timeout?
- **Suggested Fix:** Document what happens on agent disconnect: either immediate reassignment or timeout continues. If immediate reassignment is desired, add logic to detect disconnect and trigger reassignment early.
- **Human Decision:** ⏳ PENDING

#### 6. Missing Scenario - Visitor Disconnects During RNA Period
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section "Edge Cases & Race Conditions"
- **Issue:** Document doesn't address what happens if the visitor navigates away or closes their browser during the RNA waiting period. Does the RNA timeout still fire and mark the agent away even though the visitor is gone?
- **Suggested Fix:** Document behavior: If visitor disconnects during RNA period, clear the RNA timeout and cancel the call request to prevent incorrectly marking the agent away.
- **Human Decision:** ⏳ PENDING

#### 7. Next Agent Receives No Context About Reassignment
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section "What Each Party Sees" - Next Agent subsection
- **Issue:** Document states "No indication this is a reassigned call." The receiving agent doesn't know the visitor has already been waiting for 15+ seconds. This could affect how the agent greets the visitor or sets expectations.
- **Suggested Fix:** Include a flag in `call:incoming` payload like `isReassigned: true` or `waitTimeSeconds: N` so the dashboard can optionally display "Transferred call - visitor waiting 20s".
- **Human Decision:** ⏳ PENDING

#### 8. Missing Scenario - Agent Multiple Browser Tabs
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section "Implementation Details"
- **Issue:** Document doesn't address the scenario where an agent has multiple dashboard tabs open. If agent receives `call:incoming` in both tabs and accepts in one, does the RNA timeout clear properly for the request? Could accepting in Tab A while RNA fires in Tab B cause a race condition?
- **Suggested Fix:** Document expected behavior with multiple tabs. Verify `clearRNATimeout(requestId)` is called regardless of which socket instance accepts.
- **Human Decision:** ⏳ PENDING

#### 9. No Validation Limits on Configurable Timeout
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section "Configuration Recommendations"
- **Issue:** While recommendations suggest "45+ seconds - Not recommended," there's no documented validation preventing an admin from setting RNA timeout to extreme values like 1 second (causing instant RNA) or 5 minutes (terrible visitor experience). No min/max bounds are specified.
- **Suggested Fix:** Document and implement validation limits (e.g., minimum 5s, maximum 60s) in admin settings. Show warning for values outside recommended range.
- **Human Decision:** ⏳ PENDING

#### 10. Timing Diagram Shows Fixed 15s But Value Is Configurable
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section "Timing Diagram"
- **Issue:** The timing diagram hardcodes "(15 seconds)" but the configuration section explains this is customizable per-organization. This could mislead readers into thinking 15s is always the value.
- **Suggested Fix:** Update timing diagram to show "(configured timeout)" or "(e.g., 15 seconds)" to indicate variability.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 6

---

## P-geolocation-service - Geolocation Service

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/platform/geolocation-service.md`
**Review Agent:** `docs/prompts/active/review-agent-platform-geolocation-service.md`

### Findings

#### 1. No Cache Eviction Policy - Memory Grows Unbounded
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Performance (Memory usage row); Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Multiple sections flag that the location cache is an unbounded Map that "grows with unique IPs" with "no eviction policy". Section 7 explicitly lists "No cache eviction policy | Memory grows unbounded over time | 🟡 Medium". Open Question #1 asks "Should the location cache have a maximum size? Currently unbounded Map could grow indefinitely with unique IPs." On a high-traffic site, this could lead to memory exhaustion over time, especially since each unique IP is cached for 1 hour without any LRU or max-size limit.
- **Suggested Fix:** Implement an LRU cache with a maximum size limit (e.g., 10K entries as suggested in Open Questions). Consider using a library like `lru-cache` or implementing a simple max-size check with oldest-entry eviction.
- **Human Decision:** ⏳ PENDING

#### 2. Empty Allowlist Allows Everyone - Counterintuitive Behavior
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #20; Section 7 - Identified Issues; Section 10 - Open Questions #6
- **Issue:** Edge Case #20 marks "Empty allowlist | No countries in allowlist | All countries allowed | ⚠️ | Lenient, could block all" as a concern. Section 7 lists "Empty allowlist allows all | Counterintuitive for strict mode | 🟡 Medium". An admin who sets mode to "allowlist" but forgets to add countries would expect strict behavior (block everyone), but instead all visitors are allowed. This is a security/logic gap.
- **Suggested Fix:** Either (a) block all visitors when allowlist is empty (strict interpretation), or (b) show a warning in the admin UI when saving an empty allowlist explaining that it will allow all traffic, or (c) prevent saving allowlist mode with an empty country list.
- **Human Decision:** ⏳ PENDING

#### 3. Failed API Lookups Cached for Full Hour
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 3 - Data Flow (API failure branch); Section 10 - Open Questions #2
- **Issue:** Open Question #2 states "Should failed API lookups be cached shorter? Currently failed lookups (null) are cached for 1 hour same as successes. Could use shorter TTL (e.g., 5 minutes) to retry sooner." When ip-api.com fails (rate limit, network issue, invalid IP), the null result is cached for the full hour, meaning legitimate visitors could be impacted by stale failure data even after the API recovers.
- **Suggested Fix:** Cache failed lookups (null results) with a shorter TTL (e.g., 5 minutes) to allow faster retry. Keep successful lookups at 1-hour TTL for efficiency.
- **Human Decision:** ⏳ PENDING

#### 4. x-forwarded-for Header Trust Without Validation
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Security (IP spoofing row); Section 10 - Open Questions #3
- **Issue:** Security section notes "IP spoofing via headers: Trusts x-forwarded-for (assumes trusted proxy)". Open Question #3 explicitly asks "Is x-forwarded-for trustworthy? Current implementation trusts the first IP in x-forwarded-for header. If not behind a trusted proxy, this could be spoofed. May need configuration option." If the server receives direct connections (not behind a trusted proxy), attackers could spoof their IP via header injection to bypass geo-blocking.
- **Suggested Fix:** Add a configuration option to enable/disable trusting proxy headers based on deployment environment. When disabled, fall back to socket.address only. Document the security implications of each setting.
- **Human Decision:** ⏳ PENDING

#### 5. Cache Not Shared Across Multiple Server Instances
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 lists "Cache not shared across servers | Horizontal scaling = more API calls | 🟡 Medium". When running multiple server instances (common in production for load balancing), each instance has its own in-memory cache. This means the same IP could trigger API lookups on each server instance, multiplying API usage and risking rate limits.
- **Suggested Fix:** Implement a shared cache using Redis or similar for production deployments with multiple server instances. Keep in-memory cache for single-instance deployments.
- **Human Decision:** ⏳ PENDING

#### 6. Blocklist Cache Staleness After Admin Updates
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #24; Section 5 - Admin Experience Step 4; Section 10 - Open Questions #5
- **Issue:** Edge Case #24 notes "Country list updated by admin | Settings change | Need manual cache clear | ⚠️ | `clearBlocklistCache()` exists". Admin Experience Step 4 shows "Save changes | Cache cleared for org | ⚠️ | May need server restart for immediate effect". Open Question #5 asks "What happens when blocklist cache is stale? Admin updates blocklist, cache serves old data for up to 5 minutes." This means an admin who blocks a country may see those visitors still connecting for up to 5 minutes, causing confusion.
- **Suggested Fix:** Implement immediate cache invalidation when blocklist settings are updated. If database triggers aren't available, ensure the API endpoint that saves blocklist settings calls `clearBlocklistCache(orgId)` synchronously before returning success.
- **Human Decision:** ⏳ PENDING

#### 7. IPv6 Support is Partial and Untested
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability (IPv6 support row); Section 10 - Open Questions #4
- **Issue:** Section 6 states "IPv6 support: Partial - localhost handled, public IPv6 goes to API". Open Question #4 asks "Should IPv6 public addresses be supported explicitly? Currently relies on ip-api.com to handle IPv6. May need testing with IPv6-only visitors." As IPv6 adoption increases, untested IPv6 handling could cause issues for visitors on IPv6-only networks.
- **Suggested Fix:** Test geolocation with IPv6 public addresses to verify ip-api.com handles them correctly. Document any limitations. Consider adding explicit IPv6 format validation.
- **Human Decision:** ⏳ PENDING

#### 8. No Manual Location Override Capability
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 lists "No manual location override | Can't correct wrong geolocation | 🟢 Low | Add admin override in future". IP-based geolocation can be inaccurate (VPNs, corporate proxies, mobile carriers with distant POPs). Agents have no way to correct a visitor's displayed location if it's obviously wrong.
- **Suggested Fix:** Consider adding an agent-side override button to manually correct visitor location during a call, or an admin setting to map specific IP ranges to locations.
- **Human Decision:** ⏳ PENDING

#### 9. VPN/Proxy Bypass is Known Limitation
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #8; Section 6 - Security; Section 7 - Identified Issues
- **Issue:** Edge Case #8 marks "VPN with public IP | VPN user | Resolves to VPN exit node location | ⚠️ | IP-based geo limitation". Section 7 confirms "VPN/proxy bypasses blocking | Users can circumvent blocks | 🟢 Low | Known IP geo limitation". While documented as a known limitation, admins relying on geo-blocking for compliance or fraud prevention should be explicitly warned that VPN users can bypass blocks.
- **Suggested Fix:** Add a disclaimer in the Blocklist Settings admin UI: "Note: Visitors using VPNs or proxies will appear from the VPN exit node's location, not their actual location."
- **Human Decision:** ⏳ PENDING

#### 10. Silent Disconnect Provides No User Feedback
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #15, #16; Section 5 - User Experience Step 3; Section 7 - First Principles
- **Issue:** Documentation states blocked visitors experience "Silent disconnect (visitor doesn't see widget)" and Section 7's First Principles notes "Is feedback immediate? ⚠️ Mostly - Blocked visitors get no feedback (by design)". While intentionally silent for security (not revealing geo-blocking), this could confuse legitimate visitors who expect to see a widget but see nothing.
- **Suggested Fix:** Consider adding an optional "show message to blocked visitors" setting that displays a neutral message like "This service is not available in your region" rather than complete silence.
- **Human Decision:** ⏳ PENDING

#### 11. Supabase Error Fails Open Without User Notification
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Error States (Supabase error row)
- **Issue:** Error States table shows "Supabase error | Can't fetch blocklist | All countries allowed | Logs warning, fails open". While failing open is the safe default, this means a database outage could silently disable all geo-blocking across all organizations. Admins have no visibility into this failure mode.
- **Suggested Fix:** Add monitoring/alerting for blocklist fetch failures. Consider whether failing open is always the correct behavior or if high-security organizations should fail closed with a configurable option.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 6

---

## SA-platform-dashboard - Platform Dashboard

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/superadmin/platform-dashboard.md`
**Review Agent:** docs/prompts/active/review-agent-superadmin-platform-dashboard.md

### Findings

#### 1. No Pagination for Large Organization Lists
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #5; Section 7 - Identified Issues
- **Issue:** Edge Case #5 states "Very large data volumes | Many orgs/calls | Pagination not implemented ⚠️ | May slow with 1000+ orgs". Section 7 confirms "No pagination for large org lists | Slow load with 500+ orgs | 🟡 Medium". This affects the Overview, Organizations, and Retargeting tabs which all fetch organization lists without pagination.
- **Suggested Fix:** Implement server-side pagination for organization lists, or use virtual scrolling for client-side performance. Add limit/offset to Supabase queries and UI pagination controls.
- **Human Decision:** ⏳ PENDING

#### 2. Missing Skeleton/Loading States for Server-Side Rendering
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility; Section 7 - Identified Issues
- **Issue:** Section 5 states "Loading states: ⚠️ No skeleton loaders, server-rendered data" and Section 7 lists "No skeleton loaders | No visual feedback during SSR | 🟢 Low". Users see blank content during server-side data fetching with no visual indication that data is loading.
- **Suggested Fix:** Add skeleton loading components that display during server-side data fetching to provide visual feedback to users.
- **Human Decision:** ⏳ PENDING

#### 3. Expansion/Contraction MRR Hardcoded to Zero
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Section 7 states "Expansion/Contraction hardcoded to $0 | Missing upgrade/downgrade tracking | 🟡 Medium". Open Question #1 confirms: "Should expansion/contraction MRR be tracked? Currently hardcoded to $0. Would require an mrr_changes table to track seat additions/removals mid-subscription." NRR and Quick Ratio calculations are incomplete without this data.
- **Suggested Fix:** Implement mrr_changes table to track seat additions/removals and plan upgrades/downgrades. Update NRR and Quick Ratio calculations to use real expansion/contraction data.
- **Human Decision:** ⏳ PENDING

#### 4. No Data Export Functionality
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 states "No data export | Can't extract metrics | 🟢 Low". Platform admins cannot export MRR data, organization lists, funnel metrics, or cancellation analysis to CSV/Excel for offline analysis or reporting.
- **Suggested Fix:** Add CSV export button to each tab (Overview, Funnel, Organizations, Cancellations) allowing platform admins to download displayed data.
- **Human Decision:** ⏳ PENDING

#### 5. Keyboard Navigation Not Fully Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Keyboard navigation: ⚠️ Not fully verified (tables may need ARIA)". Data tables across multiple tabs (Overview, Funnel, Organizations, Cancellations) may not be accessible via keyboard navigation, violating WCAG 2.1 accessibility guidelines.
- **Suggested Fix:** Audit all data tables for keyboard navigability. Add proper ARIA roles, tabindex, and keyboard event handlers. Ensure sort buttons, filters, and table cells are keyboard-accessible.
- **Human Decision:** ⏳ PENDING

#### 6. Screen Reader Support Not Verified for Charts
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Screen reader support: ⚠️ Not verified (charts need alt text)". Visual charts showing MRR trends, churn, cohort retention, and funnel visualizations lack alternative text for screen reader users.
- **Suggested Fix:** Add aria-label or aria-describedby attributes to all chart components. Provide tabular data alternatives or descriptive summaries for visual charts.
- **Human Decision:** ⏳ PENDING

#### 7. No Real-Time Updates for Revenue Changes
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open Question #2 asks: "Is there a need for real-time updates? Current implementation is server-rendered on page load. Consider WebSocket updates for MRR changes." Platform admins must manually refresh to see revenue changes, potentially missing critical events like cancellations in progress.
- **Suggested Fix:** Evaluate need for real-time updates. If valuable, implement WebSocket subscription for critical events (new subscriptions, cancellations, payment failures) to update dashboard without refresh.
- **Human Decision:** ⏳ PENDING

#### 8. Health Scores Display-Only Without Automated Actions
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 asks: "Should health scores trigger automated actions? Currently display-only. Could trigger automated emails to at-risk org admins." At-risk organizations with low health scores are identified but no proactive intervention is triggered, relying on manual platform admin monitoring.
- **Suggested Fix:** Define health score thresholds for automated actions. Consider implementing automated alerts to platform admins or outreach emails to at-risk organization admins when health scores drop below critical thresholds.
- **Human Decision:** ⏳ PENDING

#### 9. No Data Retention Policy for funnel_events Table
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 asks: "What's the data retention policy for funnel_events? If this table grows large, may need archival strategy." Without a retention policy, the funnel_events table could grow unbounded, affecting query performance and storage costs.
- **Suggested Fix:** Define data retention policy for funnel_events (e.g., archive events older than 2 years). Implement automated archival or deletion job. Consider aggregating old events into summary tables for historical analysis.
- **Human Decision:** ⏳ PENDING

#### 10. Retargeting Events Not Tracked in Dashboard
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open Question #5 asks: "Should retargeting events be tracked in this dashboard? Currently shows config only, not event volumes sent to Facebook." Platform admins configure the Facebook pixel but have no visibility into whether retargeting events are actually being sent or received.
- **Suggested Fix:** Add retargeting event tracking to display event volumes, success/failure rates, and organization-level retargeting activity. Consider showing last 7/30 day event counts.
- **Human Decision:** ⏳ PENDING

#### 11. Facebook Pixel Access Token Storage Security
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Security
- **Issue:** Documentation states "Pixel credentials | Access token stored in platform_settings". Facebook access tokens stored in database should be encrypted at rest to prevent exposure in case of database breach or backup exposure.
- **Suggested Fix:** Verify access token is encrypted at rest in platform_settings. If not, implement column-level encryption or store in a secrets manager. Audit access patterns to ensure tokens are only accessible to authorized platform admin actions.
- **Human Decision:** ⏳ PENDING

#### 12. Database Error Shows Partial Data Without User Notification
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Error States
- **Issue:** Error States table shows "Database error | Supabase unavailable | Console error, partial data | Refresh page". When a database error occurs, users see partial data with only a console error logged. Platform admins have no visible indication that displayed data may be incomplete.
- **Suggested Fix:** Add error boundary or toast notification to inform users when any database query fails. Clearly distinguish between "complete data" and "partial data due to error" states in the UI.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 7
- **Low:** 5

---

## AUTH-invite-accept - Invite Accept

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/auth/invite-accept.md`
**Review Agent:** docs/prompts/active/review-agent-auth-invite-accept.md

### Findings

#### 1. Agent Profile Creation Failure Continues Silently
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #12; Section 7 - Identified Issues
- **Issue:** Edge Case #12 states: "Agent profile creation fails | DB insert error | Logged, continues anyway | ⚠️ | User is created but may not appear as agent". Section 7 confirms: "Agent profile creation failure continues | User created but not as agent | 🟡 Medium". When agent profile creation fails, the user is created successfully but cannot function as an agent. This leaves the system in an inconsistent state where the user exists but cannot perform their intended role.
- **Suggested Fix:** Show an error message to the user when agent profile creation fails and provide a retry mechanism. Alternatively, consider wrapping the entire account creation flow in a transaction to ensure atomicity.
- **Human Decision:** ⏳ PENDING

#### 2. Billing Seat Allocation Failure Continues Silently
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #13; Section 6 - Reliability; Section 7 - Identified Issues
- **Issue:** Edge Case #13 states: "Billing seat add fails | Stripe/API error | Logged, continues anyway | ⚠️ | Admin may not have seat allocated". Section 7 confirms: "Billing seat failure continues silently | Admin might not get agent capabilities | 🟡 Medium". An admin who chooses "Yes, I'll take calls" may not get a billing seat allocated, causing billing discrepancies and potential inability to take calls.
- **Suggested Fix:** Show a warning toast if seat allocation fails and provide guidance for resolving the issue (e.g., "Contact your admin to verify seat allocation"). Consider blocking account creation if seat allocation is critical.
- **Human Decision:** ⏳ PENDING

#### 3. No Transaction Rollback on Browser Refresh
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #18
- **Issue:** Edge Case #18 states: "Browser refresh during submit | Interrupts API calls | May leave partial state | ⚠️ | No transaction rollback". The account creation flow involves multiple sequential operations (auth.users → users → agent_profiles → invite update) without a transaction. If the user refreshes or loses connection mid-flow, partial records may exist with no cleanup mechanism.
- **Suggested Fix:** Implement idempotent operations with proper cleanup. Consider using Supabase Edge Functions with transaction support, or add a cleanup job that removes orphaned records where invite was not marked accepted.
- **Human Decision:** ⏳ PENDING

#### 4. Missing ARIA Labels on Admin Choice Buttons
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility audit states: "Screen reader support: ⚠️ No explicit ARIA labels on custom choice buttons". The admin role choice buttons ("Yes, I'll take calls" / "No, admin only") lack proper ARIA attributes, making them difficult for screen reader users to understand and interact with.
- **Suggested Fix:** Add `role="radiogroup"` to the container, `role="radio"` and `aria-checked` to each button, and descriptive `aria-label` attributes explaining the implications of each choice.
- **Human Decision:** ⏳ PENDING

#### 5. Missing Focus Indicators Using outline-none
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility audit states: "Focus indicators: ⚠️ Uses outline-none, relies on border change". The use of `outline-none` without a clear visible focus indicator violates WCAG 2.4.7 (Focus Visible). Users navigating via keyboard may not be able to see which element is currently focused.
- **Suggested Fix:** Replace or augment the border change with a visible focus ring using `focus-visible:ring-2` or similar Tailwind utility. Ensure focus states meet 3:1 contrast ratio requirements.
- **Human Decision:** ⏳ PENDING

#### 6. No Success Message Before Redirect
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - UX Audit Step 9; Section 7 - Identified Issues
- **Issue:** Section 5 states: "Success | Redirect to /admin | ✅ | No success message (instant redirect)". Section 7 confirms: "No success toast before redirect | Users may be confused by instant redirect | 🟢 Low". The instant redirect without feedback may disorient users who don't realize their account was created successfully.
- **Suggested Fix:** Add a brief toast notification ("Account created! Redirecting...") that displays for 1-2 seconds before redirect, or show a success state on the target page.
- **Human Decision:** ⏳ PENDING

#### 7. No Focus Management for Error States
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 states: "No focus management for accessibility | Screen readers may miss error messages | 🟡 Medium". When validation errors occur (password too short, passwords don't match), focus is not programmatically moved to the error message. Screen reader users may not be aware an error occurred.
- **Suggested Fix:** Use `aria-live="polite"` on the error container and programmatically focus the first error message using `focus()` or a `useEffect` that triggers on error state change.
- **Human Decision:** ⏳ PENDING

#### 8. Logged-in User Email Mismatch Edge Case
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1
- **Issue:** Open Question #1 asks: "What happens if user tries to accept with a different email? Currently the email field is disabled, so this is prevented. But if they have a Supabase account with a different email, they could be logged in and see a mismatch." A user logged into Supabase with email A could click an invite link for email B. The current flow doesn't detect or handle this session mismatch.
- **Suggested Fix:** Check for existing session on page load. If a session exists with a different email than the invite, either sign out automatically, show a warning, or prompt the user to sign out before proceeding.
- **Human Decision:** ⏳ PENDING

#### 9. No Resend Invite Option
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open Question #2 asks: "Should there be a 'resend invite' option? Currently admins must revoke and re-invite. A resend button would be more user-friendly." If an invite email is lost or expires, admins must manually delete the invite, which may refund a seat, and then re-send, which re-charges. This is cumbersome and may cause billing complications.
- **Suggested Fix:** Add a "Resend" button in Agent Management that extends expiry and re-sends the email without touching billing records.
- **Human Decision:** ⏳ PENDING

#### 10. Hardcoded 7-Day Invite Expiry
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 asks: "Should invite expiry be configurable? Currently hardcoded to 7 days. Some orgs may want shorter or longer windows." Organizations with different onboarding timelines (e.g., HR processes that take weeks, or security policies requiring same-day acceptance) cannot adjust the expiry window.
- **Suggested Fix:** Add an organization-level setting for invite expiry duration with sensible defaults (e.g., 7 days) and min/max bounds (e.g., 1-30 days).
- **Human Decision:** ⏳ PENDING

#### 11. Asymmetric Billing Seat Timing Between Roles
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open Question #5 notes: "Should billing seat be charged at send time or accept time for all roles? Currently agents charge on send (to prevent invite spam), admins charge on accept if they choose to take calls. This asymmetry could be confusing." This inconsistency can confuse admins reviewing billing: agent invites show as seats immediately, but admin-who-takes-calls seats only appear after acceptance.
- **Suggested Fix:** Document the asymmetry clearly in the billing UI. Consider standardizing to accept-time charging for all roles with rate limiting to prevent invite spam.
- **Human Decision:** ⏳ PENDING

#### 12. No Admin-to-Agent Upgrade Path
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #6
- **Issue:** Open Question #6 asks: "Is there a way to upgrade admin-only to agent later? User would need to manually create agent_profile. Consider adding 'Start taking calls' button in dashboard." An admin who initially chose "admin only" cannot easily become an agent later without database intervention or a new invite.
- **Suggested Fix:** Add a "Start taking calls" action in the user's profile or agent settings that creates an agent_profile and allocates a billing seat. This should mirror the inverse of the accept-invite choice.
- **Human Decision:** ⏳ PENDING

#### 13. Email Delivery Failure Creates Orphaned Invite
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 6 - Reliability
- **Issue:** Reliability section states: "Email delivery failure | Invite created even if email fails (logged)". If the email fails to send via Resend, the invite record exists and a seat may be charged (for agents), but the invitee never receives the link. The admin has no visibility into this failure.
- **Suggested Fix:** Return an error or warning to the admin when email delivery fails. Consider not creating the invite record (or marking it as "email_failed") until email delivery is confirmed.
- **Human Decision:** ⏳ PENDING

#### 14. Pending Invites Not Notified on Org Deletion
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 asks: "What happens to pending invites when org is deleted? The ON DELETE CASCADE constraint handles this, but should there be notification to invitees?" Invitees with pending invites will click a link that silently fails with no explanation if the org was deleted. They may be confused about why their invite is invalid.
- **Suggested Fix:** Consider sending a notification email to pending invitees when an organization is deleted, or at minimum ensure the error message is clear that the organization no longer exists.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 14
- **Critical:** 0
- **High:** 0
- **Medium:** 10
- **Low:** 4

---

## V-call-reconnection - Call Reconnection

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/visitor/call-reconnection.md`
**Review Agent:** docs/prompts/active/review-agent-visitor-call-reconnection.md

### Findings

#### 1. localStorage Expiry vs Server Timeout Mismatch
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #2; Section 7 - Identified Issues; Section 10 - Q-001; Appendix
- **Issue:** Multiple sections flag this critical timing mismatch: localStorage token expires after 5 minutes (`CALL_EXPIRY_MS: 5 * 60 * 1000`) but server times out after 30 seconds (`CALL_RECONNECT_TIMEOUT: 30_000`). Edge Case #2 marks "Visitor away 30s-5min" with ⚠️ warning. Section 7 Identified Issues states "localStorage expiry (5 min) mismatches server timeout (30s) | Visitor may see false hope of reconnection | 🟡 Medium". Q-001 explicitly asks about aligning these values. This causes a confusing UX where visitors believe reconnection is possible (valid token in localStorage) but server has already ended the call.
- **Suggested Fix:** Either reduce localStorage expiry to 30s to match server timeout, or extend server timeout to 5 minutes (with agent experience considerations). Document chosen approach.
- **Human Decision:** ⏳ PENDING

#### 2. Agent Lacks Reconnecting UI Indicator
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 Identified Issues explicitly states "Agent may not know visitor is reconnecting | Agent sees frozen video, no 'reconnecting' UI | 🟡 Medium". When a visitor navigates to a new page, the agent's video freezes with no visual indication that reconnection is in progress. Agent cannot distinguish between a visitor navigating pages vs a dropped call, leading to potential confusion about whether to wait or end the call.
- **Suggested Fix:** Add visual indicator (e.g., "Visitor reconnecting..." overlay with spinner) to agent dashboard during pending reconnection. Consider showing elapsed time in reconnect state.
- **Human Decision:** ⏳ PENDING

#### 3. Heartbeat Mechanism Incomplete
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Q-002
- **Issue:** Section 7 lists "No heartbeat during active call | Can't detect if call is truly alive | 🟢 Low". Q-002 states the `CALL_HEARTBEAT` event type is defined with `CALL_HEARTBEAT_INTERVAL: 10_000` but "The widget doesn't appear to emit heartbeats, only the event type is defined." The heartbeat mechanism exists in types but is not implemented client-side, reducing ability to detect orphaned calls or silently failed connections.
- **Suggested Fix:** Implement client-side heartbeat emission in widget during active calls. Low priority as call states are currently managed through WebRTC connection state.
- **Human Decision:** ⏳ PENDING

#### 4. Multiple Browser Tabs Scenario Undefined
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Q-003
- **Issue:** Q-003 asks "What should happen if visitor has multiple browser tabs open during a call and navigates in one tab? Currently, all tabs would have the same localStorage token." Since all tabs share the same localStorage, this could lead to race conditions where multiple tabs attempt reconnection simultaneously, or a navigation in Tab A affects the call state displayed in Tab B. This is a realistic scenario (visitor opens product in new tab) with undefined behavior.
- **Suggested Fix:** Document expected behavior for multi-tab scenarios. Consider adding tabId to stored call data or using BroadcastChannel API to coordinate between tabs. Alternatively, document that calls should only be active in one tab.
- **Human Decision:** ⏳ PENDING

#### 5. No Audio/Visual Cue on Successful Reconnection
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility; Section 10 - Q-004
- **Issue:** Section 5 Accessibility notes "⚠️ No audio cue when call reconnects (could startle user with sudden video/audio)". Q-004 asks "Should there be an audio/visual cue when call successfully reconnects to alert both parties that the call is back?" After navigating pages, the call resumes without notification, potentially startling users with sudden audio/video or causing them to miss that the call is back if they looked away.
- **Suggested Fix:** Add subtle audio chime or visual flash/toast when call successfully reconnects to alert both visitor and agent. Ensure the cue is perceivable but not jarring.
- **Human Decision:** ⏳ PENDING

#### 6. Silent Call End on Return After Long Break
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review
- **Issue:** In the UI/UX Review table, "Return after long break" row states user sees "Minimized widget, no error" with ⚠️ flag and issue "No indication call ended silently". When a visitor returns to the site after server timeout (30s-5min), they see a normal minimized widget with no indication that their call ended while they were away. This could lead to confusion about what happened to their call.
- **Suggested Fix:** When localStorage token exists but is expired or call is no longer active, show a brief notification like "Your previous call ended" or display call-ended state briefly before returning to normal widget.
- **Human Decision:** ⏳ PENDING

#### 7. In-Memory State Lost on Server Restart
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability
- **Issue:** Section 6 Reliability notes "⚠️ In-memory `callLogIds` Map lost on server restart (call logger must re-query DB)". While the pending reconnect mechanism handles server restarts (noted as ✅), the callLogIds Map is in-memory and lost on restart. The note indicates this is partially mitigated by re-querying DB, but there may be edge cases where call state is briefly inconsistent during recovery.
- **Suggested Fix:** Document the recovery behavior explicitly. Consider if any edge cases during server restart could cause reconnection failures.
- **Human Decision:** ⏳ PENDING

#### 8. Reconnecting Indicator May Be Too Brief to Notice
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - UI/UX Review; Section 7 - First Principles Review
- **Issue:** Section 5 UI/UX Review notes successful navigation shows "Brief loading, call resumes" with observation "May see brief 'Reconnecting...'". Section 7 First Principles Review states "Is feedback immediate? | ⚠️ 'Reconnecting...' appears but may be too brief to notice". For fast reconnections, users may not see any indication that reconnection occurred, leaving them uncertain about what happened during the brief page transition.
- **Suggested Fix:** Consider showing "Reconnected!" confirmation briefly after successful reconnection, or ensure the reconnecting indicator displays for a minimum duration (e.g., 500ms) even if reconnection is faster.
- **Human Decision:** ⏳ PENDING

#### 9. Token Storage Security Acknowledgment
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Security
- **Issue:** Section 6 Security notes "⚠️ Token visible in localStorage (acceptable for session-like data)". While marked as acceptable, the reconnect token stored in localStorage is accessible to any JavaScript on the page. This is a known limitation documented correctly, but worth tracking. The token is cryptographically random and validated against orgId, mitigating cross-site risks.
- **Suggested Fix:** No immediate action needed. Consider if sessionStorage (cleared on tab close) would be more appropriate for security-sensitive deployments, though this would break cross-tab behavior.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 9
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 5

---

## V-mobile-gate - Mobile Gate

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/visitor/mobile-gate.md`
**Review Agent:** docs/prompts/active/review-agent-visitor-mobile-gate.md

### Findings

#### 1. Tablets Blocked With No Override Option
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 10 - Open Question #1
- **Issue:** Documentation explicitly flags that "iPad users can't access dashboard" with tablets treated as mobile. Section 7 identifies this as Medium severity and suggests "Consider allowing tablet access with warning". Open Question #1 asks "Should tablets (iPad, Android tablets) be allowed with a warning?" Many tablets can successfully run video calls, yet users are completely blocked with no way to proceed.
- **Suggested Fix:** Add a "Continue Anyway" option for tablet users with a warning about potential experience issues. This respects power users while still warning about suboptimal experience.
- **Human Decision:** ⏳ PENDING

#### 2. Clipboard API Fails Silently With No User Feedback
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #12; Section 7 - Identified Issues
- **Issue:** Edge Case #12 explicitly flags this with ⚠️: "Clipboard API fails | Permission denied | No visual feedback". Section 7 confirms "No clipboard error handling | Copy fails silently | 🟢 Low". When the browser blocks clipboard access (permissions, HTTPS requirements, or security restrictions), the user clicks "Copy Link" and receives no indication that the copy failed.
- **Suggested Fix:** Add try/catch error handling with user feedback toast on copy failure. Suggest alternative (share button) when copy fails.
- **Human Decision:** ⏳ PENDING

#### 3. Keyboard Navigation Not Tested
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation explicitly states "Keyboard navigation: ⚠️ Not specifically tested". Mobile gate page has multiple interactive elements (Copy Link, Share/Email Link, Back to homepage) that keyboard-only users need to access. Without verification, Tab order and focus states may be broken.
- **Suggested Fix:** Conduct keyboard navigation audit. Verify logical Tab order, visible focus indicators on all buttons, and that Enter/Space activates buttons correctly.
- **Human Decision:** ⏳ PENDING

#### 4. No Focus Management on Page Load
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Focus management: ⚠️ No explicit focus trap or management". When user is redirected to mobile gate, focus is not explicitly set. Screen reader users may not immediately understand they've been redirected or where to begin interacting.
- **Suggested Fix:** Set focus to main heading or first actionable element on page load. Add skip link if page grows more complex.
- **Human Decision:** ⏳ PENDING

#### 5. Two Different Mobile Detection Systems May Cause Inconsistent Experience
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 10 - Open Question #3; Section 8 - Code References
- **Issue:** Open Question #3 documents that dashboard uses UA regex (`MobileRedirect.tsx`) while widget uses screen size + touch detection (`Widget.tsx`). A tablet user could be: blocked from dashboard (UA detection) but successfully use the widget (screen-size detection allows tablets). This asymmetry may confuse users about what "mobile" means in the application.
- **Suggested Fix:** Document this intentional difference more prominently. Consider aligning detection methods or explaining the rationale in user-facing messaging.
- **Human Decision:** ⏳ PENDING

#### 6. No Analytics Tracking on Mobile Gate Page
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Question #5
- **Issue:** Open Question #5 explicitly asks "Should there be analytics tracking on the mobile gate page? Currently no tracking of how many users hit the mobile gate, which could inform product decisions about mobile support." Without this data, the team cannot measure: how many users are being blocked, drop-off rates at mobile gate, whether tablet support is a priority.
- **Suggested Fix:** Add analytics event for mobile gate page views. Track device type, user agent, and which action (copy/share/email/homepage) users take. Use data to prioritize tablet support decision.
- **Human Decision:** ⏳ PENDING

#### 7. User Agent Detection Is Fragile for New Devices
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Question #2
- **Issue:** Section 7 lists "User agent detection is fragile | New devices may not be detected | 🟢 Low". Open Question #2 asks "Should mobile detection use feature detection instead of/in addition to UA sniffing?" The current regex may not catch new mobile devices, and UA strings can change over time. Exotic devices will "fall through to dashboard" which may cause poor experiences.
- **Suggested Fix:** Combine UA sniffing with feature detection (touch capability, screen size ratio, camera/mic APIs). This provides defense-in-depth for mobile detection.
- **Human Decision:** ⏳ PENDING

#### 8. Desktop "Request Mobile Site" Feature Causes False Positive
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #6
- **Issue:** Edge Case #6 is marked with ⚠️: "Desktop browser requests mobile site | 'Request Mobile Site' feature | Depends on UA spoofing | May redirect if UA spoofed". A desktop user who has previously used Chrome's "Request Mobile Site" feature could be incorrectly redirected to mobile gate, blocking legitimate dashboard access.
- **Suggested Fix:** Consider adding feature detection (screen dimensions, mouse/pointer) as secondary check before redirecting. Alternatively, accept current behavior as rare edge case.
- **Human Decision:** ⏳ PENDING

#### 9. Mobile Gate Page Accessible Without Authentication
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Question #4
- **Issue:** Open Question #4 notes "Should the mobile gate page be accessible without auth? Currently it can be accessed directly without login. This is fine as it contains no sensitive information, but the redirect only happens from authenticated pages." While noted as acceptable, this creates an inconsistency: authenticated routes redirect to an unauthenticated page. Anyone can access /mobile-gate directly.
- **Suggested Fix:** Either document this as intentional design decision, or wrap mobile-gate in auth to maintain consistency (redirect unauthenticated mobile users to login first).
- **Human Decision:** ⏳ PENDING

#### 10. pushState Failure Has Unclear Recovery
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Error States
- **Issue:** Error States table shows "Navigation state error | pushState fails | Back button may work | Still on mobile gate page". The recovery path is ambiguous - "Back button may work" is unclear. If pushState fails, the history manipulation meant to prevent back navigation would fail, potentially allowing users to hit partially-loaded dashboard pages.
- **Suggested Fix:** Add try/catch around pushState with graceful degradation. If history manipulation fails, log the error and accept that back button will work normally.
- **Human Decision:** ⏳ PENDING

#### 11. No Handling for Share API User Cancellation Feedback
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #11; Section 4 - Error States
- **Issue:** Edge Case #11 notes "User cancels share dialog | Closes Web Share dialog | Silent failure, no action | ✅ | AbortError caught silently". While this is marked correct, it may leave users uncertain if their share attempt worked. They may not realize they cancelled and try to access link on desktop expecting it to be there.
- **Suggested Fix:** Consider showing brief toast "Share cancelled" or leaving button in ready state with no change. Current silent handling is acceptable but not optimal UX.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 7

---

## P-heartbeat-staleness - Heartbeat & Staleness Detection

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/platform/heartbeat-staleness.md`
**Review Agent:** review-agent-platform-heartbeat-staleness.md

### Findings

#### 1. Tab Throttling Can Cause False Positives (Documented)
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Row 1; Section 4 - Edge Cases #9
- **Issue:** Documentation explicitly flags that Chrome's tab throttling can slow JavaScript execution in background tabs, causing heartbeats to stop and agents to be incorrectly marked as "away" even when present. Edge Case #9 also marks this with ⚠️. This is a known reliability issue that could frustrate active agents.
- **Suggested Fix:** Document suggests using Web Worker for heartbeat or visibility API to pause timer. Should verify if client-side implementation (A10) addresses this.
- **Human Decision:** ⏳ PENDING

#### 2. In-Simulation Agents Not Checked for Staleness (Documented/Open Question)
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues Row 4; Section 10 - Open Question Q-P6-001
- **Issue:** Currently `getStaleAgents()` only checks agents with `status === "idle"`. If an agent is in `in_simulation` status (broadcasting video to visitors) and stops heartbeating for 2+ minutes, they are NOT marked stale. This means visitors could be watching a "ghost" agent who is no longer present. The doc flags this as needing a decision.
- **Suggested Fix:** Consider adding `in_simulation` to staleness check, or at minimum reassign visitors if agent in simulation goes stale.
- **Human Decision:** ⏳ PENDING

#### 3. Reason Field Inconsistency Between Recording and Notification
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 3 - Key Code Snippets, Staleness Check; Section 7 - Identified Issues Row 3
- **Issue:** When marking an agent stale, the code calls `recordStatusChange(agent.agentId, "away", "heartbeat_stale")` with reason `"heartbeat_stale"`, but the socket event sent to the agent uses `reason: "idle"`. This inconsistency is also flagged in Identified Issues Row 3. Analytics/debugging will show different reasons for the same event.
- **Suggested Fix:** Use consistent reason `"heartbeat_stale"` in both the status record and the socket event payload.
- **Human Decision:** ⏳ PENDING

#### 4. No Warning Before Being Marked Away (Documented)
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues Row 2; Section 10 - Open Question Q-P6-002
- **Issue:** Agents receive no warning before being marked away. They only learn they've been marked away after the fact. Open Question Q-P6-002 asks whether a warning at 1.5 minutes would help. This is a UX gap - agents have no chance to prevent being marked away.
- **Suggested Fix:** Add warning notification at 90 seconds (1.5 min) before 2-minute threshold.
- **Human Decision:** ⏳ PENDING

#### 5. Worst-Case Detection Time is 3 Minutes
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Question Q-P6-003
- **Issue:** Open Question explicitly asks if 2 minutes is correct, noting worst case: "25s heartbeat + 60s check + 2min threshold means worst case is 2min + 60s = 3 minutes before detection." This is a long time for visitors to be assigned to an unresponsive agent.
- **Suggested Fix:** Consider reducing check interval from 60s to 30s, or threshold from 120s to 90s, to bring worst-case down.
- **Human Decision:** ⏳ PENDING

#### 6. Agent Notification May Not Be Seen If Tab Hidden
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review, Step 3
- **Issue:** The UX audit marks Step 3 (staleness detected) with ⚠️ and notes "Agent may not see notification if tab hidden." The irony: the very scenario that causes staleness (tab in background) is the same scenario where the agent won't see the notification. When they return, they'll see "Away" status but may have missed the toast notification.
- **Suggested Fix:** Consider persistent banner/alert that stays visible until dismissed, or audio notification.
- **Human Decision:** ⏳ PENDING

#### 7. Screen Reader Accessibility Gap
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section notes with ⚠️: "Screen reader: notification should be announced when marked away." This is an accessibility gap - visually impaired agents may not be alerted to status change.
- **Suggested Fix:** Ensure `AGENT_MARKED_AWAY` notification uses ARIA live region for screen reader announcement.
- **Human Decision:** ⏳ PENDING

#### 8. Server Restart Edge Case Uncertain
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #10
- **Issue:** Edge case #10 (Server restarts) is marked ⚠️ with "Depends on restart speed." If server restart takes >10s, all agents lose their grace period and must fully re-login. Documentation is uncertain whether this is acceptable behavior or a problem during deployments.
- **Suggested Fix:** Clarify expected behavior during deployments. Consider extending grace period during server restart scenario (e.g., persisting pending disconnect state to Redis).
- **Human Decision:** ⏳ PENDING

#### 9. Cross-Feature Dependency on Unverified A10 Documentation
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question Q-P6-004; Section 9 - Related Features
- **Issue:** Open Question Q-P6-004 asks "How does the client-side heartbeat implementation handle Chrome's aggressive tab throttling for background tabs? (Need to verify A10 documentation)" - referencing `agent/heartbeat-visibility.md`. This cross-feature dependency is unverified, meaning the most significant issue (tab throttling false positives) may or may not be handled.
- **Suggested Fix:** Review A10 documentation to verify client-side implementation addresses tab throttling. Update Q-P6-004 with verification status.
- **Human Decision:** ⏳ PENDING

#### 10. Grace Period May Be Too Short for Slow Reconnects
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #3; Section 4 - Error States Row 3
- **Issue:** The 10-second grace period is designed for quick page refreshes. Error States table notes "Slow reconnect after refresh" causes "Full re-login required." On slow networks or with large dashboard bundles, 10 seconds may not be enough time to reload and reconnect, frustrating agents on poor connections.
- **Suggested Fix:** Consider making grace period configurable or extending to 15-20 seconds.
- **Human Decision:** ⏳ PENDING

### Summary

---

## D-embed-code - Embed Code

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/admin/embed-code.md`
**Review Agent:** review-agent-admin-embed-code.md

### Findings

#### 1. Infinite Verification Polling Has No Timeout
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #16; Section 7 - Identified Issues; Section 10 - Open Questions #3
- **Issue:** Edge Case #16 states "Verification polling timeout | Widget never connects | Keeps polling until verified ⚠️ | Could add max attempts". Section 7 confirms "Verification polling has no timeout | Dashboard polls forever if never installed | 🟢 Low". Open Question #3 asks "Is infinite verification polling acceptable?" The dashboard polls every 5 seconds forever, which wastes resources and provides no feedback to the admin if installation fails.
- **Suggested Fix:** Implement exponential backoff (5s → 10s → 20s → 1min) with a maximum poll count (e.g., 100 attempts = ~20 min). After timeout, display "Installation not detected. Check if code was placed correctly." with a "Retry" button.
- **Human Decision:** ⏳ PENDING

#### 2. CSP Documentation Missing From UI
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #17; Section 7 - Identified Issues; Section 10 - Open Questions #2
- **Issue:** Edge Case #17 notes "Page with CSP headers | Content-Security-Policy | May block widget if script-src not configured ⚠️ | Admin must whitelist CDN". Section 7 identifies "CSP documentation missing | Admins may not know to whitelist CDN | 🟡 Medium". Admins with strict Content-Security-Policy headers will experience silent widget failure with no guidance on how to fix it.
- **Suggested Fix:** Add a collapsible "Advanced: CSP Configuration" section below the embed code with the required directives: `script-src 'self' cdn.ghost-greeter.com; connect-src wss://signaling.ghost-greeter.com;`
- **Human Decision:** ⏳ PENDING

#### 3. Ad Blocker Silent Failure Not Communicated
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #10; Section 7 - Identified Issues
- **Issue:** Edge Case #10 notes "Widget blocked by ad blocker | Browser extension | Widget fails to load; no error shown to visitor ⚠️ | Silent failure". Section 7 identifies "Ad blockers block widget | Some visitors never see widget | 🟡 Medium". Admins have no visibility into how many visitors are blocked by ad blockers, and the documentation doesn't provide guidance on mitigation strategies.
- **Suggested Fix:** Document known ad blocker behavior in the embed code UI. Consider tracking CDN fetch failures server-side (if possible via headers/analytics) to provide estimated block rate. Suggest using a custom subdomain (e.g., widget.company.com) as CNAME to reduce blocking.
- **Human Decision:** ⏳ PENDING

#### 4. Widget Script 404 Has No User Feedback
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #18
- **Issue:** Edge Case #18 states "Widget script 404 | CDN unavailable | Silent failure; widget doesn't appear ⚠️ | No user feedback". If Vercel CDN has an outage or the widget build fails, admins have no way to know the widget isn't loading. Verification status may remain stuck on "Waiting for installation" with no error indication.
- **Suggested Fix:** Add error handling in the embed snippet to catch script load failures. Consider implementing a health check endpoint that admins can poll or display in the dashboard.
- **Human Decision:** ⏳ PENDING

#### 5. Old Embed Code Compatibility Risk
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #7; Section 10 - Open Questions #5
- **Issue:** Edge Case #7 notes "Old embed code after update | Version mismatch | CDN serves latest; may break if API changes ⚠️ | Breaking changes rare". Open Question #5 asks "What's the upgrade path for embed code changes?" If the embed code format or initialization API changes, there's no mechanism to notify existing customers or provide a migration path.
- **Suggested Fix:** Implement versioned embed endpoints (e.g., `/v1/widget.js`). Add version tracking to the organizations table. When breaking changes occur, email customers with outdated embed code and show a warning in their dashboard.
- **Human Decision:** ⏳ PENDING

#### 6. Screen Reader Support Not Verified for Code Block
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Screen reader support: ⚠️ Code block may need aria-label". The embed code textarea/code block should have proper ARIA labeling so screen reader users understand what they're copying.
- **Suggested Fix:** Add `aria-label="GreetNow widget embed code"` to the code block container. Ensure the "Copy Code" button is announced clearly (e.g., "Copy embed code to clipboard").
- **Human Decision:** ⏳ PENDING

#### 7. Test Mode for Installation Not Available
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #1
- **Issue:** Open Question #1 asks "Should there be a 'test mode' for installation?" Currently there's no way to test the widget without actually connecting to the signaling server. This makes it difficult for developers to verify their installation in a staging environment without affecting production analytics.
- **Suggested Fix:** Add a `testMode: true` option in the `gg('init', {...})` call that shows the widget UI without establishing a server connection. Display "[TEST MODE]" watermark on the widget when active.
- **Human Decision:** ⏳ PENDING

#### 8. GTM Installation Instructions Missing
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #6; Section 4 - Edge Cases #15
- **Issue:** Open Question #6 asks "Should GTM installation be explicitly documented?" While Edge Case #15 confirms GTM works via "standard script injection", many customers use Google Tag Manager and would benefit from explicit instructions to ensure proper configuration (trigger timing, etc.).
- **Suggested Fix:** Add a "Install via Google Tag Manager" collapsible section with step-by-step GTM instructions, including trigger configuration (e.g., Page View - All Pages).
- **Human Decision:** ⏳ PENDING

#### 9. Partial Copy Error Not Recoverable
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #11
- **Issue:** Edge Case #11 states "Embed code copied incorrectly | Partial copy | Syntax error; widget doesn't load ❌ | User error - not recoverable". While this is a user error, the embed code is long (7 lines) and easy to copy incorrectly. The current design provides no validation or feedback.
- **Suggested Fix:** Consider implementing a "Verify Installation" button that tests if the widget can connect. This helps admins confirm the code was copied correctly without waiting for verification polling.
- **Human Decision:** ⏳ PENDING

#### 10. JavaScript Disabled Not Addressed
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Edge Cases (not documented)
- **Issue:** The edge cases matrix does not address what happens when a visitor has JavaScript disabled in their browser. While rare, this is a complete failure scenario with no graceful degradation.
- **Suggested Fix:** Document that the widget requires JavaScript and does not display for visitors with JS disabled. This is expected behavior but should be explicitly documented in the edge cases matrix.
- **Human Decision:** ⏳ PENDING

#### 11. Settings Only Apply to New Sessions
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #4
- **Issue:** Section 7 notes "Settings only apply to new sessions | Live visitors don't get updated settings | 🟢 Low". Open Question #4 asks "Should widget settings apply to existing sessions?" Admins may expect settings changes to take effect immediately for all visitors, but the current behavior requires new page loads.
- **Suggested Fix:** Document this behavior clearly in the Widget Settings UI (e.g., "Changes apply to new visitor sessions"). For critical settings, consider implementing WebSocket push for real-time updates.
- **Human Decision:** ⏳ PENDING

#### 12. Pageviews Alternative Verification Unexplained
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 2 - State Machine; Section 3 - Data Flow
- **Issue:** The state machine shows "OR pageviews detected" as an alternative path to "INSTALLED" state, and the Data Flow mentions "Query widget_pageviews (alternative verification)". However, there's no explanation of when or how this fallback is used, or why a VISITOR_JOIN wouldn't be sufficient. This creates ambiguity about the verification logic.
- **Suggested Fix:** Clarify when pageview-based verification is used (e.g., if WebSocket connection fails but HTTP analytics are recorded). Document which takes precedence and why both paths exist.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 7

---

## AUTH-signup-flow - Signup Flow

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/auth/signup-flow.md`
**Review Agent:** docs/prompts/active/review-agent-auth-signup-flow.md

### Findings

#### 1. Client/Server Password Validation Mismatch
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 3 - Password Requirements
- **Issue:** Documentation states client-side validation requires 8 characters (`minLength={8}`) but "Server-side: Supabase Auth default (minimum 6 characters)". A user could potentially bypass client validation (developer tools, direct API call) and create an account with a 6-character password, violating the stated 8-character policy.
- **Suggested Fix:** Configure Supabase Auth password policy to enforce minimum 8 characters server-side to match client-side validation. Alternatively, add server-side validation in a server action before calling Supabase.
- **Human Decision:** ⏳ PENDING

#### 2. No Phone Format Validation
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #8, Section 7 - Identified Issues
- **Issue:** Edge case #8 flagged with ⚠️: "Invalid phone format | Submit invalid phone | Signup succeeds". Section 7 confirms "Invalid phone numbers stored" as a Medium severity issue. Any string is accepted as a phone number, leading to invalid data in the database.
- **Suggested Fix:** Add E.164 phone format validation (e.g., +1-XXX-XXX-XXXX) or use a phone input library with country code selection. Validate both client-side and in the database trigger.
- **Human Decision:** ⏳ PENDING

#### 3. Paywall Disabled Without Clear Timeline
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Section 10 - Open Question #2
- **Issue:** Section 7 documents "Paywall bypassed" with note "Comment says 'TODO: Re-enable paywall'". Open Question #2 asks "What's the timeline for enabling this?". Users can sign up and use the product without hitting a paywall, potentially impacting revenue.
- **Suggested Fix:** Define clear timeline for paywall re-enablement. Consider adding this to sprint backlog with specific acceptance criteria for when billing integration is complete.
- **Human Decision:** ⏳ PENDING

#### 4. Email Verification Not Checked Before Dashboard Access
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 4 - Edge Case #16, Email Verification Note, Section 10 - Open Question #1
- **Issue:** Edge case #16 flagged with ⚠️ and the "Email Verification Note" explicitly states: "If Supabase is configured to require email verification: User will be created but unverified. Middleware may still allow access (checks auth, not verification). This could be a security consideration." Unverified users could access the admin dashboard.
- **Suggested Fix:** Clarify whether email verification is enabled in Supabase config. If enabled, update middleware to check verification status and redirect unverified users to a verification prompt page.
- **Human Decision:** ⏳ PENDING

#### 5. No Success Feedback Before Redirect
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Step 9, Section 7 - Identified Issues, Section 7 - First Principles Review
- **Issue:** Section 5 step 9 flagged with ⚠️: "Success | Hard redirect to /admin | No success feedback before redirect". Section 7 confirms "Abrupt redirect may confuse" as Low severity. First Principles Review question 3 notes feedback is only "Mostly" immediate.
- **Suggested Fix:** Add brief success toast or transition screen (e.g., "Account created! Redirecting...") with 1-2 second delay before redirect to provide clear confirmation.
- **Human Decision:** ⏳ PENDING

#### 6. No Password Strength Indicator
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Case #5, Section 7 - Identified Issues
- **Issue:** Edge case #5 flagged with ⚠️: "Signup with weak password | Submit 8+ char weak password | Supabase may accept". Section 7 confirms "Users may choose weak passwords" as Low severity. Users can create easily guessable passwords like "12345678".
- **Suggested Fix:** Add password strength meter component showing weak/medium/strong feedback. Consider requiring at least one uppercase, lowercase, number, or special character.
- **Human Decision:** ⏳ PENDING

#### 7. Terms/Privacy Links May Not Be Implemented
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 5 - Consent Notice, Section 10 - Open Question #5
- **Issue:** Consent notice links to `/terms` and `/privacy` but Open Question #5 asks "are these pages implemented?". Users clicking these links may get a 404 error, breaking trust and potentially creating legal compliance issues.
- **Suggested Fix:** Verify /terms and /privacy pages exist. If not, create them with appropriate legal content or link to external hosted legal pages.
- **Human Decision:** ⏳ PENDING

#### 8. Unused Server-Side signUp Action
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 8 - Code References, Section 10 - Open Question #7
- **Issue:** Code reference table shows "Server actions (unused) | apps/dashboard/src/lib/auth/actions.ts | 6-30 | Server-side signUp". Open Question #7 asks "Should the client switch to server actions for better security?". Dead code and potential security improvement opportunity.
- **Suggested Fix:** Either delete unused server action to reduce code debt, or migrate signup to use server actions for improved security (sensitive operations server-side).
- **Human Decision:** ⏳ PENDING

#### 9. No OAuth Provider Support
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #4
- **Issue:** Open Question #4 asks "Will OAuth providers (Google, GitHub) be supported for signup? Currently only email/password." Modern users expect social login options. Lack of OAuth may increase signup friction and abandonment.
- **Suggested Fix:** Add OAuth support for Google at minimum. GitHub may be relevant depending on target audience. Update database trigger to handle OAuth user metadata format.
- **Human Decision:** ⏳ PENDING

#### 10. Organization Naming Pattern May Need Onboarding Prompt
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 3 - Data Flow, Section 10 - Open Question #6
- **Issue:** Organizations are auto-named "[user_name]'s Organization". Open Question #6 asks "Is this the final format? Should admins be prompted to rename during onboarding?". Generic naming may cause confusion for users managing multiple organizations or when sharing with team members.
- **Suggested Fix:** Add organization naming to onboarding flow, or show prompt in dashboard for users to customize organization name. Consider company name as signup field alternative.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 1
- **Medium:** 4
- **Low:** 5

---

## V-public-feedback - Public Feedback

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/visitor/public-feedback.md`
**Review Agent:** docs/prompts/active/review-agent-visitor-public-feedback.md

### Findings

#### 1. Critical Prompt/Feature Name Mismatch
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 10 - Open Questions #7; Section 1 Note
- **Issue:** The prompt description states this is a "Post-call feedback form for visitors. Collects ratings, comments, and satisfaction data after calls end." However, the actual implementation is a UserVoice/Canny-style feature request voting system and bug reporter for authenticated dashboard users (Agents/Admins), NOT website visitors or post-call surveys. This fundamental documentation mismatch could cause significant confusion during development, onboarding, or feature planning. The feature name "Public Feedback" is also misleading since it requires authentication.
- **Suggested Fix:** Update all references to accurately describe this as "Feature Request Voting & Bug Reporting System" or similar. Clarify that "public" refers to cross-organization visibility, not anonymous access.
- **Human Decision:** ⏳ PENDING

#### 2. Status Changes Don't Trigger Notifications
- **Category:** Missing Scenario
- **Severity:** High
- **Location:** Section 10 - Open Questions #5
- **Issue:** Documentation explicitly states "Should feature request status changes trigger notifications? Currently only replies and upvotes notify users; status changes (completed, declined) do not." This is a significant UX gap - users who submit feature requests have no way to know their request was implemented or declined without manually checking the feedback page.
- **Suggested Fix:** Implement notifications for status changes, especially `completed` and `declined`. These are the outcomes users most want to know about.
- **Human Decision:** ⏳ PENDING

#### 3. Silent Error States for Vote and Fetch Failures
- **Category:** UX Concern
- **Severity:** High
- **Location:** Section 4 - Error States table
- **Issue:** The error states table documents that "Fetch items fails" results in "Console error, list may be empty" and "Vote fails" results in "Console error, UI may be stale". Users receive no visible feedback when these operations fail - they just see an empty list or stale vote counts. This violates the principle of providing clear error feedback.
- **Suggested Fix:** Add user-facing error toasts or inline error messages for fetch and vote failures. Show retry buttons where appropriate.
- **Human Decision:** ⏳ PENDING

#### 4. No Pagination for Feature Requests
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Performance; Section 7 - Identified Issues; Section 10 - Open Question #1
- **Issue:** Multiple sections flag that "all items load at once" with no pagination implemented. Open Question #1 explicitly asks "Should there be pagination for feature requests? Currently all items load at once, which could be slow with thousands of requests." Section 7 lists this as a Medium severity issue suggesting "Add infinite scroll or pagination."
- **Suggested Fix:** Implement pagination or infinite scroll with reasonable page sizes (e.g., 20-50 items per page).
- **Human Decision:** ⏳ PENDING

#### 5. No Rate Limiting on Submissions
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 states "Should there be rate limiting on submissions? Currently no limit on how many feature requests or bug reports a user can submit." This could enable spam or abuse, filling the feedback system with low-quality submissions.
- **Suggested Fix:** Implement per-user rate limits (e.g., max 10 feature requests and 20 bug reports per day). Consider cooldown periods between submissions.
- **Human Decision:** ⏳ PENDING

#### 6. Vote Buttons Keyboard Accessibility Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Keyboard navigation: ⚠️ Modals trap focus but vote buttons may not be fully keyboard accessible". Up/down vote buttons are core interaction elements that should be accessible via keyboard for users who cannot use a mouse.
- **Suggested Fix:** Verify vote buttons have proper tabIndex, keyboard event handlers (Enter/Space), and focus indicators. Test with keyboard-only navigation.
- **Human Decision:** ⏳ PENDING

#### 7. Vote Counts Lack Aria-Live Announcements
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Screen reader support: ⚠️ Vote counts lack aria-live announcements". When users vote, the count changes visually but screen reader users don't receive feedback that their vote was registered or the new count.
- **Suggested Fix:** Add aria-live="polite" region for vote count updates, or announce vote confirmation via screen reader.
- **Human Decision:** ⏳ PENDING

#### 8. Large Recording/Screenshot Size Not Limited
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #17; Section 6 - Performance; Section 7 - Identified Issues
- **Issue:** Edge Case #17 states "Upload large recording | Submit with video | May timeout ⚠️ | No explicit size limit". Section 6 Performance confirms "Screenshot/recording size: No explicit limits ⚠️ Large files could timeout". The 60-second recording limit helps, but doesn't prevent multi-megabyte files that could fail during upload.
- **Suggested Fix:** Add client-side file size validation before upload. Show warning for files over threshold (e.g., 10MB) and reject files over maximum (e.g., 50MB).
- **Human Decision:** ⏳ PENDING

#### 9. Notification Click Doesn't Navigate to Specific Item
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #21; Section 7 - Identified Issues; Section 10 - Open Question #2
- **Issue:** Edge Case #21 and Section 7 flag "Notification click: Marks read, navigates to /feedback ⚠️ Doesn't scroll to specific item". Open Question #2 asks "Should notifications deep-link to specific comments?" When users click a notification about their request getting upvoted or replied to, they must manually find that item.
- **Suggested Fix:** Store item ID in notification, navigate to /feedback?item=<id>, and auto-open the detail modal for that item.
- **Human Decision:** ⏳ PENDING

#### 10. No Description Length Limit
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #7; Section 7 - Identified Issues
- **Issue:** Edge Case #7 states "Very long description | Type unlimited | No limit enforced ⚠️ | Could cause UI issues". While titles are limited to 200 characters (enforced client-side), descriptions have no maximum length, which could cause layout issues or database bloat.
- **Suggested Fix:** Add maxLength or truncation for descriptions. A reasonable limit might be 5000-10000 characters.
- **Human Decision:** ⏳ PENDING

#### 11. No Upload Progress Indicator
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Bug Report Flow Step 7
- **Issue:** Section 5 Bug Report Flow notes "Submit: Upload → close → success toast | ✅ | No progress indicator". For large screenshots or recordings, users have no visibility into upload progress, creating uncertainty about whether the upload is working.
- **Suggested Fix:** Add upload progress bar or percentage indicator during file upload.
- **Human Decision:** ⏳ PENDING

#### 12. 60-Second Recording Limit May Be Insufficient
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 asks "Is 60-second recording limit sufficient? Some complex bugs may need longer recordings to reproduce." For multi-step bugs or bugs that require setup time to reproduce, 60 seconds may cut off critical context.
- **Suggested Fix:** Consider increasing limit to 120 seconds, or allow users to submit multiple 60-second clips for complex issues. Document the limit clearly to users.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 1
- **High:** 2
- **Medium:** 5
- **Low:** 4

---

## V-video-sequencer - Video Sequencer

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/visitor/video-sequencer.md`
**Review Agent:** docs/prompts/active/review-agent-visitor-video-sequencer.md

### Findings

#### 1. "Tap to Unmute" CTA is Small and Easy to Miss
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review; Section 7 - Identified Issues
- **Issue:** Multiple sections flag this problem. Section 5 User Experience Audit marks "Widget appears" with warning noting "Tap to unmute is small". Section 5 Muted Indicator UX states "Potential Issue: On smaller widget sizes, this may be easy to miss." Section 7 Identified Issues lists "Tap to unmute is small and easy to miss | Visitors may not hear intro audio | Medium". If visitors don't notice the unmute prompt, they miss the entire audio experience which is core to the ghost greeter value proposition.
- **Suggested Fix:** Make CTA more prominent: larger text/icon, pulse animation after 2 wave loops, or position more centrally. Consider A/B testing different prompt styles.
- **Human Decision:** ⏳ PENDING

#### 2. No Wave URL Fallback Uses Intro as Wave Video
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #5; Section 7 - Identified Issues
- **Issue:** Edge Case #5 notes "No wave URL (only intro)" with warning stating "Uses introUrl as wave (loops muted)". Section 7 lists "No wave URL uses intro as wave | May feel jarring if intro is personal | Low". If an agent only uploads one video meant as a personal intro, it will be repurposed as the muted looping wave, which could look awkward (e.g., agent saying words but muted, lip movements without audio).
- **Suggested Fix:** Could show static frame or avatar instead when no wave URL is provided, or document this behavior clearly in agent video upload UI with guidance.
- **Human Decision:** ⏳ PENDING

#### 3. Wave Completion Detection May Fail for Very Short Videos
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 8 - Key Constants
- **Issue:** Section 7 states "waveCompletedOnce tolerance is 0.3s | Very short videos (<0.5s) might not register complete | Low". Section 8 Key Constants shows END_DETECTION_TOLERANCE: 0.5 (0.5 seconds). If an agent uploads an extremely short wave video (under 0.5 seconds), the completion detection using timeupdate events at ~250ms intervals may not reliably catch the end, causing the transition logic to fail.
- **Suggested Fix:** Document minimum video duration requirements (e.g., wave must be at least 1 second) in agent video upload UI. Edge case unlikely with real videos.
- **Human Decision:** ⏳ PENDING

#### 4. Minimum Wave Loops Not Configurable
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions Q-V2-001
- **Issue:** Open Question Q-V2-001 states: "Should there be a configurable 'minimum wave loops' before transitioning? Currently it's 1 loop, but some agents may want visitors to see the wave 2-3 times." Currently hardcoded to require exactly 1 complete wave playback. Some agents may prefer visitors see the attention-grabbing wave animation multiple times before the personal intro plays.
- **Suggested Fix:** Consider adding organization-level or agent-level setting for minimum wave loop count. Low priority - current behavior is reasonable default.
- **Human Decision:** ⏳ PENDING

#### 5. Same Video URL for All Three Videos Creates Odd Sequence
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions Q-V2-002
- **Issue:** Open Question Q-V2-002 asks: "What happens if all three video URLs point to the same video file? (e.g., agent only uploaded one video) - Currently would work but show same video three times in sequence which may be odd." The system would play the same video muted as wave, then unmuted as intro, then loop the same video again. This creates a jarring experience where the visitor sees the same content three times with different audio states.
- **Suggested Fix:** Detect duplicate URLs and skip redundant phases. If waveUrl === introUrl === loopUrl, could go directly to loop phase with audio once unlocked. Or validate at upload time that at least 2 distinct videos are required.
- **Human Decision:** ⏳ PENDING

#### 6. No Analytics Tracking for Video Load Failures
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions Q-V2-003
- **Issue:** Open Question Q-V2-003 asks: "Is there any analytics tracking when videos fail to load? Could be valuable for detecting CDN issues or format compatibility problems." Video load failures are handled with retry logic and error states, but there's no indication that failures are tracked or reported. This makes it impossible to detect systemic issues like CDN problems, video format incompatibility, or geographic delivery issues.
- **Suggested Fix:** Add analytics event for video load failures including: video type (wave/intro/loop), error message, retry count, user agent, and geographic region. Alert on elevated failure rates.
- **Human Decision:** ⏳ PENDING

#### 7. No Keyboard Controls for Video Playback
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Section 5 Accessibility states: "Keyboard navigation: No direct keyboard controls for video playback". Users who rely on keyboard navigation cannot control the video experience. This is particularly important for users with motor impairments who cannot use mouse/touch interactions to trigger audio unlock.
- **Suggested Fix:** Add keyboard event listeners for audio unlock (spacebar/enter), and consider escape to mute. Ensure proper focus management so keyboard users can interact with the widget.
- **Human Decision:** ⏳ PENDING

#### 8. Screen Reader Support Limited to Controls Only
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Section 5 Accessibility states: "Screen reader support: ARIA labels present on controls but not on video content". Screen reader users have no way to understand that a video is playing or what the video represents. They may not know an "agent" is greeting them since the video content (the core experience) is inaccessible.
- **Suggested Fix:** Add aria-live region announcing video state changes (e.g., "Agent greeting video playing", "Agent is waiting for you"). Consider adding text alternative or audio description option for blind users.
- **Human Decision:** ⏳ PENDING

#### 9. State Machine Missing Error Paths from Later States
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 2 - State Machine diagram
- **Issue:** The state machine diagram shows loading to error for "Video load fails", but there are no error transition paths shown from wave, intro, or loop states. However, Section 4 Edge Cases #12-13 describe "Intro playback fails" and "Loop playback fails" scenarios with specific handling. The state machine should show these error recovery paths for accuracy.
- **Suggested Fix:** Update state machine to show error transitions from wave/intro/loop states, or clarify that errors in those states trigger retry within the same state rather than transitioning to error state.
- **Human Decision:** ⏳ PENDING

#### 10. Video Format Dependency Not Validated at Upload
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Browser Compatibility
- **Issue:** Section 6 Browser Compatibility notes: "Video formats: Depends on agent-uploaded format (typically MP4)". There's no indication that video format is validated at upload time. If an agent uploads a video in an unsupported format (e.g., WebM on Safari, AV1 on older browsers), visitors on certain browsers would see load failures.
- **Suggested Fix:** Validate video format at upload time and either reject unsupported formats or transcode to universally-supported MP4/H.264. Display format requirements in upload UI.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 6

---

## FEEDBACK-ellis-survey - Ellis Survey

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/feedback/ellis-survey.md`
**Review Agent:** docs/prompts/active/review-agent-feedback-ellis-survey.md

### Findings

#### 1. Dismissal Tracked as "not_disappointed" Skews PMF Data
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 3 - Data Flow (USER DISMISSES), Section 10 - Open Question #1
- **Issue:** When a user dismisses the survey, the code sets `disappointment_level: "not_disappointed"` as the default. Open Question #1 correctly identifies this: "This seems to skew data negatively. Should it be null or a separate category?" This design choice means dismissed surveys artificially inflate the "not disappointed" count, which is the least favorable PMF response. Any PMF calculation using this data will undercount true product-market fit.
- **Suggested Fix:** Either (1) use a null/separate "dismissed" category for disappointment_level, or (2) exclude dismissed surveys from PMF percentage calculations. The database migration should be updated to allow NULL or add a "dismissed" enum value.
- **Human Decision:** ⏳ PENDING

#### 2. Cooldown Documentation Mismatch (30 Days vs 90 Days)
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, Section 10 - Open Question #2
- **Issue:** The document already flags this: "Preview page says 30 days, code says 90 days" while code shows `MIN_DAYS_SINCE_LAST_SURVEY = 90`. The preview page at `/admin/preview-survey` displays incorrect cooldown information to admins testing the survey.
- **Suggested Fix:** Update preview page copy to show 90 days to match the actual code behavior.
- **Human Decision:** ⏳ PENDING

#### 3. No Close Button Until Selection Forces User Interaction
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review Row #3, Section 7 - Identified Issues
- **Issue:** Documentation notes Step 3: "Try to close without selecting - No close button visible ⚠️ Might feel trapped". The identified issues section also flags "No close button initially - User might feel trapped 🟡 Medium". Users who don't want to participate in the survey have no way to dismiss it without first selecting an option.
- **Suggested Fix:** Add visible X button from the start but track "dismissed before selection" as a separate data point. This respects user autonomy while still capturing engagement metrics.
- **Human Decision:** ⏳ PENDING

#### 4. Backdrop Click Does Nothing Before Selection
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - UI/UX Review Row #4
- **Issue:** Documentation notes: "Click backdrop without selecting - Nothing happens ⚠️ Could confuse users". Standard modal behavior is that clicking outside closes the modal. Users may repeatedly click the backdrop expecting it to dismiss, creating frustration.
- **Suggested Fix:** Either (1) allow backdrop dismiss with tracking, or (2) add subtle visual feedback (shake animation, tooltip) to indicate the modal requires interaction.
- **Human Decision:** ⏳ PENDING

#### 5. Multiple Open Tabs Can Each Show Survey
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases Row #16, Section 7 - Identified Issues
- **Issue:** Documentation flags: "Multiple tabs open - sessionStorage - Each tab tracks independently ⚠️ Could see survey in each tab". Since sessionStorage is tab-scoped, a user with multiple dashboard tabs could see the survey modal in each tab independently, leading to survey fatigue and duplicate responses.
- **Suggested Fix:** Use localStorage instead of sessionStorage (as suggested in doc), or implement cross-tab communication via BroadcastChannel API to prevent duplicate surveys in the same browser session.
- **Human Decision:** ⏳ PENDING

#### 6. Page Refresh During Timer May Cause Double Survey Attempts
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases Row #11
- **Issue:** Documentation flags: "User refreshes during timer - Page reload - Timer resets, may show if still eligible ⚠️ Session might see two attempts". The timer state isn't persisted, so a user who refreshes gets a new random timer. While sessionStorage prevents showing twice in the same session, the timer resetting could lead to unexpected survey appearances at different times than originally scheduled.
- **Suggested Fix:** Store timer start time in sessionStorage and calculate remaining time on page load rather than always starting fresh.
- **Human Decision:** ⏳ PENDING

#### 7. Keyboard Navigation Not Explicitly Handled
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes with ⚠️: "Keyboard navigation: Not explicitly handled (relies on native button behavior)". Users who navigate via keyboard should be able to tab through options, select with Enter/Space, and navigate to submit/skip buttons. Relying only on native behavior may not provide optimal keyboard UX for modal interaction patterns.
- **Suggested Fix:** Add explicit keyboard handling: focus trap within modal, Tab navigation between options, Enter to select highlighted option, Escape to dismiss (after selection).
- **Human Decision:** ⏳ PENDING

#### 8. Screen Reader Support Missing (No ARIA Labels)
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes with ⚠️: "Screen reader support: No aria-labels on modal". The survey modal lacks proper ARIA attributes for screen reader users. This is an accessibility gap that may affect visually impaired users' ability to complete the survey.
- **Suggested Fix:** Add role="dialog", aria-modal="true", aria-labelledby for title, aria-describedby for question, and proper button labels. Announce option selection to screen readers.
- **Human Decision:** ⏳ PENDING

#### 9. Sequential Eligibility Queries Could Be Parallelized
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Performance, Section 7 - Identified Issues
- **Issue:** Documentation notes: "Multiple DB queries for eligibility - 3 separate queries, sequential ⚠️ Could be optimized". The eligibility check runs 3 sequential database queries (cooldown, call count, last activity). On slower connections or under load, this adds latency to survey triggering.
- **Suggested Fix:** Parallelize independent queries using Promise.all() or create a single Supabase RPC function that returns all eligibility data in one round-trip.
- **Human Decision:** ⏳ PENDING

#### 10. No LocalStorage Fallback for Session Tracking
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability
- **Issue:** Documentation notes: "Session tracking fails - localStorage fallback could help but not implemented". If sessionStorage fails (rare but possible in private browsing modes or storage quota issues), there's no fallback, potentially showing survey unexpectedly.
- **Suggested Fix:** Implement localStorage fallback, or use try-catch with graceful degradation if storage APIs fail.
- **Human Decision:** ⏳ PENDING

#### 11. Other Survey Triggers Not Implemented
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #4
- **Issue:** Open Question #4 asks: "What triggers besides 'random' exist?" The triggered_by field in the migration comments mentions "milestone" and "post_call" as potential triggers, but only "random" is currently implemented. The feature may be incomplete if these other triggers were planned.
- **Suggested Fix:** Document whether milestone/post_call triggers are planned features or deprecated ideas. If planned, add to roadmap; if deprecated, remove from migration comments to avoid confusion.
- **Human Decision:** ⏳ PENDING

#### 12. No Maximum Follow-up Text Length
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 4 - Edge Cases Row #12, Section 10 - Open Question #5
- **Issue:** Edge case #12 notes "Very long follow-up text - No limit - Accepted (TEXT column in DB) ✅ No max length enforced". Open Question #5 asks "Should there be a maximum follow-up text length?" While DB can handle TEXT columns, extremely long responses could cause display issues in the Platform Admin feedback viewer and increase storage costs.
- **Suggested Fix:** Add client-side maxLength (e.g., 2000 characters) with character counter to guide users while allowing substantive feedback.
- **Human Decision:** ⏳ PENDING

#### 13. PMF 40% Threshold Not Calculated or Displayed
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Question #6
- **Issue:** Open Question #6 states: "How is the 40% PMF threshold tracked? Survey collects data but there's no visible dashboard showing the PMF percentage calculation." The core purpose of the Ellis Survey is to measure if 40%+ of users would be "very disappointed" without the product. Without calculating and displaying this percentage, the feature's primary value proposition is not realized.
- **Suggested Fix:** Add PMF percentage calculation to the Platform Feedback Dashboard showing: (very_disappointed_count / total_completed_surveys) * 100, with trend over time and 40% threshold line.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 13
- **Critical:** 0
- **High:** 1
- **Medium:** 5
- **Low:** 7

---

## STATS-coverage-stats - Coverage Stats

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/stats/coverage-stats.md`
**Review Agent:** docs/prompts/active/review-agent-stats-coverage-stats.md

### Findings

#### 1. DST Transition Causes 1-Hour Data Discrepancy
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, row #9
- **Issue:** Edge case #9 is flagged with ⚠️ stating "Date range spans timezone change | DST transition | Uses server timezone consistently | ⚠️ | May have 1 hour discrepancy". This acknowledged discrepancy means coverage stats crossing DST boundaries will have inaccurate hourly bucketing - pageviews recorded at 2am could be attributed to 1am or 3am depending on transition direction. For organizations analyzing hourly patterns around DST changes, this could lead to misleading staffing recommendations.
- **Suggested Fix:** Either convert all timestamps to UTC before hourly bucketing, or add a warning in the UI when date range spans a DST transition. Document the behavior explicitly so admins understand potential discrepancies.
- **Human Decision:** ⏳ PENDING

#### 2. Heatmap Missing ARIA Labels for Screen Reader Accessibility
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility; Section 7 - Identified Issues
- **Issue:** Accessibility section explicitly notes "Screen reader support: ⚠️ Heatmap needs aria labels". The DayHourHeatmap component renders a 7×24 grid of cells showing coverage intensity, but without aria-label attributes, screen reader users cannot access the coverage data at all. This is a significant accessibility gap for an important analytics feature.
- **Suggested Fix:** Add aria-label to each heatmap cell with format like "Monday 9am: 45 visitors, 12 missed opportunities, 73% coverage". Also add role="grid" and appropriate row/column headers.
- **Human Decision:** ⏳ PENDING

#### 3. Session Overlap Calculation is O(n×m×d) - Performance Risk for Long Date Ranges
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Technical Concerns, Performance table; Section 7 - Identified Issues
- **Issue:** Documentation explicitly flags "Session overlap calculations | O(n × m × days) where n=sessions, m=24 | ⚠️ Could be slow for long ranges". The suggested fix in Section 7 recommends "Pre-aggregate coverage by hour in DB" but this hasn't been implemented. For organizations with many agents over 90+ day ranges, this could cause noticeable UI latency or even timeout errors.
- **Suggested Fix:** Implement hourly pre-aggregation as suggested, or add a date range limit (e.g., max 90 days) with messaging to users about why.
- **Human Decision:** ⏳ PENDING

#### 4. No Data Retention Policy for widget_pageviews
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 10 - Open Questions, #5
- **Issue:** Open Question #5 states "What retention period for pageview data? Currently unbounded. May need archival/aggregation policy for scale." This is a scalability time bomb - pageviews table will grow indefinitely, eventually causing performance degradation and increased storage costs. High-traffic sites could generate millions of pageviews per month.
- **Suggested Fix:** Implement a retention policy: either archive raw pageviews older than X months to cold storage, or pre-aggregate old data into daily summaries and delete raw records. Document the policy for admins.
- **Human Decision:** ⏳ PENDING

#### 5. Timezone Handling Problematic for Multi-Timezone Organizations
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions, #3
- **Issue:** Open Question #3 raises: "How should timezone differences be handled? Current implementation uses server timezone. Multi-timezone orgs might want local time grouping." For organizations with agents in multiple timezones (e.g., US East + West coast), the heatmap showing "9am has coverage gap" is ambiguous - which 9am? Agent schedules are typically in local time, making server-timezone coverage data difficult to act upon.
- **Suggested Fix:** Add timezone selector to coverage stats UI, or detect agent timezones and show multiple overlaid views. At minimum, display the timezone being used prominently in the UI.
- **Human Decision:** ⏳ PENDING

#### 6. No Maximum Date Range Limit Despite Timeout Risk
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Error States, "Database timeout" row
- **Issue:** Error States table acknowledges "Database timeout | Large data volume | Loading spinner, then error | Recovery: Reduce date range". However, nothing prevents users from selecting extremely large date ranges that will time out. The UI allows arbitrary date selection with no guardrails, leading to a poor user experience when queries inevitably fail.
- **Suggested Fix:** Either enforce a maximum date range (e.g., 180 days) in the date picker, or show a warning when selecting ranges > 90 days. Could also implement progressive loading for large ranges.
- **Human Decision:** ⏳ PENDING

#### 7. No Real-time Coverage Indicator
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, row 3; Section 10 - Open Questions, #1
- **Issue:** Section 7 identifies "No real-time coverage tracking | Admin sees historical, not current | 🟢 Low | Could add live coverage indicator". Admins managing schedules would benefit from seeing current coverage state (e.g., "Right now: 2 agents online, covering 3 pools"). Currently they must infer current state from agent list rather than having a dedicated coverage view.
- **Suggested Fix:** Add a "Live Coverage" card or indicator showing current agent availability across pools. Could use existing WebSocket infrastructure.
- **Human Decision:** ⏳ PENDING

#### 8. No Alerting System for Low Coverage Periods
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions, #2
- **Issue:** Open Question #2 asks "Should there be alerts for low coverage? Currently passive reporting only. Could add email/slack alerts when coverage drops below threshold." This is a valuable feature gap - admins must manually check coverage stats rather than being proactively notified of staffing gaps. A sudden traffic surge with no agents online would go unnoticed until later review.
- **Suggested Fix:** Implement configurable coverage threshold alerts (e.g., "Alert me when coverage drops below 80% for more than 15 minutes"). Integrate with existing notification infrastructure.
- **Human Decision:** ⏳ PENDING

#### 9. No Page Value Weighting in Coverage Calculations
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions, #4
- **Issue:** Open Question #4 raises "Should coverage be weighted by page value? Currently all pageviews are equal. High-value pages (pricing, contact) could be weighted higher." Missing a visitor on the pricing page is likely more costly than missing one on a blog post, but current metrics treat them identically. This reduces the actionability of staffing recommendations.
- **Suggested Fix:** Consider adding page importance weights or at least allowing filtering by URL pattern. Show "missed on high-intent pages" as a separate metric.
- **Human Decision:** ⏳ PENDING

#### 10. Fallback Query Retry Mechanism Not Documented
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Error States, "widget_pageviews query fails" row
- **Issue:** Error States table mentions "widget_pageviews query fails | Missing column (migration not run) | Fallback query without visitor_country_code | Automatic retry". The "automatic retry" behavior is not explained. It's unclear: Does it retry the same query? Does it try a simpler query? How many retries? What if the fallback also fails? The error recovery path needs more detail.
- **Suggested Fix:** Document the exact fallback query logic and retry behavior. Specify retry count, delay, and ultimate failure state.
- **Human Decision:** ⏳ PENDING

#### 11. Empty Date Range Edge Case Has Inconsistent Behavior
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases, row #10
- **Issue:** Edge case #10 states "Empty date range | From > To | Returns 0 data | ✅ | numDays calculated as 1 minimum". This is contradictory - if From > To is an invalid range, it should either be rejected with an error or swapped to become valid. Returning "0 data" while calculating "numDays = 1 minimum" is inconsistent. The avgAgentsOnline calculation would divide by 1 day that never existed.
- **Suggested Fix:** Either swap From/To dates if From > To, or show validation error preventing the query. Don't silently accept invalid ranges.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 6

---

## API-invites-api - Invites API

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/api/invites-api.md`
**Review Agent:** docs/prompts/active/review-agent-api-invites-api.md

### Findings

#### 1. Revoke Flow Unconditionally Removes Billing Seat Regardless of Role
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 3 - Data Flow, "ADMIN REVOKES INVITE"
- **Issue:** The documented revoke flow shows unconditional seat removal: `POST /api/billing/seats { action: "remove", quantity: 1 }` after deleting any invite. However, according to Section 2 and Section 3, only agent invites charge a seat at send time. Admin invites do not charge a seat until acceptance (and only if they choose to take calls). If an admin invite is revoked, the system would attempt to remove a seat that was never added, potentially causing billing discrepancies or API errors.
- **Suggested Fix:** Add role check before seat removal: only call billing seats API if the revoked invite had `role = 'agent'`. Document this conditional logic explicitly.
- **Human Decision:** ⏳ PENDING

#### 2. Billing Failure on Admin Accept Continues Silently
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Reliability
- **Issue:** Documentation states "Billing failure on accept (admin) | Logged, continues anyway". When an admin choosing "Yes, I'll take calls" has their seat allocation fail via Stripe/API error, the account creation continues anyway. This leaves the system in an inconsistent state where the admin expects to take calls but may not have a billing seat allocated, causing potential billing discrepancies.
- **Suggested Fix:** Show warning toast to user if seat allocation fails during acceptance. Consider blocking account creation or flagging account for manual billing review.
- **Human Decision:** ⏳ PENDING

#### 3. Invites Don't Count Against Organization max_agents Limit
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 explicitly asks: "Should invites count against org's max_agents limit? Currently only checked via seat billing." Organizations could potentially send more invites than their max_agents allows, with validation only occurring at billing level. This creates a confusing experience where invites succeed but may cause billing surprises or implicit seat expansion.
- **Suggested Fix:** Validate pending invite count + active agents against max_agents limit before allowing new invites. Show clear error message when limit would be exceeded.
- **Human Decision:** ⏳ PENDING

#### 4. No Dedicated Resend Endpoint
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #2
- **Issue:** Documentation explicitly notes: "No resend endpoint | Admin must revoke + re-invite | 🟢 Low" and Open Question #2 asks "Should there be a dedicated resend endpoint?" Currently, if an invite email is lost or expires, admins must manually revoke (which may trigger seat credit) and re-send (which charges again). This is cumbersome and may cause unnecessary billing churn.
- **Suggested Fix:** Add `/api/invites/resend` endpoint that extends `expires_at` and re-sends the email without touching billing records or creating a new invite.
- **Human Decision:** ⏳ PENDING

#### 5. Expired Invites Accumulate in Database Indefinitely
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Section 7 lists: "Expired invites not auto-cleaned | DB accumulates old records | 🟢 Low". Section 10 asks: "Should expired invites be automatically cleaned up? Currently they stay in DB indefinitely (filtered by query)". Over time, the invites table will grow with expired records that are never removed, potentially affecting query performance and storage.
- **Suggested Fix:** Add periodic cleanup job (e.g., daily cron) that deletes invites where `expires_at < NOW() - INTERVAL '30 days'`. Alternatively, archive expired invites to a separate table.
- **Human Decision:** ⏳ PENDING

#### 6. Old Expired Invite Not Deleted When Sending New Invite to Same Email
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #7; Section 7 - Identified Issues
- **Issue:** Edge Case #7 states "Resend expired invite | Send again | Creates new invite (old stays expired) | ⚠️ | Old record remains but filtered by expiry". Section 7 confirms: "Old invite not deleted on 'resend' | Multiple invite records per email | 🟢 Low". When an admin sends a new invite to an email with an expired invite, both records exist in the database. This creates data redundancy.
- **Suggested Fix:** When creating a new invite, delete any existing expired invites for the same org+email combination. This keeps the invites table clean.
- **Human Decision:** ⏳ PENDING

#### 7. No Frontend Email Validation
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #10; Section 7 - Identified Issues
- **Issue:** Edge Case #10 flags: "Invite with invalid email format | Bad email | Handled by Resend (likely fails silently) | ⚠️ | No frontend validation visible". Section 7 lists: "No email validation on frontend | Invalid emails fail silently | 🟢 Low". Admins can submit malformed email addresses, and the invite is created in the database even if email delivery fails.
- **Suggested Fix:** Add client-side email format validation (regex check) before form submission. Show inline validation error for malformed emails.
- **Human Decision:** ⏳ PENDING

#### 8. Resend Quota Exceeded Handling Undefined
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 asks: "What happens if Resend quota is exceeded? Presumably email fails silently, invite still created." If the organization's Resend API quota is exhausted, invite emails would fail to deliver but invites would still be created in the database. Admins would have no visibility into this failure.
- **Suggested Fix:** Check Resend API response for quota errors and surface them to the admin. Consider adding monitoring/alerting for email delivery failures.
- **Human Decision:** ⏳ PENDING

#### 9. 7-Day Invite Expiration Is Hardcoded
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open Question #5 asks: "Is 7-day expiration the right duration? Hardcoded, could be configurable per-org." Organizations with different onboarding timelines (HR processes that take weeks, or security policies requiring same-day acceptance) cannot adjust the expiry window to match their needs.
- **Suggested Fix:** Add organization-level setting for invite expiry duration with sensible default (7 days) and min/max bounds (1-30 days).
- **Human Decision:** ⏳ PENDING

#### 10. Keyboard Navigation Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states "Keyboard navigation: ⚠️ Not verified". The invite modal and accept invite page have multiple form fields and buttons that should be keyboard-accessible. Without verification, keyboard-only users may have difficulty completing invite workflows.
- **Suggested Fix:** Conduct keyboard navigation audit on both the invite send modal and accept invite page. Verify Tab order, visible focus indicators, and Enter/Space activation on all interactive elements.
- **Human Decision:** ⏳ PENDING

#### 11. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Screen reader support: ⚠️ Form labels present but not verified". The accept invite page includes role choice buttons and form fields that may lack proper ARIA attributes. Screen reader users may have difficulty understanding the admin role choice (with billing implications).
- **Suggested Fix:** Verify ARIA labels on all form elements. Ensure role choice buttons have descriptive labels explaining billing implications. Add aria-live regions for form validation errors.
- **Human Decision:** ⏳ PENDING

#### 12. No Explicit Retry Mechanism for Server Errors
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 4 - Error States
- **Issue:** Error States shows "500 Server error | Unexpected failure | Internal server error | Retry" as recovery path, but the documentation doesn't describe an explicit retry mechanism in the UI. Users experiencing server errors must manually attempt the operation again with no guided recovery.
- **Suggested Fix:** Add retry button in error toast notifications or implement automatic retry with exponential backoff for transient failures.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 1
- **Medium:** 4
- **Low:** 7
---

## AUTH-password-reset - Password Reset

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/auth/password-reset.md`
**Review Agent:** review-agent-auth-password-reset.md

### Findings

#### 1. Existing Sessions Not Invalidated on Password Reset
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open Question #2 states: "Are existing sessions invalidated on password reset? Code does not explicitly invalidate other sessions. Supabase may handle this, but behavior is not verified." If a user resets their password due to account compromise, active attacker sessions may remain valid, defeating the security purpose of the password reset.
- **Suggested Fix:** Verify Supabase behavior regarding session invalidation on password change. If sessions persist, implement explicit invalidation of all other sessions when password is reset using Supabase session management APIs.
- **Human Decision:** ⏳ PENDING

#### 2. No Password Visibility Toggle
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 states: "No confirmation for password visibility | User can't verify what they typed | 🟡 Medium". Users must enter their new password twice without any ability to see what they've typed, increasing error rates and frustration, especially on mobile devices.
- **Suggested Fix:** Add show/hide password toggle button (eye icon) to both password input fields to let users verify their input before submission.
- **Human Decision:** ⏳ PENDING

#### 3. Weak Password Requirements
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5; Section 6 - Security
- **Issue:** Open Question #5 asks: "Should password requirements be stricter? Currently only 8 character minimum. No requirements for uppercase, numbers, or special characters." Modern security standards recommend complexity requirements to prevent weak passwords that are easily guessed or cracked.
- **Suggested Fix:** Implement password complexity requirements (e.g., at least one uppercase, one lowercase, one number, one special character) or adopt a password strength scoring system. Add real-time password strength indicator to guide users.
- **Human Decision:** ⏳ PENDING

#### 4. No Client-Side Debounce on Email Submit
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 4 - Edge Case #6
- **Issue:** Section 7 states: "No client-side debounce on email submit | Multiple emails possible | 🟢 Low". Edge Case #6 confirms: "Multiple reset requests in sequence | Click 'Send' multiple times | Supabase sends multiple emails | ⚠️ | No client-side debounce". Users may receive multiple reset emails, causing confusion about which link to use.
- **Suggested Fix:** Add debounce or disable the submit button after first click until response is received. Show loading state to indicate request is in progress.
- **Human Decision:** ⏳ PENDING

#### 5. Accessibility: No aria-live Regions for Error Announcements
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states: "Error announcements: ⚠️ Errors shown visually but no aria-live regions". Screen reader users will not hear error messages (password mismatch, password too short, link expired) when they occur, violating WCAG 2.1 accessibility guidelines.
- **Suggested Fix:** Wrap error message containers with aria-live="polite" or aria-live="assertive" attributes so screen readers announce errors as they appear.
- **Human Decision:** ⏳ PENDING

#### 6. Accessibility: No Focus Trap in Modal-Like Card
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states: "Focus management: ⚠️ No focus trap in modal-like card". The password reset form appears in a centered card that visually resembles a modal, but keyboard users can tab outside the form area to page elements behind it, causing confusion.
- **Suggested Fix:** Implement focus management to keep keyboard focus within the form card during the reset flow, or ensure the card styling doesn't imply modal behavior if focus trapping isn't intended.
- **Human Decision:** ⏳ PENDING

#### 7. Accessibility: Color Contrast Not Verified
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation states: "Color contrast: ⚠️ Not verified (uses theme colors)". The form may not meet WCAG AA contrast ratio requirements (4.5:1 for normal text, 3:1 for large text), making it difficult for users with visual impairments to read.
- **Suggested Fix:** Audit all text elements on forgot-password and reset-password pages for WCAG AA compliance. Verify button colors, input borders, and error messages meet contrast requirements.
- **Human Decision:** ⏳ PENDING

#### 8. Back Navigation After Success Shows Stale State
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 4 - Edge Case #13; Section 6 - Reliability
- **Issue:** Section 7 states: "Back navigation after success shows stale state | Confusion if user hits back | 🟢 Low". Section 6 confirms: "Browser back button | No special handling (may cause confusion)". If user clicks browser back button after successful password reset, they may see the password form again with potential for confusion or resubmission attempts.
- **Suggested Fix:** Use router.replace() or history.replaceState() after successful password update to prevent back navigation to the reset form. Alternatively, redirect users to login page if they navigate back after success.
- **Human Decision:** ⏳ PENDING

#### 9. Token Expiration Time Not Verified
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #1; Section 4 - Edge Case #3
- **Issue:** Open Question #1 states: "What is the exact token expiration time? Supabase default is 1 hour, but this may be configurable in Supabase dashboard. Not exposed in code." The actual token lifetime is undocumented and could differ from the assumed 1 hour, affecting user experience if links expire sooner than expected.
- **Suggested Fix:** Document the configured token expiration in Supabase dashboard. Consider displaying expected link validity period in the "Check your email" confirmation message (e.g., "Link expires in 1 hour").
- **Human Decision:** ⏳ PENDING

#### 10. Rate Limiting Configuration Not Documented
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 states: "Is there rate limiting on forgot-password requests? Supabase has built-in rate limiting, but the specific limits are not documented in this codebase." Without knowing rate limits, support cannot troubleshoot "too many requests" errors, and security team cannot assess abuse protection adequacy.
- **Suggested Fix:** Document Supabase's rate limiting configuration for password reset requests. Add user-facing error handling if rate limit is exceeded, with message like "Too many requests. Please try again in X minutes."
- **Human Decision:** ⏳ PENDING

#### 11. 2-Second Validation Timeout May Feel Slow
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 3 - Triggers & Events
- **Issue:** Section 7 states: "2s timeout may feel slow | User waits for 'Link Expired' | 🟢 Low". When clicking a valid reset link, users wait up to 2 seconds for the password form to appear. If the link is invalid, users wait the full 2 seconds before seeing an error.
- **Suggested Fix:** Reduce timeout to 1-1.5 seconds or implement progressive disclosure (show spinner immediately, update message at 1s if still waiting). Consider optimistic UI for valid token detection.
- **Human Decision:** ⏳ PENDING

#### 12. Reset Link Reuse Behavior Unclear
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #4
- **Issue:** Edge Case #4 states: "Reset link clicked twice | Second click after password changed | Shows form if session valid, or error | ⚠️ | Depends on Supabase session state". The behavior is marked with ⚠️ and documented as uncertain. Users who click their reset link after already resetting may see the form again (potentially allowing multiple password changes) or get a confusing error.
- **Suggested Fix:** Verify and document exact behavior when reset link is reused. If session remains valid after password change, consider explicitly invalidating the reset token or showing a "Password already changed" message with redirect to login.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 1
- **Medium:** 4
- **Low:** 7

---

## V-visitor-call - Visitor Call (Call Initiation & Active Call)

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/visitor/visitor-call.md`
**Review Agent:** `docs/prompts/active/review-agent-visitor-visitor-call.md`

### Findings

#### 1. No Explicit Double-Click Protection
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #4; Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Documentation explicitly flags that there is "No explicit debounce" for camera/mic button clicks (Edge Case #4 marked with ⚠️❓). Open Question #1 asks "Is there implicit protection via state checking, or could rapid clicks cause issues?" Referenced as Q-1202-001. Rapid double-clicks could potentially send duplicate `call:request` events before state transitions to `waiting_for_agent`.
- **Suggested Fix:** Add debounce (e.g., 500ms) to `handleCameraToggle` and `handleMicToggle` functions, or verify state transition prevents duplicate requests.
- **Human Decision:** ⏳ PENDING

#### 2. Network Drop Mid-Call Behavior Ambiguous
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #15
- **Issue:** Edge Case #15 states "Network drops mid-call → WebRTC: 'disconnected' state" with behavior marked as ⚠️ "May recover or fail". This is vague and doesn't explain: (a) how long before recovery is attempted, (b) what user feedback is shown during disconnection, (c) when the system gives up and transitions to error state, (d) whether visitor or agent is notified of temporary disconnection.
- **Suggested Fix:** Document specific recovery behavior: timeout duration, UI feedback during disconnection (e.g., "Reconnecting..." indicator), and failure threshold before ending call.
- **Human Decision:** ⏳ PENDING

#### 3. Color Contrast Accessibility Relies on External Theme
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section marks color contrast with ⚠️ and states "Relies on theme (dark/light/liquid-glass)". This means WCAG color contrast compliance is not guaranteed - it depends entirely on which theme the visitor's site has configured. Themes may not have been tested for accessibility compliance.
- **Suggested Fix:** Ensure all theme variants (dark, light, liquid-glass) are tested and validated for WCAG 2.1 AA minimum contrast ratio (4.5:1 for normal text, 3:1 for large text).
- **Human Decision:** ⏳ PENDING

#### 4. Synchronous LocalStorage Operations on Every Call
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Technical Concerns - Performance
- **Issue:** Documentation notes ⚠️ "LocalStorage operations on every call (small but synchronous)". While flagged as minor, synchronous localStorage calls on the main thread can cause jank, especially on slower devices or when localStorage is large. This affects the call initiation critical path.
- **Suggested Fix:** Consider using async storage wrapper or web worker for localStorage operations, or batch writes to reduce frequency.
- **Human Decision:** ⏳ PENDING

#### 5. Reconnect Token Stored in LocalStorage
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Identified Issues table notes "Reconnect token exposed in localStorage" as a "Theoretical security concern" with 🟢 severity, mitigated by 5-minute expiry. While the mitigation is noted, any script with access to localStorage (XSS, third-party scripts) could steal the token during its validity window and potentially hijack the call reconnection.
- **Suggested Fix:** Current 5-min expiry is reasonable mitigation. Consider documenting this in security review notes. Could also consider sessionStorage (cleared on tab close) if cross-tab reconnection isn't needed.
- **Human Decision:** ⏳ PENDING

#### 6. RNA Timeout vs Total Waiting Timeout Distinction Unclear
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 3 - Data Flow; Section 4 - Edge Cases #5, #10
- **Issue:** Documentation mentions two different timeouts that could be confused: (1) RNA timeout of "15s default" (Data Flow Step 1, Edge Case #5) which is per-agent ring time, and (2) "45s timeout waiting" (Edge Case #10, State Definitions) which is the total visitor wait time before showing "Taking longer than usual" UI. The relationship between these isn't explicitly explained. If there are 3 agents, does visitor potentially wait 45s (3x15s) before the 45s UI timeout even kicks in?
- **Suggested Fix:** Add explicit documentation clarifying: "RNA timeout (15s) applies per-agent. 45s total timeout triggers 'Taking longer' UI regardless of agent cycling. Total call request timeout is [X]s after which request is abandoned."
- **Human Decision:** ⏳ PENDING

#### 7. WebRTC Browser Support Check Not Documented
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases; Section 2 - Error States
- **Issue:** Error States table documents camera/mic permission errors and connection failures, but doesn't mention what happens if the visitor's browser doesn't support WebRTC (e.g., very old browsers, some in-app browsers). No Edge Case row addresses "Browser doesn't support WebRTC/getUserMedia".
- **Suggested Fix:** Add Edge Case row: "Browser lacks WebRTC support → Check RTCPeerConnection/getUserMedia existence → Show error: 'Your browser doesn't support video calls. Please use Chrome, Firefox, Safari, or Edge.'"
- **Human Decision:** ⏳ PENDING

#### 8. Agent Rejection Invisible to Visitor - Intentional but Undocumented Rationale
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 3 - Triggers & Events; Section 4 - Edge Cases #7
- **Issue:** When an agent rejects a call, Edge Case #7 states "Routes to next agent silently" and "Visitor unaware". The Events table confirms visitor "keeps waiting" during rejection. While this may be intentional UX (to avoid visitor anxiety), the rationale isn't documented. Visitors may wonder why connection is taking long when agents are actively rejecting.
- **Suggested Fix:** Document the UX rationale: "Agent rejections are silent to avoid visitor anxiety. Visitor sees continuous 'Connecting...' until an agent accepts or all agents are exhausted." Consider if there should be any subtle indicator after extended wait times.
- **Human Decision:** ⏳ PENDING

#### 9. State Guard for Duplicate Call Initiation Not Explicit
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 2 - State Machine
- **Issue:** The state machine shows `open --> waiting_for_agent: Click camera/mic (media granted)`. However, there's no explicit transition or guard documented for what happens if user clicks camera/mic while already in `waiting_for_agent` state. Is it ignored? Does it cause issues? This relates to Finding #1 but is distinct - it's about state-based guards, not timing-based debounce.
- **Suggested Fix:** Add explicit note: "Camera/mic clicks while in waiting_for_agent state are ignored (state check prevents re-initiation)." Or add transition: "waiting_for_agent --> waiting_for_agent: Click camera/mic [ignored]".
- **Human Decision:** ⏳ PENDING

#### 10. Open Question Q-1202-001 Remains Unresolved
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1; Referenced throughout document
- **Issue:** The document references "Q-1202-001" multiple times (Edge Case #4, Section 7, Section 10) regarding double-click protection, but this question remains open/unresolved. It's unclear if this question ID is tracked in a separate system or if it's just a documentation placeholder. The issue has been identified but not resolved.
- **Suggested Fix:** Either resolve the open question with investigation results, or create a formal ticket to investigate and implement double-click protection.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 5

---

## STATS-agent-stats - Agent Stats

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/stats/agent-stats.md`
**Review Agent:** docs/prompts/active/review-agent-stats-agent-stats.md

### Findings

#### 1. No Pagination for Large Datasets
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #8; Section 6 - Performance; Section 7 - Identified Issues
- **Issue:** Multiple sections flag this concern: Edge Case #8 marks "Large date range (1+ year)" with ⚠️ warning noting "All data loaded, no pagination" and "May be slow for high-volume agents". Section 6 Performance explicitly states "Large dataset queries | No pagination, fetches all calls in range | ⚠️ May be slow for >1000 calls". Section 7 Identified Issues confirms "Large date ranges slow | Performance degrades with >1000 calls | 🟡 Medium". Without pagination, high-volume agents stats pages will degrade significantly.
- **Suggested Fix:** Implement server-side pagination or cursor-based fetching for call_logs and agent_sessions. Alternatively, enforce maximum date range (e.g., 90 days) with warning for longer ranges.
- **Human Decision:** ⏳ PENDING

#### 2. Keyboard Navigation Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review - Accessibility
- **Issue:** Accessibility audit explicitly states "Keyboard navigation: ⚠️ Not verified". The agent stats page contains multiple interactive elements (tabs, date picker, presets, disposition breakdown) that should be keyboard-accessible. Without verification, keyboard-only users may be unable to navigate effectively.
- **Suggested Fix:** Conduct keyboard accessibility audit. Verify Tab order is logical, all interactive elements have visible focus indicators, and Enter/Space activates buttons and tabs correctly.
- **Human Decision:** ⏳ PENDING

#### 3. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review - Accessibility
- **Issue:** Accessibility audit states "Screen reader support: ⚠️ Not verified". The page is data-dense with stat cards, percentage displays, and visual elements (disposition breakdown bars) that require proper ARIA labels for screen reader users to understand the content.
- **Suggested Fix:** Add ARIA labels to stat cards (e.g., aria-label="Answer Rate: 85%"). Ensure tab panels have proper role="tabpanel" and aria-labelledby attributes. Add accessible descriptions to visual charts.
- **Human Decision:** ⏳ PENDING

#### 4. No Loading Indicator During Date Range Change
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility; Section 7 - First Principles Review; Section 7 - Identified Issues
- **Issue:** Multiple sections flag this: Section 5 notes "Loading states: ⚠️ No explicit loading spinner during date change". Section 7 First Principles asks "Is feedback immediate?" and answers "⚠️ Mostly - No loading indicator during date change". Identified Issues confirms "No loading state on date change | User may think click did not register | 🟢 Low". When admin changes date range, there is no visual feedback during the fetch, causing confusion about whether the action registered.
- **Suggested Fix:** Add loading spinner or skeleton UI during date range change refetch. Even a brief visual indicator provides important feedback.
- **Human Decision:** ⏳ PENDING

#### 5. No Export Functionality for Agent Stats
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 explicitly lists "No export functionality | Cannot download data for external analysis | 🟢 Low". Admins viewing agent performance cannot export the data for use in spreadsheets, reports, or external analysis tools.
- **Suggested Fix:** Add CSV export button that exports visible stats and optionally the underlying call logs for the selected date range.
- **Human Decision:** ⏳ PENDING

#### 6. No Agent Comparison View
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues
- **Issue:** Section 7 lists "No comparison view | Cannot compare agents side-by-side | 🟢 Low". Admins who want to compare two agents performance must manually navigate between individual agent pages and remember values. This makes identifying top performers or spotting outliers tedious.
- **Suggested Fix:** Add multi-select capability on agents list to compare 2-4 agents side-by-side, or provide a summary table view with sortable columns.
- **Human Decision:** ⏳ PENDING

#### 7. Stats Caching Strategy Undefined
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #1
- **Issue:** Open Question #1 explicitly asks "Should stats be cached? Currently all queries hit DB fresh on each page load. Consider caching for performance." Every page load and date range change performs fresh database queries. For frequently accessed agent stats, this creates unnecessary database load and slower response times.
- **Suggested Fix:** Implement query-level caching with reasonable TTL (e.g., 5 minutes). Consider cache invalidation on new call_log or session entries for that agent.
- **Human Decision:** ⏳ PENDING

#### 8. Maximum Date Range Not Defined
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2; Section 4 - Edge Cases #8
- **Issue:** Open Question #2 asks "Whats the max supported date range? No explicit limit - very long ranges may timeout." Edge Case #8 confirms concern about "1+ year" ranges. Without an enforced limit, users could select multi-year date ranges that cause database timeouts or browser performance issues.
- **Suggested Fix:** Either enforce a maximum date range (e.g., 365 days) with clear error message, or implement pagination that gracefully handles any date range.
- **Human Decision:** ⏳ PENDING

#### 9. Utilization Metric Definition Ambiguous
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3; Section 3 - Activity Metrics
- **Issue:** Open Question #3 asks "Should utilization include away time? Current calculation excludes away time - is this the right definition?" Section 3 shows utilizationPercentage = (in_call_seconds / activeSeconds) * 100 where activeSeconds = idle + in_call (excluding away). Different stakeholders may expect different definitions of "utilization", causing confusion when interpreting the metric.
- **Suggested Fix:** Add tooltip or info icon explaining exactly how utilization is calculated. Document that away time is intentionally excluded. Consider adding secondary metric showing utilization including away time.
- **Human Decision:** ⏳ PENDING

#### 10. No Real-Time Stats Updates
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 asks "Are there plans for real-time stats? Current implementation requires page refresh." Stats are fetched once on page load and only update on date range change or full page refresh. Admins monitoring agent performance during peak hours see stale data.
- **Suggested Fix:** Document this as intended behavior for now. Consider adding auto-refresh option (every 5 minutes) for admins who want to monitor in real-time. WebSocket updates likely overkill for this use case.
- **Human Decision:** ⏳ PENDING

#### 11. Deleted Agent Historical Stats Inaccessible
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5; Section 4 - Edge Cases #7
- **Issue:** Open Question #5 asks "Should deleted agents retain historical stats? Currently, stats page 404s for deleted agents." Edge Case #7 confirms "Stats for deleted/deactivated agent | Agent soft-deleted | Page returns 404 (notFound)". When an agent is removed, admins lose access to all their historical performance data, which may be needed for reporting or auditing purposes.
- **Suggested Fix:** Allow viewing historical stats for deactivated agents with clear visual indicator that agent is no longer active. Consider archival report export before agent deletion.
- **Human Decision:** ⏳ PENDING

#### 12. Ongoing Calls May Temporarily Inflate Answer Rate
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 3 - Metric Definitions
- **Issue:** The Total Answers metric is defined as status = "accepted" OR "completed" with note "Includes ongoing calls". This means while a call is in progress (accepted but not completed), it counts toward the answer rate. If an agent has one ongoing call and zero completed calls, their answer rate could show 100% even though no calls have been completed. This is technically correct but may mislead admins viewing stats during active periods.
- **Suggested Fix:** Consider adding "(includes X active)" annotation when displaying stats during periods with ongoing calls, or add separate metric for completed calls only.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 4
- **Low:** 8

#### 8. Back Navigation After Success Shows Stale State
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 4 - Edge Case #13; Section 6 - Reliability
- **Issue:** Section 7 states: "Back navigation after success shows stale state | Confusion if user hits back | 🟢 Low". Section 6 confirms: "Browser back button | No special handling (may cause confusion)". If user clicks browser back button after successful password reset, they may see the password form again with potential for confusion.
- **Suggested Fix:** Use router.replace() or history.replaceState() after successful password update to prevent back navigation to the reset form. Alternatively, redirect users to login page if they navigate back after success.
- **Human Decision:** ⏳ PENDING

#### 9. Token Expiration Time Not Verified
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #1; Section 4 - Edge Case #3
- **Issue:** Open Question #1 states: "What is the exact token expiration time? Supabase default is 1 hour, but this may be configurable in Supabase dashboard. Not exposed in code." The actual token lifetime is undocumented and could differ from the assumed 1 hour.
- **Suggested Fix:** Document the configured token expiration in Supabase dashboard. Consider displaying expected link validity period in the Check your email confirmation message (e.g., Link expires in 1 hour).
- **Human Decision:** ⏳ PENDING

#### 10. Rate Limiting Configuration Not Documented
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 states: "Is there rate limiting on forgot-password requests? Supabase has built-in rate limiting, but the specific limits are not documented in this codebase." Without knowing rate limits, support cannot troubleshoot too many requests errors.
- **Suggested Fix:** Document Supabase rate limiting configuration for password reset requests. Add user-facing error handling if rate limit is exceeded.
- **Human Decision:** ⏳ PENDING


---

## A-video-recordings - Video Recordings

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/video-recordings.md`
**Review Agent:** docs/prompts/active/review-agent-agent-video-recordings.md

### Findings

#### 1. Upload Failure Causes Permanent Recording Loss
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #4; Section 6 - Reliability; Section 7 - Identified Issues
- **Issue:** Edge Case #4 states "Upload fails | Network error | Error logged, recording lost ⚠️ | No retry mechanism" and Section 7 confirms "No upload retry | Lost recordings | 🟡 Medium". When a network error occurs during upload, the recording is permanently lost with no automatic retry mechanism.
- **Suggested Fix:** Implement retry logic with exponential backoff (e.g., 3 attempts with 1s, 2s, 4s delays). Consider persisting chunks to IndexedDB before upload attempt.
- **Human Decision:** ⏳ PENDING

#### 2. Page Refresh During Call Loses Recording Data
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #9; Section 6 - Reliability; Section 7 - Identified Issues
- **Issue:** Edge Case #9 states "Agent refreshes during call | Page refresh | Recording data lost ⚠️ | In-memory chunks lost" and Section 6 Reliability confirms "Recording data loss | In-memory until upload (no mitigation)". Recording chunks are stored in memory and are lost if the agent refreshes or navigates away.
- **Suggested Fix:** Consider IndexedDB buffering to persist chunks during recording. Add beforeunload warning if recording is in progress.
- **Human Decision:** ⏳ PENDING

#### 3. No Chunked Upload for Long Calls
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #8; Section 6 - Performance; Section 7 - Identified Issues
- **Issue:** Edge Case #8 states "Very long call | Hours-long call | Large file, slow upload ⚠️ | No chunked upload" and Section 7 confirms "No chunked upload | Fails for long calls | 🟡 Medium". Single-file upload may timeout or fail for lengthy recordings.
- **Suggested Fix:** Implement resumable uploads using Supabase resumable upload API or chunked upload pattern. Consider splitting recordings into segments for very long calls.
- **Human Decision:** ⏳ PENDING

#### 4. Visitor Not Notified of Recording
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 10 - Open Questions #3; Section 6 - Security (Privacy consent)
- **Issue:** Open Question #3 asks "Should visitors be notified they're being recorded? Currently no in-widget indicator." While Section 6 Security mentions "Privacy warning shown in admin settings", there is no indication to the actual visitor being recorded. This is a privacy compliance concern (GDPR, CCPA, state recording laws).
- **Suggested Fix:** Add visible recording indicator in widget UI (red dot or "Recording" badge). Consider audio announcement at call start for two-party consent jurisdictions.
- **Human Decision:** ⏳ PENDING

#### 5. Deleted Recording Shows No User Feedback
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #15; Section 4 - Error States (PLAYBACK_404)
- **Issue:** Edge Case #15 states "Recording deleted from storage | Retention policy | 404 on playback ⚠️ | No UI indication" and Error States shows "PLAYBACK_404 | Recording deleted/missing | Video fails to load | Recording is gone". Users see a failed video player with no explanation.
- **Suggested Fix:** Add error state UI in video modal: "This recording is no longer available (expired or deleted)". Check recording existence before attempting playback.
- **Human Decision:** ⏳ PENDING

#### 6. Storage Quota Handling Missing
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open Question #2 states "What happens when storage quota exceeded? No handling for Supabase storage limits." If organization exceeds storage quota, recording uploads will fail silently with no proactive warning to admins.
- **Suggested Fix:** Monitor storage usage and warn admins when approaching quota. Gracefully handle quota exceeded errors with user-friendly messaging.
- **Human Decision:** ⏳ PENDING

#### 7. GDPR Right to Deletion Not Fully Implemented
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #6
- **Issue:** Open Question #6 states "What about GDPR right to deletion? Retention policy exists but no per-recording delete UI." Admins cannot delete individual recordings on request; they must wait for retention policy to expire.
- **Suggested Fix:** Add delete button on recording rows for admins. Implement soft-delete with audit trail for compliance. Consider "Delete all recordings for visitor X" functionality.
- **Human Decision:** ⏳ PENDING

#### 8. Modal Escape Key Not Implemented
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility; Section 7 - Identified Issues
- **Issue:** Accessibility section states "Keyboard navigation: ⚠️ Modal close via Escape not implemented" and Section 7 confirms "No keyboard close | Accessibility | 🟢 Low". Users relying on keyboard navigation cannot close the video modal without mouse.
- **Suggested Fix:** Add Escape key handler to close video modal. Ensure focus trap and focus return to trigger button on close.
- **Human Decision:** ⏳ PENDING

#### 9. No Transcription Retry UI
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Error States; Section 7 - Identified Issues
- **Issue:** Error States shows "TRANSCRIPTION_FAILED | Deepgram API error | 'Failed' badge in table | Admin can retry via API" and Section 7 confirms "No transcription retry UI | Admin friction | 🟢 Low". Admins must use API directly to retry failed transcriptions.
- **Suggested Fix:** Add "Retry Transcription" button on rows with failed transcription status.
- **Human Decision:** ⏳ PENDING

#### 10. No Estimated Processing Time Shown
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - First Principles Review; Section 7 - Identified Issues
- **Issue:** First Principles Review states "Is feedback immediate? ⚠️ Mostly - Transcription status shown, but processing time not estimated" and Section 7 confirms "No estimated processing time | User confusion | 🟢 Low". Users don't know how long to wait for transcription/summary to complete.
- **Suggested Fix:** Show estimated processing time based on call duration (e.g., "Processing ~2 minutes" for a 5-minute call).
- **Human Decision:** ⏳ PENDING

#### 11. State Diagram Missing Error States
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 2 - State Machine
- **Issue:** The state machine diagram shows linear progression from RECORDING → UPLOADING → PROCESSING → COMPLETE but doesn't show error states or transitions. According to the Error States table, uploads can fail (UPLOAD_FAILED), transcriptions can fail (TRANSCRIPTION_FAILED), and AI summaries can fail (AI_SUMMARY_FAILED), but these aren't represented in the state diagram.
- **Suggested Fix:** Add ERROR states to the diagram showing: UPLOADING → UPLOAD_FAILED, PROCESSING → TRANSCRIPTION_FAILED, PROCESSING → AI_SUMMARY_FAILED. Show recovery paths where applicable.
- **Human Decision:** ⏳ PENDING

#### 12. Screen Reader Support Browser-Dependent
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section states "Screen reader support: ⚠️ Video controls are native (browser-dependent)". The reliance on native browser video controls means accessibility varies significantly across browsers and may not meet WCAG requirements.
- **Suggested Fix:** Consider using an accessible video player library (e.g., Plyr, Video.js with accessibility plugins) for consistent screen reader support across browsers.
- **Human Decision:** ⏳ PENDING

#### 13. Silent Failure When Recording Cannot Start
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 4 - Error States (RECORDING_NOT_STARTED)
- **Issue:** Error States shows "RECORDING_NOT_STARTED | No permissions or streams | Nothing (silent fail) | Check camera/mic permissions". If recording fails to start due to permission issues, there's no indication to the agent that the call is not being recorded.
- **Suggested Fix:** Show recording indicator in agent UI during active calls. If recording fails to start, show warning toast: "Recording failed - check browser permissions."
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 13
- **Critical:** 0
- **High:** 1
- **Medium:** 7
- **Low:** 5

---

## AUTH-login-flow - Login Flow

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/auth/login-flow.md`
**Review Agent:** docs/prompts/active/review-agent-auth-login-flow.md

### Findings

#### 1. Incomplete Middleware Redirect for Unauthenticated Users
- **Category:** Logic Issue
- **Severity:** Critical
- **Location:** Section 3 - Data Flow, and Section 10 - Open Questions #1
- **Issue:** The middleware code at `middleware.ts` lines 56-57 has `if (isProtectedPath && !user) { return }` but no redirect to login page. Documentation explicitly states: "No user? Return (incomplete redirect logic - see issues)" and "Is this intentional or a bug?" This creates a security gap where unauthenticated users on protected routes are not redirected.
- **Suggested Fix:** Complete the middleware logic: `if (isProtectedPath && !user) { return NextResponse.redirect(new URL('/login', request.url)) }` to redirect unauthenticated users to the login page.
- **Human Decision:** ⏳ PENDING

#### 2. User with No Profile Row Causes Redirect Failure
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 4 - Edge Cases, Row #20
- **Issue:** Edge case matrix shows: "User with no profile row | Auth exists, no users row | Returns null, redirects fail | ⚠️ | May cause issues". When a user has an auth.users record but no corresponding `users` table row, the role query returns null and redirect logic fails. This is a data integrity issue that can strand users.
- **Suggested Fix:** Add defensive check after role query: if no profile row found, either create one with default role, show an error message, or redirect to a recovery flow. Consider RPC or trigger to ensure profile creation on signup.
- **Human Decision:** ⏳ PENDING

#### 3. Deactivated Agents Can Still Login
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #12; Section 7 - Identified Issues
- **Issue:** Documentation states: "Login with deactivated agent | `is_active: false` | Login succeeds, but features limited | ⚠️ | No explicit check at login". Deactivated agents can authenticate successfully, creating confusing UX where they see a limited dashboard without understanding why.
- **Suggested Fix:** Check `is_active` flag after successful authentication. Either block login entirely with a clear message ("Your account has been deactivated. Contact your administrator.") or show a prominent banner explaining limited access.
- **Human Decision:** ⏳ PENDING

#### 4. No Client-Side Rate Limiting on Login Attempts
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #19; Section 7 - Identified Issues
- **Issue:** Edge case matrix notes: "Rapid login attempts | Spam click | No client-side rate limit | ⚠️ | Server has rate limits (socket), not login". While Supabase has server-side rate limiting, the client allows unlimited rapid submissions which could degrade UX and create unnecessary server load.
- **Suggested Fix:** Add client-side debounce (e.g., 500ms) on form submission or implement an attempt counter that shows a cooldown after 3-5 rapid failures. This provides immediate feedback to users.
- **Human Decision:** ⏳ PENDING

#### 5. No Failed Login Attempt Logging for Security Auditing
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #4
- **Issue:** Identified Issues table states: "No login attempt logging | Security audit gap | 🟡 Medium | Log failed attempts". Open Question #4 asks: "Should failed login attempts be logged? For security auditing, should we track failed attempts per email?" Without this, brute force detection and security forensics are limited.
- **Suggested Fix:** Log failed login attempts with timestamp, email (hashed if needed), IP address, and user agent. Consider triggering alerts for repeated failures against the same email or from the same IP.
- **Human Decision:** ⏳ PENDING

#### 6. Platform Admin Redirects to /admin Instead of /platform
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #21; Section 10 - Open Questions #7
- **Issue:** Edge case shows: "Platform admin login | `is_platform_admin: true` | Redirects to /admin (not /platform) | ⚠️ | Platform check happens in layout". Open Question #7 asks: "Should they redirect directly to /platform?" Platform admins must navigate extra steps to reach their primary workspace.
- **Suggested Fix:** Update login redirect logic to check `is_platform_admin` flag and redirect directly to `/platform` instead of `/admin`.
- **Human Decision:** ⏳ PENDING

#### 7. Email Verification Requirement Unclear
- **Category:** Confusing User Story
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases, Row #11; Section 10 - Open Questions #5
- **Issue:** Edge case shows: "Login with unverified email | Unconfirmed signup | Supabase handles - depends on config | ⚠️ | May allow or block based on Supabase settings". Open Question #5 asks: "Is email verification required? The current flow appears to allow login without email verification. Is this intended?" The intended behavior is undocumented.
- **Suggested Fix:** Document the intended email verification policy. Either enforce verification (recommended for security) and document the flow, or explicitly document that verification is not required and explain why.
- **Human Decision:** ⏳ PENDING

#### 8. Screen Reader Labels Not Explicitly Associated
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section notes: "Screen reader support: ⚠️ Labels present but not explicitly associated". Form inputs have visible labels but may not have proper `htmlFor`/`id` associations required for screen reader accessibility. This violates WCAG 2.1 guidelines.
- **Suggested Fix:** Ensure all form inputs have matching `id` attributes and that labels use `htmlFor` (or `for` in HTML) pointing to those IDs. Consider using `aria-labelledby` or `aria-label` as alternatives.
- **Human Decision:** ⏳ PENDING

#### 9. Hard Redirect Causes Visual Flash
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - UX Audit, Step 5; Section 7 - Identified Issues
- **Issue:** UX Audit shows: "Success | Redirect to dashboard | ✅ | Hard redirect (flash)". Identified Issues confirms: "Hard redirect causes flash | UX polish | 🟢 Low | Use Next.js router after session set". The `window.location.href` redirect causes a full page reload flash instead of a smooth SPA transition.
- **Suggested Fix:** After session is set in cookies, use Next.js `router.push()` for a smoother client-side navigation. Ensure cookies are properly synchronized before navigation.
- **Human Decision:** ⏳ PENDING

#### 10. Session Duration Not Documented for Users
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 asks: "What's the session duration? Supabase default is 1 hour with refresh tokens. Is this documented anywhere for users?" Users have no visibility into when their session will expire or how long they'll remain logged in.
- **Suggested Fix:** Document session duration in user-facing help content or FAQs. Consider showing session expiration warning before automatic logout.
- **Human Decision:** ⏳ PENDING

#### 11. No "Remember Me" Option
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #6
- **Issue:** Identified Issues notes: "No 'Remember me' option | User convenience | 🟢 Low | Supabase handles session duration". Open Question #6 asks: "Should there be a 'Remember me' checkbox?" Users cannot choose to extend their session duration for convenience on trusted devices.
- **Suggested Fix:** Evaluate whether "Remember me" functionality is needed based on user feedback. If implemented, extend session duration or persist refresh token when checkbox is selected.
- **Human Decision:** ⏳ PENDING

#### 12. JavaScript Required with No Fallback
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Reliability
- **Issue:** Reliability section states: "JavaScript disabled | Form won't work (client-side only)". Users with JavaScript disabled have no way to log in and receive no message explaining why. While rare, this creates an accessibility barrier.
- **Suggested Fix:** Consider progressive enhancement with a server action fallback, or at minimum display a `<noscript>` message explaining that JavaScript is required for login.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 1
- **High:** 1
- **Medium:** 6
- **Low:** 4

---

## M-UPTIME_MONITORING - External Uptime Monitoring Setup

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/monitoring/UPTIME_MONITORING.md`
**Review Agent:** docs/prompts/active/review-agent-monitoring-UPTIME_MONITORING.md

### Findings

#### 1. Free Tier vs 1-Minute Check Frequency Contradiction
- **Category:** Logic Issue
- **Severity:** Critical
- **Location:** Section "Provider: Better Uptime" vs Monitor 1 & 2 configurations
- **Issue:** The document states under "Better Uptime Free Tier" that the free tier offers "3-minute check frequency", but Monitor 1 (Dashboard) and Monitor 2 (Signaling Server) are both configured with "Check Frequency: 1 minute". This is a direct contradiction - either these monitors will fail to create on the free tier, or the setup will unexpectedly incur costs.
- **Suggested Fix:** Either update all monitors to 3-minute frequency to stay within free tier, or clarify that 1-minute checks require the $20/mo upgrade and update Cost Analysis section accordingly.
- **Human Decision:** ⏳ PENDING

#### 2. Monitor Count Inconsistency
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section "Production Services to Monitor" table vs "Implementation Steps" section
- **Issue:** The initial table lists 4 services to monitor, but the implementation section defines 5 monitors (including optional WebSocket Monitor 3). The Acceptance Criteria says "4+ monitors" and Cost Analysis says "we need 4-5". This ambiguity could cause confusion during setup.
- **Suggested Fix:** Clarify whether WebSocket monitor is included in the count. Update table to show 5 rows if WebSocket is recommended, or explicitly state "4 required + 1 optional".
- **Human Decision:** ⏳ PENDING

#### 3. Placeholder Contact Information Not Flagged
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section "Step 3: Configure Alert Escalation"
- **Issue:** The escalation policy contains placeholder values `+1-xxx-xxx-xxxx` for phone numbers. While this is expected in a template, there is no callout or action item to replace these with real numbers. A reader could accidentally configure with placeholders or forget to update them.
- **Suggested Fix:** Add a visible callout: "⚠️ REQUIRED: Replace placeholder phone numbers with actual on-call contact before deploying." Also add this to the Verification Checklist.
- **Human Decision:** ⏳ PENDING

#### 4. Supabase API Key Exposure in Third-Party Service
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section "Monitor 4: Supabase API"
- **Issue:** The Supabase monitor requires adding the `apikey` (anon key) to Better Uptime headers configuration. While the anon key is "public" by design (exposed in frontend), storing it in a third-party monitoring platform creates an additional exposure vector. If Better Uptime is compromised, the key is exposed. There is no discussion of this security tradeoff.
- **Suggested Fix:** Add a security note: "The Supabase anon key is designed for public use and has RLS protection. Storing in Better Uptime is acceptable, but monitor Better Uptime security advisories."
- **Human Decision:** ⏳ PENDING

#### 5. Missing Incident Response Runbook
- **Category:** Missing Scenario
- **Severity:** High
- **Location:** Entire document
- **Issue:** The document covers how to set up monitoring and receive alerts, but provides no guidance on what to do when an alert fires. There is no incident response runbook linking to debugging steps, rollback procedures, or escalation paths beyond "call this number". When a 3 AM alert wakes someone up, they need actionable next steps.
- **Suggested Fix:** Add section "Incident Response" with: (1) Link to runbook for each service type, (2) Common causes and fixes, (3) Who can deploy fixes, (4) When to page vs investigate.
- **Human Decision:** ⏳ PENDING

#### 6. No Staging Environment Monitoring Coverage
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section "Production Services to Monitor"
- **Issue:** Only production URLs are documented for monitoring. There is no mention of whether staging should be monitored, and no staging URLs are provided. If staging goes down, it could block development/QA without anyone noticing.
- **Suggested Fix:** Either add staging monitors (with lower-priority alerts) or explicitly document the decision: "Staging is not monitored because [reason]."
- **Human Decision:** ⏳ PENDING

#### 7. WebSocket Monitor Free Tier Uncertainty
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section "Monitor 3: Signaling Server WebSocket (Optional)"
- **Issue:** The note says "If Better Uptime does not support WebSocket monitors on free tier, skip this and rely on the HTTP health check." This suggests the documentation was written without verifying if WebSocket monitoring is available. This uncertainty should be resolved before implementation.
- **Suggested Fix:** Verify Better Uptime free tier WebSocket support and update the doc with definitive guidance. Remove "If" conditional.
- **Human Decision:** ⏳ PENDING

#### 8. Widget Content Validation May Be Fragile
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section "Monitor 5: Widget JavaScript"
- **Issue:** Monitor 5 validates widget.js by checking if response body contains "ghostGreeter". If the build process changes (different bundler, aggressive minification, variable renaming), this string check could fail even when the widget works correctly. This would cause false positive alerts.
- **Suggested Fix:** Use a more reliable validation method: (1) Check for specific export signature, (2) Add a version comment at top that survives minification, or (3) Just check HTTP 200 and Content-Type for JS files.
- **Human Decision:** ⏳ PENDING

#### 9. Owner Role Ambiguity in Maintenance Table
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section "Ongoing Maintenance"
- **Issue:** The maintenance table assigns tasks to "On-call engineer", "Admin", and "DevOps" but these roles are not defined anywhere in the document. It is unclear who specifically is responsible, which could lead to tasks falling through the cracks.
- **Suggested Fix:** Either link to a team roles document or specify actual people/teams (e.g., "Ryan", "Platform team", "Whoever is in #on-call Slack channel").
- **Human Decision:** ⏳ PENDING

#### 10. Maintenance Window Too Narrow
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section "Step 5: Configure Maintenance Windows"
- **Issue:** Only a single maintenance window is configured: "Tuesdays 2:00 AM - 3:00 AM UTC". This does not account for: (1) Emergency hotfix deploys at other times, (2) Extended maintenance, (3) Holiday deployments. Any deploy outside this window will trigger false alerts.
- **Suggested Fix:** Document how to create ad-hoc maintenance windows for emergency deploys. Consider adding a second regular window or extending to 2 hours.
- **Human Decision:** ⏳ PENDING

#### 11. Health Endpoint Components Not Individually Validated
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section "Monitor 2: Signaling Server Health" and "Quick Reference - Health Check Response Format"
- **Issue:** The health endpoint returns status of individual components (`"redis": "connected"`), but Monitor 2 only validates that `status: "ok"`. If Redis disconnects but the server stays up, `status` might still return "ok" with `"redis": "disconnected"`. The monitoring will not catch this partial failure.
- **Suggested Fix:** Add JSON path validation for `$.redis = "connected"` or create a separate monitor that checks Redis connectivity specifically.
- **Human Decision:** ⏳ PENDING

#### 12. SSL Expiry Alert Only on Dashboard Monitor
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section "Monitor 1: Dashboard" vs other monitors
- **Issue:** Only Monitor 1 (Dashboard) has "SSL Expiry Alert: 14 days before expiration" configured. The other services (Signaling Server, Supabase, Widget CDN) also use HTTPS but do not have SSL expiry alerts configured. If those certs expire, there would be no warning.
- **Suggested Fix:** Add SSL expiry alerts to all HTTPS monitors, or document why only Dashboard needs it (e.g., "Railway and Supabase manage their own certs").
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 1
- **High:** 1
- **Medium:** 5
- **Low:** 5


---

## V-cobrowse-sender - Co-Browse Sender

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/visitor/cobrowse-sender.md`
**Review Agent:** `docs/prompts/active/review-agent-visitor-cobrowse-sender.md`

### Findings

#### 1. Password Fields Captured in DOM Snapshots
- **Category:** Documented Issue
- **Severity:** Critical
- **Location:** Section 4 - Edge Cases Row 6; Section 6 - Security; Section 7 - Identified Issues; Section 10 - CRITICAL ISSUES REFERENCED
- **Issue:** Documentation explicitly flags CRIT-A5-001: "Password field visible - Value may be captured" with red indicator. Section 6 Security confirms "Password fields captured | CRIT-A5-001 - no sanitization | 🔴 Critical". The `captureSnapshot()` function serializes the entire DOM including password field values, allowing agents to see visitor passwords.
- **Suggested Fix:** As documented: "Mask `<input type="password">` values before serializing". Add sanitization step in `captureSnapshot()` to replace password field values with asterisks or empty strings.
- **Human Decision:** ⏳ PENDING

#### 2. No Visitor Awareness of Screen Sharing
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review Step 1; Section 6 - Security Row 4; Section 7 - Identified Issues
- **Issue:** Section 5 notes "Co-browse auto-starts | ⚠️ | No indication to visitor". Section 6 Security flags "Visitor unaware of sharing | Q-A5-001 - no indicator | 🟡 Medium". Visitors entering a call have no visual indication that their screen is being captured and shared with the agent, which is a privacy and trust concern.
- **Suggested Fix:** As documented: "Add Screen shared with agent indicator". Consider a persistent banner or icon during active co-browse sessions.
- **Human Decision:** ⏳ PENDING

#### 3. No Payload Size Limit for DOM Snapshots
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases Row 4; Section 6 - Performance Row 2; Section 7 - Identified Issues; Section 10 - Open Questions Q-V5-001
- **Issue:** Open Question Q-V5-001 explicitly asks "Should there be payload size limits for DOM snapshots? Large pages could generate 100KB+ payloads. Currently no limit enforced." Section 6 confirms "HTML serialization | outerHTML creates large strings | 🟡 Medium - no size limit". Large pages could cause bandwidth exhaustion and memory pressure on both client and server.
- **Suggested Fix:** As documented: "Add max size check or compression". Consider truncating or compressing snapshots exceeding a threshold (e.g., 50KB), or implement differential updates instead of full DOM sends.
- **Human Decision:** ⏳ PENDING

#### 4. Rate Limit vs Throttle Mismatch for Mouse Events
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 3 - Throttling/Debouncing Strategy; Section 3 - Server-Side Rate Limiting
- **Issue:** The Throttling/Debouncing Strategy table shows mouse events are throttled at "50ms (~20fps)" on the client, which would produce up to 1200 events per minute. However, the Server-Side Rate Limiting table shows `cobrowse:mouse` has a limit of "300 (5/sec)" or 300 per minute. This means the client generates 4x more events than the server allows, resulting in ~75% of mouse events being silently dropped by rate limiting.
- **Suggested Fix:** Either increase server rate limit to match client throttle (1200/min), or decrease client throttle rate to match server limit (200ms for 5/sec). Document the intentional mismatch if this is by design.
- **Human Decision:** ⏳ PENDING

#### 5. Rate Limit vs Throttle Mismatch for Scroll Events
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 3 - Throttling/Debouncing Strategy; Section 3 - Server-Side Rate Limiting
- **Issue:** The Throttling/Debouncing Strategy table shows scroll events are throttled at "100ms (10fps)" on the client, which would produce up to 600 events per minute. However, the Server-Side Rate Limiting table shows `cobrowse:scroll` has a limit of "120 (2/sec)" or 120 per minute. This means the client generates 5x more events than the server allows, resulting in ~80% of scroll events being silently dropped by rate limiting.
- **Suggested Fix:** Either increase server rate limit to match client throttle (600/min), or decrease client throttle rate to match server limit (500ms for 2/sec). Document the intentional mismatch if this is by design.
- **Human Decision:** ⏳ PENDING

#### 6. Socket Disconnect Causes Event Loss
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases Row 3; Section 4 - Error States Row 2
- **Issue:** Edge Case Row 3 states "Socket disconnects during call | Network drop | Events queue, sent on reconnect (or lost) | ⚠️ | No local buffering". Error States confirms "Socket not connected | Network down | Nothing visible | Events lost, reconnect auto-retries". There is no local buffering of co-browse events during disconnection, meaning important context (page navigation, form fills) could be lost during network interruptions.
- **Suggested Fix:** Consider implementing a small local event buffer (last 10-20 events or last 5 seconds) that can be replayed on reconnection to minimize context loss during brief disconnects.
- **Human Decision:** ⏳ PENDING

#### 7. Visitor Cannot Opt Out During Call
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - First Principles Review "Is the flow reversible?"
- **Issue:** Section 7 explicitly states "Is the flow reversible? ❌ No | Visitor cannot opt out during call". Once a visitor enters a call, they have no mechanism to disable screen sharing while continuing the video call. This removes visitor control over their privacy during the session and may create compliance concerns (GDPR right to object).
- **Suggested Fix:** Consider adding a visitor-facing toggle to pause/disable co-browse during an active call, while keeping the video call active. At minimum, document this limitation for legal/compliance review.
- **Human Decision:** ⏳ PENDING

#### 8. "Significant" DOM Changes Not Defined
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 3 - Data Flow diagram; Section 4 - Edge Cases Row 5; Section 10 - Open Questions Q-V5-002
- **Issue:** The Data Flow diagram shows MutationObserver handling and states "Only triggers capture on significant changes" but does not define what constitutes "significant". Edge Case Row 5 says "MutationObserver filters significant only" marked as handled, but Open Question Q-V5-002 asks "Should MutationObserver be more selective?" suggesting the definition is not settled. Future developers may misunderstand the filtering logic without clear criteria.
- **Suggested Fix:** Document the specific criteria for "significant" changes (e.g., node additions/removals > N, attribute changes on specific element types, etc.) or reference the exact code logic that makes this determination.
- **Human Decision:** ⏳ PENDING

#### 9. Open Questions Have Inconsistent Numbering
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 10 - Open Questions
- **Issue:** Open Questions lists Q-V5-001 and Q-V5-002 with proper IDs, but questions 3-5 lack numbered IDs ("Privacy indicator:", "Canvas capture:", "Same-origin iframes:"). This inconsistency makes it difficult to reference specific open questions in discussions and breaks the established ID pattern.
- **Suggested Fix:** Add IDs to all open questions: Q-V5-003 for privacy indicator, Q-V5-004 for canvas capture, Q-V5-005 for same-origin iframes.
- **Human Decision:** ⏳ PENDING

#### 10. Cross-Reference Uses Agent Feature Code for Visitor Feature Issue
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Security; Section 10 - CRITICAL ISSUES REFERENCED
- **Issue:** The critical password issue is labeled "CRIT-A5-001" (Agent feature code prefix "A5") but this is a Visitor feature (V5 - Co-Browse Sender). The privacy indicator concern references "Q-A5-001" similarly. Using Agent feature codes in Visitor documentation creates confusion about which codebase components are affected and where fixes should be implemented.
- **Suggested Fix:** Either rename to use Visitor feature prefix (CRIT-V5-001, Q-V5-006) or clarify in documentation that this issue spans both features and the A5 prefix refers to where the fix impacts agent experience.
- **Human Decision:** ⏳ PENDING

#### 11. Browser Tab Backgrounding May Disrupt Co-Browse
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases Row 10
- **Issue:** Edge Case Row 10 notes "Tab backgrounded | User switches tabs | Events continue (browser may throttle) | ⚠️ | Chrome throttling". When visitors switch to other tabs while on a call, Chrome background tab throttling may reduce timer resolution from 4ms to 1000ms and limit setTimeout/setInterval execution, potentially disrupting the 2-second snapshot interval and event delivery.
- **Suggested Fix:** Document this as a known limitation. Consider using requestAnimationFrame-based timing where possible, or document that agents should be aware the view may become stale when visitors switch tabs.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 11
- **Critical:** 1
- **High:** 0
- **Medium:** 4
- **Low:** 6

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/agent/video-recordings.md`
**Review Agent:** docs/prompts/active/review-agent-agent-video-recordings.md

### Findings

#### 1. Upload Failure Causes Permanent Recording Loss
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #4; Section 6 - Reliability; Section 7 - Identified Issues
- **Issue:** Edge Case #4 states "Upload fails | Network error | Error logged, recording lost ⚠️ | No retry mechanism" and Section 7 confirms "No upload retry | Lost recordings | 🟡 Medium". When a network error occurs during upload, the recording is permanently lost with no automatic retry mechanism.
- **Suggested Fix:** Implement retry logic with exponential backoff (e.g., 3 attempts with 1s, 2s, 4s delays). Consider persisting chunks to IndexedDB before upload attempt.
- **Human Decision:** ⏳ PENDING

#### 2. Page Refresh During Call Loses Recording Data
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #9; Section 6 - Reliability; Section 7 - Identified Issues
- **Issue:** Edge Case #9 states "Agent refreshes during call | Page refresh | Recording data lost ⚠️ | In-memory chunks lost" and Section 6 Reliability confirms "Recording data loss | In-memory until upload (no mitigation)". Recording chunks are stored in memory and are lost if the agent refreshes or navigates away.
- **Suggested Fix:** Consider IndexedDB buffering to persist chunks during recording. Add beforeunload warning if recording is in progress.
- **Human Decision:** ⏳ PENDING

#### 3. No Chunked Upload for Long Calls
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #8; Section 6 - Performance; Section 7 - Identified Issues
- **Issue:** Edge Case #8 states "Very long call | Hours-long call | Large file, slow upload ⚠️ | No chunked upload" and Section 7 confirms "No chunked upload | Fails for long calls | 🟡 Medium". Single-file upload may timeout or fail for lengthy recordings.
- **Suggested Fix:** Implement resumable uploads using Supabase resumable upload API or chunked upload pattern. Consider splitting recordings into segments for very long calls.
- **Human Decision:** ⏳ PENDING

#### 4. Visitor Not Notified of Recording
- **Category:** Documented Issue
- **Severity:** High
- **Location:** Section 10 - Open Questions #3; Section 6 - Security (Privacy consent)
- **Issue:** Open Question #3 asks "Should visitors be notified they're being recorded? Currently no in-widget indicator." While Section 6 Security mentions "Privacy warning shown in admin settings", there is no indication to the actual visitor being recorded. This is a privacy compliance concern (GDPR, CCPA, state recording laws).
- **Suggested Fix:** Add visible recording indicator in widget UI (red dot or "Recording" badge). Consider audio announcement at call start for two-party consent jurisdictions.
- **Human Decision:** ⏳ PENDING

#### 5. Deleted Recording Shows No User Feedback
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases #15; Section 4 - Error States (PLAYBACK_404)
- **Issue:** Edge Case #15 states "Recording deleted from storage | Retention policy | 404 on playback ⚠️ | No UI indication" and Error States shows "PLAYBACK_404 | Recording deleted/missing | Video fails to load | Recording is gone". Users see a failed video player with no explanation.
- **Suggested Fix:** Add error state UI in video modal: "This recording is no longer available (expired or deleted)". Check recording existence before attempting playback.
- **Human Decision:** ⏳ PENDING

#### 6. Storage Quota Handling Missing
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #2
- **Issue:** Open Question #2 states "What happens when storage quota exceeded? No handling for Supabase storage limits." If organization exceeds storage quota, recording uploads will fail silently with no proactive warning to admins.
- **Suggested Fix:** Monitor storage usage and warn admins when approaching quota. Gracefully handle quota exceeded errors with user-friendly messaging.
- **Human Decision:** ⏳ PENDING

#### 7. GDPR Right to Deletion Not Fully Implemented
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #6
- **Issue:** Open Question #6 states "What about GDPR right to deletion? Retention policy exists but no per-recording delete UI." Admins cannot delete individual recordings on request; they must wait for retention policy to expire.
- **Suggested Fix:** Add delete button on recording rows for admins. Implement soft-delete with audit trail for compliance. Consider "Delete all recordings for visitor X" functionality.
- **Human Decision:** ⏳ PENDING

#### 8. Modal Escape Key Not Implemented
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility; Section 7 - Identified Issues
- **Issue:** Accessibility section states "Keyboard navigation: ⚠️ Modal close via Escape not implemented" and Section 7 confirms "No keyboard close | Accessibility | 🟢 Low". Users relying on keyboard navigation cannot close the video modal without mouse.
- **Suggested Fix:** Add Escape key handler to close video modal. Ensure focus trap and focus return to trigger button on close.
- **Human Decision:** ⏳ PENDING

#### 9. No Transcription Retry UI
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Error States; Section 7 - Identified Issues
- **Issue:** Error States shows "TRANSCRIPTION_FAILED | Deepgram API error | 'Failed' badge in table | Admin can retry via API" and Section 7 confirms "No transcription retry UI | Admin friction | 🟢 Low". Admins must use API directly to retry failed transcriptions.
- **Suggested Fix:** Add "Retry Transcription" button on rows with failed transcription status.
- **Human Decision:** ⏳ PENDING

#### 10. No Estimated Processing Time Shown
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - First Principles Review; Section 7 - Identified Issues
- **Issue:** First Principles Review states "Is feedback immediate? ⚠️ Mostly - Transcription status shown, but processing time not estimated" and Section 7 confirms "No estimated processing time | User confusion | 🟢 Low". Users don't know how long to wait for transcription/summary to complete.
- **Suggested Fix:** Show estimated processing time based on call duration (e.g., "Processing ~2 minutes" for a 5-minute call).
- **Human Decision:** ⏳ PENDING

#### 11. State Diagram Missing Error States
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 2 - State Machine
- **Issue:** The state machine diagram shows linear progression from RECORDING → UPLOADING → PROCESSING → COMPLETE but doesn't show error states or transitions. According to the Error States table, uploads can fail (UPLOAD_FAILED), transcriptions can fail (TRANSCRIPTION_FAILED), and AI summaries can fail (AI_SUMMARY_FAILED), but these aren't represented in the state diagram.
- **Suggested Fix:** Add ERROR states to the diagram showing: UPLOADING → UPLOAD_FAILED, PROCESSING → TRANSCRIPTION_FAILED, PROCESSING → AI_SUMMARY_FAILED. Show recovery paths where applicable.
- **Human Decision:** ⏳ PENDING

#### 12. Screen Reader Support Browser-Dependent
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section states "Screen reader support: ⚠️ Video controls are native (browser-dependent)". The reliance on native browser video controls means accessibility varies significantly across browsers and may not meet WCAG requirements.
- **Suggested Fix:** Consider using an accessible video player library (e.g., Plyr, Video.js with accessibility plugins) for consistent screen reader support across browsers.
- **Human Decision:** ⏳ PENDING

#### 13. Silent Failure When Recording Cannot Start
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 4 - Error States (RECORDING_NOT_STARTED)
- **Issue:** Error States shows "RECORDING_NOT_STARTED | No permissions or streams | Nothing (silent fail) | Check camera/mic permissions". If recording fails to start due to permission issues, there's no indication to the agent that the call is not being recorded.
- **Suggested Fix:** Show recording indicator in agent UI during active calls. If recording fails to start, show warning toast: "Recording failed - check browser permissions."
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 13
- **Critical:** 0
- **High:** 1
- **Medium:** 7
- **Low:** 5

---

## API-agent-api - Agent API

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/api/agent-api.md`
**Review Agent:** docs/prompts/active/review-agent-api-agent-api.md

### Findings

#### 1. Silent Email Failure - User Thinks Invite Sent
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Cases row 22, Section 7 - Identified Issues
- **Issue:** Documentation explicitly flags email send failure as silent. When email delivery fails, the admin sees success but the invitee never receives the invitation. This creates confusion and potential trust issues.
- **Suggested Fix:** Return email send status in API response. Show warning toast: "Invite created but email may not have been delivered." Add "Resend invite" button on pending invites list.
- **Human Decision:** Pending

#### 2. Race Condition on Concurrent Invite/Revoke
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases row 21, Section 7 - Identified Issues
- **Issue:** Documentation identifies concurrent invite plus revoke race condition with no explicit locking. If two admins simultaneously send and revoke an invite to the same email, the outcome is undefined. While rare, this could result in orphaned billing seats.
- **Suggested Fix:** Add unique constraint on email plus organization_id plus pending status in invites table. Return clear error on constraint violation.
- **Human Decision:** Pending

#### 3. Stats Query Performance - No Optimization for Large Call Logs
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Technical Concerns Performance, Section 7 - Identified Issues
- **Issue:** Documentation notes stats aggregation computed on page load could be slow with large call_logs. Agent statistics are computed synchronously during page load. For organizations with many agents and long call history, this will cause noticeable page load delays.
- **Suggested Fix:** Pre-compute daily/weekly stats via background job or database trigger. Store aggregated stats in separate table. Alternative: lazy-load stats after initial agent list renders.
- **Human Decision:** Pending

#### 4. Screen Reader Support Not Verified
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - UI/UX Review Accessibility
- **Issue:** Documentation states screen reader support is not verified. The accessibility audit is incomplete - screen reader compatibility has not been tested. Agent management is a core admin function, and accessibility compliance may be required for enterprise customers.
- **Suggested Fix:** Conduct screen reader testing with VoiceOver/NVDA. Ensure all form fields have proper labels, buttons have accessible names, and status changes are announced via ARIA live regions.
- **Human Decision:** Pending

#### 5. Stripe Down During Invite - No Retry Mechanism
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 10 - Open Questions number 2
- **Issue:** Documentation asks what happens if Stripe is down during invite. The invite record is created then rolled back on billing failure, but there is no retry mechanism. Admin must manually retry without knowing if it is a temporary or permanent issue.
- **Suggested Fix:** Implement exponential backoff retry for billing API calls. If all retries fail, show specific error about billing service unavailable. Consider queuing failed billing operations for background retry.
- **Human Decision:** Pending

#### 6. Deactivated Agents Completely Hidden
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions number 3
- **Issue:** Documentation asks if deactivated agents should be visible to admins. Currently they are fully hidden. Admins cannot see which agents were previously on their team, when they were removed, or re-invite them easily. This loses institutional knowledge.
- **Suggested Fix:** Add Show deactivated agents toggle to agent list. Display deactivated agents in a separate section with grayed-out styling. Show deactivation date and who removed them.
- **Human Decision:** Pending

#### 7. Hardcoded 7-Day Invite Expiry
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions number 4
- **Issue:** Documentation asks if 7-day invite expiry is the right duration. It is hardcoded and not configurable per-organization. Some organizations may need longer or shorter expiry periods.
- **Suggested Fix:** Add invite_expiry_days setting to organization settings with default of 7. Allow admins to configure between 1-30 days.
- **Human Decision:** Pending

#### 8. Accept Invite Redirects Agent Role to Admin Path
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 3 - Detailed Logic, INVITEE ACCEPTS INVITE data flow
- **Issue:** The data flow shows redirect to /admin after invite acceptance. However, users with agent role should be redirected to /bullpen, not /admin. An agent user redirected to /admin may see a 403 error.
- **Suggested Fix:** Redirect based on role: agent role to /bullpen, admin role to /admin. Check middleware for role-based redirect logic.
- **Human Decision:** Pending

#### 9. Reactivating Another Users Agent Profile Not Documented
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 2 - State Machine, Section 3 - Detailed Logic
- **Issue:** State diagram shows transition from deactivated to active via Admin re-adds. However, the detailed flow only covers self-reactivation. If Admin A deactivated Agent B, the flow for Admin A to reactivate Agent B later is not documented.
- **Suggested Fix:** Document the reactivation flow for third-party agents. Either clarify it is not supported, or document the admin UI and API for reactivating specific deactivated agents.
- **Human Decision:** Pending

#### 10. Can Admin Remove Themselves as Agent - Edge Case Missing
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Edge Cases
- **Issue:** The 22 edge cases do not cover the scenario where an admin removes their own agent profile. Is this allowed? What happens to their admin access? The Self-add when already agent case shows the button is hidden, but no case shows self-removal.
- **Suggested Fix:** Add edge case: Admin removes self as agent with expected behavior. Clarify if admin access is retained.
- **Human Decision:** Pending

#### 11. Rollback Flow on Billing Failure Not Shown in Data Flow
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 3 - Detailed Logic, Section 6 - Reliability
- **Issue:** The ADMIN SENDS INVITE data flow shows sequential steps but does not show error path for billing failure. Section 6 Reliability mentions invite is deleted on seat add failure but the data flow diagram omits this rollback logic.
- **Suggested Fix:** Add error branch to data flow diagram showing: If billing fails, delete invite record, return error.
- **Human Decision:** Pending

#### 12. Potential Documentation Drift with Invites API
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 9 - Related Features
- **Issue:** This document contains extensive invite handling logic but Section 9 references a separate Invites API document. Having invite logic documented in two places creates potential for documentation drift.
- **Suggested Fix:** Clearly delineate ownership. Agent API doc should reference Invites API for invite details, or consolidate all invite logic into one document.
- **Human Decision:** Pending

#### 13. No REST Endpoints for Agent List/Get/Update
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues, Section 10 - Open Questions
- **Issue:** Documentation notes no dedicated list/get/update REST endpoints. All CRUD except delete uses client Supabase calls. This hybrid architecture makes it harder to add middleware, rate limiting, or audit logging for all agent operations.
- **Suggested Fix:** If full API consistency is desired, create /api/agents routes for list, get, update. If current approach is intentional, document the architectural decision.
- **Human Decision:** Pending

### Summary
- **Total Findings:** 13
- **Critical:** 0
- **High:** 0
- **Medium:** 6
- **Low:** 7

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/visitor/widget-lifecycle.md`
**Review Agent:** `docs/prompts/active/review-agent-visitor-widget-lifecycle.md`

### Findings

#### 1. Minimize Button Hidden on First Visit - Poor Discoverability
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues; Section 5 - UX Review (Step 9)
- **Issue:** Documentation explicitly flags: "Minimize button hidden on first visit | Users can't dismiss widget without calling | 🟡 Medium". The UX Review also notes "⚠️ Not always visible on first visit". Visitors who want to dismiss the widget without making a call have no way to do so unless `show_minimize_button` is enabled by admin (default is `false`).
- **Suggested Fix:** Consider changing default of `show_minimize_button` to `true`, or provide an alternative dismiss affordance (close button, click-away-to-minimize).
- **Human Decision:** ⏳ PENDING

#### 2. No Full Keyboard Navigation - Accessibility Gap
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Documentation notes "Keyboard navigation: ⚠️ Escape key supported, but no full keyboard nav". Users who rely on keyboard navigation cannot tab through widget controls, focus interactive elements, or navigate the widget without a mouse.
- **Suggested Fix:** Implement full keyboard navigation with tabindex, focus management, and focus-visible styles on all interactive elements.
- **Human Decision:** ⏳ PENDING

#### 3. "Tap to Unmute" Overlay Not Prominent Enough
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - UX Review, Step 3
- **Issue:** UX Review notes "⚠️ 'Tap to unmute' overlay could be more prominent" for the audio unlock interaction. Users may not understand why video plays silently or miss the prompt to enable audio.
- **Suggested Fix:** Make tap-to-unmute overlay more visually prominent with animation, larger text, or pulsing indicator.
- **Human Decision:** ⏳ PENDING

#### 4. Widget Position Not Persisted Across Page Navigation
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #1
- **Issue:** Documentation flags: "Widget position not persisted | Position resets on page navigation | 🟢 Low" and Open Question #1 asks "Should widget position persist across page navigations?". If a visitor drags the widget to a preferred position, it resets to server-configured position on navigation, requiring repeated repositioning.
- **Suggested Fix:** Store dragged position in localStorage alongside other widget state. Low priority but improves UX.
- **Human Decision:** ⏳ PENDING

#### 5. Auto-Hide Preference Not Remembered
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Questions #2
- **Issue:** Documentation flags: "Auto-hide resets on page navigation | User preference not remembered | 🟢 Low". If widget auto-hides and user expands it, that preference is not persisted, leading to repeated auto-hide on subsequent pages.
- **Suggested Fix:** Store "user has manually expanded after auto-hide" flag in localStorage.
- **Human Decision:** ⏳ PENDING

#### 6. No "Close" Option - Only Minimize Available
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #3
- **Issue:** Open Question #3 asks "Should there be a 'close' option (not just minimize)?". Some visitors may want to completely dismiss the widget for their session rather than just minimize it. Currently there's no way to fully close/hide the widget - it always remains as a minimized button.
- **Suggested Fix:** Consider adding a "close for this session" option that hides widget completely until page refresh or new session. Store in sessionStorage.
- **Human Decision:** ⏳ PENDING

#### 7. Minimized Position Inconsistent with Expanded Position
- **Category:** Logic Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open Question #5 notes "Should center position use a different minimized location? Currently minimized always goes to bottom-right regardless of expanded position." If a visitor drags the widget to top-left and it minimizes, the minimized button appears at bottom-right, which could be confusing as the widget "jumps" across the screen.
- **Suggested Fix:** Consider making minimized position match the expanded position (or nearest corner if center).
- **Human Decision:** ⏳ PENDING

#### 8. Referenced Feature Docs Do Not Exist
- **Category:** Inconsistency
- **Severity:** Medium
- **Location:** Section 9 - Related Features
- **Issue:** Section 9 references `./widget-theming.md` (V6) and `./device-detection.md` (V7) but these files do not exist in the `docs/features/visitor/` directory. The feature IDs V6 and V7 imply these are part of the visitor feature set but they are missing.
- **Suggested Fix:** Either create the missing documentation files for widget-theming and device-detection, or remove/update the references. The theming logic is in widget-styles.ts and device detection is in Widget.tsx - these may warrant their own feature docs.
- **Human Decision:** ⏳ PENDING

#### 9. Large Monolithic Code Files
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 8 - Code References
- **Issue:** Widget.tsx is 1380 lines and widget-styles.ts is 1685 lines. These large files could be difficult to maintain, test, and reason about. High line counts may indicate too many responsibilities in single files.
- **Suggested Fix:** Consider splitting Widget.tsx into smaller components (e.g., MinimizedWidget, ExpandedWidget, CallState, DragHandler). Split widget-styles.ts into modular style files by concern (base, themes, positions, states).
- **Human Decision:** ⏳ PENDING

#### 10. Call Reconnection Expiry Not Fully Documented
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 4 - Edge Cases, Row 5
- **Issue:** Edge case #5 mentions "Call reconnects via localStorage token" with "5 min expiry" but doesn't document what happens when the token expires. Does the widget show an error? Does it silently fail? Does the visitor see a "call ended" message?
- **Suggested Fix:** Document the complete flow for reconnection token expiry: what the visitor sees, whether they can re-initiate a call, and how the agent-side handles this.
- **Human Decision:** ⏳ PENDING

#### 11. Hidden State Transition When Agent Becomes Unavailable Mid-Call
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 2 - State Machine
- **Issue:** The state machine shows `in_call → in_call: Reconnection (page nav)` but doesn't show what happens if the agent becomes unavailable during an active call. Other states (open, minimized, waiting_for_agent) show transitions to `hidden` when agent unavailable, but `in_call` doesn't. Is the call terminated? Does it show an error?
- **Suggested Fix:** Add explicit transition from `in_call` state when agent becomes unavailable, documenting whether call ends gracefully, shows error, or attempts reconnection.
- **Human Decision:** ⏳ PENDING

#### 12. Max Z-Index May Conflict with Host Website Overlays
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 6 - Security
- **Issue:** Widget uses `z-index: 2147483647` (JavaScript max safe integer for 32-bit signed) to prevent clickjacking. However, this may conflict with host website's modal dialogs, cookie consent banners, or other critical overlays that also use high z-index values, potentially causing UX issues on some sites.
- **Suggested Fix:** Document this behavior for admins installing the widget. Consider making z-index configurable or using a slightly lower value that still prevents most clickjacking.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 12
- **Critical:** 0
- **High:** 0
- **Medium:** 5
- **Low:** 7

---

## STATS-call-analytics - Call Analytics

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/stats/call-analytics.md`
**Review Agent:** docs/prompts/active/review-agent-stats-call-analytics.md

### Findings

#### 1. 500 Row Limit Without Pagination Blocks Access to Historical Data
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Row 1; Section 10 - Open Questions #1
- **Issue:** Documentation explicitly flags: "500 row limit not paginated - Can't see older calls - Medium - Add pagination or infinite scroll". For organizations with high call volume, calls older than a few weeks would be completely inaccessible. This limits the feature's usefulness for trend analysis and historical auditing.
- **Suggested Fix:** Implement cursor-based pagination or infinite scroll. Consider server-side aggregations for older data that don't need individual call access.
- **Human Decision:** ⏳ PENDING

#### 2. Coverage Calculation Has O(n×m) Complexity - Performance Risk
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 6 - Performance, Row 2 and 3; Section 10 - Open Questions #3
- **Issue:** Documentation flags: "Coverage calculation | Iterates all pageviews/sessions | ⚠️ O(n×m) complexity" and "Hourly coverage | Loops 24×days×sessions | ⚠️ Could be slow for long ranges". For organizations with high traffic and long date ranges, this calculation could cause significant page load delays.
- **Suggested Fix:** Pre-calculate coverage metrics hourly/daily via background job and store aggregated results. Alternatively, limit date range selection to max 90 days.
- **Human Decision:** ⏳ PENDING

#### 3. Call Duration Outliers Skew Average Metrics
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #4; Section 7 - Identified Issues Row 3; Section 10 - Open Questions #2
- **Issue:** Edge case #4 is marked ⚠️: "Call duration outliers | Very long calls | Included in average (no capping) | ⚠️ | May skew averages". A single 4-hour call (e.g., left open accidentally) would significantly distort the "Avg Call Duration" metric, making it misleading for planning purposes.
- **Suggested Fix:** Display median in addition to mean, or trim outliers beyond 2 standard deviations. Alternatively, cap call duration at org-configurable threshold (e.g., 2 hours).
- **Human Decision:** ⏳ PENDING

#### 4. No Debounce on Rapid Filter Changes
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #19
- **Issue:** Edge case #19 is marked ⚠️: "Rapid filter changes | User spam clicks | Each triggers server refresh | ⚠️ | No debounce visible". A user rapidly clicking filters could trigger multiple expensive database queries in succession, potentially causing rate limiting or poor UX with flashing results.
- **Suggested Fix:** Implement 300-500ms debounce on filter changes before triggering server re-fetch. Consider showing "Apply" button for complex filter scenarios.
- **Human Decision:** ⏳ PENDING

#### 5. Long Date Ranges Have No Enforced Limit
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 4 - Edge Cases #20
- **Issue:** Edge case #20 is marked ⚠️: "Date range > 1 year | Long analysis | Works but slow | ⚠️ | No limit enforced". Combined with the O(n×m) coverage calculation, a user selecting a multi-year date range could trigger extremely slow queries that degrade experience for everyone on shared infrastructure.
- **Suggested Fix:** Enforce max date range (e.g., 365 days) with clear messaging. For longer analysis, suggest CSV export or provide pre-aggregated yearly summaries.
- **Human Decision:** ⏳ PENDING

#### 6. Recording URL Expiration Causes Unrecoverable Data Loss
- **Category:** Technical Debt
- **Severity:** High
- **Location:** Section 4 - Error States, Row 2
- **Issue:** Error States table shows: "Recording URL expired | Old S3 links | Video/audio won't play | No recovery (data lost)". Signed S3 URLs have expiration times. Once expired, organizations permanently lose access to call recordings. This is a critical data retention issue, especially for compliance-sensitive industries.
- **Suggested Fix:** Implement URL refresh mechanism that generates new signed URLs on demand. Store recording references (not signed URLs) in database and sign on access.
- **Human Decision:** ⏳ PENDING

#### 7. Supabase Query Failure Shows No Explicit Error
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 4 - Error States, Row 1; Section 7 - First Principles Review #5
- **Issue:** Error States shows: "Supabase query fails | Database issue | Empty results, no explicit error | Page refresh". First Principles #5 confirms "Are errors recoverable? ⚠️ Mostly - No explicit error states shown". Users would see empty results with no way to know if there's no data vs. a system error.
- **Suggested Fix:** Implement explicit error boundary that catches query failures and displays "Unable to load call data. Please try again." with retry button.
- **Human Decision:** ⏳ PENDING

#### 8. Table Rows Not Keyboard Focusable - Accessibility Gap
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility audit shows: "Keyboard navigation: ⚠️ Table rows not focusable". Users who rely on keyboard navigation cannot access call row details, expand transcriptions, or play recordings without a mouse. This is a WCAG 2.1 Level A violation.
- **Suggested Fix:** Add tabindex="0" to interactive table rows. Implement keyboard handlers for Enter (expand) and Space (play recording).
- **Human Decision:** ⏳ PENDING

#### 9. Icons Lack Aria-Labels - Screen Reader Gap
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility audit shows: "Screen reader support: ⚠️ Icons lack aria-labels". Status icons (accepted, missed, rejected), action icons (play, expand, export) are not accessible to screen reader users, making the interface unusable for visually impaired users.
- **Suggested Fix:** Add aria-label to all icon buttons (e.g., aria-label="Play recording" on play button). Use sr-only text for status icons.
- **Human Decision:** ⏳ PENDING

#### 10. No Loading Indicators During Data Fetch
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 5 - Accessibility; Section 7 - First Principles Review #3; Section 7 - Identified Issues Row 2
- **Issue:** Multiple places flag this: Accessibility shows "Loading states: ⚠️ No skeleton loaders during fetch", First Principles says "Is feedback immediate? ⚠️ Mostly - No loading indicators during filter apply", and Identified Issues lists "No loading indicators - User confused on slow queries - Low - Add skeleton loaders".
- **Suggested Fix:** Add skeleton loaders for stat cards and table during initial load. Show subtle spinner or progress bar during filter re-fetch.
- **Human Decision:** ⏳ PENDING

#### 11. No Real-Time Updates for New Calls
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #4
- **Issue:** Open Question #4 asks: "Should we add real-time updates? Currently requires page refresh to see new calls." Admins monitoring live call activity must manually refresh to see new calls, which is suboptimal for active monitoring scenarios.
- **Suggested Fix:** Implement Supabase Realtime subscription for new call_logs within current filter. Show "New calls available" toast that auto-updates or prompts refresh.
- **Human Decision:** ⏳ PENDING

#### 12. No Saved Filter Presets for Repetitive Analysis
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 7 - Identified Issues Row 5; Section 10 - Open Questions #5
- **Issue:** Identified Issues flags: "No saved filter presets - Repetitive filter setup - Low - Add filter presets". Open Question #5 elaborates: "Admins analyzing the same segments repeatedly would benefit." Power users must manually recreate complex filter combinations each session.
- **Suggested Fix:** Add "Save filter preset" with naming capability. Store in localStorage or user_preferences. Consider org-wide shared presets for common analyses.
- **Human Decision:** ⏳ PENDING

#### 13. First Principles vs UX Audit Contradiction
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 5 - UX Audit vs Section 7 - First Principles Review
- **Issue:** The UX Audit in Section 5 shows all steps as "Clear? ✅" with no issues, but First Principles Review in Section 7 marks "Is feedback immediate? ⚠️" and "Are errors recoverable? ⚠️". These sections contradict each other on the quality of the user experience.
- **Suggested Fix:** Reconcile the UX Audit to reflect the known gaps. Add "Issues" column entries for loading state and error feedback gaps.
- **Human Decision:** ⏳ PENDING

#### 14. Ambiguous "Total Answers" Definition May Cause Confusion
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Section 2 - Key Metrics Calculated
- **Issue:** The metrics table defines "Total Answers" as "Count where status = 'accepted' OR 'completed'". It's unclear why "accepted" alone counts as an answer when "completed" implies successful resolution. An accepted call that immediately drops should arguably be counted differently than a completed call.
- **Suggested Fix:** Clarify the business definition: Does "answered" mean agent picked up, or call was successfully completed? Consider renaming to "Calls Connected" if the former.
- **Human Decision:** ⏳ PENDING

#### 15. No Proactive Low Coverage Alerts
- **Category:** Documented Issue
- **Severity:** Low
- **Location:** Section 10 - Open Questions #6
- **Issue:** Open Question #6 asks: "Should there be alerts for low coverage? Currently just displays data, no proactive notifications." Organizations may not check the dashboard regularly and could miss periods of poor coverage until customer complaints surface.
- **Suggested Fix:** Implement configurable coverage threshold alerts (e.g., email admin when coverage drops below 50% for 3 consecutive hours). Add to notification settings.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 15
- **Critical:** 0
- **High:** 1
- **Medium:** 4
- **Low:** 10
TEST APPEND Wed Dec  3 15:59:50 MST 2025

---

## M-error-tracking - Error Tracking

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/monitoring/error-tracking.md`
**Review Agent:** review-agent-monitoring-error-tracking.md

### Findings

#### 1. No Sensitive Data Scrubbing Configured
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Security; Section 7 - Identified Issues; Edge Case #12
- **Issue:** Multiple locations in the documentation explicitly flag that no `beforeSend` filter is configured to scrub PII from error data sent to Sentry. Section 6 Security table shows "⚠️ No automatic scrubbing configured". Edge Case #12 states "Sensitive data in error | PII in exception message | Sent to Sentry as-is | ⚠️". This means emails, names, and other personal data in exception messages are transmitted to a third-party service.
- **Suggested Fix:** Implement a `beforeSend` hook in Sentry config files to strip common PII patterns (emails, names, phone numbers) from error messages before transmission.
- **Human Decision:** ⏳ PENDING

#### 2. Widget Errors During WebRTC Are Invisible
- **Category:** Documented Issue
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #7; Section 7 - Identified Issues; Section 10 - Open Question #1
- **Issue:** Edge Case #7 notes "Error during WebRTC | Peer connection fail | Dashboard side captured only | ⚠️ | Widget errors lost". When a WebRTC error occurs on the visitor side (in the widget), this error is completely invisible to developers. Section 7 marks "Widget has no error tracking | Customer-site errors invisible" as Medium severity.
- **Suggested Fix:** Implement a lightweight error boundary in the widget that POSTs critical errors (especially WebRTC failures) to the signaling server, which then forwards to Sentry.
- **Human Decision:** ⏳ PENDING

#### 3. Server Events Lost When Sentry Unreachable
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 4 - Edge Case #8; Section 6 - Reliability; Section 7 - Identified Issues
- **Issue:** Edge Case #8 states "Network timeout to Sentry | No connectivity | Events queued in browser, lost on server | ⚠️ | No offline queue on server". The browser SDK queues events during network issues, but the server SDK drops them.
- **Suggested Fix:** Implement server-side event buffering using disk or Redis with retry logic when Sentry becomes available.
- **Human Decision:** ⏳ PENDING

#### 4. 100% Trace Sample Rate Unsustainable at Scale
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 7 - Identified Issues; Section 10 - Open Question #3; Configuration Reference
- **Issue:** The Sample Rates Summary table shows tracesSampleRate at 100% for all four environments. Section 7 identifies "100% trace sample rate | High Sentry costs" as Low severity.
- **Suggested Fix:** Reduce tracesSampleRate to 10-20% for production environments while keeping higher rates for development/staging.
- **Human Decision:** ⏳ PENDING

#### 5. Sentry Alert Configuration Undocumented
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 10 - Open Question #5
- **Issue:** Open Question #5 notes "Are Sentry alerts configured? The code shows SDK setup but alert rules are configured in Sentry UI - not documented here what rules exist."
- **Suggested Fix:** Document current Sentry alert rules in this feature doc or a separate runbook.
- **Human Decision:** ⏳ PENDING

#### 6. No Client-Side Rate Limiting for High Error Volume
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 4 - Edge Case #9; Section 6 - Reliability
- **Issue:** Edge Case #9 states "High error volume | Thousands of errors | All sent (no rate limiting configured) | ⚠️ | Could hit Sentry quota".
- **Suggested Fix:** Configure Sentry sampleRate or custom rate limiting logic to cap errors per session/minute.
- **Human Decision:** ⏳ PENDING

#### 7. Source Map Upload Failure Allows Build to Continue
- **Category:** Technical Debt
- **Severity:** Low
- **Location:** Section 4 - Edge Case #11
- **Issue:** Edge Case #11 notes "Source map upload fails | CI build issue | Errors show minified stack | ⚠️ | Build continues".
- **Suggested Fix:** Make source map upload failure a blocking CI step, or add prominent alerting when upload fails.
- **Human Decision:** ⏳ PENDING

#### 8. Related Feature Link References Inconsistent Filename
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 9 - Related Features
- **Issue:** Section 9 links to "[Uptime Monitoring (M1)](./UPTIME_MONITORING.md)" but the file may be differently cased.
- **Suggested Fix:** Verify the exact filename exists and update the link if needed.
- **Human Decision:** ⏳ PENDING

#### 9. Environment Differentiation for Sample Rates Unclear
- **Category:** Confusing User Story
- **Severity:** Low
- **Location:** Configuration Reference - Sample Rates Summary
- **Issue:** The Sample Rates Summary table shows 100% for all environments but does not indicate if these rates should differ between development/staging/production.
- **Suggested Fix:** Add guidance to Configuration Reference explaining how to set environment-specific sample rates.
- **Human Decision:** ⏳ PENDING

#### 10. No Guidance on What Constitutes a Critical Error for Alerting
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Sections 3, 4 (general)
- **Issue:** While the documentation thoroughly covers what errors are captured, there is no guidance on error severity classification for alerting purposes.
- **Suggested Fix:** Add a subsection under Triggers and Events that classifies errors by business impact to guide alert configuration in Sentry.
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 10
- **Critical:** 0
- **High:** 0
- **Medium:** 3
- **Low:** 7

---

## API-billing-api - Billing API

**Reviewed:** 2025-12-03
**Doc File:** `docs/features/api/billing-api.md`
**Review Agent:** `docs/prompts/active/review-agent-api-billing-api.md`

### Findings

#### 1. State Machine Diagram Missing "paused" State
- **Category:** Inconsistency
- **Severity:** High
- **Location:** Section 2 - State Machine and State Definitions
- **Issue:** The State Definitions table includes a "paused" state with description "Account paused by admin" but this state is completely absent from the State Machine diagram. The diagram shows transitions between (none), trialing, active, past_due, and cancelled - but no paused state or any transitions to/from it. This creates confusion about whether paused is a valid state and how it integrates with the subscription lifecycle.
- **Suggested Fix:** Either add "paused" to the state diagram with proper transitions (e.g., active → paused → active), or remove it from State Definitions if it's not actually implemented. If paused is separate from Stripe subscription state, document that clearly.
- **Human Decision:** ⏳ PENDING

#### 2. Unknown Stripe Status Defaults to "active" - Security Risk
- **Category:** Logic Issue
- **Severity:** High
- **Location:** Section 4 - Edge Cases, Row 20
- **Issue:** Edge case #20 states: "Unknown Stripe status | subscription.updated | Defaults to 'active', logs warning | ⚠️ Conservative fallback". Defaulting to "active" for unknown statuses is NOT conservative - it grants access when status is uncertain. An unknown status could indicate account suspension, fraud, or a new Stripe status not yet mapped. Granting active status by default could allow access to users who should be restricted.
- **Suggested Fix:** Default unknown statuses to "past_due" or a new "unknown" status that restricts access while logging for investigation. Active should only be set for explicitly known good statuses.
- **Human Decision:** ⏳ PENDING

#### 3. Seat Removal Not Reducing Billing - User Expectation Mismatch
- **Category:** UX Concern
- **Severity:** High
- **Location:** Section 2 - Seat Management, Section 5 - Step 5
- **Issue:** Documentation explicitly flags in Section 5: "Remove team member | Seat freed (no billing change) | ⚠️ User may expect billing reduction". The pre-paid model means admins who remove agents continue paying for those seats. This is counter-intuitive - users naturally expect that removing a seat reduces their bill. Without clear upfront explanation, this feels like being overcharged.
- **Suggested Fix:** Add prominent UI messaging when removing an agent: "Your seat count will remain at X. To reduce billing, go to Billing Settings and lower your seat count." Consider showing "unused seats" prominently in billing dashboard.
- **Human Decision:** ⏳ PENDING

#### 4. No Timeout Handling on Stripe API Calls
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 6 - Performance, Section 7 - Identified Issues
- **Issue:** Documentation explicitly identifies: "Stripe API latency | Async calls, no timeout handling | ⚠️ Could add timeouts" and Identified Issues lists "No explicit timeout on Stripe calls | Long hangs on Stripe issues | 🟡 Medium". If Stripe is slow or unresponsive, API requests will hang indefinitely, causing poor user experience and potential resource exhaustion.
- **Suggested Fix:** Add AbortController with 30-second timeout to all Stripe API calls. Return user-friendly error: "Payment system is temporarily slow. Please try again in a moment."
- **Human Decision:** ⏳ PENDING

#### 5. Six-Month Offer Loss Not Warned - Irreversible Action
- **Category:** UX Concern
- **Severity:** Medium
- **Location:** Section 3 - Update Settings Data Flow, Section 7 - Identified Issues
- **Issue:** Documentation states: "Switching away from six_month → lose offer forever" and Identified Issues notes "six_month offer loss not warned | Users may accidentally lose discount | 🟡 Medium". This is an irreversible action with no confirmation. An admin could switch from 6-month to monthly billing without realizing they can never switch back.
- **Suggested Fix:** Add confirmation dialog: "Warning: Switching away from 6-month billing is permanent. You won't be able to return to this discounted rate. Are you sure?" with explicit "Cancel" and "Switch Anyway" buttons.
- **Human Decision:** ⏳ PENDING

#### 6. No Rate Limiting on Billing Endpoints
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Section 10 - Open Questions #4
- **Issue:** Documentation identifies: "No rate limiting on billing endpoints | Potential abuse | 🟢 Low" and asks "Should billing endpoints have stricter rate limiting?". Billing endpoints create real costs (Stripe API calls, subscription changes). Without specific rate limiting, malicious actors could spam subscription creation attempts or trigger excessive Stripe API calls.
- **Suggested Fix:** Add billing-specific rate limiting: 5 requests/minute per user for create-subscription, 20 requests/minute for seats endpoint, 10 requests/minute for update-settings.
- **Human Decision:** ⏳ PENDING

#### 7. No Audit Logging for Billing Changes
- **Category:** Technical Debt
- **Severity:** Medium
- **Location:** Section 7 - Identified Issues, Section 10 - Open Questions #6
- **Issue:** Documentation notes: "No audit logging | Can't track billing changes | 🟢 Low | Add billing_events table" and Open Question #6 asks: "Should there be a billing audit log? Currently no historical record of billing changes." For financial operations, audit trails are typically required for compliance and dispute resolution. There's no record of who changed seats, when subscriptions were modified, or billing frequency changes.
- **Suggested Fix:** Create billing_audit_log table with: timestamp, user_id, org_id, action (created_subscription, updated_seats, changed_frequency), old_value, new_value, ip_address. Log all billing endpoint actions.
- **Human Decision:** ⏳ PENDING

#### 8. No Alert System for Failed Stripe Operations
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #1
- **Issue:** Open Question #1 asks: "Should failed Stripe operations trigger alerts? Currently just logged - consider Sentry integration for billing failures." Billing failures are critical business events. If Stripe subscription creation fails repeatedly, or webhooks fail, no one is alerted. Failed payment method setups could indicate fraud or system issues.
- **Suggested Fix:** Integrate Sentry alerts for: subscription creation failures, webhook signature failures, repeated payment failures, and any 500 errors on billing endpoints. Consider PagerDuty integration for critical billing issues.
- **Human Decision:** ⏳ PENDING

#### 9. Authorization Inconsistency for Seats Endpoint
- **Category:** Logic Issue
- **Severity:** Medium
- **Location:** Section 3 - Key Functions/Components, API Reference - POST /api/billing/seats
- **Issue:** The update-settings endpoint requires admin role ("Auth: Required (admin role only)") but the seats endpoint allows "any authenticated user" per the API Reference. However, adding/removing seats is a billing operation with financial impact. If any authenticated user can call /api/billing/seats, a regular agent could potentially manipulate seat counts. The invites/agents APIs that call this endpoint may not properly validate caller permissions.
- **Suggested Fix:** Verify that seats endpoint validates admin role OR ensure it's only called through properly-protected invite/agent APIs. Document the expected authorization chain clearly.
- **Human Decision:** ⏳ PENDING

#### 10. Long-Term Stripe Outage Behavior Undefined
- **Category:** Missing Scenario
- **Severity:** Medium
- **Location:** Section 10 - Open Questions #5
- **Issue:** Open Question #5 asks: "What's the expected behavior when Stripe is down long-term? Dev mode works, but production could be stuck." If Stripe has extended downtime, new signups cannot subscribe, existing users cannot update billing, and webhook events queue up. There's no documented graceful degradation or manual override process.
- **Suggested Fix:** Document Stripe outage runbook: how to monitor Stripe status, manual subscription activation process for emergencies, grace period policy during outages. Consider caching last-known subscription status.
- **Human Decision:** ⏳ PENDING

#### 11. Proration Handling Not Documented for Users
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 5 - Step 6, Section 10 - Open Questions #2
- **Issue:** Section 5 shows "Change billing frequency | Proration applied | ✅" but Open Question #2 notes: "What happens to mid-cycle prorations? Stripe handles automatically, but not documented for users." Users switching billing frequency mid-cycle don't know if they'll be charged immediately, credited, or how the proration is calculated. This creates billing surprise anxiety.
- **Suggested Fix:** Before confirming frequency change, show proration preview: "You'll be charged $X today (prorated for remaining period) and $Y on your next billing date."
- **Human Decision:** ⏳ PENDING

#### 12. 7-Day Trial Period Hardcoded
- **Category:** Missing Scenario
- **Severity:** Low
- **Location:** Section 2 - High-Level Flow, Section 10 - Open Questions #3
- **Issue:** Documentation shows trial is fixed at 7 days and Open Question #3 asks: "Is the 7-day trial period configurable? Currently hardcoded - should it be per-org?" Different customer segments (enterprise, partners, promotions) may need different trial lengths. Hardcoding prevents sales flexibility.
- **Suggested Fix:** Add TRIAL_DAYS environment variable defaulting to 7. Consider per-org override via organizations.trial_days field set by superadmin.
- **Human Decision:** ⏳ PENDING

#### 13. Related Features Incorrectly Marked as "planned"
- **Category:** Inconsistency
- **Severity:** Low
- **Location:** Section 9 - Related Features
- **Issue:** All related features are marked as "(planned)" but the documentation files exist. For example, subscription-creation.md, seat-management.md, agent-management.md, and invites-api.md all exist in the docs/features directory. This suggests outdated documentation or incorrect status labeling.
- **Suggested Fix:** Update Related Features to remove "(planned)" label and add proper cross-references to existing documentation files.
- **Human Decision:** ⏳ PENDING

#### 14. Loading States Marked as Frontend Responsibility with No Guidance
- **Category:** UX Concern
- **Severity:** Low
- **Location:** Section 5 - Accessibility
- **Issue:** Accessibility section notes: "Loading states: ⚠️ Frontend responsibility" without providing any guidance on expected loading behavior. Each billing endpoint could take 2-5 seconds due to Stripe API calls. Without documented expected loading UX, different frontends may implement inconsistent or missing loading states.
- **Suggested Fix:** Add loading state recommendations: "All billing endpoints should show loading spinners. Disable submit buttons during API calls. Show progress for multi-step operations."
- **Human Decision:** ⏳ PENDING

### Summary
- **Total Findings:** 14
- **Critical:** 0
- **High:** 3
- **Medium:** 7
- **Low:** 4
