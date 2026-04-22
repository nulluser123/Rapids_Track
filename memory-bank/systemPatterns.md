Last Updated: 2026-04-23

# System Patterns

## Architecture
- Single Page Application (SPA).
- Monolithic entry script (`app.js`) handling DOM events, routing, and lifecycle.

## Design Patterns & Component Relationships
- **DOM Structure**: All views contained in `/index.html`.
- **Styling**: TailwindCSS via CDN with custom utility overrides in `/style.css`.
- **Data Fetching**: Dedicated module `/js/api.js` for external Chess.com network requests.
- **Data Persistence**: `/js/store.js` handles LocalStorage read/write and Export/Import operations.
- **Computation**: `/js/stats.js` for complex player analytics computation.
- **UI/UX**: `/js/animations.js` for UI transitions.

## Key Views
- Leaderboard (`#leaderboard`): Sorted ranking, active vs MIA.
- Comparison (`#comparison`): Head-to-head metrics.
- Stats (`#stats`): Detailed analytical insights.
- Settings (`#settings`): App configuration and ledger operations.
