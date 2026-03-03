import re

with open('style.css', 'r') as f:
    css = f.read()

# 1. Adapt Grid Row columns for mobile/desktop
# Old grid
grid_old = """/* Grid Row utility */
.grid-row {
    display: grid;
    grid-template-columns: 30px 1fr 80px 100px 50px;
    align-items: center;
    gap: 8px;
}"""

grid_new = """/* Grid Row utility (Mobile First) */
.grid-row {
    display: grid;
    grid-template-columns: 20px 1fr 40px 75px 44px;
    align-items: center;
    gap: 4px;
}

@media (min-width: 768px) {
    .grid-row {
        grid-template-columns: 30px 1fr 80px 100px 50px;
        gap: 8px;
    }
}"""
css = css.replace(grid_old, grid_new)

# 2. Update .btn-del logic for hover (Desktop) vs active (Mobile)
btn_del_old = """.btn-del {
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

btn_del_new = """.btn-del {
    background: transparent;
    color: var(--text-secondary);
    padding: 8px;
    border: 1px solid var(--border-color);
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
}

.btn-del:active {
    color: var(--accent-danger);
    border-color: var(--accent-danger);
    background: #fef2f2;
}

/* On desktop with pointer, hide until hover */
@media (hover: hover) and (pointer: fine) {
    .btn-del {
        opacity: 0;
        border-color: transparent;
    }
    .player-row:hover .btn-del {
        opacity: 1;
    }
    .btn-del:hover {
        color: var(--accent-danger);
        border-color: var(--accent-danger);
        background: #fef2f2;
    }
}"""
css = css.replace(btn_del_old, btn_del_new)

# General buttons: Ensure active states map similarly to hover
btn_active_new = """button:active {
    background: var(--bg-color);
    color: var(--text-primary);
    border-color: var(--text-secondary);
}"""

css = css.replace("""button:hover {
    background: var(--bg-color);
    color: var(--text-primary);
    border-color: var(--text-secondary);
}""", """button:hover, button:active {
    background: var(--bg-color);
    color: var(--text-primary);
    border-color: var(--text-secondary);
}""")


# Add padding adjustment to leaderboard and row to support smaller screen
lb_padding_old = """.player-row {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--card-bg);
    transition: background 0.1s;
}"""

lb_padding_new = """.player-row {
    padding: 8px;
    border-bottom: 1px solid var(--border-color);
    background: var(--card-bg);
    transition: background 0.1s;
}
@media (min-width: 768px) {
    .player-row {
        padding: 12px 16px;
    }
}"""
css = css.replace(lb_padding_old, lb_padding_new)

# Make list-header match the row padding
list_header_old = """.list-header {
    padding: 12px 16px;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
}"""

list_header_new = """.list-header {
    padding: 8px;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
}
@media (min-width: 768px) {
    .list-header {
        padding: 12px 16px;
    }
}"""
css = css.replace(list_header_old, list_header_new)

# Force inputs flex in the add player row to prevent overflow
input_row_old = """.input-row {
            display: flex;
            gap: 8px;
        }"""
input_row_new = """.input-row {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        @media (min-width: 768px) {
            .input-row {
                flex-direction: row;
            }
        }"""

css = css.replace(input_row_old, input_row_new)


with open('style.css', 'w') as f:
    f.write(css)
