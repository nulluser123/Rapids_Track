import os
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport (iPhone SE size)
        context = browser.new_context(viewport={'width': 375, 'height': 667})
        page = context.new_page()

        # Mock Chart.js and fetch
        page.add_init_script("""
            window.Chart = class {
                constructor() {}
                destroy() {}
            };
            window.fetch = async () => ({
                ok: true,
                json: async () => ({
                    chess_rapid: { last: { rating: 1500, date: 1600000000 } }
                })
            });
        """)

        cwd = os.getcwd()
        file_path = f"file://{os.path.join(cwd, 'index.html')}"

        # Initialize with data
        data = '{"players":[{"username":"hikaru","rapidRating":3200,"previousRating":3100,"lastUpdated":1600000000,"history":[3100,3150,3200]}],"historyData":{}}'
        page.add_init_script(f"localStorage.setItem('chessRatingTracker', '{data}');")

        page.goto(file_path)
        page.wait_for_selector('.player-row')

        # Open details
        page.locator('summary', has_text='DATA OPTIONS').click()

        # Wait a sec for transition
        page.wait_for_timeout(500)

        page.screenshot(path="verification/with_player_mobile.png", full_page=True)
        print("📸 Screenshot saved to verification/with_player_mobile.png")
        browser.close()

if __name__ == "__main__":
    run()
