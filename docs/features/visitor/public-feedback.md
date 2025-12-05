# Feature: Feature Request Voting & Bug Reporting (V6)

## Quick Summary
A cross-organization feature request voting system and private bug reporting tool for authenticated dashboard users. Users can submit feature requests visible to all authenticated users across organizations, vote/comment on ideas, and report bugs privately within their organization. Includes screenshot/recording capture and notifications.

> **Naming Note:** The term "public" in the original feature name referred to cross-organization visibility of feature requests (visible to all authenticated users, regardless of organization), NOT anonymous/unauthenticated public access. This feature requires authentication.

## Affected Users
- [x] Agent
- [x] Admin
- [x] Platform Admin

> **Authentication Required:** This feature is only accessible to authenticated dashboard users (Agents, Admins, Platform Admins). Website visitors do not interact with this feature directly.

---

## 1. WHAT IT DOES

### Purpose
Provides a two-part feedback system for authenticated dashboard users (Agents, Admins, Platform Admins):
1. **Feature Requests (Cross-Organization):** A Reddit-style voting forum where authenticated users from ANY organization can submit, vote on, and discuss feature ideas. Requests are visible across all organizations, enabling community-driven feature prioritization. Top-voted features inform product roadmap.
2. **Bug Reports (Organization-Private):** An in-app bug reporting tool with screenshot/recording capture, visible only within the submitter's organization for internal tracking.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent | Request features to improve workflow | Submit ideas, vote on existing requests, discuss in comments |
| Admin | Report issues and request org-specific features | Submit bugs with evidence, track feature request status |
| Admin | See what other orgs want | View cross-org feature requests to understand platform direction |
| Platform Admin | Prioritize product roadmap | View all feedback, see vote counts, identify high-impact features |
| Platform Admin | Respond to user issues | View bug reports with attachments, track resolution status |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)

**Feature Request:**
1. User clicks "Request Feature" floating button → opens `/feedback` page
2. User clicks "New Request" → modal appears
3. User enters title and description
4. User submits → Request saved with `type: 'feature'`, `status: 'open'`
5. Other users can upvote/downvote
6. Other users can comment (with threading)
7. Platform admins can update status

**Bug Report:**
1. User clicks "Report Bug" floating button → modal opens
2. User enters title and description
3. User optionally captures screenshot or records screen (up to 60s)
4. User submits → Bug saved with `type: 'bug'`, browser info, page URL
5. Bug visible only to users in same organization

### State Machine

```
FEATURE REQUEST LIFECYCLE
                                   
  [New Request]                    
       │                           
       ▼                           
     ┌────────┐                    
     │  open  │◄────────────┐      
     └────┬───┘             │      
          │                 │      
    ┌─────┼─────┐           │      
    ▼     ▼     ▼           │      
┌──────┐ ┌───────────┐ ┌────────┐  
│closed│ │in_progress│ │declined│  
└──────┘ └─────┬─────┘ └────────┘  
               │                   
               ▼                   
          ┌─────────┐              
          │completed│              
          └─────────┘              
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `open` | New request awaiting review | Submit feature request | Admin changes status |
| `in_progress` | Actively being worked on | Admin marks in progress | Admin marks completed/closed |
| `completed` | Feature has been built | Admin marks completed | N/A (terminal state) |
| `closed` | Closed without action | Admin marks closed | Admin reopens (→ open) |
| `declined` | Request rejected | Admin marks declined | Admin reopens (→ open) |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Submit feature request | PublicFeedbackClient form | Creates `feedback_items` row with `type: 'feature'` | None |
| Submit bug report | FeedbackButtons modal | Creates `feedback_items` row with `type: 'bug'` + browser info | Uploads screenshot/recording to storage |
| Upvote/Downvote | PublicFeedbackClient item card | Inserts/updates `feedback_votes` | Triggers `update_feedback_vote_count()` → updates `vote_count` |
| Remove vote | Click same vote button again | Deletes `feedback_votes` row | Decrements `vote_count` |
| Add comment | PublicFeedbackClient detail modal | Inserts `feedback_comments` | Triggers `update_feedback_comment_count()` + `notify_on_comment_reply()` |
| Reply to comment | Comment reply form | Inserts `feedback_comments` with `parent_comment_id` | Creates notification for parent comment author |
| Delete comment | User's own comment | Deletes `feedback_comments` | Decrements `comment_count` |
| Mark notification read | Click notification | Updates `feedback_notifications.is_read = true` | Decrements badge count |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `PublicFeedbackClient` | `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | Main feature request board with voting/comments |
| `FeedbackButtons` | `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | Floating UI buttons + bug report modal + notifications |
| `FeedbackClient` | `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | Platform admin view of all feedback |
| `PublicFeedbackPage` | `apps/dashboard/src/app/(app)/feedback/page.tsx` | Auth wrapper for public feedback |
| `update_feedback_vote_count()` | Database trigger | Auto-updates vote_count on vote changes |
| `update_feedback_comment_count()` | Database trigger | Auto-updates comment_count on comment changes |
| `notify_on_comment_reply()` | Database trigger | Creates notification when someone replies |
| `notify_on_upvote()` | Database trigger | Creates notification when someone upvotes |

### Data Flow

```
USER SUBMITS FEATURE REQUEST
    │
    ├─► PublicFeedbackClient: handleSubmit()
    │   ├─► Fetch user's organization_id from users table
    │   └─► Insert into feedback_items:
    │       { organization_id, user_id, type: 'feature', title, description, 
    │         status: 'open', priority: 'medium' }
    │
    └─► UI: Close modal, refresh items list

USER VOTES ON FEATURE
    │
    ├─► PublicFeedbackClient: handleVote(itemId, voteType, currentVote)
    │   │
    │   ├─► IF currentVote === voteType (clicking same vote)
    │   │   └─► DELETE from feedback_votes (remove vote)
    │   │
    │   ├─► ELSE IF currentVote === null (no existing vote)
    │   │   └─► INSERT into feedback_votes { item_id, user_id, vote_type }
    │   │
    │   └─► ELSE (switching vote)
    │       └─► UPDATE feedback_votes SET vote_type = newType
    │
    ├─► Database trigger: update_feedback_vote_count()
    │   └─► UPDATE feedback_items SET vote_count = vote_count ± vote_type
    │
    ├─► Database trigger: notify_on_upvote() [if upvote]
    │   └─► INSERT notification for item owner (if not self-vote)
    │
    └─► UI: fetchItems() → refresh display with new counts

USER SUBMITS BUG REPORT
    │
    ├─► FeedbackButtons: handleSubmitBug()
    │   │
    │   ├─► IF screenshot exists
    │   │   └─► uploadMedia(screenshot, 'screenshot') → storage bucket
    │   │
    │   ├─► IF recording exists
    │   │   └─► uploadMedia(recording, 'recording') → storage bucket
    │   │
    │   └─► INSERT into feedback_items:
    │       { organization_id, user_id, type: 'bug', title, description,
    │         status: 'open', page_url: pathname, browser_info: userAgent,
    │         screenshot_url, recording_url }
    │
    └─► UI: Close modal, show success toast

COMMENT THREADING
    │
    ├─► Root Comment: parent_comment_id = NULL
    │
    ├─► Reply: parent_comment_id = <parent_id>
    │   └─► Max depth: 4 levels (enforced in UI, not database)
    │
    └─► Display: Recursive CommentThread component builds tree
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path feature request | Submit form | Request created, shown in list | ✅ | |
| 2 | Happy path bug report | Submit modal | Bug created with attachments | ✅ | |
| 3 | Upvote own request | Click upvote on own item | Vote registered, no notification | ✅ | Self-notifications blocked |
| 4 | Downvote then upvote | Click down then up | Vote switches, count adjusts by +2 | ✅ | Trigger handles UPDATE |
| 5 | Remove vote | Click same vote again | Vote deleted, count adjusts | ✅ | |
| 6 | Very long title | Type >200 chars | Input maxLength="200" prevents | ✅ | Client-side enforcement |
| 7 | Very long description | Type unlimited | No limit enforced | ⚠️ | Could cause UI issues |
| 8 | Empty title/description | Try to submit | Button disabled + error shown | ✅ | |
| 9 | Submit during loading | Rapid clicks | isSubmitting prevents double-submit | ✅ | |
| 10 | View bug from other org | Direct URL | RLS blocks access | ✅ | Policy enforces org check |
| 11 | View feature from other org | Direct URL or search | Allowed (public) | ✅ | Features are cross-org |
| 12 | Comment reply at max depth | Reply at depth 4 | Reply button hidden | ✅ | maxDepth = 4 in UI |
| 13 | Delete comment with replies | Delete parent | Cascades delete children | ✅ | ON DELETE CASCADE |
| 14 | Screenshot capture fails | No permission | Error toast shown | ✅ | Try/catch handles |
| 15 | Recording >60 seconds | Let recording run | Auto-stops at 60s | ✅ | setTimeout enforces |
| 16 | User stops sharing mid-record | End share | Recording stops, blob saved | ✅ | onended handler |
| 17 | Upload large recording | Submit with video | May timeout | ⚠️ | No explicit size limit |
| 18 | Search with special chars | Type regex chars | ilike handles safely | ✅ | Supabase escapes |
| 19 | Notification polling | Every 30s | Fetches last 20 notifications | ✅ | |
| 20 | Mark all notifications read | Click "Mark all read" | Batch update | ✅ | |
| 21 | Click notification | Select notification | Marks read, navigates to /feedback | ⚠️ | Doesn't scroll to specific item |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Submit fails | Network error | "Failed to submit. Please try again." | Retry button |
| Screenshot permission denied | User blocks screen share | "Could not capture screenshot. Please try again." | Try again button |
| Recording start fails | Browser incompatible | "Could not start recording. Please try again." | Retry or skip |
| Upload fails | Storage error | Form stays open, can retry | Retry submission |
| Fetch items fails | Network error | Console error, list may be empty | Refresh page |
| Vote fails | Network error | Console error, UI may be stale | Refresh to sync |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Feature Request Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click "Request Feature" button | Navigate to /feedback | ✅ | |
| 2 | Click "New Request" | Modal opens with form | ✅ | |
| 3 | Fill title/description | Real-time validation | ✅ | |
| 4 | Click "Submit Request" | Loading state → close modal → refresh list | ✅ | |
| 5 | Click upvote arrow | Immediate visual feedback, count updates | ✅ | |
| 6 | Click item card | Detail modal opens with comments | ✅ | |
| 7 | Write comment | Submit → comment appears in thread | ✅ | |

**Bug Report Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click "Report Bug" | Modal opens | ✅ | |
| 2 | Fill title/description | Real-time validation | ✅ | |
| 3 | Click "Screenshot" | Screen picker opens | ✅ | |
| 4 | Select screen | Screenshot captured, preview shown | ✅ | |
| 5 | Click "Record Screen" | Modal hides, recording starts | ✅ | Floating indicator shows |
| 6 | Click "Stop Recording" | Modal reopens with video preview | ✅ | |
| 7 | Submit | Upload → close → success toast | ✅ | No progress indicator |

### Accessibility
- Keyboard navigation: ⚠️ Modals trap focus but vote buttons may not be fully keyboard accessible
- Screen reader support: ⚠️ Vote counts lack aria-live announcements
- Color contrast: ✅ Status badges have distinct colors
- Loading states: ✅ Spinner shown during loads

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large item lists | No pagination implemented | ⚠️ Could slow with many items |
| Comment tree rendering | Recursive component | ✅ Limited to depth 4 |
| Vote count updates | Database trigger | ✅ Efficient, atomic |
| Notification polling | 30s interval | ✅ Low overhead |
| Screenshot/recording size | No explicit limits | ⚠️ Large files could timeout |

### Security
| Concern | Mitigation |
|---------|------------|
| Cross-org bug access | RLS policy: bugs only visible to same org |
| Feature request spam | Requires authentication |
| Vote manipulation | One vote per user per item (unique constraint) |
| Malicious attachments | Storage bucket public, but upload restricted to user's org folder |
| XSS in comments | React escapes content by default |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Vote count drift | Database triggers ensure consistency |
| Comment count drift | Database triggers ensure consistency |
| Notification delivery | Database triggers with SECURITY DEFINER |
| Failed uploads | User can retry, form stays open |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Reddit-style voting is familiar
2. **Is the control intuitive?** ✅ Yes - Up/down arrows, comment boxes are standard
3. **Is feedback immediate?** ✅ Yes - Vote counts update instantly
4. **Is the flow reversible?** ✅ Yes - Can remove votes, delete own comments
5. **Are errors recoverable?** ✅ Yes - Form stays open on failure
6. **Is the complexity justified?** ✅ Yes - Voting/threading are necessary for feature prioritization

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No pagination | Performance degrades with scale | 🟡 Medium | Add infinite scroll or pagination |
| No description length limit | Very long descriptions could break UI | 🟢 Low | Add maxLength or truncation |
| Notification click doesn't scroll to item | UX inconvenience | 🟢 Low | Store item ID, scroll to it |
| No progress indicator for uploads | User uncertainty during large uploads | 🟢 Low | Add upload progress bar |
| Recording file size unlimited | Could timeout/fail for long recordings | 🟢 Low | Add size check before upload |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Public feedback page | `apps/dashboard/src/app/(app)/feedback/page.tsx` | 1-19 | Auth wrapper |
| Main feedback client | `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | 1-985 | Voting, comments, modals |
| Feature request list | `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | 499-586 | Item cards with votes |
| Submit feature form | `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | 590-679 | New request modal |
| Detail modal with comments | `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | 681-880 | Selected item view |
| Comment thread component | `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | 886-983 | Recursive threaded comments |
| Floating buttons | `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | 1-658 | Bug report + notifications |
| Bug report modal | `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | 481-654 | Form with attachments |
| Screenshot capture | `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | 131-157 | getDisplayMedia API |
| Screen recording | `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | 159-219 | MediaRecorder API |
| Notifications dropdown | `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | 347-428 | Bell icon + list |
| Platform admin view | `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | 1-737 | All orgs feedback |
| Database schema | `supabase/migrations/20251129000000_feedback_system.sql` | 1-319 | Tables, triggers, RLS |
| Vote count trigger | `supabase/migrations/20251129100000_feedback_downvotes.sql` | 10-35 | Handles up/down/update |
| Notification triggers | `supabase/migrations/20251129200000_feedback_notifications.sql` | 64-139 | Reply + upvote notifications |
| Storage/enhancements | `supabase/migrations/20251129450000_feedback_enhancements.sql` | 1-66 | Screenshot/recording storage |

---

## 9. RELATED FEATURES
- [Call Lifecycle (P3)](../platform/call-lifecycle.md) - Calls may generate feedback about call quality
- [Widget Settings (D5)](../admin/widget-settings.md) - Feature requests may relate to widget config
- [Agent Management (D4)](../admin/agent-management.md) - Bugs may relate to agent UI issues

---

## 10. OPEN QUESTIONS

1. **Should there be pagination for feature requests?** Currently all items load at once, which could be slow with thousands of requests.

2. **Should notifications deep-link to specific comments?** Currently clicking a notification just navigates to /feedback, not to the specific item or comment.

3. **Is 60-second recording limit sufficient?** Some complex bugs may need longer recordings to reproduce.

4. **Should there be rate limiting on submissions?** Currently no limit on how many feature requests or bug reports a user can submit.

5. **Should feature request status changes trigger notifications?** Currently only replies and upvotes notify users; status changes (completed, declined) do not.

6. **Should there be email digest options for notifications?** Users may prefer daily/weekly summaries instead of real-time notifications for high-activity feature requests.



