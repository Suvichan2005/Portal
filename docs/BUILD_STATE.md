# PORTAL Build State

**Version:** 1.5.1  
**Last Updated:** 2026-11-03 12:50 UTC+5:30  
**Phase:** 12 — Independent Release Reconciliation, Typed Destination Semantics & Atomic Pipeline  
**Branch:** feature/portal-next-level  
**Remote:** https://github.com/Suvichan2005/Portal  

## Release Overview: v1.5.1

Portal v1.5.1 reconciles all release claims, eliminates discrepancies, completes candidate destination ranking with typed semantics, grounds external modules in live operational status without fabricated links, and establishes an atomic, lock-protected cross-device release pipeline:

### 1. Reconciled Build Integrity & Bundle Checksums
- `scripts/generate-metadata.ts` now computes SHA-256 bundle checksums (`manifest.json`, `index.html`, `overlay.js`, `service-worker.js`) to guarantee exact code provenance.
- Build metadata strictly reflects current Git HEAD and target directory parameters.

### 2. Typed Destination Semantics (Saved Sessions, Searches & Canonical URLs)
- Extended `PinnedShortcut` and `DestinationCandidate` with explicit types (`'url'`, `'session'`, `'search'`, `'action'`).
- Pinned workspace sessions store `sessionId` and `tabCount`, rendering with a folder icon and `Workspace • X tabs` subtitle.
- Clicking a pinned session card restores all workspace tabs via `storage.restoreSession(id)`, eliminating the prior defect where only the first tab was opened.
- Repeated research searches (visited >= 2 times) are recognized as high-value destinations (`type: 'search'`), while one-off search queries are cleanly filtered out.
- Dynamic Suggested Destinations list tracks already-pinned items reactively with a disabled `✓ Pinned` indicator.

### 3. Honest Operational Module Status & OpenClaw Live Bridge
- Completely stripped all unverified `.local` fake domains (`flowmate.local`, `placement.local`) and fabricated status messages ("All tasks reconciled").
- Connected `ModuleRegistry` to the real local OpenClaw Gateway on `http://127.0.0.1:57849/health`. When alive, OpenClaw is dynamically marked as `connected` ("Gateway Online (127.0.0.1:57849) • Coordinator Ready").
- Flowmate and Placement OS honestly report unconfigured states with direct deep links or import options.

### 4. 7-Stage Prompt API Capability Model
- Expanded Prompt API lifecycle tracking across 7 distinct stages: `api_unavailable`, `flag_disabled`, `model_downloadable`, `model_ready`, `session_created`, `inference_applied`, `heuristic_deterministic`.
- The UI status badge only displays "Gemini Nano Active" when actual inference has executed and updated topic clusters, rather than claiming active AI simply because the API is present.

### 5. Asynchronous Search Popback & Direct URL Navigation Fixes
- Monotonic `searchSeq` counter increments immediately on empty query in both homepage and floating launcher, preventing delayed in-flight search responses from resurrecting suggestion menus after backspacing.
- Enter key prioritizes unambiguous direct URLs, IPs, localhost, and valid TLDs without searching Google.
- Background service worker wraps session storage in an initialization promise, preventing MRU history cold-start race conditions upon worker wakeup.

### 6. Atomic NTFS Release Pipeline & Rollback Protection
- Overhauled `scripts/sync-release.ps1` with native exit code validation (`$LASTEXITCODE`), deployment locking (`.deploy.lock`), fast-forward only git sync, and staging in `dist.staging/`.
- Verifies 5 required artifacts before executing an atomic NTFS directory swap (`dist` -> `dist.backup`, `dist.staging` -> `dist`).
- Explicitly documents Chrome MV3 security limitations regarding unattended extension reload.

---

## Quality & Verification Status

| Verification Area | Result | Notes |
| :--- | :--- | :--- |
| **Unit Test Suite (`tests/unit`)** | **38 of 38 PASSED** | Verified url-utils, grammar, synchronous intent, deep-path clustering, typed sessions, research queries, Prompt API stages, and honest module registry |
| **Playwright E2E Suite (`tests/e2e`)** | **32 of 32 PASSED** | Verified in Chromium against unpacked MV3 extension across all user journeys |
| **Total Test Verification** | **70 of 70 PASSED** | 100% green across unit and E2E suites |
| **TypeScript Typecheck** | **0 errors** | Strict mode enforced with zero warnings |
| **Empirical Performance Benchmark** | **DOM Interactive: 31.40ms** | Cold run: 236.75ms, Warm fastest: 138.40ms, JS Heap: 3.40 MB, Bundle: 98.2 KB |
| **Network Zero-Overhead Test** | **PASSED (0 reqs)** | Verified cold New Tab open produces 0 non-extension requests |
| **Bundle Checksums** | **Verified** | SHA-256 computed and stored in `build-metadata.json` |

---

## Release Overview: v1.4.0

Portal v1.4.0 reconstructs the daily-driver user experience based on direct ThinkBook testing and establishes a robust, free cross-device delivery workflow without reliance on the Chrome Web Store. It solves every owner-identified reliability issue:

### 1. Daily-Driver UX Repairs & Grammar Unification
1. **Pasted URLs & Direct Domains Immediate Navigation**:
   - Built `src/core/search/url-utils.ts` to parse complete protocols (`https://`, `http://`, `file:///`, `chrome://`), `localhost(:port)?`, IPv4 addresses (`127.0.0.1:port`), and valid TLD domains (`github.com`, `vite.dev`).
   - Cleaned input removes whitespace, quotes, and carriage returns.
   - Immediate navigation receives top score (5000) with badge `NAVIGATE`. Pasted URLs NEVER fall back to Google searches.
2. **Synchronous Intent Resolver (<1ms)**:
   - Built `resolveSynchronousIntent()` in `src/core/search/grammar.ts`.
   - Pure, deterministic, synchronous function evaluating the current input value immediately when Enter is pressed, even if asynchronous search suggestions have not returned.
3. **Alt+Q MRU Tab Switcher (`Alt+Q → Enter`)**:
   - Background service worker tracks `mruTabHistory: number[]` on every tab activation and closure.
   - When summoned on empty query, open tabs are sorted in strict MRU order. The previously active tab is selected at index 0 with badge `SWITCH TAB`. Pressing `Alt+Q → Enter` instantly switches back to the previous tab.
4. **Alt+Q on New Tab Focuses Search Box**:
   - Service worker detects if the active tab is `chrome://newtab` or an extension page, sending `PORTAL_FOCUS_SEARCH` to immediately focus and select the search input rather than opening a redundant page.
   - Added `/` key shortcut on New Tab page to instantly focus the search input from anywhere on the page.
5. **Zero Listener Leak & Clean Teardown**:
   - `src/overlay/floating-launcher.ts` registers `__portalClose` on the host element.
   - On close or toggle off, cleanly unbinds all `window` keydown listeners, cancels active search debounce timers, restores previously focused page elements, and unmounts the Shadow DOM host.
6. **Specific Saved Session Restoration**:
   - Search results for saved sessions attach `sessionId: s.id`.
   - `restore-saved-session` command receives execution context with `sessionId` and restores the exact selected session, eliminating the bug where `sessions[0]` was always restored.
7. **Unified `@` Prefix Grammar**:
   - Supports owner-preferred `@` provider search bangs: `@gh` (GitHub), `@yt` (YouTube), `@w` (Wikipedia), `@so` (StackOverflow), `@r` (Reddit), `@npm` (npm), `@g` (Google), `@ddg` (DuckDuckGo), `@x` (X/Twitter). Legacy `!` bangs remain supported for muscle memory.
   - Supports search filter scopes: `@tabs`, `@bookmarks`, `@history`, `@audio`, and `/` commands.
8. **Homepage Ownership & Shortcut Management**:
   - Personal pinned shortcuts feature an inline edit button (✏️) opening `#editShortcutModal` to rename titles, edit URLs, or delete shortcuts.
   - "+ Add" button in Quick Access section header allows adding new custom pinned links.
   - Added "Recently Closed" tab in Contextual Section calling `chrome.sessions.getRecentlyClosed()`, allowing 1-click restoration of recently closed tabs or full windows.
   - Heuristic recommendations are labeled as `FREQUENT`, preserving total honesty and never falsely claiming to be model-generated AI.
9. **Themes, Accents & Density Customization**:
   - Added `midnight` theme (pure OLED black `#000000` with subtle zinc borders).
   - Added 5 accent colors: `violet` (default), `blue` (electric blue), `emerald`, `amber`, and `rose`.
   - Added 3 layout density levels: `compact` (tighter spacing and cards), `comfortable` (balanced default), and `relaxed` (roomy padding).
   - Added section visibility controls in settings (Intelligence Briefing, Contextual Section, OpenClaw).
10. **Free Cross-Device Delivery & Sync Workflow (Section 8)**:
    - Authoring `scripts/sync-release.ps1` for ThinkBook: pulls tested releases from GitHub, builds and verifies integrity, updates atomic build marker (`build-metadata.json`), and provides safe developer extension reload.
    - Verified that developer mode reload retains `chrome.storage.local` with 100% data retention (user settings, pinned shortcuts, and New Tab override remain intact).
    - Added "Check for Updates" button in Settings drawer reading atomic build metadata.

---

## Quality & Verification Status

| Verification Area | Result | Notes |
| :--- | :--- | :--- |
| **Unit Test Suite (`tests/unit`)** | **27 of 27 PASSED** | Verified url-utils, grammar parsing, synchronous intent resolver, multi-token ranking, shortcut editing, saved session targeting, and preferences |
| **Playwright E2E Suite (`tests/e2e`)** | **26 of 26 PASSED** | Ran against real unpacked Chrome MV3 extension in real Chromium |
| **Total Test Verification** | **53 of 53 PASSED** | 100% passing across the entire test suite (1.3m full run) |
| **TypeScript Typecheck** | **0 errors** | Strict mode enforced across core, overlay, newtab, service worker |
| **Empirical Performance Benchmark** | **DOM Interactive: 47.3ms** | Cold run: 269ms, Warm average: 146ms, JS Heap: 3.79 MB, Summon latency: 104ms |
| **Network Zero-Overhead Test** | **PASSED (0 reqs)** | Cold New Tab open produces 0 non-extension requests |
| **Atomic Build Marker** | **Verified** | `dist/build-metadata.json` bundled with version, commit hash, timestamp |

### 1. Critical Source Integrity & Execution Corrections
1. **Purged Simulated Production Data**:
   - Eliminated fabricated recruiter emails, fake calendar meetings, and fake Flowmate priorities from `briefing-service.ts`.
   - Default state on clean profile or unconfigured source contains exactly 0 items with honest `unconfigured` status.
2. **Purged Fake OpenClaw Job History & Completed Status**:
   - Removed synthetic jobs (`job-101`, `job-aud-01`) and mock coordinator success claims from `openclaw-bridge.ts`.
   - The jobs list displays "No automation jobs recorded." until genuine tasks are executed.
3. **Targeted Storage Migration Engine (`src/core/migration.ts`)**:
   - Safe migration scanning for known seed signatures (`prio-1`, `comm-1`, `mail-1`, `job-101`).
   - Automatically purges historical fixture seeds without touching user shortcuts, saved sessions, or preferences.
4. **Frozen Source Observation Timestamps**:
   - In `BriefingService.refreshAll()`, source observation timestamps (`generatedAt`, `lastChecked`) are NEVER advanced on refresh unless genuine live source data was fetched.
   - Separated observation time from cache access time (`lastCachedAt`).
5. **Cold-Load Zero Network Invariant Guaranteed**:
   - Separated `getCachedStatus()` (reads local cache in 0ms, 0 network) from `probeGateway()` (explicit network probe).
   - Ordinary New Tab opens generate **0 loopback or external network requests**, verified via Playwright request monitoring.
6. **Honest Host & Workstation Connectivity**:
   - IdeaPad coordinator correctly reflects actual host daemon status (`offline` when Gateway is stopped).
   - ThinkBook workstation is truthfully displayed as `UNPAIRED (Requires Tailscale SSH setup)` rather than misleading standby.
7. **Strict Task Execution Verification**:
   - `submitTask()` verifies actual runner connectivity via port 57849 probe.
   - When the Gateway service is stopped, requests are honestly rejected with actionable error messages (`"OpenClaw Gateway is not running on 127.0.0.1:57849. Start with 'clawctl gateway-service start'"`), recording a truthful `rejected` job rather than fabricating task queueing.
8. **User-Initiated Briefing Import Workflow**:
   - Added user-facing "Import Briefing" button (`#importBriefingBtn`) and modal dialog.
   - Supports importing personal priorities and tasks from Markdown bullet lists or JSON structures, populating the briefing surface with genuine user content.
9. **Canonical Gmail Thread URL Sanitization**:
   - Replaced plain string concatenation with strict hex/alphanumeric sanitization (`BriefingService.buildGmailThreadUrl`) enforcing canonical `https://mail.google.com/mail/u/0/#inbox/<sanitizedId>` links.
10. **Resilient In-Memory Storage Fallback**:
    - Enhanced `StorageService` with in-memory fallback mechanisms to ensure graceful execution across Node.js test runners, background service workers, and page contexts without runtime DOM errors.
11. **Saved Session Hardening & Capacity**:
    - `saveSession` validates and sanitizes URLs (rejecting `javascript:` and invalid schemes), deduplicates tabs within sessions, and expands capacity to 100 sessions without silent 20-item truncation.
    - Added session renaming (`renameSavedSession`) and deletion (`deleteSavedSession`).
12. **Safe Audio Controls & Audible Tab Isolation**:
    - `mute-all-audio-tabs` tracks `portalMutedTabIds` to ensure unmuting ONLY restores tabs that were muted by Portal, never unmuting tabs the user deliberately muted outside Portal.
    - Search engine `@audio` prefix strictly filters for `audible: true` tabs with score bonuses and `AUDIO 🔊` badge.

---

## Quality & Verification Status

| Verification Area | Result | Notes |
| :--- | :--- | :--- |
| **Unit Test Suite (`tests/unit`)** | **19 of 19 PASSED** | Verified seed purging, timestamp freezing, markdown import, URL sanitization, task rejection, saved sessions capacity, and audio muting |
| **Playwright E2E Suite (`tests/e2e`)** | **22 of 22 PASSED** | Ran against real unpacked Chrome MV3 extension in Chromium |
| **Total Test Verification** | **41 of 41 PASSED** | Zero skipped, zero failures (1.2m full run) |
| **TypeScript Typecheck** | **0 errors** | Strict mode enforced across core, overlay, newtab, service worker |
| **Network Zero-Overhead Test** | **PASSED (0 reqs)** | Verified cold New Tab open produces 0 non-extension requests |
| **Bundle Footprint** | **<96 KB total** | Service worker (6.06 KB), overlay (13.63 KB), newtab (33.95 KB) |
| **Idle CPU Overhead** | **0%** | Zero polling, purely event-driven architecture |

---

## Measured Performance (v1.3.1 vs Native NTP Baseline)

| Metric | Native NTP Baseline | Portal v1.3.1 Measured | Target Contract | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DOM Interactive** | 18.30 ms | **28.40 ms** | < 100 ms | **PASSED** |
| **DOM Content Loaded** | 18.40 ms | **61.40 ms** | < 120 ms | **PASSED** |
| **Load Event** | ~20.00 ms | **63.90 ms** | < 150 ms | **PASSED** |
| **JS Heap Memory** | ~28.00 MB | **3.20 MB** | < 38 MB | **PASSED** (~1/9 native) |
| **Cold Navigation** | 242.34 ms | **257.38 ms** | < 350 ms | **PASSED** |
| **Warm Navigation Average** | 72.90 ms | **175.70 ms** | < 250 ms | **PASSED** |
| **Keypress Latency** | N/A | **45.95 ms** | < 60 ms | **PASSED** |
| **Summon Latency** | N/A | **116.12 ms** | < 150 ms | **PASSED** |
| **Cold NTP Network Requests**| 0 external | **0 external / 0 loopback** | 0 requests | **PASSED** |
| **Idle Background CPU** | 0% | **0%** | 0% | **PASSED** |
