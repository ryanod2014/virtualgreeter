# Feature: Mobile Gate (V7)

## Quick Summary
The Mobile Gate is a device detection and redirection system that prevents mobile users from accessing the GreetNow dashboard, instead showing them a friendly page with options to access the application on a desktop computer.

## Affected Users
- [x] Website Visitor (indirect - widget has separate mobile handling)
- [x] Agent (redirected to mobile gate when on mobile)
- [x] Admin (redirected to mobile gate when on mobile)
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
GreetNow's video calling and dashboard features require a desktop browser for optimal experience. The Mobile Gate feature:
- Detects when users access the dashboard from mobile devices
- Redirects them to an informative "Switch to Desktop" page
- Provides convenient ways to transfer the link to a desktop computer
- Prevents frustrating mobile experiences with video calling and complex UI

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent on mobile | Access their dashboard | Shows clear message explaining desktop requirement, provides link transfer options |
| Admin on mobile | Manage settings | Shows clear message, provides copy/share options to access on desktop |
| New user signing up | Complete onboarding | Redirects to mobile gate so they can continue on desktop |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. User opens any authenticated dashboard page on mobile device
2. `MobileRedirect` component runs in `(app)/layout.tsx`
3. User agent is checked against mobile device regex pattern
4. If mobile detected, user is redirected to `/mobile-gate`
5. User sees "Switch to Desktop" page with options
6. User copies link or shares/emails it to themselves
7. User opens link on desktop computer

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER VISITS DASHBOARD                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  MobileRedirect runs  │
                    │  (100ms delay)        │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Check User Agent    │
                    │   against regex       │
                    └───────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            │                                       │
            ▼                                       ▼
   ┌─────────────────┐                   ┌─────────────────────┐
   │  Mobile Device  │                   │   Desktop Device    │
   │    Detected     │                   │     Detected        │
   └─────────────────┘                   └─────────────────────┘
            │                                       │
            ▼                                       ▼
   ┌─────────────────┐                   ┌─────────────────────┐
   │   Redirect to   │                   │  Show Dashboard     │
   │  /mobile-gate   │                   │   (normal flow)     │
   └─────────────────┘                   └─────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────┐
   │        MOBILE GATE PAGE             │
   │  • Copy Link button                 │
   │  • Share/Email Link button          │
   │  • Dashboard URL display            │
   │  • Back to homepage link            │
   └─────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `checking` | Component verifying device type | Page load | Detection complete |
| `mobile_detected` | User agent matches mobile pattern | Regex match found | Redirect initiated |
| `desktop_confirmed` | User agent does not match mobile | Regex match not found | Component unmounts |
| `on_mobile_gate` | User on /mobile-gate page | Redirect complete or direct navigation | Navigate to homepage or use desktop |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | `MobileRedirect` component | Starts 100ms timer for check | None |
| User agent check | `checkMobile()` function | Tests UA against regex | None |
| Mobile detected | `checkMobile()` | Calls `router.replace("/mobile-gate")` | Browser history replaced (no back) |
| Copy button click | Mobile gate page | Copies dashboard URL to clipboard | Shows "Link Copied!" confirmation |
| Share button click | Mobile gate page | Opens Web Share API or mailto | External share dialog or email client |
| Back navigation attempt | Mobile gate page | `popstate` event blocked | Pushes current URL back to history |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `MobileRedirect` | `apps/dashboard/src/lib/components/MobileRedirect.tsx` | Client component that detects mobile and redirects |
| `MobileGatePage` | `apps/dashboard/src/app/mobile-gate/page.tsx` | The mobile gate UI page |
| `handleCopyLink` | `apps/dashboard/src/app/mobile-gate/page.tsx` | Copies dashboard URL to clipboard |
| `handleShareLink` | `apps/dashboard/src/app/mobile-gate/page.tsx` | Uses Web Share API or mailto fallback |
| `isMobileDevice` | `apps/widget/src/Widget.tsx` | Widget-specific mobile detection (separate system) |

### Data Flow

```
PAGE LOAD (Authenticated Dashboard)
    │
    ├─► Layout.tsx: <MobileRedirect /> component renders
    │
    ├─► MobileRedirect: useEffect starts 100ms timer
    │   └─► Purpose: Small delay for accurate detection
    │
    ├─► MobileRedirect: checkMobile() executes
    │   ├─► Read navigator.userAgent (or vendor or opera)
    │   ├─► Regex test: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
    │   │
    │   ├─► IF mobile match:
    │   │   └─► router.replace("/mobile-gate")
    │   │       └─► Browser history: REPLACE (not push)
    │   │
    │   └─► IF no match:
    │       └─► setIsChecking(false) → show dashboard
    │
    └─► MobileRedirect: returns null (renders nothing)

MOBILE GATE PAGE
    │
    ├─► useEffect: Set dashboardUrl from window.location.origin + "/dashboard"
    │
    ├─► useEffect: Check Web Share API availability → setCanShare(boolean)
    │
    ├─► useEffect: Prevent back navigation
    │   └─► pushState + popstate listener to block history.back()
    │
    ├─► handleCopyLink():
    │   ├─► navigator.clipboard.writeText(dashboardUrl)
    │   ├─► setCopied(true)
    │   └─► setTimeout → setCopied(false) after 2 seconds
    │
    └─► handleShareLink():
        ├─► IF navigator.share && canShare:
        │   └─► navigator.share({ title, text, url })
        │
        └─► ELSE (fallback):
            └─► window.location.href = mailto:?subject=...&body=...
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | iPhone user accesses dashboard | User agent contains "iphone" | Redirects to mobile gate | ✅ | |
| 2 | iPad user accesses dashboard | User agent contains "ipad" | Redirects to mobile gate | ✅ | Tablets treated as mobile |
| 3 | Android phone user | User agent contains "android" | Redirects to mobile gate | ✅ | |
| 4 | Android tablet user | User agent contains "android" | Redirects to mobile gate | ✅ | Tablets treated as mobile |
| 5 | Desktop user with narrow window | Screen small but desktop UA | Does NOT redirect | ✅ | UA-based, not screen size |
| 6 | Desktop browser requests mobile site | "Request Mobile Site" feature | Depends on UA spoofing | ⚠️ | May redirect if UA spoofed |
| 7 | User directly navigates to /mobile-gate | Types URL directly | Shows mobile gate page | ✅ | No redirect loop |
| 8 | User on mobile gate tries back button | Click back | Stays on mobile gate | ✅ | History manipulation blocks back |
| 9 | Web Share API available | Modern mobile browser | Shows "Share Link" text | ✅ | |
| 10 | Web Share API unavailable | Older browser | Shows "Email Link to Myself" text | ✅ | Falls back to mailto |
| 11 | User cancels share dialog | Closes Web Share dialog | Silent failure, no action | ✅ | AbortError caught silently |
| 12 | Clipboard API fails | Permission denied | No visual feedback | ⚠️ | No error handling shown |
| 13 | Mobile user on /mobile-gate refreshes | Page refresh | Stays on mobile gate | ✅ | Pathname check prevents loop |
| 14 | Opera Mini user | User agent contains "opera mini" | Redirects to mobile gate | ✅ | |
| 15 | BlackBerry user | User agent contains "blackberry" | Redirects to mobile gate | ✅ | |
| 16 | Windows Phone user | User agent contains "iemobile" | Redirects to mobile gate | ✅ | |
| 17 | Chrome DevTools mobile emulation | Spoofed UA | Redirects to mobile gate | ✅ | Works for testing |
| 18 | Firefox Responsive Design Mode | No UA change | Does NOT redirect | ✅ | Only screen size changes |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Clipboard write fails | Browser blocks clipboard | Button shows normal state | Try share button instead |
| Web Share cancelled | User dismisses share dialog | Nothing, silent handling | Can click share again |
| Web Share error | Share API throws error | Falls through to mailto | Opens email client |
| Navigation state error | pushState fails | Back button may work | Still on mobile gate page |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Open dashboard on mobile | Redirect to /mobile-gate | ✅ | Fast redirect, no flash |
| 2 | See mobile gate page | Display "Switch to Desktop" messaging | ✅ | Clear explanation |
| 3 | Tap "Copy Link" | URL copied, button text changes | ✅ | 2s feedback with checkmark |
| 4 | Tap "Share Link" | Opens native share dialog | ✅ | Native, familiar UI |
| 5 | Tap "Email Link" | Opens email app with pre-filled content | ✅ | Convenient fallback |
| 6 | Tap "Back to homepage" | Navigate to / | ✅ | Clear exit path |
| 7 | Tap browser back | Stay on mobile gate | ✅ | Prevents confusion from partial dashboard load |

### Visual Design
- **Theme**: Dark theme with glowing orb effects (matches landing page)
- **Layout**: Centered card with clear hierarchy
- **Icons**: Lucide icons (Monitor, Smartphone, Copy, Mail, Check, etc.)
- **Animation**: Fade-in entrance animations with staggered delays
- **Responsive**: Works well on all mobile screen sizes

### Accessibility
- Keyboard navigation: ⚠️ Not specifically tested
- Screen reader support: ✅ Semantic HTML, clear button labels
- Color contrast: ✅ High contrast dark theme
- Loading states: ✅ "Loading..." shown while URL resolves
- Focus management: ⚠️ No explicit focus trap or management

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Flash of dashboard content | 100ms delay + checking state | ✅ Minimal flash |
| Detection accuracy | User agent regex | ✅ Covers major mobile platforms |
| Redirect speed | router.replace (no history push) | ✅ Fast, clean redirect |

### Security
| Concern | Mitigation |
|---------|------------|
| Dashboard URL exposure | Only shows user's own dashboard URL |
| Share data leakage | Only shares URL, no sensitive data |
| History manipulation | Uses pushState legitimately to improve UX |

### Reliability
| Concern | Mitigation |
|---------|------------|
| False positives (desktop detected as mobile) | Unlikely - regex is conservative |
| False negatives (mobile not detected) | Possible with exotic devices; falls through to dashboard |
| Redirect loop | Pathname check prevents redirect when on /mobile-gate |
| Web Share API support | Graceful fallback to mailto |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - "Desktop required, here's how to get there"
2. **Is the control intuitive?** ✅ Yes - Copy or share link, simple actions
3. **Is feedback immediate?** ✅ Yes - Copy shows confirmation, share opens immediately
4. **Is the flow reversible?** ⚠️ Partially - Can go to homepage, but can't access dashboard on mobile
5. **Are errors recoverable?** ✅ Yes - Multiple ways to transfer link
6. **Is the complexity justified?** ✅ Yes - Video calling genuinely needs desktop

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Tablets treated as mobile | iPad users can't access dashboard | 🟡 Medium | Consider allowing tablet access with warning |
| No clipboard error handling | Copy fails silently | 🟢 Low | Add error toast on copy failure |
| No "Continue Anyway" option | Power users stuck | 🟢 Low | Consider advanced option for tablet users |
| User agent detection is fragile | New devices may not be detected | 🟢 Low | Combine with feature detection if needed |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Mobile redirect component | `apps/dashboard/src/lib/components/MobileRedirect.tsx` | 1-55 | Client component with UA detection |
| Mobile gate page | `apps/dashboard/src/app/mobile-gate/page.tsx` | 1-207 | Full page UI |
| Layout integration | `apps/dashboard/src/app/(app)/layout.tsx` | 20 | MobileRedirect placed in app layout |
| Copy link handler | `apps/dashboard/src/app/mobile-gate/page.tsx` | 13-18 | Clipboard API usage |
| Share link handler | `apps/dashboard/src/app/mobile-gate/page.tsx` | 20-44 | Web Share API with mailto fallback |
| Back navigation prevention | `apps/dashboard/src/app/mobile-gate/page.tsx` | 55-63 | History API manipulation |
| Widget mobile detection | `apps/widget/src/Widget.tsx` | 26-35 | Different detection for widget (screen-based) |
| Widget device filtering | `apps/widget/src/Widget.tsx` | 300-310 | Admin-configurable device settings |

---

## 9. RELATED FEATURES
- [Widget Lifecycle](./widget-lifecycle.md) - Widget has its own mobile detection (`isMobileDevice()`) based on screen size, separate from dashboard mobile gate
- [Widget Settings](../admin/widget-settings.md) - Admin can configure `devices` setting: "all", "desktop", or "mobile" for the widget
- [Login Flow](../auth/login-flow.md) - Mobile users are redirected after login attempt

---

## 10. OPEN QUESTIONS

1. **Should tablets (iPad, Android tablets) be allowed with a warning?** - Currently all tablets are blocked, but many can run video calls. Consider a "Continue Anyway" option for tablets.

2. **Should mobile detection use feature detection instead of/in addition to UA sniffing?** - User agent can be spoofed or may not cover all devices. Could check for camera/mic capabilities.

3. **Why are there two different mobile detection systems?**
   - Dashboard: User agent regex in `MobileRedirect.tsx`
   - Widget: Screen size + touch detection in `Widget.tsx`
   - This is intentional - dashboard needs to block access, widget just hides based on admin settings

4. **Should the mobile gate page be accessible without auth?** - Currently it can be accessed directly without login. This is fine as it contains no sensitive information, but the redirect only happens from authenticated pages.

5. **Should there be analytics tracking on the mobile gate page?** - Currently no tracking of how many users hit the mobile gate, which could inform product decisions about mobile support.



