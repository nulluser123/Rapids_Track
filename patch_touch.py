import re

with open('style.css', 'r') as f:
    css = f.read()

# Typography updates
css = re.sub(r'\.monospace \{\n    font-family: \'JetBrains Mono\', monospace;\n    font-size: 12px;\n\}',
             '.monospace {\n    font-family: \'JetBrains Mono\', monospace;\n    font-size: 14px;\n}', css)

css = re.sub(r'h1 \{\n    font-size: 11px;', 'h1 {\n    font-size: 13px;', css)
css = re.sub(r'\.list-header \{\n    padding: 12px 16px;\n    background: var\(--card-bg\);\n    border-bottom: 1px solid var\(--border-color\);\n    font-weight: 600;\n    font-size: 10px;',
             '.list-header {\n    padding: 12px 16px;\n    background: var(--card-bg);\n    border-bottom: 1px solid var(--border-color);\n    font-weight: 600;\n    font-size: 12px;', css)

css = re.sub(r'\.section-title \{\n    font-size: 11px;', '.section-title {\n    font-size: 13px;', css)

# Button touch target updates (min-height 44px)
buttons_old = """button {
    cursor: pointer;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    font-size: 11px;"""

buttons_new = """button {
    cursor: pointer;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    font-size: 13px;
    min-height: 44px; /* Touch target size */"""

css = css.replace(buttons_old, buttons_new)

# Input touch target updates
input_old = """input {
    border: 1px solid var(--border-color);
    padding: 10px 12px;
    font-family: inherit;
    border-radius: var(--radius-md);
    transition: border-color 0.15s ease;
    background: var(--bg-color);
    color: var(--text-primary);
}"""

input_new = """input {
    border: 1px solid var(--border-color);
    padding: 12px 16px;
    font-family: inherit;
    border-radius: var(--radius-md);
    transition: border-color 0.15s ease;
    background: var(--bg-color);
    color: var(--text-primary);
    min-height: 44px; /* Touch target size */
}"""

css = css.replace(input_old, input_new)

# Details touch target updates
summary_old = """summary {
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
}"""

summary_new = """summary {
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
    min-height: 44px; /* Touch target size */
}"""

css = css.replace(summary_old, summary_new)

with open('style.css', 'w') as f:
    f.write(css)
