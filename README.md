# UQEC MLBB Tournament — v1.1

GitHub Pages frontend + Cloudflare Worker API + CSV files committed into the same GitHub repository. No SQL database, no frontend framework. **Not live until GitHub + Worker are configured.**

## Publishing guide

### A. Set up GitHub Pages
1. Create a GitHub repository (e.g. `uqec-mlbb`). Upload contents of this ZIP **including `data/initial/`** to the `main` branch. Do not upload private credentials, a `.dev.vars` file, or a GitHub token.
2. Under repository Settings → Pages → Deploy from a branch, select `main` and `/(root)`.
3. Note the exact GitHub Pages origin, typically `https://YOUR_USERNAME.github.io` (no final slash, and no repository path).

### B. Create a GitHub fine-grained Personal Access Token
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Limit repository access to **this repository only**. Enable **Contents: Read and write**. Set an expiry longer than tournament days. Never put the token in GitHub website JavaScript or public repository files.
3. Keep the token private. If exposed, revoke it immediately.

### C. Deploy the Cloudflare Worker API
1. Create a Cloudflare account if needed; install Node.js locally.
2. Open a terminal within the included `worker/` folder.
3. In `wrangler.toml`, set `GH_OWNER`, `GH_REPO`, `GH_BRANCH` and `ALLOWED_ORIGIN` (the GitHub Pages **origin**, not the full project page URL).
4. Run `npx wrangler login` and then `npx wrangler deploy`.
5. In Cloudflare Worker Settings → Variables and Secrets, add **Secret** bindings:
   - `GH_TOKEN`: the GitHub fine-grained access token;
   - `ADMIN_USERNAME`: organizer username (can use the one planned earlier);
   - `ADMIN_PASSWORD`: **new strong password** (do not reuse the previously shared demo password);
   - `SESSION_SECRET`: random long secret (at least 32 unpredictable characters).
6. Redeploy Worker if needed, and check `https://YOUR_WORKER.workers.dev/api/health`.
7. Edit **root** `config.js` replacing the Worker URL with your deployed Worker URL. Commit to GitHub.
8. Visit the GitHub Pages site, open Organizer, sign in with **Worker secret** credentials, and try saving a harmless score/note. Verify a `data/matches.csv` commit appears in GitHub, then restore test results.

Alternative: secrets can be added with `npx wrangler secret put GH_TOKEN` and similarly for the other three keys.

## User workflow
- **Spectators:** public views auto-refresh from GitHub via Worker approximately every 20 seconds (GitHub API response rather than waiting for GitHub Pages rebuild). On GitHub Pages, the Worker URL must be configured in `config.js`.
- **Organizer:** secure server-validated login, 8-hour bearer session held in sessionStorage. Save scores, rosters, and seed overrides → Worker validates → GitHub REST Contents API commits CSV → frontend reloads. GitHub commits are the change history.
- **Backups:** Export all CSV before importing/resetting; backups are local downloads.
- **Reload from GitHub:** discard unsaved browser changes and fetch latest GitHub data.
- **Reset match results:** clears all recorded results and manual seeds, preserves roster and group assignments.
- **Reset everything:** restores the four original baseline CSV files from `data/initial/` as new commits. To change what “original” means, update those baseline files deliberately.

## Technical limitations / safety
- Cloudflare Worker is required for automatic GitHub updates; GitHub Pages alone cannot securely write files.
- The Worker secret username/password are **never published** in frontend code. However, a shared password with no 2FA, no account-level audit, and no enforced rate limiting is **not equivalent to a full identity provider**. For higher-assurance security use Cloudflare Access or another identity service, and add edge rate limiting.
- GitHub API commits to multiple CSV files are **sequential, not atomic**. A failure mid-roster save or reset may commit some but not all files; the dashboard reports the failure and you can inspect GitHub history or retry after reloading.
- A stale editor is rejected using the previous CSV blob SHA. Saving after someone else changes the same file requires reloading. Only one organizer should edit at a time.
- Changes are visible once committed and fetched, but the public view polls; don't promise instant push notifications. GitHub API rate limits apply: avoid excessive traffic; for a large spectator audience move public GETs to a cached read endpoint (or Cloudflare KV/D1 cache) instead of per-visitor GitHub API reads.
- Avoid publishing sensitive information about minors; get school permission before publishing real student names or class data. Draft roster name spellings remain unverified.
- Modified 8-team double-elimination bracket, with **no grand-final reset**. 21 group fixtures + 14 playoff fixtures.

## Development
- Public site: HTML + CSS + vanilla JS in repo root (`index.html`, `css/`, `js/`).
- Data: `data/{teams,players,matches,seeds}.csv`.
- Worker: `worker/index.js` (ES module) and `worker/wrangler.toml`.
- Offline preview: run `python -m http.server 8000` in the root; without the Worker configured, public views load local CSV and organizer editing is unavailable.

## V1.1.1 reliability patch (no installation required)

- Keep your existing GitHub Pages repository, Worker code, credentials, and URL. Replace the site files with this package using GitHub's browser upload; do not overwrite the existing `data/*.csv` with older example data if your live scores or rosters have changed.
- `js/app.js` now falls back to same-origin GitHub Pages `data/*.csv` whenever the Worker API cannot be reached. These published files can lag the latest commit until Pages deployment finishes.
- Organizer changes are staged in browser localStorage **before** trying to save. If any save cannot be confirmed, use **Download unpublished CSV backup** in the Organizer page. The recovery panel is displayed even if the organizer cannot sign in. This backup is local to the browser/device; do not clear site storage before exporting it.
- Successful saves clear the local pending backup **for that dataset only**. Unconfirmed saves are never retried automatically or discarded by an automatic data reload; compare the GitHub file before any manual retry. A network failure can occur after a commit succeeds.
- Public fallback is read-only; server-side authentication and automatic saving still require a reachable Cloudflare Worker. Data edits in an existing authorized session can be exported as local backups, not guaranteed to publish.
- Reload and reset are blocked while unpublished backup edits exist. Export and reconcile first, then discard the backup deliberately.
- Recommended upload for an existing installation: **only replace `index.html` and `js/app.js`**. Do not upload `data/` or Worker files just to install the patch.
- GitHub Pages must successfully publish the updated `index.html` and `js/app.js` for the patch to take effect. Force-refresh the browser (Ctrl+F5).

### Important limitations

No automatic correction to unreliable network/TLS connections. Browser localStorage isn't synchronized across devices and can be cleared by browser settings. If a save partially succeeds across multiple CSV datasets, export the remaining local backups and compare each file to the GitHub repository. A test on the event's internet connection is required.
