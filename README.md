# Portal ✦ Intelligent Chrome Homepage & Browser Launcher

> An intelligent, beautiful, ultra-lightweight Chrome homepage and floating command palette designed to elevate daily browsing, surface Flowmate personal context, and orchestrate OpenClaw automation without slowing down your browser.

![Portal New Tab](docs/screenshots/01-newtab-home.png)

## Core Capabilities in v1.3.0

- **Ultra-Lightweight Homepage**: Replaces Chrome's New Tab with an instantaneous, minimal, typography-focused dashboard (**45.4ms DOM interactive, 3.44MB JS heap**, 0% idle CPU).
- **Floating Command Palette (`Alt+Q`)**: Press `Alt+Q` on any webpage to instantly summon a floating launcher over the active tab for seamless tab switching, bookmark lookup, web search, and browser actions.
- **Context-Preserving Search & Navigation**: Searches and links triggered from the floating launcher automatically open in a **new tab**, never replacing or interrupting your current webpage.
- **Personal Intelligence Briefing**: Surfaces morning priorities, commitments, and schedule previews backed by local projections from Flowmate, tagged by source with real freshness indicators.
- **Expandable Detailed Briefing Modal**: Full breakdown of strategic priorities, time-sensitive deadlines, unresolved follow-ups, and one-click markdown summary copying.
- **Important Mail Highlights**: Clean, action-oriented thread highlights with read-only direct Gmail links (`https://mail.google.com/mail/u/0/#inbox/<threadId>`) and an instant **Privacy Preview toggle** to mask snippets when screen sharing.
- **OpenClaw Activity & Control Center**: Probes local OpenClaw Gateway on loopback (`127.0.0.1:57849`), displays coordinator (IdeaPad) and workstation (ThinkBook) node states, and provides bounded task submission with toast confirmation.
- **Saved Browsing Session Workspaces**: Snapshot all open tabs in your current window into a named recoverable session (`/save-session`); restore them in a new window with one click (`/restore-session` or search `session`).
- **Audio Tab Control & Filtering**: Type `@audio` (or `@sound`, `@music`) to isolate playing media tabs. Audio tabs display a prominent `AUDIO 🔊` badge and priority boost; control them via `/switch-to-audio-tab` or `/mute-all-audio-tabs`.
- **Quick Search Bangs**: Instant DuckDuckGo-style bangs (`!gh` GitHub, `!yt` YouTube, `!w` Wikipedia, `!so` Stack Overflow, `!r` Reddit, `!npm` npm, `!m` Google Maps, `!g` Google, `!x` Twitter, `!ddg` DuckDuckGo) for direct routing.
- **Category Filter Modifiers**: Filter instantly with prefix keys:
  - `@audio` strictly isolates playing/audible media tabs
  - `@` strictly isolates open tabs (`@github`, `@portal`)
  - `#` or `*` strictly isolates bookmarks (`#dev`, `*docs`)
  - `/` strictly isolates browser commands (`/sleep`, `/theme`, `/clip`, `/save-session`)
- **Safe Action Acknowledgement**: In-palette notice bar gives immediate visual acknowledgement when commands execute (e.g. "Zen mode enabled", "Tab duplicated") and remains open on errors so you are never left guessing.
- **User-Initiated Clipboard Privacy**: `/clip` command opens copied URLs safely on demand without intrusive background clipboard snooping.
- **Inactivity-Gated Tab Memory Suspender**: `/sleep` discards non-active background tabs older than 10 minutes via `chrome.tabs.discard()`; `/sleep-all` forces immediate memory reclamation.
- **Zen / Focus Mode (`Z`)**: Press `Z` or click the Zen button to toggle an ultra-minimalist view that hides non-essential widgets and presents a tranquil distraction-free dashboard.
- **Harmonious Omnibox**: Preserves native Chrome address bar behavior while offering an optional `p <query>` omnibox shortcut.
- **Dual-Tier Local Intelligence**:
  - **Tier 1 (Deterministic Clustering)**: Automatically discovers high-frequency destinations and recurring browsing clusters using frequency-recency half-life decay.
  - **Tier 2 (Chrome Prompt API / Gemini Nano)**: Integrates Chrome's on-device `LanguageModel` with structured JSON constraints when supported on the device.
- **Zero Telemetry & Strict Privacy**: 100% local-first. Zero external API calls, zero analytics, zero remote servers.
- **Interactive Bookmarks Tree**: Explore your bookmark hierarchy with expandable/collapsible folder navigation right from the homepage contextual panel.

---

## Performance Against Native Chrome Baseline

Measured on a Lenovo IdeaPad (Windows 11, Chrome 156):

| Metric | Native Chrome NTP Baseline | Portal Target Budget | Portal v1.3.0 Result | Status |
|---|---|---|---|---|
| **DOM Interactive** | 18.30 ms | < 100 ms | **45.40 ms** | **PASSED** |
| **DOM Content Loaded** | 18.40 ms | < 120 ms | **67.80 ms** | **PASSED** |
| **Warm Navigation Average** | ~72.90 ms | < 250 ms | **143.68 ms** | **PASSED** |
| **Active JS Heap** | ~28.00 MB | < 38.00 MB | **3.44 MB** | **EXCEEDED** (< 1/8 native) |
| **Keypress Autocomplete Latency** | < 16 ms | < 60 ms | **53.11 ms** | **PASSED** |
| **Extension Bundle Size** | N/A | < 250 KB | **94.8 KB** (total dist) | **EXCEEDED** |
| **Idle Service Worker CPU** | 0% | 0% | **0%** | **PASSED** (Suspends cleanly) |

See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) for full benchmark methodology.

---

## Installation & Setup

### Install Unpacked in Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `dist` folder located in this repository (`Portal/dist`).
5. Open a new tab (`Ctrl+T`) to immediately experience Portal, or press `Alt+Q` on any page!

### Development & Testing
```powershell
# Install dependencies
npm install

# Typecheck codebase
npm run typecheck

# Build production extension (dist/)
npm run build

# Run automated Playwright E2E browser test suite (21 tests)
npm test

# Run real browser performance benchmark
npm run benchmark
```

---

## Architecture & Verification
- [`docs/BUILD_STATE.md`](docs/BUILD_STATE.md) — Implementation status, audited fixes, and v1.3.0 capabilities.
- [`docs/DEVICE_TOPOLOGY.md`](docs/DEVICE_TOPOLOGY.md) — Multi-device orchestration topology, IdeaPad coordinator, ThinkBook worker node, security boundaries, and execution classes.
- [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) — Complete 39-item verification matrix across real browser workflows.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architectural decision log and trade-off rationale.
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) — Detailed latency, memory, and startup measurements.
