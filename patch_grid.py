import re

with open('style.css', 'r') as f:
    css = f.read()

# Fix grid column layout for the diff spanning over the rating
new_grid = """/* Grid Row utility */
.grid-row {
    display: grid;
    grid-template-columns: 30px 1fr 80px 100px 50px;
    align-items: center;
    gap: 8px;
}"""

css = re.sub(r'/\* Grid Row utility \*/\n\.grid-row \{.*?\}', new_grid, css, flags=re.DOTALL)

with open('style.css', 'w') as f:
    f.write(css)

with open('index.html', 'r') as f:
    html = f.read()

html = html.replace('''<span class="p-rating monospace ${ghostClass}">${ratingDisplay}${crown}${diffHtml}</span>''',
                    '''<span class="p-rating monospace ${ghostClass}">${ratingDisplay}${crown}</span><span class="monospace" style="margin-left: 8px;">${diffHtml}</span>''')

with open('index.html', 'w') as f:
    f.write(html)
