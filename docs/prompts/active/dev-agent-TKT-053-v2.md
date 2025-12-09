# Dev Agent Continuation: TKT-053-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-053
> **Branch:** `agent/tkt-053` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Critical Bugs in Iframe Matching Logic

**QA Summary:**
Critical bugs in iframe matching logic cause unnamed iframes to be incorrectly treated as cross-origin. The implementation has fundamental flaws in how it matches and handles iframes.

**Failures Found:**

### BLOCKER-1: Unnamed iframes treated as cross-origin (CRITICAL)
- **File:** apps/widget/src/features/cobrowse/useCobrowse.ts
- **Lines:** 101-113
- **Issue:** `find()` returns undefined for iframes without src/name attributes, falls through to cross-origin handler, shows placeholder instead of capturing content
- **Evidence:** No position-based fallback despite comment claiming "Match by src, name, or position". If iframe has no src AND no name, originalIframe is undefined, causing contentDocument access to fail.
- **Expected:** Iframes without src/name attributes should have content captured via srcdoc
- **Actual:** Shows "Embedded content - not visible" placeholder for same-origin iframes
- **AC Failed:** AC1 - Same-origin iframe content is visible in agent view

### BLOCKER-2: Duplicate iframes not handled (CRITICAL)
- **File:** apps/widget/src/features/cobrowse/useCobrowse.ts
- **Line:** 101
- **Issue:** `Array.find()` returns first match only, no index tracking to distinguish duplicate iframes with same src
- **Evidence:** Multiple iframes with same src URL will all match the first iframe, subsequent iframes fall through to cross-origin handler
- **Expected:** Multiple iframes with same src should all have content captured
- **Actual:** Only first iframe with a given src works, rest show placeholder
- **AC Failed:** AC1 - Same-origin iframe content is visible in agent view

### BLOCKER-3: Incomplete URL fixing for resources (CRITICAL)
- **File:** apps/widget/src/features/cobrowse/useCobrowse.ts
- **Lines:** 130-151
- **Issue:** Only `img` and `link[rel="stylesheet"]` tags have URLs fixed, missing `script[src]`, `video[src]`, `audio[src]`, `embed[src]`
- **Evidence:** Only `querySelectorAll('img')` and `querySelectorAll('link[rel="stylesheet"]')` in code
- **Expected:** All relative URLs in iframe content resolved to absolute URLs
- **Actual:** Script/video/audio/embed tags NOT fixed, may fail to load resources
- **AC Failed:** AC1 - Resource loading in iframe content (partial regression)

### BLOCKER-4: Incorrect base URL for relative paths (CRITICAL)
- **File:** apps/widget/src/features/cobrowse/useCobrowse.ts
- **Line:** 128
- **Issue:** Uses `.origin` which loses path information, relative URLs may resolve incorrectly
- **Evidence:** `new URL(originalIframe.src).origin` loses path, should use full `originalIframe.src`
- **Example:** If iframe src is `https://example.com/app/form`, and it has image `../logo.png`, using origin would resolve to `https://example.com/logo.png` instead of `https://example.com/logo.png` (correct would be relative to `/app/`)
- **Expected:** Relative URLs should resolve from correct base path
- **Actual:** Path information lost, incorrect resolution

---

## What You Must Fix

1. **Fix iframe matching to use index-based fallback**
   - Add index tracking to distinguish iframes
   - When src and name both fail to match, use iframe index/position
   - Ensure unnamed iframes can be matched

2. **Add index tracking for duplicate iframes**
   - Track which iframe index you're processing
   - Match by (src + index) or (name + index) for duplicates
   - Use position-based fallback as documented in comment

3. **Expand URL fixing to all resource tags**
   - Add `script[src]`
   - Add `video[src]`, `video source[src]`
   - Add `audio[src]`, `audio source[src]`
   - Add `embed[src]`
   - Add `object[data]`

4. **Use full URL for base path, not just origin**
   - Change: `new URL(originalIframe.src).origin`
   - To: `originalIframe.src` (full URL with path)

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-053`
2. Pull latest: `git pull origin agent/tkt-053`
3. Read current implementation at `apps/widget/src/features/cobrowse/useCobrowse.ts:101-151`
4. Fix iframe matching logic (lines 101-113):
   - Add iframe index tracking
   - Implement position-based fallback for unnamed iframes
   - Handle duplicate iframes with same src
5. Fix URL resolution logic (lines 128-151):
   - Use full URL instead of just origin
   - Add missing resource tags (script, video, audio, embed, object)
6. Run `pnpm typecheck && pnpm build`
7. Manual test with:
   - Page with unnamed iframe (no src, no name)
   - Page with multiple iframes with same src
   - Iframe with relative URLs for scripts/videos
8. Push for re-QA

---

## Original Acceptance Criteria

- ❌ AC1: Same-origin iframe content is visible in agent view (FAILS for unnamed iframes and duplicates)
- ✅ AC2: Cross-origin iframes show clear "Embedded content - not visible" placeholder (works)
- ✅ AC3: Placeholder is styled to be visible but non-intrusive (works)
- ✅ AC4: No errors when encountering iframes in DOM capture (works)

---

## Files in Scope

- `apps/widget/src/features/cobrowse/useCobrowse.ts` (lines 101-151 need major fixes)

---

## Test Scenarios After Fix

1. **Unnamed iframe test:**
   - Create iframe without src or name attribute
   - Verify content is captured and visible in agent view

2. **Duplicate iframe test:**
   - Create 3 iframes all with src="https://example.com/form"
   - Verify all 3 show correct content (not all matching to first)

3. **Resource loading test:**
   - Create iframe with relative script src: `<script src="../lib.js">`
   - Verify script loads correctly in agent view

4. **Path resolution test:**
   - Create iframe at `/app/dashboard` with image `../logo.png`
   - Verify image resolves to `/logo.png` not `/app/logo.png`

---

**Estimated Rework:** 1-2 hours
**Risk Level:** Medium - Core iframe matching logic needs refactoring
**Regression Risk:** Low - Code is broken now, fixes will improve it
