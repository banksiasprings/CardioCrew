# PB Maintenance campaign — plan

**Status:** Locked 2026-05-06. Designed in conversation with Steven; all 18 grilling questions answered. Ready to implement; slice plan at the bottom.

**Why:** the 30-day "Four Ways" campaign builds the habit; this campaign locks in the gains afterwards. Different game (PBs not check-boxes), different rhythm (weekly schedule rotation), different scoring (multi-axis: consistency / Beast / Most Improved).

---

## Spec

### Exercises (4)

`squats · push-ups · plank · crunches`. No run.

PB metric (**one shot, single attempt** — NOT cumulative across the day):
- **Squats / Push-ups / Crunches** — max reps in one unbroken set.
- **Plank** — longest single hold time (seconds).

Multiple attempts during the day are allowed (see B2 below — retry as many times as you want), but each attempt is an independent single-set / single-hold number. Your day's PB = highest single attempt. Adding multiple sets together does NOT count (3 × 30 push-ups ≠ 90 PB).

### Weekly rhythm

- 7 sessions/week (one session per day).
- Each exercise scheduled **2 sessions/week**, except one exercise that gets **1 session/week** to make 7 (3×2 + 1×1 = 7).
- Schedule **randomised each week**:
  - Which exercise gets the 1× slot is random.
  - Distribution across the 7 days is random.
- Push-ups Sunday is NOT locked (originally suggested but superseded by the random rotation rule).

### Scoring — per user

**Daily (max +3/day):**
- **+1 Consistency** if you submit on time (today, before midnight Sydney time).
- **+1 Beast** if you posted the highest raw number that day. Ties: both win.
- **+1 Most Improved** if you posted the biggest % delta over your own prior PB. Ties: both win.

(Same person can win both Beast + Most Improved for the same day — +3 day max.)

**Weekly consistency cap (separate from daily):**
- All 7 days submitted (on-time OR catch-up) → consistency score = `7 − count(catch-up days)`.
- Any day fully missed (no submission, catch-up window expired) → **cliff: 0 consistency points for the entire week.**
- Catch-up window: 3 days max. Reuses the existing `CATCHUP_DAYS` constant from the classic campaign. Beyond 3 days a missed day is locked; if there's no submission for it, the cliff fires.

So:
| Submission pattern | Consistency pts |
|---|---|
| 7 on-time | 7 |
| 6 on-time + 1 catch-up | 6 |
| 5 on-time + 2 catch-up | 5 |
| 4 on-time + 3 catch-up (window-expired) | 0 (cliff) |
| 5 on-time + 2 missed (no log at all) | 0 (cliff) |
| 0 on-time + 7 catch-up | 0 |

### Submission UX

- **Hybrid input:** typed number is the default (squats / push-ups / crunches); plank gets a stopwatch button (start / stop / save) plus typed-time fallback.
- **Re-submit anytime during the day.** The number stored is your running best for that day.
- **Other users' submissions are HIDDEN** until midnight judgment. You only see your own running best.
- At midnight Sydney time the system locks the day, computes Beast + Most Improved, awards the points, and the day's results become visible.

### PB tracking

- **Lifetime per exercise per user.** Persists across campaigns. Joining a new PB-Maintenance campaign brings your lifetime PBs with you.
- **Display:**
  - Inline on the day's exercise card ("Your PB: 78 reps · Beat it!").
  - Records strip on the profile page (4 PBs in a row).
- **Graph (separate page or modal):**
  - Default: own PB history per exercise.
  - "Compare" toggle: campaign-wide — all members' PB curves on one chart.

### Notifications

- **Defer.** Existing 6pm motivation quote serves as the daily reminder.

### Architecture

- **New campaign type:** `campaignType: 'pb-maintenance'` on `campaigns/{campaignId}`. Existing campaigns default to `'classic'` (or `'template'` for template campaigns). Backward-compatible.
- **Multi-campaign supported.** Today tab gets a campaign dropdown so a user can switch their active campaign (Steven says infrastructure is partially in place — leaderboard already has `lb-campaign-select`; reuse the pattern).
- **Per-day submissions** stored as fields on the existing `campaigns/{id}/members/{uid}.completions` map (matches existing pattern). Schema:
  ```
  completions: {
    "d3_pushups_value": 78,        // raw number (reps or seconds)
    "d3_pushups_at": Timestamp,    // when it was submitted
    "d3_pushups_status": "on-time" | "catch-up",
    ...
  }
  ```
- **Lifetime PBs** on `users/{userId}.pbs.{exercise}`:
  ```
  pbs: {
    pushups:  { value: 78, at: Timestamp, campaignId: "...", day: 14 },
    squats:   { value: 60, at: ... },
    plank:    { value: 180, at: ... },  // seconds
    crunches: { value: 50, at: ... }
  }
  ```
- **Daily judgment timezone:** `Australia/Sydney` (fixed). Midnight in Sydney rolls the day over. (Implementation note: convert UTC timestamps to Sydney local for day-bucket determination; same approach as `wasDayCompletedOnTime` in the classic campaign but scoped to Sydney instead of UTC.)

---

## Decisions log (locked 2026-05-06)

- A1 — exercises = squats / push-ups / plank / crunches (no run).
- A2 — schedule random per week (not fixed days).
- A3 — PB metric = max reps for everything except plank, which is longest time.
- B1 — submission = hybrid (typed default; stopwatch optional for plank).
- B2 — re-submit allowed all day; others' results hidden until midnight.
- B3 — catch-up costs 1pt off the max; missing a day fully = 0pt cliff for the week.
- C1 — both Beast (raw best) AND Most Improved (% delta) award points; same person can win both.
- C2 — ties = both win (friendly).
- C3 — consistency = on-time submission per day.
- C4 — everyone consistent gets daily +1 (no top-performer bonus).
- D1 — PBs are lifetime, persist across campaigns.
- D2 — graph: own progress + compare-members toggle.
- D3 — PB display: inline on exercise card + profile records strip.
- E1 — submission UI: card-shaped with illustration + last-3 attempts.
- E2 — no push notifications; existing 6pm quote is the reminder.
- F1 — new campaign type `pb-maintenance` (alongside existing classic / template).
- F2 — data model: per-day submissions on members.completions + lifetime on users.pbs.
- F3 — multi-campaign via Today-tab dropdown.

---

## Slice plan (8 vertical slices)

Each slice is independently shippable; campaign + app stay functional at every commit. Total estimate ~1,500-2,000 LOC across the 8.

### Slice 1 — Campaign type + creation flow

Add `campaignType` to the data model and a picker to the "create campaign" UI.

- Add `campaignType: 'classic' | 'template' | 'pb-maintenance'` field to campaign creation.
- Existing campaigns default to `'classic'` (read-time fallback).
- Create-campaign UI gets a 3-tile picker for type. PB-Maintenance creation collects nothing extra at this stage (schedule generated in Slice 2).
- New campaigns of type `pb-maintenance` show a placeholder "Coming soon" card on Today until Slice 3 ships.
- Backward-compat: existing scoring code (`getDayScore`, `wasDayCompletedOnTime`) still runs for classic/template; pb-maintenance routes to new code paths added in later slices.
- **Files:** `index.html` (campaign creation UI + read-time defaults).
- **LOC:** ~150.
- **Risk:** very low — pure scaffolding.

### Slice 2 — Schedule generator

Generate the weekly schedule deterministically per campaign + week index.

- Helper: `generatePBSchedule(campaignId, weekNumber) → ['pushups','plank','squats','crunches','pushups','plank','squats']` (length 7, 3×2 + 1×1).
- Deterministic by hashing `(campaignId + weekNumber)` so every member sees the same week. (Avoids storing schedule on Firestore — saves writes; cheap to recompute.)
- "Today's exercise" = `generatePBSchedule(...)[dayOfWeek]`.
- Schedule tab in the cab/campaign page shows the full week.
- **Files:** `index.html` (helper + schedule view).
- **LOC:** ~200.
- **Risk:** low — pure function + display.

### Slice 3 — PB submission card on Today

Card-shaped UI on the Today page when active campaign is `pb-maintenance`.

- Today page detects active campaign type and renders the new card if pb-maintenance.
- Card shows: today's exercise illustration + name, lifetime PB ("Your PB: 78 reps"), inline number input ("Reps today"), Submit button.
- For plank: stopwatch (Start / Stop / Save), with manual time entry as fallback.
- "Last 3 attempts" list below the input: today's running best + previous days' final values.
- **Other users' values are NOT shown today** — even leaderboard hides them until midnight judgment.
- Submit writes to `members.completions.{dayKey}_{exercise}_value/at/status`.
- Re-submit during the day: updates the existing entry if higher than current value (running best).
- Campaign dropdown on Today tab integrates: switching campaigns swaps which UI is shown.
- **Files:** `index.html` (UI + submit handler + Firestore writes).
- **LOC:** ~350.
- **Risk:** medium — the most user-facing slice.

### Slice 4 — Lifetime PB updates

When a daily submission beats the user's lifetime PB, update `users/{uid}.pbs.{exercise}`.

- On every submission, compare to lifetime PB; if higher, update in same Firestore transaction.
- Plank: lower time would be a degradation; we use **higher = better** (longer hold). Confirm with Steven.
  - Wait — plank PB is "longest time", so higher = better. ✓
- For squats/push-ups/crunches, higher reps = better. ✓
- **Files:** `index.html`.
- **LOC:** ~80.
- **Risk:** low.

### Slice 5 — Midnight judgment + Beast / Most Improved scoring

At midnight Sydney time (or first app-open after midnight), award daily points.

- Determine "yesterday" via Sydney midnight boundary.
- For each campaign of type `pb-maintenance`:
  - Read all members' submissions for yesterday's exercise.
  - **Beast** = highest value (ties = all winners).
  - **Most Improved** = max ((today_value - prior_PB) / prior_PB). Members without a prior PB are excluded from MI (can't compute %).
  - Write points to a new `members.completions.day{N}_score` field: `{ consistency: 0|1, beast: 0|1, mostImproved: 0|1 }`.
- Computed client-side, idempotent (re-running won't double-award).
- One winner-announcement banner on next app open ("🏆 Yesterday's Beast: Steven · 78 push-ups").
- **Files:** `index.html` (judgment helper + first-load hook + banner UI).
- **LOC:** ~280.
- **Risk:** medium — timing / timezone math is the gotcha. Use the same UTC-anchored approach as `wasDayCompletedOnTime` but with Sydney offset.

### Slice 6 — Weekly consistency scoring + cliff

Compute the weekly consistency score with the catch-up subtraction + missed-day cliff.

- Helper `getPBWeekConsistency(userId, weekNumber)`:
  - For each of the 7 days: was there a submission within the catch-up window?
  - If ANY day has none → return 0.
  - Else return `7 - count(submissions where status = 'catch-up')`.
- `getTotalPoints(userId)` for pb-maintenance = sum across all completed weeks of (consistency + Beast wins + MI wins).
- Today tab shows weekly running total + "× left to keep streak".
- **Files:** `index.html`.
- **LOC:** ~180.
- **Risk:** medium — interacts with Slice 5 + the existing `getDayScore` / `getStreak` paths.

### Slice 7 — PB graph + records UI

Visualise PBs.

- Profile page strip: 4 PB cards (one per exercise) with current value + tiny sparkline.
- Tap a card → modal with full graph: x = date, y = PB value. Toggle "Just me" / "Compare campaign".
- Graph implementation: simple inline SVG (no external charting lib — single-file PWA constraint).
- **Files:** `index.html`.
- **LOC:** ~300.
- **Risk:** low-medium — SVG drawing is straightforward but the comparison-mode data wrangling is a bit fiddly.

### Slice 8 — Catch-up window + edit-yesterday UX for PB submissions

Mirror the existing classic-campaign catch-up window for PB submissions.

- Allow editing yesterday's submission (and 2 days back, matching `CATCHUP_DAYS = 3`).
- Catch-up submissions get `status: 'catch-up'` (so Slice 6's scoring can subtract).
- After the catch-up window expires, the day is locked.
- Post-judgment edits don't change Beast / MI awards (those were locked at midnight).
- **Files:** `index.html`.
- **LOC:** ~150.
- **Risk:** low.

---

## Slicing notes

- **Slice 3 is the user-facing milestone** — once it ships, users can submit PBs daily even though the scoring (Slices 5-6) hasn't kicked in yet. Useful for soft-launch testing with one or two real users.
- **Slices 5 + 6 can run before any users have switched** to a pb-maintenance campaign, so they can be developed without affecting the existing 30-day campaign.
- **Order can flex** — 1 → 2 → 3 is the natural sequence (data model → schedule → UI), then 4-8 in any order.

## What's NOT in this plan (deferred)

- Push notifications (E2 — defer; 6pm motivation quote covers it).
- Multi-user submission validation / cheating prevention (honor system).
- Per-exercise unit options (e.g., "push-ups in 60s" alternative metric). One metric per exercise.
- Rest-day awareness (every day has a session, no rest days in this campaign).
- Cross-campaign leaderboards spanning classic + pb-maintenance.
- Migration tooling to bring 30-day participants into the new campaign automatically.

These are all future work if/when needed.
