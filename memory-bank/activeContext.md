Last Updated: 2026-05-12

# Active Context

## Current Work Focus
- Replaced the Comparison tab entirely with a new **Duel** view for head-to-head player stat comparison.

## Recent Changes
- `index.html`: Removed `view-comparison` HTML and all nav links; replaced with `view-duel` scaffold featuring two styled `<select>` dropdowns and a `#duel-stats-grid` injection target.
- `js/store.js`: Added `STORAGE_KEY_DUEL`, `getDuelSelection()`, and `saveDuelSelection()` for persisting the two chosen player keys across sessions.
- `js/app.js`: Removed `renderComparisonContent()` entirely. Added `duelPlayerA`/`duelPlayerB` to state (loaded from store on init). Added `renderDuelSelectors()`, `renderDuel()`, `buildDuelStats()`, `computeWeeklyDelta()`, and `getDuelWinner()`. Wired `syncData()` to re-render the duel grid after a sync completes.
- `style.css`: Added `.duel-select`, `.duel-player-card`, `.duel-row`, `.duel-val-a/b`, `.duel-row-label`, `.duel-section-header`, `.duel-empty`, and staggered `duelRowIn` animation.

## Key Behavior
- Players start with no selection — user must pick both.
- Selection is remembered in LocalStorage and survives page refresh.
- After a sync, if the Duel view is active, the grid auto-updates.
- Winner ⭐ icon highlights the better value on each stat row.

## Next Steps
- (No pending items — awaiting next user request)
