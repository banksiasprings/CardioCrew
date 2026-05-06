# UI Audit & Polish

**Status**: in progress
**Owner**: Steven (autonomous Claude execution while Steven's at work)
**Created**: 2026-05-06

## Goal

Make CardioCrew look slick, tidy, professional. Fix all contrast/visibility issues across **day** and **night** themes for every screen. Standardise button sizing and styling. Remove dead UI. Polish layout/spacing.

## Working approach

Atomic commits per fix-pass so any single change is revertable from dispatch. Bump SW per pass so Steven sees changes on phone refresh.

## Findings (from live audit)

### Critical: contrast fails on tertiary text

| Theme | Token | Value | On bg | Ratio | Status |
|---|---|---|---|---|---|
| Night | `--text-3` | `#484F58` | `#0D1117` | ~3.0 | ❌ WCAG AA fail (needs 4.5) |
| Day | `--text-3` | `#A07850` | `#F5EDD6` | ~3.5 | ❌ WCAG AA fail |
| Night | `--text-2` | `#8B949E` | `#0D1117` | ~6.4 | ✅ AA pass |
| Day | `--text-2` | `#6B4A30` | `#F5EDD6` | ~7.5 | ✅ AA pass |

`--text-3` is used for: empty-state lines ("Pending — settles after catch-up"), helper text ("6 to come" in week tracker), section sublines, tab labels, "history" header, etc. **Fixing this single token improves contrast across the entire app.**

### Specific element issues
- **Outline buttons** (Suggestion / General feedback type) — borders too faint on dark, near-invisible
- **Star rating (RATE YOUR EXPERIENCE)** — unrated stars too dim
- **"📅 HISTORY" PB-mode header** — uses `--text-3`, very faint
- **Stat card labels (TOTAL POINTS / PERFECT DAYS / etc.)** — gold gradient bg makes light text hard to read
- **Profile-banner** at top of Today (PB mode) — has subtle blue tint, fine
- **Toggle switches (notification reminders)** — small tap targets

### Dead/redundant UI candidates
- Legacy `#tab-history` pane — kept in DOM but unreachable since History tab was folded into Today
- `drawWeightSparkline` function — comment notes "Retained for compatibility — no longer called"
- Update-banner styling could use polish

### Layout polish targets
- Bottom-nav spacing now 3 tabs, could use better tap-target distribution
- Profile section spacing consistency
- Card margins on smaller screens

## Fix passes

| Pass | Goal | Status |
|---|---|---|
| 1 | Bump `--text-3` contrast in both themes (token fix, cascades) | pending |
| 2 | Outline button visibility — border + active state | pending |
| 3 | Specific element overrides (history header, week tracker, stars) | pending |
| 4 | Polish: bottom-nav, stat-card labels, section spacing | pending |
| 5 | Cleanup: delete legacy `#tab-history`, dead JS | pending |
| 6 | Smoke test both themes across all screens | pending |

## Out of scope
- Major layout rework (e.g. redesigning Today screen)
- New features
- Theme rebrand (gold/parchment palette stays)
- Mobile-specific tap target sizing beyond what's needed for visibility (the main tap targets are already large)
