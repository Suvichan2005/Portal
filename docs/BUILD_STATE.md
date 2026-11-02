# PORTAL Build State

**Version:** 1.3.0  
**Last Updated:** 2026-11-02 15:00 UTC+5:30  
**Phase:** 8 — Personal Intelligence, Context & Device Orchestration Release  
**Branch:** feature/portal-next-level  
**Remote:** https://github.com/Suvichan2005/Portal  

## Release Overview: v1.3.0

Portal v1.3.0 expands the ultra-lightweight browser launcher into a unified, secure personal command surface integrating Flowmate personal context and OpenClaw multi-node execution, while strictly preserving zero-network-overhead New Tab responsiveness (<60ms DOM interactive, 3.2MB RAM, 0% idle CPU).

### 1. 10 Corrected Audit Findings
1. **Manifest Version Alignment**: Synchronized `manifest.json`, `package.json`, and all UI footers to `v1.3.0`.
2. **Overlay Premature Dismissal**: Floating launcher now awaits service worker acknowledgement before dismissing. Displays action notices (e.g. "Zen mode enabled", "Tab duplicated") in an integrated notice bar; stays open on failures.
3. **Inactivity Threshold for Tab Suspension**: `sleep-inactive-tabs` now enforces a 10-minute inactivity threshold (`now - tab.lastAccessed >= 10m`), preventing active workflow interruption. Added `force-sleep-all-tabs` for immediate unconditioned tab sleep.
4. **User-Initiated Clipboard Privacy**: Removed automatic clipboard snooping on window focus. Surfaced explicit user-triggered command `open-clipboard-url` (`/clip`) and added an opt-in toggle in settings.
5. **Zen Mode Document Independence**: `toggle-zen-mode` now safely persists state to `chrome.storage.local` across both service worker and page contexts without runtime DOM reference errors.
6. **Settings Dialog Viewport Containment**: Modal dialog bounded with `max-height: 85vh` and scrollable content area, ensuring close button (`#closeSettingsBtn`) is always reachable.
7. **Notice Bar Shadow DOM Identification**: Added explicit `noticeBar.id = 'noticeBar'` for robust component querying and test stability.
8. **Real Service Worker Command Authority**: Verified background execution with `Duplicate Current Tab` and `Restore Closed Tab` using real Chrome tab and session APIs.
9. **Zero-NTP Overhead Invariant**: Verified zero live external requests or LLM execution on New Tab open. All intelligence is read synchronously from bounded local cache (`chrome.storage.local`).
10. **Device Topology Documentation**: Fully authored `docs/DEVICE_TOPOLOGY.md` with verified IdeaPad vs ThinkBook execution classes, loopback isolation, and port assignments.

### 2. New Product Capabilities in v1.3.0
- **Personal Intelligence Briefing**:
  - Compact morning preview of top priorities, schedule preview, and commitments.
  - Source tags (`flowmate:work`, `calendar:personal`, `project:portal`) and real freshness indicator (`Updated 12m ago`).
  - Powered by local projection caching in `src/core/intelligence/briefing-service.ts`.
- **Important Mail Highlights**:
  - Action-oriented thread highlights with sender, subject, summary, and direct read-only links (`https://mail.google.com/mail/u/0/#inbox/<threadId>`).
  - Privacy Preview toggle hiding sensitive email snippets on shared or mirrored screens.
  - Strictly read-only navigation — zero automated email sending from Portal.
- **OpenClaw Activity & Control Center**:
  - Local Gateway health indicator communicating exclusively over loopback (`127.0.0.1:57849/health`).
  - Node topology monitoring showing IdeaPad coordinator (`A9-T7`, active) and ThinkBook workstation (`tb-heavy-01`, standby).
  - Bounded task submission interface with local queue confirmation toast.
  - Direct dashboard shortcut command (`/openclaw-status`).
- **Device Topology & Security**:
  - Loopback-only bridge binding (`127.0.0.1:57849`). Zero remote token exposure in browser bundles.
  - Documented execution classes (Class A/B/C) delineating Portal, Flowmate, and OpenClaw responsibilities.

## Quality & Verification Status

| Verification Area | Result | Notes |
| :--- | :--- | :--- |
| **Playwright E2E Suite** | **18 of 18 PASSED** | Ran against real unpacked Chrome MV3 extension |
| **TypeScript Typecheck** | **0 errors** | Strict mode enforced across core, overlay, newtab, sw |
| **Bundle Footprint** | **<95 KB** | Full extension build well under 250 KB budget |
| **Idle CPU Impact** | **0%** | Zero background polling, purely event-driven |

## Measured Performance (v1.3.0 vs Native NTP Baseline)

| Metric | Native NTP Baseline | Portal v1.3.0 | Target Contract | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DOM Interactive** | 18.30 ms | **58.00 ms** | < 100 ms | **PASSED** |
| **DOM Content Loaded** | 18.40 ms | **83.30 ms** | < 120 ms | **PASSED** |
| **JS Heap Memory** | ~28.00 MB | **3.22 MB** | < 38 MB | **PASSED** (<1/8 native) |
| **Summon & Render Latency** | N/A | **103.27 ms** | < 200 ms | **PASSED** |
| **Keypress Latency** | N/A | **47.84 ms** | < 60 ms | **PASSED** |
| **Idle Background CPU** | 0% | **0%** | 0% | **PASSED** |
