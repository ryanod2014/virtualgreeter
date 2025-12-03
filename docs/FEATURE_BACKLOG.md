# Feature Backlog

> **Purpose:** Store P2/P3 feature requests for later. PM surfaces these when appropriate.
> **Rule:** Preserve whatever context was given (detailed OR vague).

---

## Status Legend

| Status | Meaning |
|--------|---------|
| 🟢 READY TO BUILD | Detailed enough to create tickets |
| 🟡 NEEDS DETAILS | Vague idea - need to flesh out before building |

---

## P2: Build Later (Important but not urgent)

### Complete Feature Documentation (49 remaining features)
**Added:** 2024-12-03
**Priority:** P2
**Status:** 🟢 READY TO BUILD

**What human said:**
We need to finish documenting all features. Have in-depth breakdown of how to document features.

**Scope:**
- 55 total features across 7 categories
- 6 already documented (P3 + Tier 1: P2, V3, A2, A3, P4)
- 49 remaining

**Reference:** `docs/FEATURE_DOCUMENTATION_TODO.md` contains:
- Complete feature list with priority tiers
- Detailed documentation template (Part 1)
- Key files to reference for each category
- Quality checklist for each doc

**Priority Tiers (from TODO file):**
| Tier | Count | Features |
|------|-------|----------|
| 🟠 Tier 2 (High) | 6 | P6, A1, P5, V4, V1, V2 |
| 🟡 Tier 3 (Medium) | 7 | D2, D3, A4, V8, A5, V5, A10 |
| 🟢 Tier 4 (Standard) | 9 | D1, D5, D4, D6, D7, A7, D9, A6, V6 |
| 🔵 Tier 5 (Lower) | 8 | D10, O1, O4, O3, O5, A8, P9, P10 |
| ⚪ Tier 6 (Last) | 19 | M1-4, F1-3, S1-4, O2, O6, P1, P7, P8, P11, P12, V7, D8, D11-14, A9 |

**How to execute:**
1. Spawn Doc Agents in parallel (3-5 at a time, no file conflicts)
2. Each agent follows template in FEATURE_DOCUMENTATION_TODO.md Part 1
3. Doc agents log findings to session file
4. PM creates fix tickets from discoveries
5. Move through tiers in order

**Trigger to promote to P1:**
- Before launch (all critical features must be documented)
- When we need to onboard new devs
- When a bug is found in an undocumented feature

---

### Org-Configurable Idle Timeout
**Added:** 2024-12-03
**Priority:** P2
**Status:** 🟡 NEEDS DETAILS

**What human said:**
Backlog for now. Currently hardcoded to 5 min. Different businesses may want different timeouts.

**If NEEDS DETAILS - questions to ask when surfacing:**
- What's the min/max range? (e.g., 2-30 minutes)
- Should this be in admin settings alongside RNA timeout?

**PM's initial thoughts:**
Could be added to recording_settings table similar to rna_timeout_seconds. Low effort once we build it.

**Trigger to promote to P1:**
- Customer specifically asks for it
- Building other timing customizations anyway

---

---

## P3: Someday/Maybe

### [FEATURE NAME]
**Added:** [DATE]
**Priority:** P3
**Status:** 🟢 READY TO BUILD / 🟡 NEEDS DETAILS

**What human said:**
[Exactly what they told me]

**PM's thoughts:**
[If I have ideas on how this could work]

---

## Promoted to Active

*Features that were in backlog but got picked up*

| Feature | Was | Promoted To | Date | Reason |
|---------|-----|-------------|------|--------|
| | | | | |

---

## Archived (Not Doing)

*Features we decided against*

| Feature | Date | Reason Not Doing |
|---------|------|------------------|
| | | |

