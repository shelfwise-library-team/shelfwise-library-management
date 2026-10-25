#!/usr/bin/env python3
"""Create salted PBKDF2 password hashes for Shelfwise's Render env variable.

This script prompts locally for four user IDs and passwords. It never writes the
passwords to a file; only salted password hashes are printed as JSON.
"""
import base64
import getpass
import hashlib
import json
import re
import secrets
import sys

ITERATIONS = 210_000
USER_COUNT = 4


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def main() -> None:
    users = []
    seen = set()
    print("Shelfwise team account setup")
    print("Enter four unique user IDs and passwords. Passwords must be at least 12 characters.")
    print("Your passwords will not be printed or saved; only their hashes will be output.\n")

    for number in range(1, USER_COUNT + 1):
        while True:
            username = input(f"User ID for team member {number}: ").strip().lower()
            if not re.fullmatch(r"[a-z0-9._-]{3,40}", username):
                print("Use 3–40 characters: lowercase letters, numbers, dot, underscore, or hyphen.")
                continue
            if username in seen:
                print("That user ID has already been used. Choose a unique ID.")
                continue
            break

        while True:
            password = getpass.getpass(f"Password for {username} (input hidden): ")
            confirmation = getpass.getpass("Confirm password (input hidden): ")
            if password != confirmation:
                print("Passwords do not match. Try again.")
                continue
            if len(password) < 12:
                print("Use at least 12 characters. A unique passphrase is recommended.")
                continue
            if password != password.strip():
                print("For easier sign-in, do not begin or end your password with spaces.")
                continue
            break

        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS, dklen=32)
        users.append({
            "username": username,
            "salt": b64(salt),
            "hash": b64(digest),
            "iterations": ITERATIONS,
        })
        seen.add(username)
        del password, confirmation
        print(f"Created password hash for {username}.\n")

    print("\nCopy the JSON below into the Render backend environment variable SHELFWISE_USERS_JSON.")
    print("Do not commit this JSON to GitHub or share it in a public place.\n")
    print(json.dumps(users, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled. No passwords were saved.", file=sys.stderr)
        sys.exit(1)
