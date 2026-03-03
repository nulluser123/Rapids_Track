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

# Now we need to update the updateUI function to match the grid layout
script_content = html[script_start:]

# 1. Update the empty state inside updateUI
empty_state_old = '''<button class="btn-add" onclick="toggleDrawer(true); setTimeout(() => document.getElementById('usernameInput').focus(), 100);">
                            + ADD PLAYER
                        </button>'''
empty_state_new = '''<button class="btn-add" onclick="document.getElementById('usernameInput').focus();">
                            + ADD PLAYER
                        </button>'''
script_content = script_content.replace(empty_state_old, empty_state_new)

# 2. Update the row innerHTML inside updateUI
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
                    <div style="text-align:right;">
                        <span class="p-rating monospace ${ghostClass}">${ratingDisplay}${crown}${diffHtml}</span>
                    </div>
                    <div style="text-align:right;">
                        <button class="btn-del" aria-label="Remove player ${p.username}" onclick="removePlayer('${p.username}')">DEL</button>
                    </div>
                `;"""

script_content = script_content.replace(row_old, row_new)

# Remove the drawer event listeners
script_content = re.sub(r"document\.getElementById\('menuBtn'\)\.addEventListener\('click', \(\) => toggleDrawer\(true\)\);", "// Removed menuBtn listener", script_content)
script_content = re.sub(r"document\.getElementById\('closeDrawerBtn'\)\.addEventListener\('click', \(\) => toggleDrawer\(false\)\);", "// Removed closeDrawerBtn listener", script_content)
script_content = re.sub(r"document\.getElementById\('overlay'\)\.addEventListener\('click', \(\) => toggleDrawer\(false\)\);", "// Removed overlay listener", script_content)
script_content = re.sub(r"document\.getElementById\('toggleThemeBtn'\)\.addEventListener\('click', toggleTheme\);", "// Removed theme toggle listener", script_content)


new_html = html[:body_start] + new_body + script_content
with open('index.html', 'w') as f:
    f.write(new_html)
