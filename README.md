# Dead Tab Cleaner

A local-only Chrome and Brave extension that checks open HTTP/HTTPS tabs after you click **Scan tabs**. It flags unavailable resources, deleted YouTube videos, restricted pages, and temporary failures, then lets you explicitly close, move, or group the tabs you select.

## Install locally

1. Run `pnpm install` and `pnpm build`.
2. In Chrome or Brave, open `chrome://extensions` or `brave://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose **`/Users/lmadisha/development/projects/tab-manager-extenstion/dist`** — not the project root. The root contains source files; `dist` contains the compiled `service-worker.js` required by Chrome and Brave.

## How it works

- Click **Scan tabs** in the popup or dashboard. The extension never runs scans automatically.
- HTTP 404/410 responses and confirmed removed YouTube videos are marked **Dead** and selected by default.
- Restricted pages (401/403), temporary failures (429, network errors, timeouts, 5xx), and unknown results are visible but not selected.
- In the review dashboard, explicitly choose **Close**, **Move to new window**, or **Add to group**. Closing asks for confirmation and offers URL-based Undo.

Pinned tabs and non-web pages are skipped. Ignore rules are stored locally and prevent future flags for a matching URL or domain.

## Privacy and permissions

All checks and results remain in the browser. The extension collects no analytics and uploads no URLs. It requests only tabs, tab groups, storage, scripting, and HTTP/HTTPS host access; scripting is used during a user-started scan to identify rendered unavailable pages.

## Development

```bash
pnpm verify
```

This runs the unit/UI tests, production build, and TypeScript validation.
