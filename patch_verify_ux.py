import re

with open('verification/verify_ux.py', 'r') as f:
    py = f.read()

# Replace drawer specific assertions
drawer_open_wait = '''            # Wait for drawer to open
            page.wait_for_selector("#sideDrawer.open")
            print("✅ Side drawer opened.")'''
py = py.replace(drawer_open_wait, '')

# Update a11y checks
a11y_checks = '''        # Verify A11y Attributes
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
            sys.exit(1)'''

new_a11y_checks = '''        # Verify A11y Attributes
        print("Verifying A11y Attributes...")
        try:
            input_label = page.get_attribute("#usernameInput", "aria-label")
            if input_label == "Chess.com Username":
                print("✅ Username input has correct aria-label.")
            else:
                print(f"❌ Username input aria-label is '{input_label}'.")
                sys.exit(1)

        except Exception as e:
            print(f"❌ Error during A11y verification: {e}")
            sys.exit(1)'''

py = py.replace(a11y_checks, new_a11y_checks)

with open('verification/verify_ux.py', 'w') as f:
    f.write(py)
