# Shelfwise Home + Dashboard Redesign

The package contains an overlay update for the current React + Java + SQLite project.

## Design concepts
1. Welcome home — cinematic welcome page with glass book cards and a primary Enter Dashboard action.
2. Light dashboard — crisp, high-contrast light theme with navy sidebar and sapphire actions.
3. Dark dashboard — deep navy glass surfaces with bright blue, cyan, teal, amber, violet, and coral accents.

The included PNG files are generated mockups to preview the proposed direction. They are not the app itself and may contain illustrative sample values.

## Main changes
- `frontend/src/App.jsx`: first-load welcome screen, persistent theme preference, dashboard entry, welcome-home navigation.
- `frontend/src/styles.css`: new welcome screen and refreshed light/dark dashboard themes.
- `backend/src/main/java/*`: updated member-profile/fine-rate source files from the prior patch so the package remains aligned with the requested fields and rates.

See `APPLY_UPDATE.txt` for the safe overlay process. Preserve the existing `library.db` and unchanged Java source files.
