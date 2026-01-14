from playwright.sync_api import sync_playwright, expect
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to desktop size
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for hydration
        page.wait_for_timeout(1000)

        # Set input value via JS to avoid visibility issues during test
        page.evaluate("document.getElementById('usernameInput').value = 'TestPlayer'")

        # Click Add Player
        page.click("#addPlayerBtn")

        # Check if player card is added
        # Wait for the card to appear (Use more specific locator)
        expect(page.locator("h4", has_text="TestPlayer")).to_be_visible()

        # Take a screenshot
        screenshot_path = "/home/jules/verification/verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
