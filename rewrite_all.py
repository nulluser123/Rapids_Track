import re

with open('index.html', 'r') as f:
    html = f.read()

# Replace body content up to the script tag with the new split layout
body_start = html.find('<body>') + 6
script_start = html.find('<script>')

new_body = """
    <div class="app-container">
        <!-- LEFT PANE: Main Content -->
        <div class="main-pane">
            <div class="neo-box header-card">
                <h1 class="section-title">♞ RAPID TRACKER</h1>
                <div class="header-controls">
                    <div id="status" class="status-bar">SYSTEM READY</div>
                    <div id="progressContainer" class="progress-container">
                        <div id="progressBar" class="progress-bar"></div>
                    </div>
                </div>
            </div>

            <div class="neo-box leaderboard">
                <div class="list-header grid-row">
                    <span>RANK</span>
                    <span>PLAYER</span>
                    <span>TREND</span>
                    <span style="text-align:right;">RATING</span>
                    <span></span>
                </div>
                <div id="playerList">
                    <!-- JS will populate -->
                </div>
            </div>
        </div>

        <!-- RIGHT PANE: Side Panel -->
        <div class="side-pane">

            <div class="neo-box sticky-section">
                <div class="section-title" style="padding: 16px 16px 0;">➕ ADD PLAYER</div>
                <div class="input-row" style="padding: 16px;">
                    <input type="text" id="usernameInput" placeholder="Chess.com Username" aria-label="Chess.com Username">
                    <button id="addPlayerBtn" class="btn-add">ADD</button>
                </div>
            </div>

            <div class="neo-box">
                <div class="section-title" style="padding: 16px 16px 0;">📊 VS. VISUALIZER</div>
                <div class="chart-wrapper">
                    <canvas id="ratingChart"></canvas>
                </div>
            </div>

            <div class="neo-box" style="padding: 16px;">
                 <button id="refreshAllBtn" class="btn-refresh">REFRESH RATINGS</button>
            </div>

            <details class="neo-box">
                <summary class="section-title">⚙️ DATA OPTIONS</summary>
                <div class="settings-content">
                    <button id="exportDataBtn" class="btn-secondary">EXPORT JSON</button>
                    <button id="importDataBtn" class="btn-secondary">IMPORT JSON</button>
                    <input type="file" id="importFileInput" accept=".json" style="display: none;">
                </div>
            </details>

            <details class="neo-box">
                <summary class="section-title">🧠 MENTAL TRAINER</summary>
                <div class="vis-tool settings-content" style="flex-direction: column;">
                    <p style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em;">What color is this square?</p>
                    <div id="targetCoord" class="coord-display monospace">?</div>

                    <div style="display: flex; gap: 8px; width: 100%;">
                        <button id="btnWhite" class="choice-btn white">WHITE</button>
                        <button id="btnBlack" class="choice-btn black">BLACK</button>
                    </div>

                    <div id="visFeedback" class="feedback"></div>
                    <div id="streakCounter" class="streak-counter monospace">STREAK: 0</div>

                    <div style="margin-top: 12px;">
                        <button id="toggleBoardBtn" class="btn-secondary" style="width: 100%;">TOGGLE BOARD</button>
                    </div>

                    <div id="miniBoard" class="mini-board">
                        <!-- JS will populate -->
                    </div>
                </div>
            </details>

            <footer class="footer monospace">
                Neo Rapid Tracker <span id="version-number">v1.0.2</span>
            </footer>

        </div>
    </div>
"""

script_content = html[script_start:]

empty_state_old = '''<button class="btn-add" onclick="toggleDrawer(true); setTimeout(() => document.getElementById('usernameInput').focus(), 100);">
                            + ADD PLAYER
                        </button>'''
empty_state_new = '''<button class="btn-add" onclick="document.getElementById('usernameInput').focus();">
                            + ADD PLAYER
                        </button>'''
script_content = script_content.replace(empty_state_old, empty_state_new)

row_old = """row.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <span class="rank">${index + 1}</span>
                        <div class="p-info ${ghostClass}">
                            <div style="display:flex; align-items:center; flex-wrap:wrap;">
                                ${miaStamp}
                                <span class="p-name">${p.username}${ghostIcon}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-right: 12px;">
                        <canvas class="sparkline-canvas" width="60" height="20"></canvas>
                    </div>

                    <div style="text-align:right;">
                        <span class="p-rating ${ghostClass}">${ratingDisplay}${crown}${diffHtml}</span>
                        <div style="margin-top:4px;">
                            <button class="btn-del" aria-label="Remove player ${p.username}" onclick="removePlayer('${p.username}')">X</button>
                        </div>
                    </div>
                `;"""

row_new = """row.className = 'player-row grid-row';
                row.innerHTML = `
                    <span class="rank monospace">${index + 1}</span>
                    <div class="p-info ${ghostClass}">
                        <div style="display:flex; align-items:center; flex-wrap:wrap;">
                            ${miaStamp}
                            <span class="p-name">${p.username}${ghostIcon}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <canvas class="sparkline-canvas" width="60" height="20"></canvas>
                    </div>
                    <div style="text-align:right; display:flex; justify-content:flex-end; align-items:center; gap:8px;">
                        <span class="p-rating monospace ${ghostClass}">${ratingDisplay}${crown}</span><span class="monospace">${diffHtml}</span>
                    </div>
                    <div style="text-align:right;">
                        <button class="btn-del" aria-label="Remove player ${p.username}" onclick="removePlayer('${p.username}')">DEL</button>
                    </div>
                `;"""

script_content = script_content.replace(row_old, row_new)

# Remove the drawer event listeners safely
script_content = script_content.replace("document.getElementById('menuBtn').addEventListener('click', () => toggleDrawer(true));", "// Removed menuBtn listener")
script_content = script_content.replace("document.getElementById('closeDrawerBtn').addEventListener('click', () => toggleDrawer(false));", "// Removed closeDrawerBtn listener")
script_content = script_content.replace("document.getElementById('overlay').addEventListener('click', () => toggleDrawer(false));", "// Removed overlay listener")
script_content = script_content.replace("document.getElementById('toggleThemeBtn').addEventListener('click', toggleTheme);", "// Removed theme toggle listener")

new_html = html[:body_start] + new_body + script_content
with open('index.html', 'w') as f:
    f.write(new_html)

# Now, completely rewrite style.css manually to avoid regex swallowing
css = """@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

:root {
    --bg-color: #f1f5f9; /* Slate-100 */
    --card-bg: #ffffff;
    --text-primary: #1e293b; /* Slate-800 */
    --text-secondary: #64748b; /* Slate-500 */
    --border-color: #e2e8f0; /* Slate-200 */
    --border-width: 1px;
    --shadow-soft: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    --shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --radius-md: 4px;
    --accent-primary: #3b82f6; /* Blue-500 */
    --accent-success: #10B981; /* Green */
    --accent-danger: #EF4444;  /* Red */
    --accent-warning: #F59E0B; /* Orange */
}

* { box-sizing: border-box; outline: none; -webkit-tap-highlight-color: transparent; }
*:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    background-color: var(--bg-color);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.5;
    overflow-y: auto;
    overflow-x: hidden;
}

/* === LAYOUT === */
.app-container {
    display: flex;
    flex-direction: column;
    width: 100vw;
    min-height: 100vh;
}
.main-pane { padding: 16px; flex: 1; }
.side-pane {
    padding: 16px;
    background: var(--bg-color);
    display: flex;
    flex-direction: column;
    gap: 16px;
}
@media (min-width: 768px) {
    body { overflow: hidden; }
    .app-container {
        display: grid;
        grid-template-columns: 1fr 350px;
        height: 100vh;
    }
    .main-pane { padding: 24px; overflow-y: auto; }
    .side-pane { padding: 24px; border-left: 1px solid var(--border-color); overflow-y: auto; }
}

.neo-box {
    background: var(--card-bg);
    border: var(--border-width) solid var(--border-color);
    box-shadow: var(--shadow-soft);
    margin-bottom: 16px;
    border-radius: var(--radius-md);
    overflow: hidden;
}

h1 {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
    padding: 16px;
    background: var(--card-bg);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-color);
}

button {
    cursor: pointer;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    font-size: 13px;
    min-height: 44px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s ease;
}
button:hover, button:active {
    background: var(--bg-color);
    color: var(--text-primary);
    border-color: var(--text-secondary);
}
.btn-add { background-color: transparent; }
.btn-refresh {
    background-color: var(--accent-primary);
    color: white;
    border: 1px solid var(--accent-primary);
    width: 100%;
}
.btn-refresh:hover, .btn-refresh:active {
    background-color: #2563eb;
    color: white;
    border-color: #2563eb;
}

input {
    border: 1px solid var(--border-color);
    padding: 12px 16px;
    font-family: inherit;
    border-radius: var(--radius-md);
    transition: border-color 0.15s ease;
    background: var(--bg-color);
    color: var(--text-primary);
    min-height: 44px;
}
input:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }

.header-controls { padding: 12px; display: flex; gap: 8px; flex-direction: column; }
.status-bar {
    padding: 8px; font-weight: 600; text-align: center; background: var(--bg-color);
    border-radius: var(--radius-md); margin-bottom: 8px; font-size: 0.875rem; color: var(--text-secondary);
}
.status-bar.error { background: #fee2e2; color: #b91c1c; }
.status-bar.loading { background: #fef3c7; color: #b45309; }
.progress-container { height: 4px; background: #e2e8f0; border-radius: 2px; margin-bottom: 12px; overflow: hidden; display: none; }
.progress-bar { height: 100%; background: var(--accent-primary); width: 0%; transition: width 0.3s ease; }
.progress-container.active { display: block; }
.input-row { display: flex; flex-direction: column; gap: 8px; }
@media (min-width: 768px) { .input-row { flex-direction: row; } }
#usernameInput { flex-grow: 1; }

.leaderboard { padding: 0; }
.list-header {
    padding: 8px 16px;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
}
.section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
.player-row { padding: 8px 16px; border-bottom: 1px solid var(--border-color); background: var(--card-bg); transition: background 0.1s; }
.player-row:last-child { border-bottom: none; }
.player-row:hover { background: #f8fafc; }
@media (min-width: 768px) {
    .list-header, .player-row { padding: 12px 16px; }
}

.rank { font-weight: 700; color: var(--text-secondary); }
.p-info { flex-grow: 1; padding: 0 8px; }
.p-name { font-weight: 600; font-size: 15px; display: block; color: var(--text-primary); }
.p-rating { font-weight: 700; color: var(--text-primary); }

.diff { font-size: 0.8em; font-weight: bold; margin-left: 6px; }
.diff.up { color: #059669; }
.diff.down { color: #DC2626; }
.diff.neutral { color: var(--text-secondary); }

.btn-del {
    background: transparent; color: var(--text-secondary); padding: 8px;
    border: 1px solid var(--border-color); min-height: 44px; min-width: 44px;
    display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md);
}
.btn-del:active { color: var(--accent-danger); border-color: var(--accent-danger); background: #fef2f2; }
@media (hover: hover) and (pointer: fine) {
    .btn-del { opacity: 0; border-color: transparent; }
    .player-row:hover .btn-del { opacity: 1; }
    .btn-del:hover { color: var(--accent-danger); border-color: var(--accent-danger); background: #fef2f2; }
}

.chart-wrapper { padding: 12px; height: 250px; background: var(--card-bg); }

details { margin-top: 16px; }
summary {
    background: var(--card-bg); color: var(--text-secondary); padding: 16px;
    font-weight: 600; cursor: pointer; list-style: none; border: none;
    box-shadow: none; display: flex; align-items: center; min-height: 44px;
}
summary::-webkit-details-marker { display: none; }
summary::before { content: "▶"; display: inline-block; font-size: 10px; margin-right: 8px; transition: transform 0.2s ease; transform-origin: center; }
details[open] summary::before { transform: rotate(90deg); }
.settings-content { background: var(--card-bg); padding: 12px; border-top: 1px solid var(--border-color); display: flex; gap: 8px; flex-wrap: wrap; }
.btn-secondary { background: transparent; font-size: 12px; flex: 1; color: var(--text-secondary); border: 1px solid var(--border-color); }

.mia-stamp { color: var(--accent-danger); border: 2px solid var(--accent-danger); padding: 0px 4px; font-weight: 900; transform: rotate(-10deg); display: inline-block; margin-right: 6px; font-size: 10px; letter-spacing: 1px; }
.ghost-text { color: #aaa !important; }

.vis-tool { text-align: center; }
.coord-display { font-size: 3rem; font-weight: 800; margin: 30px 0; padding: 20px; background: var(--bg-color); border-radius: var(--radius-md); color: var(--text-primary); }
.choice-btn { width: 100%; margin-bottom: 12px; padding: 16px; font-size: 14px; font-weight: 700; border: 1px solid var(--border-color); }
.choice-btn.white { background: #fff; color: #1e293b; }
.choice-btn.white:hover { background: #f1f5f9; }
.choice-btn.black { background: #1e293b; color: #fff; border-color: #1e293b; }
.choice-btn.black:hover { background: #334155; }
.feedback { min-height: 24px; font-weight: 600; margin: 20px 0; padding: 10px; border-radius: var(--radius-md); }
.feedback.correct { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.feedback.wrong { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
.streak-counter { font-size: 14px; margin-bottom: 10px; font-weight: bold; }
.mini-board { display: grid; grid-template-columns: repeat(8, 1fr); width: 200px; height: 200px; margin: 20px auto; border: 2px solid #000; display: none; }
.mini-board.visible { display: grid; }
.sq { width: 100%; height: 100%; }
.sq.light { background: #eee; }
.sq.dark { background: #555; }
.sq.target { background: var(--accent-success) !important; border: 2px solid #000; }

.footer { text-align: center; padding: 20px; color: var(--text-secondary); font-size: 12px; margin-top: 40px; border-top: 1px solid var(--border-color); }

/* Grid Row utility (Mobile First) */
.grid-row {
    display: grid;
    grid-template-columns: 44px 1fr 60px 80px 44px;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
}
@media (min-width: 768px) {
    .grid-row {
        grid-template-columns: 30px 1fr 80px 100px 50px;
        gap: 8px;
    }
}
.monospace { font-family: 'JetBrains Mono', monospace; font-size: 14px; }
"""

with open('style.css', 'w') as f:
    f.write(css)
