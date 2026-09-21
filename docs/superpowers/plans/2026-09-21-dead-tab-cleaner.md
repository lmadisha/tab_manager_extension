# Dead Tab Cleaner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Chrome and Brave extension that manually scans eligible tabs for unavailable resources and lets users close, move, group, or ignore flagged tabs.

**Architecture:** A Manifest V3 service worker owns tab discovery, request-queue scanning, result classification, storage, badge updates, and explicit tab actions. React popup and dashboard pages communicate with it through typed messages; on-demand content scripts contribute generic and YouTube page evidence. Shared TypeScript modules make the result contract and safety rules testable without a browser.

**Tech Stack:** TypeScript, React, Vite, Manifest V3, Chrome Extensions APIs, Vitest, Testing Library, ESLint, Prettier.

**Spec:** `docs/superpowers/specs/2026-09-21-dead-tab-cleaner-design.md`

## Global Constraints

- Target Chrome and Brave with one Chromium Manifest V3 build.
- Start scans only after an explicit user click; no startup or scheduled scanning.
- Keep URLs, results, rules, and undo records local; add no telemetry or remote service.
- Scan only eligible HTTP/HTTPS tabs and exclude pinned tabs, browser-internal pages, extension pages, files, devtools, and unsupported schemes.
- Never alter tabs without an explicit dashboard action; confirm closures and provide URL-based undo.
- Auto-select only high-confidence dead results; leave restricted, temporary, unknown, and medium-confidence results unselected.
- Never classify 401/403, 429, network failures, timeouts, or 5xx responses as permanently dead.

---

## File structure

```text
src/
  background/
    service-worker.ts          # Message entry point and orchestration
    tab-actions.ts             # Close/undo/window/group browser operations
  content/
    detector.ts                # On-demand DOM detector entry point
    generic-detector.ts        # Conservative generic unavailable text detection
    youtube-detector.ts        # YouTube-specific unavailable-state detection
  dashboard/
    main.tsx                   # Dashboard mount point
    App.tsx                    # Review page state and commands
    TabList.tsx                # Flagged-tab filters, list, selection
    ActionBar.tsx              # Close/move/group/ignore controls
  popup/
    main.tsx                   # Popup mount point
    App.tsx                    # Scan control and summary
  services/
    classifier.ts              # Evidence-to-result precedence rules
    scanner.ts                 # Eligibility, deduplication, queue and fetching
    storage.ts                 # Local scan, ignore, and undo persistence
  shared/
    constants.ts               # Limits and supported schemes
    messages.ts                # Typed UI/service-worker messages
    types.ts                   # Result and detector contracts
tests/
  classifier.test.ts
  scanner.test.ts
  detectors.test.ts
  storage.test.ts
  tab-actions.test.ts
manifest.json
vite.config.ts
```

### Task 1: Scaffold the Manifest V3 extension

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.json`
- Create: `src/popup/index.html`
- Create: `src/dashboard/index.html`
- Create: `src/popup/main.tsx`
- Create: `src/dashboard/main.tsx`
- Create: `src/styles.css`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`

**Interfaces:**
- Produces: a `pnpm build` artifact with `manifest.json`, popup page, dashboard page, and background service worker.

- [ ] **Step 1: Initialise the project and install development dependencies**

Run:

```bash
git init
pnpm init
pnpm add react react-dom
pnpm add -D @types/chrome @types/react @types/react-dom @vitejs/plugin-react typescript vite vitest jsdom @testing-library/react @testing-library/jest-dom eslint prettier
```

- [ ] **Step 2: Add a failing build check before configuring Vite**

Add this script to `package.json`:

```json
"build": "vite build"
```

Run: `pnpm build`

Expected: FAIL because Vite configuration and HTML entry points do not yet exist.

- [ ] **Step 3: Configure Vite and the two UI entry points**

Use `@vitejs/plugin-react`; configure Rollup inputs for `src/popup/index.html` and `src/dashboard/index.html`; copy `manifest.json` into `dist`. Create each HTML page with a root element and its matching TypeScript entry point.

- [ ] **Step 4: Add the minimal Manifest V3 configuration**

Set `manifest_version` to `3`; configure the popup page, `background.service_worker`, and `type: "module"`. Request `tabs`, `tabGroups`, `storage`, and `scripting`, plus `host_permissions` for `http://*/*` and `https://*/*`. Do not add `alarms`, `history`, identity, or analytics permissions.

- [ ] **Step 5: Verify the extension package**

Run: `pnpm build`

Expected: PASS and `dist/manifest.json` references the emitted popup, dashboard, and worker assets.

- [ ] **Step 6: Commit the scaffold**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts manifest.json src .eslintrc.cjs .prettierrc.json
git commit -m "chore: scaffold dead tab cleaner extension"
```

### Task 2: Define shared contracts and pure classification rules

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`
- Create: `src/services/classifier.ts`
- Create: `tests/classifier.test.ts`

**Interfaces:**
- Produces: `classifyTab(evidence: ScanEvidence): Classification` and `isInitiallySelected(result: TabScanResult): boolean`.
- Consumes: no browser APIs; tests execute in Node.

- [ ] **Step 1: Write failing classification tests**

```ts
expect(classifyTab({ httpStatus: 404 })).toMatchObject({ status: "dead", confidence: "high" });
expect(classifyTab({ httpStatus: 403 })).toMatchObject({ status: "restricted", confidence: "medium" });
expect(classifyTab({ networkError: "timeout" })).toMatchObject({ status: "temporary_error" });
expect(classifyTab({ content: { kind: "youtube_removed", confidence: "high" }, httpStatus: 200 }))
  .toMatchObject({ status: "dead", confidence: "high" });
expect(isInitiallySelected({ status: "dead", confidence: "medium" } as TabScanResult)).toBe(false);
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm vitest run tests/classifier.test.ts`

Expected: FAIL because the classifier module does not exist.

- [ ] **Step 3: Define the contracts**

In `types.ts`, define `TabHealthStatus` (`healthy`, `dead`, `restricted`, `temporary_error`, `unknown`), `ConfidenceLevel`, `DetectionResult`, `ScanEvidence`, `TabScanResult`, `IgnoreRule`, and `UndoRecord`. A scan result must contain `tabId`, `windowId`, `title`, `url`, `status`, `confidence`, `reason`, optional `httpStatus`, and `scannedAt`.

- [ ] **Step 4: Implement precedence in the classifier**

Implement this exact order: high-confidence site content result; HTTP 404/410; valid rendered-page content; generic unavailable content; 401/403; 429/network/timeout/5xx; successful 2xx/3xx; unknown. Return high confidence for 404/410 and confirmed YouTube deletion, medium for generic content and restrictions, and low for unknown. `isInitiallySelected` must return true only for `dead` plus `high` confidence.

- [ ] **Step 5: Verify the focused tests**

Run: `pnpm vitest run tests/classifier.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the shared model and classifier**

```bash
git add src/shared src/services/classifier.ts tests/classifier.test.ts
git commit -m "feat: classify tab health conservatively"
```

### Task 3: Build tab eligibility, deduplicated network scanning, and persistence

**Files:**
- Create: `src/services/scanner.ts`
- Create: `src/services/storage.ts`
- Create: `tests/scanner.test.ts`
- Create: `tests/storage.test.ts`

**Interfaces:**
- Consumes: `classifyTab`, `TabScanResult`, `IgnoreRule`.
- Produces: `getEligibleTabs(tabs)`, `scanTabs(tabs, options)`, `getIgnoreRules()`, `saveIgnoreRule(rule)`, `loadLatestResults()`, and `saveLatestResults(results)`.

- [ ] **Step 1: Write failing eligibility and deduplication tests**

```ts
expect(getEligibleTabs([
  { id: 1, url: "chrome://settings", pinned: false },
  { id: 2, url: "https://example.test/a", pinned: false },
  { id: 3, url: "https://example.test/a", pinned: false },
  { id: 4, url: "https://pinned.test", pinned: true },
] as chrome.tabs.Tab[]).map(tab => tab.id)).toEqual([2, 3]);

expect(await scanTabs(duplicateTabs, { fetchImpl })).toHaveLength(2);
expect(fetchImpl).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run scanner tests**

Run: `pnpm vitest run tests/scanner.test.ts tests/storage.test.ts`

Expected: FAIL because scanner and storage modules do not exist.

- [ ] **Step 3: Implement safe eligibility and URL grouping**

Accept only `http:` and `https:` URLs. Reject missing IDs/URLs, pinned tabs, and URLs covered by URL or hostname ignore rules. Group remaining tabs by exact URL so one check fans out to every duplicate.

- [ ] **Step 4: Implement bounded network checks**

Use a maximum of six active URL checks. For each unique URL, attempt `fetch(url, { method: "HEAD", redirect: "follow", signal })`; retry once with `GET` when HEAD throws or returns 405/501. Apply an eight-second `AbortController` timeout. Convert response status or thrown error to `ScanEvidence`; never throw an error that stops the remaining queue.

- [ ] **Step 5: Implement local storage**

Store `{ latestResults, ignoreRules, undoRecord }` using `chrome.storage.local`. Validate that ignore rule types are `url` or `domain`; cap the undo record at one latest close operation. Make adapter functions accept a storage implementation for unit tests.

- [ ] **Step 6: Verify scanner and storage behavior**

Run: `pnpm vitest run tests/scanner.test.ts tests/storage.test.ts`

Expected: PASS, including HEAD-to-GET fallback, skipped pinned/internal tabs, URL deduplication, timeout-as-temporary behavior, and ignored URL/domain handling.

- [ ] **Step 7: Commit scanning and storage**

```bash
git add src/services/scanner.ts src/services/storage.ts tests/scanner.test.ts tests/storage.test.ts
git commit -m "feat: scan eligible tabs with local persistence"
```

### Task 4: Add on-demand page-content detectors

**Files:**
- Create: `src/content/generic-detector.ts`
- Create: `src/content/youtube-detector.ts`
- Create: `src/content/detector.ts`
- Create: `tests/detectors.test.ts`

**Interfaces:**
- Produces: `detectUnavailablePage(url: string, document: Document): DetectionResult | undefined`.
- Consumes: `DetectionResult` from `src/shared/types.ts`.

- [ ] **Step 1: Write failing detector tests**

```ts
expect(detectUnavailablePage("https://www.youtube.com/watch?v=a", documentWith("Video unavailable")))
  .toMatchObject({ kind: "youtube_removed", confidence: "high" });
expect(detectUnavailablePage("https://example.test", documentWith("Page not found")))
  .toMatchObject({ kind: "generic_unavailable", confidence: "medium" });
expect(detectUnavailablePage("https://example.test", documentWith("An article mentioning Page not found")))
  .toBeUndefined();
```

- [ ] **Step 2: Run detector tests**

Run: `pnpm vitest run tests/detectors.test.ts`

Expected: FAIL because detector modules do not exist.

- [ ] **Step 3: Implement generic and YouTube detectors**

The generic detector must require a known error-title/heading selector or a concise body that exactly matches an unavailable phrase; never match arbitrary article text. Recognize `Page not found`, `404 Not Found`, `Content unavailable`, and `This page no longer exists` as medium confidence. The YouTube detector must recognize `Video unavailable`, `This video is unavailable`, and deletion-specific player messages as high-confidence dead; classify `Private video` and region restrictions as restricted.

- [ ] **Step 4: Implement the content-script entry point**

Register `detectPageHealth` as a function that returns a serializable detection result. The service worker injects it only with `chrome.scripting.executeScript` after a manual scan begins, and gracefully ignores injection failures on protected pages.

- [ ] **Step 5: Verify detector tests**

Run: `pnpm vitest run tests/detectors.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit content detection**

```bash
git add src/content tests/detectors.test.ts
git commit -m "feat: detect unavailable pages and videos"
```

### Task 5: Wire the service worker and explicit tab actions

**Files:**
- Create: `src/shared/messages.ts`
- Create: `src/background/tab-actions.ts`
- Create: `src/background/service-worker.ts`
- Create: `tests/tab-actions.test.ts`
- Modify: `manifest.json`

**Interfaces:**
- Produces: messages `scanTabs`, `getResults`, `closeTabs`, `undoClose`, `moveToWindow`, `groupTabs`, `addIgnoreRule`.
- Consumes: scanner, storage, detector entry point, and Chrome tabs/tabGroups APIs.

- [ ] **Step 1: Write failing tab-action tests against a Chrome API adapter**

```ts
await closeTabs([11, 12], chromeAdapter);
expect(chromeAdapter.tabs.remove).toHaveBeenCalledWith([11, 12]);

await moveToNewWindow([11, 12], chromeAdapter);
expect(chromeAdapter.windows.create).toHaveBeenCalledWith({ tabId: 11 });

await groupTabs([11, 12], "Dead tabs", chromeAdapter);
expect(chromeAdapter.tabs.group).toHaveBeenCalledWith({ tabIds: [11, 12] });
```

- [ ] **Step 2: Run action tests**

Run: `pnpm vitest run tests/tab-actions.test.ts`

Expected: FAIL because action modules do not exist.

- [ ] **Step 3: Implement browser actions with explicit input validation**

Before every action, query live tabs and discard missing IDs. `closeTabs` stores restorable URL/window/index/pinned data before `chrome.tabs.remove`. `undoClose` recreates saved URLs in their original window when available. `moveToNewWindow` creates a window from the first tab then moves the others in selection order. `groupTabs` groups IDs and updates its title; when an existing group ID is supplied, move tabs into it instead.

- [ ] **Step 4: Implement typed message handling and scan orchestration**

`scanTabs` calls `chrome.tabs.query({})`, runs the scanner, injects detector code only into eligible tabs, reclassifies with content evidence, saves results, and sets the action badge to the number of high-confidence dead tabs. Return progress/results to the requester. No handler may scan on browser startup, install, alarm, navigation, or tab creation.

- [ ] **Step 5: Verify worker/action tests**

Run: `pnpm vitest run tests/tab-actions.test.ts`

Expected: PASS. Then run: `pnpm build`

Expected: PASS with the worker referenced in the manifest.

- [ ] **Step 6: Commit service-worker orchestration**

```bash
git add src/background src/shared/messages.ts manifest.json tests/tab-actions.test.ts
git commit -m "feat: add manual scan and tab actions"
```

### Task 6: Build the popup and review dashboard

**Files:**
- Create: `src/popup/App.tsx`
- Create: `src/dashboard/App.tsx`
- Create: `src/dashboard/TabList.tsx`
- Create: `src/dashboard/ActionBar.tsx`
- Modify: `src/styles.css`
- Create: `tests/dashboard.test.tsx`

**Interfaces:**
- Consumes: typed messages and `TabScanResult`.
- Produces: manual scan control, scan summary, result filters, selection, confirmations, and explicit action requests.

- [ ] **Step 1: Write a failing dashboard selection test**

```tsx
render(<TabList results={[highConfidenceDead, restricted, temporary]} />);
expect(screen.getByLabelText(highConfidenceDead.title)).toBeChecked();
expect(screen.getByLabelText(restricted.title)).not.toBeChecked();
expect(screen.getByLabelText(temporary.title)).not.toBeChecked();
```

- [ ] **Step 2: Run the UI test**

Run: `pnpm vitest run tests/dashboard.test.tsx`

Expected: FAIL because the dashboard component does not exist.

- [ ] **Step 3: Implement the popup**

Show the number of open tabs, latest health counts, an accessible `Scan tabs` button that sends `scanTabs`, an in-progress state, and a `Review results` control that opens the dashboard. The popup must not start a scan on mount.

- [ ] **Step 4: Implement the dashboard and filters**

List only flagged results. Include checkbox, title, URL, reason, status, confidence, and filters for All, Dead, Restricted, Temporary, and Unknown. Initialize selection using `isInitiallySelected`; provide select-all-visible and clear-selection controls.

- [ ] **Step 5: Implement action confirmation and feedback**

Require a native or React confirmation dialog before `closeTabs`, showing the exact selected count. Provide Undo after a completed close. Add controls for move-to-new-window, group title/existing group choice, and ignore URL/domain. Disable actions when nothing is selected.

- [ ] **Step 6: Verify UI and package**

Run: `pnpm vitest run tests/dashboard.test.tsx`

Expected: PASS. Then run: `pnpm build`

Expected: PASS.

- [ ] **Step 7: Commit the user interface**

```bash
git add src/popup src/dashboard src/styles.css tests/dashboard.test.tsx
git commit -m "feat: add scan review dashboard"
```

### Task 7: Complete verification and package for browser loading

**Files:**
- Create: `README.md`
- Modify: `package.json`
- Modify: `manifest.json`

**Interfaces:**
- Produces: documented load-unpacked workflow and repeatable validation scripts.

- [ ] **Step 1: Add aggregate verification scripts**

Add:

```json
"test": "vitest run",
"typecheck": "tsc --noEmit",
"lint": "eslint .",
"verify": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
```

- [ ] **Step 2: Run the full automated suite**

Run: `pnpm verify`

Expected: PASS with unit/UI coverage for each classifier state, content detectors, scanning safety behavior, storage, and every tab action adapter.

- [ ] **Step 3: Load the extension manually in Chrome**

Run: `pnpm build`, then open `chrome://extensions`, enable Developer mode, and select **Load unpacked** using `dist`.

Expected: no manifest or worker error; popup opens and dashboard opens.

- [ ] **Step 4: Test the user-visible workflow in Chrome and Brave**

Use safe test tabs representing a valid page, 404, 410, a protected URL, a temporary-failure URL, and a YouTube unavailable page. Click **Scan tabs**. Verify only high-confidence dead results are selected. Verify close confirmation/undo, move-to-new-window ordering, group creation, existing-group placement, and ignored URL/domain behavior in both browsers.

- [ ] **Step 5: Document local-only behavior and installation**

Write `README.md` with installation, manual-scan usage, statuses, selection safety rules, available actions, local-only privacy statement, permissions explanation, and development/verification commands.

- [ ] **Step 6: Commit release-ready documentation**

```bash
git add README.md package.json manifest.json
git commit -m "docs: document extension installation and privacy"
```

## Spec coverage review

- Chrome and Brave MV3 support: Tasks 1 and 7.
- Explicit manual scanning only: Tasks 1, 3, 5, and 6.
- Conservative detection/classification and YouTube support: Tasks 2, 3, and 4.
- Flagging with safe initial selection: Tasks 2 and 6.
- Close/undo, move-window, groups, and ignores: Tasks 3, 5, and 6.
- Local-only privacy and least permissions: Tasks 1, 3, 5, and 7.
- Automated and browser verification: Tasks 2 through 7.
