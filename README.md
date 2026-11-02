# Portal ✦ Intelligent Chrome Homepage & Browser Launcher

> An intelligent, beautiful, ultra-lightweight Chrome homepage and floating command palette designed to elevate daily browsing without slowing down your browser.

![Portal New Tab](docs/screenshots/01-newtab-home.png)

## Core Capabilities

- **Ultra-Lightweight Homepage**: Replaces Chrome's New Tab with an instantaneous, minimal, typography-focused dashboard (<42ms DOM interactive, ~3.4MB JS heap).
- **Floating Command Palette**: Press `Alt+Q` on any webpage to instantly summon a floating launcher over the active tab for seamless tab switching, bookmark lookup, web search, and browser actions.
- **Context-Preserving Search & Navigation**: Searches and links triggered from the floating launcher automatically open in a **new tab**, never replacing or interrupting your current webpage.
- **Quick Search Bangs**: Instant DuckDuckGo-style bangs (`!gh` GitHub, `!yt` YouTube, `!w` Wikipedia, `!so` Stack Overflow, `!r` Reddit, `!npm` npm, `!m` Google Maps, `!g` Google, `!x` Twitter, `!ddg` DuckDuckGo) for direct routing.
- **Category Filter Modifiers**: Filter instantly with prefix keys:
  - `@` strictly isolates open tabs (`@github`, `@portal`)
  - `#` or `*` strictly isolates bookmarks (`#dev`, `*docs`)
  - `/` strictly isolates browser commands (`/sleep`, `/theme`)
- **Smart Clipboard URL Chip**: Automatically detects links copied in your clipboard on focus and surfaces a 1-click / Enter chip to navigate without pasting.
- **Tab Memory Suspender**: Built-in `/sleep` command calls native `chrome.tabs.discard()` on inactive background tabs, reclaiming system RAM while preserving open tabs.
- **Zen / Focus Mode**: Press `Z` or click the Zen button to toggle an ultra-minimalist view that hides non-essential widgets and presents a tranquil distraction-free dashboard.
- **Harmonious Omnibox**: Preserves native Chrome address bar behavior while offering an optional `p <query>` omnibox shortcut.
- **Dual-Tier Local Intelligence**:
  - **Tier 1 (Deterministic Clustering)**: Automatically discovers high-frequency destinations and recurring browsing clusters using frequency-recency half-life decay.
  - **Tier 2 (Chrome Prompt API / Gemini Nano)**: Integrates Chrome's on-device `LanguageModel` with structured JSON constraints when supported on the device.
- **Zero Telemetry & Strict Privacy**: 100% local-first. Zero external API calls, zero analytics, zero remote servers.
- **Smart Deduplication & Tab Switching**: Seamlessly switches to already open tabs across multiple windows instead of spawning duplicate tabs.
- **Interactive Bookmarks Tree**: Explore your bookmark hierarchy with expandable/collapsible folder navigation right from the homepage contextual panel.
- **Toast Feedback System**: Real-time ambient visual feedback confirming actions such as pinning shortcuts, toggling themes, or sleeping background tabs.

---

## Performance Against Native Chrome Baseline

Measured on a Lenovo IdeaPad (Windows 11 Pro, Chrome 156):

| Metric | Native Chrome NTP Baseline | Portal Target Budget | Portal Measured Result |
|---|---|---|---|
| **DOM Interactive** | 18.30 ms | < 100 ms | **41.70 ms** |
| **DOM Content Loaded** | 18.40 ms | < 120 ms | **95.60 ms** |
| **Active JS Heap** | ~28.00 MB | < 38.00 MB | **3.43 MB** |
| **Extension Bundle Size** | N/A | < 250 KB | **68.2 KB** (total dist) |
| **Summon Latency (Overlay)** | N/A | < 200 ms | **128.84 ms** |
| **Idle Service Worker CPU** | 0% | 0% | **0%** (Suspends cleanly) |

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

# Run automated Playwright E2E browser test suite (14 tests)
npm test
```

---

## Architecture & Verification
- [`docs/BUILD_STATE.md`](docs/BUILD_STATE.md) — Implementation status, audited fixes, and next-level features.
- [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) — Complete 31-item verification matrix across real browser workflows.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architectural decision log and trade-off rationale.
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) — Detailed latency, memory, and startup measurements.
