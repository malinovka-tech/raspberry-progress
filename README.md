# Raspberry progress

Static harvest page for Малинівка. GitHub Actions rebuilds it whenever the expense bot records income with raspberry kilos.

Live page after Pages is enabled:

`https://malinovka-tech.github.io/raspberry-progress/`

## How it works

1. Someone logs a **Дохід** in the Telegram bot and enters raspberry kg.
2. The bot sends a GitHub `repository_dispatch` (webhook-style POST with a token).
3. This workflow rewrites the static page from the new total and deploys GitHub Pages.

The bot does not render HTML. It only triggers this repo.

## Setup

### 1. Enable GitHub Pages

In this repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Run **Regenerate progress** once from the Actions tab (enter `0` for kg) so the first deploy can create the `github-pages` environment. Approve it if GitHub asks.

### 2. Set the season target

Edit `config.json` (`targetKg`, title, season), or set repository variable `TARGET_KG`.

### 3. Give the bot a GitHub token

Create a fine-grained PAT for **this repo only**:

- **Contents**: Read and write (required to send `repository_dispatch`)
- **Metadata**: Read

Classic PAT alternative: `repo` (and `public_repo` if the repo is public).

Put it on the **running expense bot** as `RASPBERRY_PROGRESS_GITHUB_TOKEN`. Optional:

```
RASPBERRY_PROGRESS_GITHUB_REPO=malinovka-tech/raspberry-progress
RASPBERRY_PROGRESS_PAGES_URL=https://malinovka-tech.github.io/raspberry-progress
```

### 4. Preview locally

```bash
CURRENT_KG=125.5 LAST_DELTA_KG=12 node scripts/render.js
open dist/index.html
```
