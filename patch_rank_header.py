import re

with open('style.css', 'r') as f:
    css = f.read()

# Fix the grid overlap on mobile for the word "RANK".
grid_old = """/* Grid Row utility (Mobile First) */
.grid-row {
    display: grid;
    grid-template-columns: 44px 1fr 60px 80px 44px;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
}"""

grid_new = """/* Grid Row utility (Mobile First) */
.grid-row {
    display: grid;
    grid-template-columns: 48px 1fr 60px 80px 44px;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
}"""

css = css.replace(grid_old, grid_new)

with open('style.css', 'w') as f:
    f.write(css)
