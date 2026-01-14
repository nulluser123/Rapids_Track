import os
from playwright.sync_api import sync_playwright

def verify_style(page):
    # Load the local HTML file
    cwd = os.getcwd()
    file_path = f"file://{cwd}/index.html"
    page.goto(file_path)

    # Check if the external stylesheet is loaded and applied
    # We can check for a specific style that is defined in style.css
    # For example, body background color or font family

    # Get the computed style of the body
    body_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")

    # Check if it matches the variable --bg-color default #f8fafc (rgb(248, 250, 252))
    print(f"Body background color: {body_bg}")

    # Also check if h1 has the correct style
    h1_color = page.evaluate("getComputedStyle(document.querySelector('h1')).color")
    print(f"H1 color: {h1_color}")

    # Take a screenshot to visually verify
    page.screenshot(path="verification/style_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_style(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
