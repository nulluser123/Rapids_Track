Last Updated: 2026-05-07

# Active Context

## Current Work Focus
- Leaderboard now shows games played between syncs alongside the rating change for each player.

## Recent Changes
- `store.js`: History snapshots now include a `total` field (wins+losses+draws) in addition to `rating`. This enables diff-based game count between syncs.
- `app.js`: `renderLeaderboard()` calculates `gamesPlayed` by diffing `total` from the last two history entries. Displays as a subtle "N games" label beneath the rating change in each active player row.
- Integrated comprehensive player metrics (tilt trackers, milestone tracking, long-term volatility assessments).
- Refactored leaderboard ordering to separate active players from MIA players.

## Next Steps
- (No pending items — awaiting next user request)
