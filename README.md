# Claude Code App Manager

A browser-only dashboard for keeping track of every app you've built with Claude Code, including works in progress, all in one place. No server, no build step required. The theme is inspired by Japanese watercolor painting (indigo, sakura, matcha, and gold washes on a paper-textured background, hanko-stamp-style status badges, and brush-stroke decorative animations).

🔗 Live URL: https://jannu007.github.io/app-management/ (auto-deploys on every push to `main`. It's hosted on GitHub Pages, so it's completely free.)

## Features

- Connect your GitHub account to automatically list your repositories
- Manually set a status for each repository — "Unclassified / In Progress / Completed / Paused / Archived"
- Register apps that aren't on GitHub via "+ Add manually"
- Search by name/description/tags, filter by status, sort by update date or name
- Freely add tags and notes to organize each app
- Data is stored in the browser's `localStorage` (can be exported/imported as JSON for backup or moving to another browser)
- PWA support — install it on your phone or PC and launch it from your home screen/desktop
- A lightweight lock screen. You must enter a passphrase to see the contents (⚠️ this is a static site, so it's not real authentication — just a casual deterrent. The passphrase's hash is included in the source code)

## Usage

Day to day, just bookmark and open the live URL above (https://jannu007.github.io/app-management/).

If you want to run it locally or modify it, serve it with a simple local server to avoid `file://` restrictions in the browser.

```bash
# from the root of this repository
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000` in your browser. Pushing to `main` automatically redeploys to Pages via GitHub Actions.

### Syncing with GitHub

1. Open "Settings" in the top right
2. Enter your GitHub username (no token needed if public repos are enough)
3. If you also want private repos, enter a Personal Access Token with `repo` scope (a read-only fine-grained PAT is recommended)
4. Check "Only sync repositories with a specific topic" to limit the sync to repos tagged with a GitHub topic (e.g. `claude-code`)
5. Click "Sync with GitHub" after saving to refresh the list

The token is stored only in this browser's localStorage and is never used for anything other than talking to the GitHub API.

Repositories added by a sync are registered as "Unclassified" — update the status manually to reflect reality (syncing never overwrites existing status, tags, or notes).

- **Tap a card to expand it**: clicking a card body expands it downward and automatically lists the HTML files in that repository. If GitHub Pages is enabled, each file links to its published Pages URL; otherwise it links to a preview via [htmlpreview.github.io](https://htmlpreview.github.io/). If a `homepage` is set, it's added to the list too, and "View on GitHub" is always available last. Clicking an item opens it in a new tab (click the card again to collapse it). Editing is done via the ✎ button in the top right of the card.
- **Auto-filled descriptions**: for repositories with no description set on GitHub, the first sentence of the README is automatically extracted and used instead.

### Registering an app manually

Apps that aren't on GitHub, or that only run locally, can be registered via "+ Add manually".

### Backups

Use "Export" in "Settings" to save as a JSON file, and "Import" to load one back in (also useful for moving to another browser or device).

### Installing (PWA)

Open the live URL in a supported browser (Chrome, Edge, etc.) and a "📲 Install" button appears at the bottom of the screen. Clicking it adds the app to your home screen/desktop/app list so it can launch without a browser tab.

- Mobile (Android Chrome / iOS Safari): also available via the browser's share menu or the address bar's "Install" / "Add to Home Screen" option
- PC (Chrome / Edge): also available via the install icon on the right side of the address bar, or "Install app" in the browser menu

## File structure

```
index.html              Page structure
css/style.css           Styles
js/app.js               Logic (GitHub sync, localStorage management, search/filter, PWA install)
manifest.webmanifest    PWA manifest
sw.js                   Service worker (offline caching)
icons/                  App icons
.github/workflows/      Automatic deployment to GitHub Pages
```
