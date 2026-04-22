# Project Memory Bank - Rapid Tracker v2

## 1. Project Overview
**Rapid Tracker v2** (Grandmaster's Ledger) is a frontend web application designed to track, store, and analyze Chess.com rapid ratings for a curated list of players. It operates as a Single Page Application (SPA) focusing on high-quality visual aesthetics, real-time data fetching, and deep statistical analysis.

## 2. Architecture & Technologies
- **Core Tech**: Vanilla HTML, CSS, JavaScript (ES6 Modules)
- **Styling**: TailwindCSS (injected via CDN) with a custom dark-mode specific design system (Space Grotesk & Manrope fonts).
- **Icons**: Google Material Symbols Outlined.
- **Data Persistence**: LocalStorage-focused data management. Provides options to Export/Import `.json` backups.
- **External API**: Chess.com public API for fetching player profiles and current ratings.

## 3. Directory Structure
- `/index.html` - Main application entry point, containing the DOM structure for all views.
- `/style.css` - Custom styling rules and override utilities.
- `/js/`
  - `app.js` - Main monolithic entry script handling DOM events, view routing, and core lifecycle.
  - `api.js` - Dedicated module for Chess.com network requests.
  - `store.js` - Data persistence layer (reading/writing to LocalStorage).
  - `stats.js` - Computation engine for complex player analytics (volatility, weekly elo, game records).
  - `animations.js` - Transition and animation utilities for the UI.
- `/players.txt` - Configuration/seed file for initial tracking list.

## 4. Core Application Views
1. **Leaderboard (`#leaderboard`)**
   - Displays the current sorted ranking of all tracked players.
   - Separates "Active" players from "MIA" (Missing In Action) players based on user-configured inactivity thresholds, while maintaining original rank indexes.
2. **Comparison (`#comparison`)**
   - Head-to-head metrics for active players in the current season.
   - Features a bar chart visualizer, Average Rating Change metrics, and Top Gainer / Biggest Drop superlatives.
3. **Stats (`#stats`)**
   - The "Shard Intelligence" report module.
   - Features Awards & Superlatives (Spotify Wrapped style), Weekly Elo Gain/Loss, 30-Day Volatility Index, and detailed breakdowns of player playstyles (grinder, pacifist, etc.).
4. **Settings (`#settings`)**
   - "Control Terminal" for managing app configurations.
   - Adjust Inactivity Thresholds (1-30 days).
   - Perform Ledger Operations (Clear data, Export JSON, Import JSON).

## 5. Recent Context & Development Highlights
- **Stats Page Expansion**: Newly integrated logic for comprehensive player metrics, including tilt trackers, milestone tracking, and long-term volatility assessments.
- **Leaderboard Ordering**: Logic refactored to separate active players from MIA players for improved UI readability.
- **Visuals**: Emphasizes a "glassmorphic" and premium dark mode aesthetic with micro-animations and data-dense dashboards.
