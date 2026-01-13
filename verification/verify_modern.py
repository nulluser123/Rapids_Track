
from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Load the local HTML file
    # We assume the script is run from repo root or we need absolute path.
    # verification/verify_modern.py is where we are.
    # index.html is in repo root.

    cwd = os.getcwd()
    file_path = f"file://{cwd}/index.html"

    print(f"Navigating to {file_path}")
    page.goto(file_path)

    # Wait for page to load
    page.wait_for_load_state("networkidle")

    # Take a screenshot of the initial state
    page.screenshot(path="verification/verification_initial.png", full_page=True)

    # Check if critical elements exist
    title = page.title()
    print(f"Page Title: {title}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
