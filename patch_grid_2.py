with open('index.html', 'r') as f:
    html = f.read()

# We need diff to be inline or properly gridded. Let's make the rating section right-aligned and contain both.
old_rating = '''<div style="text-align:right;">
                        <span class="p-rating monospace ${ghostClass}">${ratingDisplay}${crown}</span><span class="monospace" style="margin-left: 8px;">${diffHtml}</span>
                    </div>'''
new_rating = '''<div style="text-align:right; display:flex; justify-content:flex-end; align-items:center; gap:8px;">
                        <span class="p-rating monospace ${ghostClass}">${ratingDisplay}${crown}</span><span class="monospace">${diffHtml}</span>
                    </div>'''

html = html.replace(old_rating, new_rating)

# Fix header spacing
html = html.replace('''<span style="text-align:right;">RATING</span>''', '''<span style="text-align:right;">RATING</span>''')

with open('index.html', 'w') as f:
    f.write(html)
