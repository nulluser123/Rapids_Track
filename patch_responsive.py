import re

with open('style.css', 'r') as f:
    css = f.read()

# 1. Update Body Typography (Mobile-First 16px) and Layout
body_old = """body {
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
}"""

body_new = """body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    background-color: var(--bg-color);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.5;
    overflow-y: auto; /* Scroll by default on mobile */
    overflow-x: hidden;
}

/* === LAYOUT === */
.app-container {
    display: flex;
    flex-direction: column;
    width: 100vw;
    min-height: 100vh;
}

.main-pane {
    padding: 16px;
    flex: 1;
}

.side-pane {
    padding: 16px;
    background: var(--bg-color);
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* DESKTOP SPLIT */
@media (min-width: 768px) {
    body {
        overflow: hidden;
    }
    .app-container {
        display: grid;
        grid-template-columns: 1fr 350px;
        height: 100vh;
    }
    .main-pane {
        padding: 24px;
        overflow-y: auto;
    }
    .side-pane {
        padding: 24px;
        border-left: 1px solid var(--border-color);
        overflow-y: auto;
    }
}"""

css = css.replace(body_old, body_new)

# Write back
with open('style.css', 'w') as f:
    f.write(css)
