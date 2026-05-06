# Career XP & Public Profiles

**Status**: ✅ COMPLETE — all 4 slices live (2026-05-06)
**Owner**: Steven + Claude
**Created**: 2026-05-06
**Shipped**: SW v44 → v48, APP_VERSION v18 → v21

## Goal

Give CardioCrew a Duolingo-style **career stat** layer on top of per-campaign points. Total XP shows next to your name, drives an auto-assigned fitness tier, ranks you on a global leaderboard, and tapping anyone's name opens their public profile (XP, badges, graphs).

## Why this matters

- Per-campaign points reset every 30 days. The reward for long-term consistency disappears.
- Career XP rewards _showing up across campaigns_, not just one season.
- Public profiles add social weight — you can see who you're competing against beyond the current campaign.
- Auto-assigned fitness tier removes the awkward self-select question and ties tier directly to demonstrated effort.

---

## Decisions locked (2026-05-06 grilling)

| # | Question | Decision |
|---|---|---|
| 1 | Classic vs PB scale | **Raw points** — no normalization. 1 point earned anywhere = 1 XP. |
| 2 | Levels? | **Tiers**, replacing the existing self-select fitness level. Beginner → Intermediate → Advanced → Athlete. Auto-assigned by XP threshold. |
| 3 | Live XP? | **Yes** — XP ticks up immediately when you tick a checkbox or submit a PB. |
| 4 | Career leaderboard placement | **Toggle on Board page** — "This Campaign" vs "All-Time". |
| 5 | Public profile contents | Avatar, name, clan + title, XP, tier, badges, current campaigns, streak, perfect days, XP-over-time graph, fitness profile, PB graphs/lists. **Hidden**: settings, admin. |
| 6 | XP graph window | **Daily XP for last 30 days**. Tapping another user's profile shows your line + theirs on the same chart for comparison. |
| 7 | Backfill | **Yes** — walk every existing member doc on first load post-deploy and snapshot to `xpHistory`. |
| 8 | Slicing | **Stage releases** — build, test in Chrome, report, get green light, move on. |

### Tier thresholds (proposed — adjustable during testing)

| Tier | XP range | Icon |
|---|---|---|
| 🌱 Beginner | 0 – 99 | (current default) |
| 💪 Intermediate | 100 – 499 | |
| 🔥 Advanced | 500 – 1,499 | |
| ⚡ Athlete | 1,500+ | |

Rationale: a typical 30-day classic campaign yields 60–120 points for active users. So:
- Tier 1 → finish your first campaign (≥1 active campaign at decent pace)
- Tier 2 → 1–4 campaigns of decent effort
- Tier 3 → ~5–15 campaigns; long-term consistent
- Tier 4 → ~15+ campaigns; veteran

Steven can adjust thresholds in testing if they feel off.

---

## Schema

### `users/{uid}` — extended

```js
{
  name, nameLower, createdAt, pbs, badges,        // existing fields
  profile: { gym, fitnessLevel, ... },             // existing — fitnessLevel becomes derived, not stored
  xpHistory: {                                     // NEW
    [campaignId]: {
      campaignName: 'string',
      campaignType: 'classic' | 'pb-maintenance',
      points: number,                              // current points in this campaign (live mirror)
      startDate: 'YYYY-MM-DD',
      lastUpdatedAt: ISO string,                   // updated every time member doc writes
    }
  }
}
```

Note: we do **not** store `xpHistory[id].finalAt` — points just stop incrementing once the user stops earning. Querying XP at a past date is done from `state.members[uid].completions` for active campaigns and from `xpHistory` snapshots for all the rest.

`fitnessLevel` continues to live on the user doc but is **derived from xp total** rather than user-input. Changing it requires earning XP. The button-based UI is preserved for visual purposes (active state shown), just made read-only.

---

## Slice plan

### Slice 1 — Total XP + auto-assigned tier ✅

**Scope:**
- Compute `getCareerXP(userId)` — sum of `state.myUser.xpHistory[*].points` + live points from current campaign
- Backfill `xpHistory` from existing member docs on first app load (idempotent)
- Maintain `xpHistory[currentCampaignId].points` live: hook into existing toggleChallenge / toggleMission / submitPB / runPBJudgmentForDay so every points-changing event also writes to user doc
- Display "🌱 Beginner · 47 XP" badge under profile name (Profile pane only)
- Replace fitness-level button click handlers with read-only "auto-assigned" UI
- Compute tier client-side from XP total

**Verifiable:**
- Open Profile as Claude Code → see "Beginner · 0 XP" badge under name
- Backfill kicks in for any user already in completed campaigns
- Tap a fitness tier button → no-op (active state still shown, but driven by XP)
- Submit a PB / tick a checkbox in any active campaign → XP total ticks up live

**Files:** `index.html`, `sw.js`

---

### Slice 2 — All-Time toggle on Board ✅

**Scope:**
- Add toggle to Board page: "This Campaign" (current) vs "All-Time XP" (new)
- All-Time view ranks all known users by `getCareerXP`, shows tier emoji + total XP
- Reads `xpHistory` from each user's user doc — single batch load on toggle

**Verifiable:**
- Switch to All-Time tab → sorted list with avatars, names, tier, XP
- Julia at top, Master William up there with kids, etc.

---

### Slice 3 — Public profile modal ✅

**Scope:**
- Tap any user name (in any leaderboard, in-campaign or All-Time) → modal opens
- Modal shows: avatar / warrior preview, name, clan + title, XP + tier, current campaigns, streak, perfect days, badges grid, fitness profile
- Slice 4 will add the graph; for now show "Graph coming next slice" placeholder
- Cache other-user data in `state.publicProfiles[uid]` to avoid re-reading

**Verifiable:**
- Tap Julia on Board → modal shows her stats
- Tap Master William → kid-friendly version

---

### Slice 4 — XP-over-time graph + comparison ✅

**Scope:**
- Last 30 days of daily XP earned (cumulative line)
- On other-user profile: overlay "you" vs "them" — two lines on one canvas, distinct colours
- Re-uses `_pbGraphRender` patterns from Slice 7 of the PB Maintenance build

**Verifiable:**
- Open your profile → see your 30-day XP curve
- Open Julia's profile → see her line + your line overlaid

---

## Backfill plan

On first load post-v18:
1. Read `state.myUser.xpHistory` — if exists, skip
2. Otherwise: collection-group query for member docs with `__name__ == state.userId`
3. For each membership found: read campaign doc for name/type/startDate, sum points from completions, write `xpHistory[campaignId]`
4. Mark backfill complete via `state.myUser.xpBackfilledAt` timestamp

Non-self users: their `xpHistory` populates organically as they open the app. Until then, the All-Time leaderboard will just show 0 XP for them. Acceptable trade-off.

---

## Open follow-ups

- **Negative XP edge case** — if someone unticks a checkbox or deletes a PB entry, points decrement. The live mirror handles this naturally (always re-read current total). Confirm in testing.
- **Tier transitions** — when crossing a threshold, do we celebrate? (Future enhancement — low priority.)
- **PB graph in public profile** — Slice 3 will include the PB records strip. Per-exercise sparkline needs to read another user's PB submissions across all their PB campaigns. Confirm performance is OK before shipping.
