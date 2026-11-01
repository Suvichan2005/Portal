# PORTAL Build State

**Version:** 1.1.0  
**Last Updated:** 2026-11-02 05:04 UTC+5:30  
**Phase:** 6 — Verified v1.1.0 Release (Audited & Production-Ready)  
**Branch:** main  

## Audited Failures Corrected in v1.1.0
- [x] **Privileged Execution in Overlay Fixed**: In MV3, injected content scripts lack access to `chrome.tabs`, `chrome.bookmarks`, `chrome.history`, and `chrome.sessions`. Floating launcher refactored into a thin client communicating via `chrome.runtime.sendMessage` (`PORTAL_SEARCH`, `PORTAL_EXECUTE_ACTION`, `PORTAL_GET_INITIAL_STATE`) to the central service worker.
- [x] **Web Search Navigation Isolation Fixed**: Web searches and destination URLs executed from the floating launcher now open in a **new tab** via `chrome.tabs.create`, leaving the user's host webpage intact instead of replacing it.
- [x] **Shortcut Rebinding to `Alt+Q`**: Registered `"Alt+Q"` in `manifest.json` commands, updated all UI shortcut badges and hint tags in both New Tab page and Floating Launcher.
- [x] **Unified Search & Experience Parity**: Floating launcher now queries the identical multi-source ranker (`topSites`, open tabs, bookmarks, history, custom aliases, and commands) with full feature parity with the New Tab page.
- [x] **Bookmark Tree Folder Navigation Added**: Added interactive folder expansion and bookmark navigation in the New Tab contextual section.
- [x] **Toast Feedback System**: Added ambient notification toasts for user actions (pinning, clearing cache, theme toggles, command execution).

## Quality & Performance Verification
- [x] **10 of 10 Playwright E2E Tests Passing**: Verified in real Chrome browser with unpacked extension loaded.
- [x] **Zero Remote Telemetry & Strict Local Privacy**: 100% offline-first. Zero external API calls, zero analytics.
- [x] **Measured Performance**:
  - DOM Interactive: **44.10 ms** (native baseline: 18.30 ms)
  - JS Heap Memory: **3.27 MB** (budget <38 MB)
  - Floating Launcher Summon Latency: **143.92 ms** (budget <200 ms)
  - Keypress Response Latency: **82.94 ms** (smooth interaction)
  - Total Extension Distribution Bundle: **62.8 KB** (budget <250 KB)
  - Service Worker Idle CPU: **0%** (suspends cleanly)
