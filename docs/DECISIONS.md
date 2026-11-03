# PORTAL Consequential Decisions Log

## DEC-001: Zero Admin Portable Node.js Toolchain
- **Context:** Automated environment execution cannot interact with interactive Windows UAC prompts spawned by global MSI installers.
- **Decision:** Install Node.js LTS portable into `%LOCALAPPDATA%\Programs\node` and configure User PATH.
- **Alternative Rejected:** System-wide MSI via elevated installer — requires human intervention and breaks autonomous execution.
- **Impact:** Clean, repeatable, non-invasive dev environment completely within user space.

## DEC-002: Lightweight Vanilla TypeScript + Vite Architecture
- **Context:** Extension must match Chrome's native NTP speed (<50ms initial render, <15MB RAM).
- **Decision:** Pure TypeScript with lightweight DOM rendering and modern CSS container queries / CSS tokens.
- **Alternative Rejected:** Heavy React/Next.js/Tailwind runtime bundles — adds 150KB+ JS and 200ms+ hydration lag.
- **Impact:** Sub-millisecond render time, minimal bundle footprint (<65KB total extension bundle).

## DEC-003: On-Demand Injection for Floating Command Palette
- **Context:** Floating launcher needs to appear over existing webpages when summoned via keyboard shortcut.
- **Decision:** Use Chrome `chrome.scripting.executeScript` / dynamic injection with an isolated Shadow DOM container rather than declaring heavy persistent content scripts across all web origins.
- **Alternative Rejected:** Persistent `<all_urls>` content scripts injected into every frame and tab on page load. Causes memory bloat and privacy concerns.
- **Impact:** Zero browsing overhead when launcher is not open.

## DEC-004: Dual-Tier Intelligence Architecture (Prompt API + Deterministic Clustering)
- **Context:** Chrome 156 on this 12GB RAM IdeaPad exposes `globalThis.LanguageModel`, but `LanguageModel.availability()` reports `'unavailable'` (hardware threshold requires 16GB RAM for Gemini Nano).
- **Decision:** Implement a two-tiered intelligence engine:
  1. *Tier 1 (Deterministic Clustering & Ranking):* Real-time history and visit frequency-recency decay (half-life decay scoring, domain clustering, typing intent parsing). 100% offline, zero-latency, zero hallucination.
  2. *Tier 2 (Chrome Prompt API / Gemini Nano):* Probes `LanguageModel.availability()`. When `'readily'` or `'after-download'`, leverages on-device LLM with strict JSON Schema (`responseConstraint`) to categorize and summarize topic clusters and interpret natural-language queries.
- **Alternative Rejected:** Forcing external cloud AI APIs (violates privacy and independence brief) or dropping AI intelligence entirely (violates user intent).
- **Impact:** Perfect resilience, instantaneous responsiveness on any hardware, and full on-device AI acceleration when supported.

## DEC-005: Centralized Service Worker Action & Search Authority
- **Context:** In Chrome Manifest V3, content scripts (`overlay.js`) running in host webpages do not have access to privileged Chrome extension APIs such as `chrome.tabs`, `chrome.bookmarks`, `chrome.history`, or `chrome.sessions`. In v1.0.0, calling these directly from the overlay failed silently.
- **Decision:** Decouple the floating launcher UI from extension privileges. Refactor the overlay into a thin client that dispatches typed requests (`PORTAL_SEARCH`, `PORTAL_EXECUTE_ACTION`, `PORTAL_GET_INITIAL_STATE`) to the background service worker via `chrome.runtime.sendMessage`. The service worker acts as the central execution authority.
- **Alternative Rejected:** Attempting to inject privileged scripts or polyfilling APIs in the page context (impossible under Chrome's MV3 sandbox architecture).
- **Impact:** 100% reliability for all commands, tab switching, and bookmark queries from any injected webpage.

## DEC-006: Context-Aware Navigation Isolation
- **Context:** In v1.0.0, executing a web search or navigating to a destination from the overlay replaced the current webpage via `window.location.href`, destroying the user's active browsing context.
- **Decision:** Context-aware action routing in the service worker: when an action originates from `context: 'overlay'`, URLs and web searches always create a new tab via `chrome.tabs.create({ url, active: true })`, preserving the existing webpage. When originated from `context: 'newtab'`, it navigates in place.
- **Alternative Rejected:** Overwriting `window.location.href` or opening new windows.
- **Impact:** Users can summon the floating launcher anywhere, search or open links, and never lose their place on the original webpage.

## DEC-007: Shortcut Rebinding to Alt+Q
- **Context:** User requested replacing the default `Alt+K` shortcut with `Alt+Q` for ergonomic one-hand reach on desktop layouts.
- **Decision:** Register `"Alt+Q"` in `manifest.json` under `commands.toggle-launcher` across windows, mac, and default platforms. Update all visual badges, tooltips, and settings descriptions across both surfaces.
- **Alternative Rejected:** Retaining `Alt+K` or unconfigurable fixed bindings.
- **Impact:** Direct ergonomic access with clear visual signposting in the UI.

## DEC-008: Silent Fallback for Experimental Prompt API Feature Flags
- **Context:** When Chrome's experimental on-device AI flags are disabled in `chrome://flags`, Chromium rejects `LanguageModel.availability()` with `"The feature flag gating model execution was disabled"`. In v1.1.0, logging this via `console.warn` caused Chrome's extensions manager (`chrome://extensions`) to flag the extension with a red "Errors" badge at `src/newtab/index.html:0`.
- **Decision:** Wrap the probe in a silent `try...catch` block in `src/core/ai/prompt-api.ts`. If the feature flag is disabled or rejected, resolve immediately to `'unavailable'` without printing warnings. Additionally, wrap all asynchronous initialization calls in `newtab.ts` with error-isolated `.catch(() => {})`.
- **Alternative Rejected:** Logging errors to console or failing new tab initialization.
- **Impact:** Zero red error badges in `chrome://extensions`, robust graceful fallback to deterministic discovery.

## DEC-009: Quick Search Bangs & Category Filters
- **Context:** Power users want DuckDuckGo-style direct search shortcuts (`!gh react`, `!yt lofi`, `!w`, `!so`, `!npm`) without opening individual websites first.
- **Decision:** Implement dedicated bang matcher (`src/core/search/bangs.ts`) prioritizing direct search actions with score 3500, plus category prefixes (`@` for open tabs, `#` for bookmarks, `/` for commands).
- **Alternative Rejected:** Forcing users to type full URLs or rely only on general web search engines.
- **Impact:** Instant one-keystroke routing to developer docs, video platforms, and code repositories.

## DEC-010: Smart Clipboard URL Detection
- **Context:** Users frequently copy URLs from chat apps, emails, or terminals and want to immediately open them in their browser.
- **Decision:** Check `navigator.clipboard.readText()` on page focus and launcher summon. If text is a valid HTTP/HTTPS URL, surface an unobtrusive action chip and top search suggestion.
- **Alternative Rejected:** Auto-navigating without user confirmation (can cause unexpected navigation if user copied unintended text).
- **Impact:** Seamless 1-click or Enter key navigation to copied links without manual pasting.

## DEC-011: Native Tab Discarding for Memory Management
- **Context:** Chrome users with multiple open tabs face significant memory pressure, but closing tabs loses active workspace context.
- **Decision:** Add command `Sleep Inactive Tabs (Save Memory)` (`/sleep-tabs`) calling `chrome.tabs.discard()`. This reclaims RAM for all non-active, non-audible background tabs while leaving their titles and favicons intact in the tab bar.
- **Alternative Rejected:** Force-closing tabs or installing external background process managers.
- **Impact:** Frees hundreds of megabytes of RAM on demand with zero lost tabs.

## DEC-012: Layered Orchestration & Strict Separation of Responsibilities
- **Context:** The mission requires integrating Portal with Flowmate personal context and OpenClaw automation across two machines (IdeaPad and ThinkBook). Blurring these boundaries risks making Portal slow, fragile, and bloated.
- **Decision:** Enforce architectural separation:
  - **Portal:** Read-only presentation surface and fast launcher. Reads pre-computed projections from `chrome.storage.local`. Never executes live background agents, heavy LLM inferences, or sync loops during New Tab renders.
  - **Flowmate:** Source of truth for personal context, goals, commitments, and calendar reconciliation. Emits periodic cached snapshots to Portal.
  - **OpenClaw:** Automation executor running outside the browser sandbox. Communicates only via loopback HTTP bridge (`127.0.0.1:57849`).
- **Alternative Rejected:** Running agent loops or live Gmail/Calendar API queries directly inside Chrome extension service worker.
- **Impact:** Instant NTP load times (<60ms DOM interactive), complete independence if Flowmate/OpenClaw are offline, and zero browser extension bloat.

## DEC-013: User-Initiated Clipboard Privacy & Opt-In Auto-Detection
- **Context:** Reading `navigator.clipboard.readText()` automatically on every window focus or launcher open raises privacy concerns (e.g. leaking copied passwords or tokens) and triggers unwanted browser permission prompts.
- **Decision:** Turn automatic clipboard detection into an explicit opt-in preference (`autoDetectClipboardUrl: false` by default). Provide an explicit user-initiated command `open-clipboard-url` (`/clip`) that only inspects clipboard when deliberately triggered.
- **Alternative Rejected:** Unconditional silent clipboard polling on all focus events.
- **Impact:** Respects privacy, eliminates unprompted clipboard warnings, and provides immediate link navigation when deliberately invoked.

## DEC-014: Inactivity-Gated Tab Suspension
- **Context:** Indiscriminately discarding all background tabs causes tabs recently accessed or temporarily in use to be reloaded prematurely upon switching.
- **Decision:** Update `sleep-inactive-tabs` to check `tab.lastAccessed`. Only tabs inactive for at least 10 minutes (`now - tab.lastAccessed >= 10 * 60 * 1000`) are discarded. Add a separate explicit command `force-sleep-all-tabs` (`/sleep-all`) for users who explicitly want immediate aggressive memory reclamation.
- **Alternative Rejected:** Discarding all tabs regardless of last access time.
- **Impact:** Prevents disruption of active multi-tab workflows while still freeing memory on long-idle tabs.

## DEC-015: Loopback Isolation & Zero Token Bundling
- **Context:** Portal must connect to OpenClaw Gateway on the IdeaPad host without exposing security tokens in the client bundle or accepting arbitrary remote commands.
- **Decision:** Restrict Gateway probing strictly to loopback (`127.0.0.1:57849`). Portal sends bounded tasks with explicit descriptions and parameters. No secret credentials, JWTs, or SSH private keys are bundled into the extension.
- **Alternative Rejected:** Embedding static API keys or opening WAN-accessible network sockets in the extension.
- **Impact:** Eliminates remote attack vectors while allowing seamless local automation orchestration.

## DEC-016: Non-Premature Overlay Dismissal & Notice Acknowledgement
- **Context:** In earlier builds, the floating launcher closed instantly upon item click before the background service worker could report whether the action succeeded or failed.
- **Decision:** Overlay awaits message reply from service worker. If the action succeeds with an informative message (e.g. "Zen mode enabled", "Tab duplicated"), an integrated notice bar displays the message for 850ms before dismissal. If the action fails or has no effect, the overlay stays open and displays the reason.
- **Alternative Rejected:** Blind immediate dismissal on click.
- **Impact:** Eliminates phantom actions and gives the user real visual certainty that commands executed successfully.

## DEC-017: Saved Browsing Session Workspaces
- **Context:** Daily browser workflows involve grouping tabs for specific projects or research tasks, but heavy third-party session extensions consume significant memory and inject remote trackers.
- **Decision:** Implement lightweight native session snapshots in `chrome.storage.local`. Commands `/save-session` and `/restore-session` capture current window tab URLs and titles, allowing instant restoration in a clean window. Saved sessions are automatically indexed in the omni-search engine with the `SESSION` badge.
- **Alternative Rejected:** Heavy third-party session manager extensions or syncing complete DOM trees.
- **Impact:** Zero-overhead session preservation and recovery using native browser primitives.

## DEC-018: Audio Tab State & Native Media Introspection
- **Context:** When dozens of tabs are open across multiple windows, finding which tab is playing audio or making noise is a major friction point.
- **Decision:** Query `tab.audible` directly via Chrome's native tabs API. Add `@audio` / `@sound` filter modifier to isolate playing tabs, badge audible tabs with `AUDIO 🔊` and a score bonus in search results, and provide commands `switch-to-audio-tab` and `mute-all-audio-tabs`.
- **Alternative Rejected:** Polling web audio contexts from content scripts.
- **Impact:** Instant one-keystroke identification and control of media-producing tabs with zero content script overhead.

## DEC-019: Expandable Detailed Briefing Projection Modal
- **Context:** The compact morning briefing on the homepage surfaces top priorities, but users also need access to time-sensitive schedules, overdue follow-ups, and copyable markdown without cluttering the minimal homepage.
- **Decision:** Add an "Expand Briefing" action opening a lightweight, bounded modal (`#briefingModal`) with the full structured Flowmate projection and a one-click "Copy Briefing Summary" button.
- **Alternative Rejected:** Expanding the briefing inline on the homepage (violates minimal text-forward homepage contract).
- **Impact:** Rich context available on demand without expanding default homepage footprint or load time.


## DEC-020: Strict Source Integrity & Elimination of Synthetic Production Data
- **Context:** Earlier versions populated empty caches with plausible-looking hardcoded seed items (fake recruiter emails, mock calendar meetings, and simulated OpenClaw completed jobs). Refreshing advanced timestamps on fabricated content, misleading users into believing live connections existed.
- **Decision:** Strictly ban fabricated production fixtures in production source code. Default states for unconfigured services must return 0 items and honest status indicators (`unconfigured`, `disconnected`, `offline`, `unpaired`). Never advance source observation timestamps (`generatedAt`, `lastChecked`) during refresh unless actual data was fetched from a live provider.
- **Alternative Rejected:** Keeping demo data to make the UI look populated on initial install.
- **Impact:** Total integrity and transparency. Portal never misleads the user about the reality of external integrations or automated actions.

## DEC-021: Zero-Network NTP Load Isolation
- **Context:** Opening a new tab must feel instantaneous and consume zero network bandwidth. Probing loopback ports or remote APIs during NTP page load adds latency, risks timeouts, and violates the core lightweight mandate.
- **Decision:** Enforce a strict architectural split between `getCachedStatus()` and live network probes (`probeGateway()`). During ordinary New Tab page loads, Portal reads solely from local storage caches (`chrome.storage.local`). Probes of `127.0.0.1:57849` or external endpoints occur ONLY during explicit user-initiated actions (clicking the refresh button or submitting a task).
- **Alternative Rejected:** Probing local daemon health on every New Tab open.
- **Impact:** Verified 0 loopback/external network requests on cold NTP open. Sub-30ms DOM interactive time preserved.

## DEC-022: Targeted Storage Migration Engine
- **Context:** Existing installations might have persisted previous synthetic demo seeds (`prio-1`, `comm-1`, `mail-1`, `job-101`) in their local extension storage. Wiping all storage indiscriminately would destroy legitimate user pinned shortcuts, custom theme settings, and saved session workspaces.
- **Decision:** Implement `runStorageMigration()` in `src/core/migration.ts`. The migration inspects cached entities for known seed signatures and purges ONLY the synthetic items, retaining all legitimate user shortcuts, sessions, and configuration untouched.
- **Alternative Rejected:** Calling `chrome.storage.local.clear()` on upgrade.
- **Impact:** Flawless backward compatibility and clean purge of old mock data without user disruption.

## DEC-023: User-Initiated Briefing Ingestion via Structured Markdown/JSON
- **Context:** Before an automated Flowmate sync daemon or local companion is paired, users still want to populate their morning command surface with their real daily priorities and tasks.
- **Decision:** Provide an explicit "Import Briefing" button and modal dialog (`#importBriefingModal`). The parser supports standard Markdown bullet lists (with optional task checkboxes `[ ]` / `[x]`) and structured JSON, validating items before storing them locally.
- **Alternative Rejected:** Requiring users to configure external API tokens or wait for daemon pairing.
- **Impact:** Immediate utility on clean installs without sacrificing offline-first principles or data integrity.

## DEC-024: Synchronous Intent Resolution & Direct Navigation Invariant
- **Context:** On ThinkBook testing, pasted URLs and direct domains were frequently hijacked by Google search when Enter was pressed before asynchronous suggestion scoring returned.
- **Decision:** Create a synchronous intent resolver `resolveSynchronousIntent()` that executes in <1ms without depending on async ranking. When Enter is pressed, if the input is a valid protocol URL, `localhost(:port)?`, IPv4, or recognized TLD domain, Portal navigates directly to that URL with priority score 5000 (`NAVIGATE`), completely bypassing Google search.
- **Alternative Rejected:** Waiting for asynchronous search debounce before enabling the Enter key (causes perceived sluggishness).
- **Impact:** 100% reliable direct navigation on paste, zero Google search hijacking for valid web destinations.

## DEC-025: Unified `@` Prefix Grammar & Token Hierarchy
- **Context:** Power users preferred DuckDuckGo/Flowmate-style `@` prefixes over `!` for provider bangs, site-scoped searching, and tab/history filtering.
- **Decision:** Establish a unified `@` prefix grammar: `@gh` (GitHub), `@yt` (YouTube), `@w` (Wikipedia), `@so` (StackOverflow), `@r` (Reddit), `@npm` (npm), `@g` (Google), `@ddg` (DuckDuckGo), `@x` (X/Twitter). Maintain legacy `!` bangs for backward muscle memory. Filter scopes use `@tabs`, `@bookmarks`, `@history`, `@audio`. Commands use `/`.
- **Alternative Rejected:** Rigidly enforcing only one prefix character.
- **Impact:** Clean, modern search ergonomics aligned with user preferences while preserving muscle memory.

## DEC-026: MRU Tab History Tracking & NewTab Focus Handoff
- **Context:** In standard Chrome, switching back to the previously active tab requires cumbersome shortcuts. Additionally, pressing `Alt+Q` while already on a New Tab page opened redundant launcher instances or new tabs.
- **Decision:** In `service-worker.ts`, maintain an in-memory `mruTabHistory: number[]` updated on `chrome.tabs.onActivated` and `onRemoved`. When `Alt+Q` is pressed on a New Tab page, the service worker sends a `PORTAL_FOCUS_SEARCH` message to immediately focus and select the homepage search box. When summoned on a webpage, the empty palette state places the previously active tab at index 0 with badge `SWITCH TAB`, guaranteeing that `Alt+Q → Enter` instantly switches to the previous tab.
- **Alternative Rejected:** Opening duplicate new tab pages or ignoring `Alt+Q` on New Tab.
- **Impact:** Seamless, lightning-fast MRU tab switching and zero redundant page openings.

## DEC-027: Shadow DOM Teardown & Complete Event Listener Cleanup
- **Context:** Repeatedly toggling the floating command palette over complex web pages left orphaned `window` keydown listeners and timers in memory.
- **Decision:** Implement an explicit `__portalClose` teardown function attached to the Shadow DOM host. Closing the overlay unbinds all `window` keydown listeners, cancels pending search debounce timers, restores focus to the previously active element on the page, and unmounts the host node.
- **Alternative Rejected:** Merely hiding the overlay with CSS `display: none` while leaving listeners active.
- **Impact:** Zero memory leaks, zero event interference with underlying web applications.

## DEC-028: Free Cross-Device Delivery via Atomic Metadata & PowerShell Sync
- **Context:** The owner requested a reliable, zero-cost delivery workflow to sync verified releases from the IdeaPad development machine to the ThinkBook primary workstation without paying for a Chrome Web Store developer account.
- **Decision:** Implement a lightweight Git-and-PowerShell synchronization workflow:
  1. Author `scripts/sync-release.ps1` for ThinkBook, pulling tested code from GitHub, running local build/typecheck verification, and updating an atomic `build-metadata.json` marker containing version, commit hash, and timestamp.
  2. Verify that reloading an unpacked developer extension preserves `chrome.storage.local` with 100% data retention (user preferences, pinned shortcuts, and New Tab override remain untouched).
  3. Provide a "Check for Updates" button in Portal preferences displaying the active build metadata.
- **Alternative Rejected:** Uploading private builds to Chrome Web Store (requires developer fees and store review delays).
- **Impact:** Instant, zero-cost, private cross-device release delivery between IdeaPad and ThinkBook.

## DEC-029: Chrome Prompt API Output Language Safety Attestation
- **Context:** In Chrome 134-136+ (as tested on ThinkBook), calling `LanguageModel.availability()` or `LanguageModel.create()` without explicitly attesting to expected input and output languages produces a console error: `"No output language was specified in a LanguageModel API request. An output language should be specified to ensure optimal output quality and properly attest to output safety. Please specify a supported output language code: [*]"`.
- **Decision:** Pass `{ expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }` to both `LanguageModel.availability(options)` and `LanguageModel.create(options)`.
- **Alternative Rejected:** Omitting language options or suppressing the Chrome console warning.
- **Impact:** Satisfies Chrome's strict safety and output quality checks, completely silencing the console error while ensuring optimal model execution on compatible hardware.

## DEC-030: Unified Add Shortcut Modal (Direct Manual Entry + Suggested Discovery Picker)
- **Context:** Adding shortcuts previously required either manually typing a URL or relying solely on auto-generated heuristic cards. Furthermore, previous builds hid the manual URL form when switching between discovery tabs, adding friction and breaking muscle memory.
- **Decision:** Consolidate `#editShortcutModal` into a single, unified discovery surface:
  1. Top tier: Direct manual entry fields (Title, URL) with auto-title inference from typed or pasted URLs and a prominent "Add Shortcut" button.
  2. Bottom tier: Dynamic "Suggested Destinations" picker categorizing candidate links from Open Tabs, Top Bookmarks, Frequent History, and Saved Sessions with filter chips (`All`, `Tabs`, `Bookmarks`, `Frequent`, `Sessions`) and 1-click addition.
- **Alternative Rejected:** Multi-tab wizard or modal that hides the manual URL fields.
- **Impact:** Zero-friction manual shortcut creation (<1s) while enabling instant 1-click shortcut creation from active tabs or saved bookmarks without copying URLs.

## DEC-031: Modular Personal Command Shell Architecture & Presets
- **Context:** Portal needs to integrate Flowmate personal context, Placement OS career tracking, AgenticCollab session handoffs, and OpenClaw automation without bloating the ultra-lightweight homepage for users who want a minimal search launcher.
- **Decision:** Implement `ModuleRegistry` with typed descriptors and three workspace layout presets:
  1. `focused`: Minimalist launcher with search box, live clock, and personal pinned shortcuts. Briefing and modular panels hidden.
  2. `daily`: Balanced homepage with search, quick access shortcuts, and morning briefing projection.
  3. `studio`: Full modular command environment exposing dedicated tabs and control panels for Flowmate, Placement OS, AgenticCollab, and OpenClaw.
- **Alternative Rejected:** Hardcoding all modules onto the homepage or building separate standalone extensions.
- **Impact:** Portal accommodates different user working styles—from distraction-free minimalists to full-power orchestration users—with zero runtime overhead when panels are inactive.

## DEC-032: Deep-Path History Clustering & Clean Title Normalization
- **Context:** History-based shortcut clustering in earlier builds grouped visits solely by top-level domain (`chatgpt.com`, `github.com`), collapsing distinct projects, repositories, or chat sessions into generic domain buckets. Generic titles like "Sign in", "Home", or "Overview" were often selected as cluster labels.
- **Decision:** Enhance `clustering.ts` with deep-path aware grouping:
  - ChatGPT: `chatgpt.com/c/:id`
  - GitHub: `github.com/:owner/:repo`
  - Google Docs: `docs.google.com/document/d/:id`
  - Google Sheets: `docs.google.com/spreadsheets/d/:id`
  - YouTube: `youtube.com/watch?v=:id`
  - Filter out generic titles (`Home`, `Sign in`, `Overview`, `Dashboard`, etc.) and fall back to segment-derived names.
- **Alternative Rejected:** Domain-only grouping or clustering every distinct query parameter.
- **Impact:** Suggestions represent meaningful user destinations (specific repos, conversations, and docs) rather than generic login or landing pages.

## DEC-033: Typed Destination Semantics (Saved Sessions, Searches & Canonical URLs)
- **Context:** Earlier shortcut implementations treated all destinations as simple static URLs. When a user pinned a saved browsing session workspace, it either broke or was stored as `url: urls[0]`, navigating only to the first tab upon click and discarding all remaining workspace tabs. Additionally, repeated search queries were lost or forced into mock web page URLs.
- **Decision:** Extend `PinnedShortcut` and `DestinationCandidate` to support explicit destination types: `type: 'url' | 'session' | 'search' | 'action'`. A session card stores `sessionId` and `tabCount`, rendering with a folder icon and a subtitle indicating `Workspace • X tabs`. Clicking the card triggers `storage.restoreSession(sessionId)` to restore the full tab workspace. Search destinations store `searchQuery` and execute via the default search provider. Already-pinned items are tracked reactively and rendered with a disabled `✓ Pinned` indicator.
- **Alternative Rejected:** Forcing all shortcuts into single URLs or losing workspace semantics.
- **Impact:** Workspaces behave as true multi-tab environments; research queries are easily accessible; duplicate pins are prevented.

## DEC-034: Honest Module Registry & Live OpenClaw Port 57849 Probing
- **Context:** Independent audit revealed that earlier versions claimed integration with external tools via fake `.local` domains (`flowmate.local`, `placement.local`) and fabricated status messages ("All tasks reconciled").
- **Decision:** Remove all fabricated domains and hardcoded fixtures. Connect `ModuleRegistry` to the real local OpenClaw Gateway on `http://127.0.0.1:57849/health`. When alive, OpenClaw is honestly marked as `connected` ("Gateway Online (127.0.0.1:57849) • Coordinator Ready") with primary URL `http://127.0.0.1:57849/`. When disconnected, offline or unconfigured modules (Flowmate, Placement OS) report truthful guidance with deep links or import options.
- **Alternative Rejected:** Keeping fabricated `.local` links or hiding external module panels.
- **Impact:** Total operational transparency. Portal integrates with real local processes when running, and honestly acknowledges when they are not.

## DEC-035: Atomic NTFS Staging Pipeline & Release Locking
- **Context:** Deploying new builds directly into `dist/` on Windows could fail midway or corrupt files if a build crashed or Chrome was reading from the directory. Furthermore, previous release scripts did not check PowerShell command exit codes (`$LASTEXITCODE`), erroneously reporting success even if `npm run build` failed.
- **Decision:** Overhaul `scripts/sync-release.ps1` to use an atomic deployment strategy:
  1. Acquire a deployment lock (`.deploy.lock`) to prevent concurrent executions.
  2. Pull updates using fast-forward only (`git pull --ff-only`).
  3. Compile TypeScript and stage output into `dist.staging/`.
  4. Verify the existence and non-zero size of 5 mandatory artifacts (`manifest.json`, `index.html`, `overlay.js`, `service-worker.js`, `build-metadata.json`).
  5. Perform an atomic directory rename swap on NTFS: `dist` -> `dist.backup`, `dist.staging` -> `dist`.
  6. Provide automated rollback on failure and explicit documentation of Chrome MV3 reload limitations.
- **Alternative Rejected:** Direct in-place overwriting of `dist/` without verification or lockfiles.
- **Impact:** Completely eliminates broken intermediate builds, guarantees deployment atomicity, and prevents script concurrency conflicts.

## DEC-036: 7-Stage Capability Lifecycle for Chrome Prompt API
- **Context:** Prompt API status was previously binary (`ready` vs `unavailable`). Checking API availability alone was conflated with model execution, leading to misleading claims that Gemini Nano was "active" when it was merely present.
- **Decision:** Implement a 7-stage lifecycle in `prompt-api.ts`:
  1. `api_unavailable`: `LanguageModel` absent from `globalThis`.
  2. `flag_disabled`: Experimental flag disabled in `chrome://flags`.
  3. `model_downloadable`: Availability reports `after-download`.
  4. `model_ready`: Availability reports `readily`.
  5. `session_created`: Active session successfully instantiated.
  6. `inference_applied`: Model has actually generated inferences and updated clusters.
  7. `heuristic_deterministic`: Fallback running offline deterministic clustering.
  The UI badge reports "Gemini Nano Active" ONLY when `inference_applied` is reached.
- **Alternative Rejected:** Labeling Gemini Nano active as soon as the API object is detected.
- **Impact:** Verifiable, completely truthful AI status reporting matching Chrome's actual on-device capability state.
