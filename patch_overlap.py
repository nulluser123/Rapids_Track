import re

with open('style.css', 'r') as f:
    css = f.read()

# Fix the grid overlap on mobile.
grid_old = """/* Grid Row utility (Mobile First) */
.grid-row {
    display: grid;
    grid-template-columns: 20px 1fr 40px 75px 44px;
    align-items: center;
    gap: 4px;
}"""

grid_new = """/* Grid Row utility (Mobile First) */
.grid-row {
    display: grid;
    grid-template-columns: 20px 1fr 60px 80px 44px;
    align-items: center;
    gap: 4px;
    overflow-x: auto; /* Prevent hard overlap if screen too small */
}"""

css = css.replace(grid_old, grid_new)

with open('style.css', 'w') as f:
    f.write(css)
