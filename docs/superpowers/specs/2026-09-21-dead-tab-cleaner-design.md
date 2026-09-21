# Dead Tab Cleaner — Design

## Purpose

Dead Tab Cleaner is a local-only Chrome and Brave extension that manually scans open browser tabs for resources that are unavailable, deleted, or taken down. It flags those tabs for user review; it never closes or changes tabs automatically.

## Scope

The first release supports Chromium Manifest V3 browsers: Chrome and Brave. A user starts every scan by selecting **Scan tabs**. The extension checks eligible HTTP and HTTPS tabs, reports tab health, and lets the user close selected tabs, move them to a new window, or add them to a tab group.

Out of scope: scheduled/startup scanning, Firefox, cloud services, telemetry, automatic tab removal, and persistent scan history.

## Architecture

The extension has four bounded components:

1. **Popup** — starts a scan, shows the latest counts, and opens the review dashboard.
2. **Service worker** — discovers tabs, filters unsupported schemes, deduplicates URLs, queues network checks, combines evidence, maintains the badge, and carries out explicit tab actions.
3. **Content scripts** — inspect rendered pages for unavailable-resource evidence that HTTP alone cannot detect. Version one includes generic unavailable-page signals and a YouTube unavailable-video detector.
4. **Review dashboard** — presents flagged results, filters them, tracks selection, and requests bulk actions from the service worker.

All scanning and storage remain in the browser. No URLs, results, or analytics leave the device.

## Data flow and classification

1. The user starts a manual scan from the popup or dashboard.
2. The service worker queries open tabs, skipping browser-internal, extension, file, devtools, and unsupported schemes. Pinned tabs are excluded by default.
3. Eligible duplicate URLs are scanned once and the outcome is applied to each matching tab.
4. The scanner uses a bounded concurrency queue. It tries a `HEAD` request first, with a `GET` fallback where required.
5. A content script inspects the live document when page evidence is available.
6. The classifier returns a `TabScanResult` with a status, confidence, reason, optional HTTP status, and scan time.

Classification rules are conservative:

| Evidence | Status | Default selection |
| --- | --- | --- |
| HTTP 404 or 410 | Dead, high confidence | Selected |
| Confirmed deleted/unavailable YouTube video | Dead, high confidence | Selected |
| Generic unavailable-page signal | Dead, medium confidence | Unselected |
| HTTP 401 or 403 | Restricted | Unselected |
| HTTP 429, timeout, DNS/connection failure, or 5xx | Temporary error | Unselected |
| Insufficient or conflicting evidence | Unknown | Unselected |

Authentication failures, rate limits, server errors, and timeouts must never be classified as permanently dead. A content result that shows a valid page can override an unauthenticated background request.

## Review and actions

The popup contains the manual scan control and a concise summary. The dashboard lists flagged tabs with title, URL, reason, status, confidence, and a checkbox. It filters by Dead, Restricted, Temporary, and Unknown.

Only high-confidence dead tabs are selected initially. The user can select or deselect any displayed tab and may take one of these explicit actions:

- **Close selected:** confirm before closing. Store tab URLs and placement information locally and provide an Undo control that recreates the tabs.
- **Move to new window:** create a review window from the first selected tab and preserve the order of remaining selected tabs.
- **Add to group:** create a named tab group or use an existing group.
- **Ignore URL / Ignore domain:** store a local rule so matching future tabs are not flagged.

Results, ignore rules, and a small bounded undo/action record are stored with `chrome.storage.local`. A new manual scan replaces the displayed scan results.

## Permissions and privacy

The manifest requests only `tabs`, `tabGroups`, `storage`, `scripting`, and HTTP/HTTPS host access. Content scripts run only while a user-initiated scan needs page evidence. The extension performs no external upload, account connection, analytics, or scheduled background scans.

## Verification

Unit tests cover URL eligibility, deduplication, network-status mapping, content-detector precedence, ignore rules, cached-result expiry, and initial selection rules.

Browser-level tests cover manual scan through dashboard review, close-and-undo, move-to-window, group creation/reuse, and skipped-tab handling. Manual Chrome and Brave checks validate extension installation, permission behavior, results display, and tab actions.

## Acceptance criteria

1. The extension loads in Chrome and Brave as Manifest V3.
2. A user can manually scan individual eligible open tabs.
3. Missing/deleted URLs and unavailable YouTube videos are flagged with a reason and confidence.
4. Uncertain/restricted/temporary results remain visible but unselected by default.
5. A user can close, move to a new window, or group selected tabs after an explicit action.
6. The extension never automatically closes or changes tabs, never treats 401/403 or transient failures as dead, and keeps scan data local.
