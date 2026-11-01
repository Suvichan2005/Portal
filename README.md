# Portal ✦ Intelligent Chrome Homepage & Browser Launcher

> An intelligent, beautiful, ultra-lightweight Chrome homepage and floating command palette designed to elevate daily browsing without slowing down your browser.

![Portal New Tab](docs/screenshots/01-newtab-home.png)

## Core Capabilities

- **Ultra-Lightweight Homepage**: Replaces Chrome's New Tab with an instantaneous, minimal, typography-focused dashboard (<45ms DOM interactive, ~3.3MB JS heap).
- **Floating Command Palette**: Press `Alt+Q` on any webpage to instantly summon a floating launcher over the active tab for seamless tab switching, bookmark lookup, web search, and browser actions.
- **Context-Preserving Search & Navigation**: Searches and links triggered from the floating launcher automatically open in a **new tab**, never replacing or interrupting your current webpage.
- **Harmonious Omnibox**: Preserves native Chrome address bar behavior while offering an optional `p <query>` omnibox shortcut.
- **Dual-Tier Local Intelligence**:
  - **Tier 1 (Deterministic Clustering)**: Automatically discovers high-frequency destinations and recurring browsing clusters using frequency-recency half-life decay.
  - **Tier 2 (Chrome Prompt API / Gemini Nano)**: Integrates Chrome's on-device `LanguageModel` with structured JSON constraints when supported on the device.
- **Zero Telemetry & Strict Privacy**: 100% local-first. Zero external API calls, zero analytics, zero remote servers.
- **Smart Deduplication & Tab Switching**: Seamlessly switches to already open tabs across multiple windows instead of spawning duplicate tabs.
- **Interactive Bookmarks Tree**: Explore your bookmark hierarchy with expandable/collapsible folder navigation right from the homepage contextual panel.
- **Built-in Power Commands**: One-click actions to close duplicate tabs across windows, restore recently closed tabs, toggle light/dark theme, and clear AI cache.
- **Toast Feedback System**: Real-time ambient visual feedback confirming actions such as pinning shortcuts, toggling themes, or restoring closed tabs.

---

## Performance Against Native Chrome Baseline

Measured on a Lenovo IdeaPad (Windows 11 Pro, Chrome 156):

| Metric | Native Chrome NTP Baseline | Portal Target Budget | Portal Measured Result |
|---|---|---|---|
| **DOM Interactive** | 18.30 ms | < 100 ms | **44.10 ms** |
| **DOM Content Loaded** | 18.40 ms | < 120 ms | **76.40 ms** |
| **Active JS Heap** | ~28.00 MB | < 38.00 MB | **3.27 MB** |
| **Extension Bundle Size** | N/A | < 250 KB | **62.8 KB** (total dist) |
| **Summon Latency (Overlay)** | N/A | < 200 ms | **143.92 ms** |
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

# Build production extension (dist/)
npm run build

# Run automated Playwright E2E browser test suite (10 tests)
npm test

# Run baseline & performance benchmarks
npx tsx tests/measure-portal-performance.ts
```

---

## Keyboard Shortcuts

- `Ctrl+T`: Open Portal Homepage (New Tab).
- `Alt+Q`: Toggle Floating Command Palette over any webpage.
- `↑ / ↓`: Navigate search suggestions and shortcuts.
- `Enter`: Select or execute destination / command.
- `Esc`: Dismiss search panel or floating overlay.
- `p <query> + Space`: Native Chrome Omnibox search via Portal.

---

## Architecture & Project Files

- `manifest.json`: Manifest V3 extension definition with `Alt+Q` command.
- `src/background/service-worker.ts`: Central action & search authority running privileged extension APIs.
- `src/core/search/`: Unified ranking algorithm and multi-source aggregator.
- `src/core/ai/`: History clusterer and Chrome Prompt API integration.
- `src/overlay/floating-launcher.ts`: Standalone Shadow DOM floating command palette communicating with the service worker.
- `src/newtab/`: Minimal homepage UI, styling, bookmark tree, and clock.
- `docs/ACCEPTANCE.md`: Verification matrix across all 26 user journeys.
- `docs/DECISIONS.md`: Consequential architecture decisions (DEC-001 through DEC-007).
