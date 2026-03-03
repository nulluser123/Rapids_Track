import re

with open('style.css', 'r') as f:
    css = f.read()

# 1. Add Fonts and Update Variables
new_vars = """@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

/* === MODERN VARIABLES === */
:root {
    --bg-color: #f1f5f9; /* Slate-100 */
    --card-bg: #ffffff;
    --text-primary: #1e293b; /* Slate-800 */
    --text-secondary: #64748b; /* Slate-500 */
    --border-color: #e2e8f0; /* Slate-200 */
    --border-width: 1px;

    /* Shadows & Radius */
    --shadow-soft: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    --shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --radius-md: 4px;

    /* Palette */
    --accent-primary: #3b82f6; /* Blue-500 */
    --accent-success: #10B981; /* Green */
    --accent-danger: #EF4444;  /* Red */
    --accent-warning: #F59E0B; /* Orange */
}

/* Remove dark mode override to enforce light theme */
:root[data-theme="dark"] {
    /* No-op, force light theme */
}"""

css = re.sub(r'/\* === MODERN VARIABLES === \*/.*?/\* === RESET & BASE === \*/', new_vars + '\n\n/* === RESET & BASE === */', css, flags=re.DOTALL)


# 2. Update Body and Base Layout
new_body = """body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    background-color: var(--bg-color);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.4;
    overflow: hidden; /* Prevent full page scroll, panes handle it */
}

/* === LAYOUT === */
.app-container {
    display: grid;
    grid-template-columns: 1fr 350px;
    height: 100vh;
    width: 100vw;
}

.main-pane {
    padding: 24px;
    overflow-y: auto;
}

.side-pane {
    padding: 24px;
    border-left: 1px solid var(--border-color);
    background: var(--bg-color);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* Grid Row utility */
.grid-row {
    display: grid;
    grid-template-columns: 30px 1fr 80px 70px 40px;
    align-items: center;
    gap: 8px;
}

.monospace {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
}"""

css = re.sub(r'body \{.*?\}', new_body, css, flags=re.DOTALL)

# 3. Update Box and Typography
css = css.replace('.neo-box {', '.neo-box {\n    background: var(--card-bg);\n    border: var(--border-width) solid var(--border-color);\n    box-shadow: var(--shadow-soft);\n    margin-bottom: 16px;\n    border-radius: var(--radius-md);\n    overflow: hidden;\n}\n\n/* Override old neo-box */\n.old-neo-box {')
css = re.sub(r'h1 \{.*?\}', """h1 {
    font-size: 11px;
    font-weight: 600;
    margin: 0;
    padding: 16px;
    background: var(--card-bg);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-color);
}""", css, flags=re.DOTALL)

# 4. Buttons
new_buttons = """button {
    cursor: pointer;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s ease;
}

button:hover {
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
    padding: 12px;
    font-size: 12px;
}
.btn-refresh:hover {
    background-color: #2563eb;
    color: white;
    border-color: #2563eb;
}"""

css = re.sub(r'button \{.*?\.btn-refresh \{.*?\}', new_buttons, css, flags=re.DOTALL)

# 5. Leaderboard Header and Row
new_lb = """.list-header {
    padding: 12px 16px;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
}

.section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
}

.player-row {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--card-bg);
    transition: background 0.1s;
}

.player-row:last-child { border-bottom: none; }
.player-row:hover { background: #f8fafc; }

.rank {
    font-weight: 700;
    color: var(--text-secondary);
}

.p-name {
    font-weight: 600;
    font-size: 13px;
    display: block;
    color: var(--text-primary);
}

.p-rating {
    font-weight: 700;
    color: var(--text-primary);
}

.btn-del {
    background: transparent;
    color: var(--text-secondary);
    padding: 4px 8px;
    opacity: 0;
    border: 1px solid transparent;
}
.player-row:hover .btn-del {
    opacity: 1;
}
.btn-del:hover {
    color: var(--accent-danger);
    border-color: var(--accent-danger);
    background: #fef2f2;
}"""

css = re.sub(r'\.list-header \{.*\.btn-del:active \{.*?\}', new_lb, css, flags=re.DOTALL)

# 6. Details / Summary arrow
new_details = """summary {
    background: var(--card-bg);
    color: var(--text-secondary);
    padding: 16px;
    font-weight: 600;
    cursor: pointer;
    list-style: none; /* Hide default arrow */
    border: none;
    box-shadow: none;
    display: flex;
    align-items: center;
}
summary::-webkit-details-marker {
  display: none;
}
summary::before {
    content: "▶";
    display: inline-block;
    font-size: 8px;
    margin-right: 8px;
    transition: transform 0.2s ease;
    transform-origin: center;
}
details[open] summary::before {
    transform: rotate(90deg);
}"""

css = re.sub(r'summary \{.*?\}', new_details, css, flags=re.DOTALL)


# Clean up redundant old classes
css = re.sub(r'\.side-drawer \{.*?\.mini-board\.visible \{ display: grid; \}', '', css, flags=re.DOTALL)

with open('style.css', 'w') as f:
    f.write(css)
