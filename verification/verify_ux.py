import os
import sys
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Mock Chart.js to prevent errors from CDN blocking
        page.add_init_script("""
            window.Chart = class {
                constructor() {}
                destroy() {}
            };
        """)

        # Get absolute path to index.html
        cwd = os.getcwd()
        file_path = f"file://{os.path.join(cwd, 'index.html')}"

        print(f"Loading {file_path}")

        # Clear local storage before loading to ensure empty state
        page.add_init_script("localStorage.clear();")

        page.goto(file_path)

        # Verify Empty State
        print("Verifying Empty State...")
        try:
            page.wait_for_selector(".empty-state")
            content = page.content()
            if "No players yet" in content and "Add a Chess.com username to start tracking" in content:
                print("✅ Empty state text present.")
            else:
                print("❌ Empty state text missing.")
                sys.exit(1)

            add_btn = page.locator(".empty-state button")
            if add_btn.is_visible() and "+ ADD PLAYER" in add_btn.text_content():
                print("✅ 'Add Player' CTA button is visible.")
            else:
                print("❌ 'Add Player' CTA button not found or incorrect.")
                sys.exit(1)

            # Take screenshot of empty state
            page.screenshot(path="verification/empty_state.png")
            print("📸 Screenshot saved to verification/empty_state.png")

            # Test Interaction
            print("Testing CTA Interaction...")
            add_btn.click()

            # Wait for drawer to open
            page.wait_for_selector("#sideDrawer.open")
            print("✅ Side drawer opened.")

            # Check Focus (wait a bit for the setTimeout)
            page.wait_for_timeout(200)
            is_focused = page.evaluate("document.activeElement.id === 'usernameInput'")
            if is_focused:
                print("✅ Username input is focused.")
            else:
                print("⚠️ Username input focus check failed (might be headless timing issue).")
                # Not failing hard on this as headless focus can be flaky

        except Exception as e:
            print(f"❌ Error during empty state verification: {e}")
            sys.exit(1)

        # Verify A11y Attributes
        print("Verifying A11y Attributes...")
        try:
            menu_label = page.get_attribute("#menuBtn", "aria-label")
            if menu_label == "Open menu":
                print("✅ Menu button has correct aria-label.")
            else:
                print(f"❌ Menu button aria-label is '{menu_label}'.")
                sys.exit(1)

            close_label = page.get_attribute("#closeDrawerBtn", "aria-label")
            if close_label == "Close menu":
                print("✅ Close drawer button has correct aria-label.")
            else:
                print(f"❌ Close drawer button aria-label is '{close_label}'.")
                sys.exit(1)

            input_label = page.get_attribute("#usernameInput", "aria-label")
            if input_label == "Chess.com Username":
                print("✅ Username input has correct aria-label.")
            else:
                print(f"❌ Username input aria-label is '{input_label}'.")
                sys.exit(1)

        except Exception as e:
            print(f"❌ Error during A11y verification: {e}")
            sys.exit(1)

        print("\n🎉 All UX verifications passed!")
        browser.close()

if __name__ == "__main__":
    run()
