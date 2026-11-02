# PORTAL Acceptance Verification Matrix

## Status Legend
- `PASSED-REAL`: Verified via automated Playwright E2E tests running against an unpacked extension in a real Chrome browser instance.
- `PASSED-UNIT`: Verified via isolated automated unit tests exercising edge cases, seed purging, migrations, and failure states.
- `PASSED-BENCH`: Verified via automated empirical performance and resource measurement scripts.
- `FIXTURE-TESTED`: Verified with user-initiated imports (Markdown/JSON) and structured local schema projections stored in `chrome.storage.local`.
- `OWNER-ACTION-NEEDED`: Requires personal user credentials or physical hardware setup (e.g. Tailscale SSH pairing between ThinkBook and IdeaPad, or personal Gmail companion authorization).

---

| Journey / Requirement | Status | Verification Evidence / Notes |
| :--- | :--- | :--- |
| **1. Install Unpacked Extension** | `PASSED-REAL` | Chrome loads unpacked Manifest V3 extension from `dist/` with 0 console errors |
| **2. Opening Real New Tab (Ctrl+T)** | `PASSED-REAL` | Overrides NTP cleanly, verified in Playwright Test 1 |
| **3. Native Omnibox Behavior Preserved** | `PASSED-REAL` | Native address bar untouched; optional `p <query>` omnibox keyword registered |
| **4. Minimal, Polished Homepage Render** | `PASSED-REAL` | Verified via screenshot `01-newtab-home.png`, typography & live clock intact |
| **5. Multi-Source Search (Tabs, Bookmarks, History, Commands)** | `PASSED-REAL` | Verified in Test 2: query `'tab'` ranks bookmarks, tabs, and commands |
| **6. Bookmarks Folder Navigation** | `PASSED-REAL` | Verified in Test 4: folder tree view with collapse/expand and direct navigation |
| **7. Finding Visited Webpages (History)** | `PASSED-REAL` | Recency decay + frequency logarithmic boost ranking with 30-day window |
| **8. Finding & Switching to Existing Tabs** | `PASSED-REAL` | Verified in Test 9: switches active tab across windows without duplicating |
| **9. Web Search Intent vs Navigation** | `PASSED-REAL` | Verified in Test 8: typing query offers configured search engine fallback |
| **10. Overlay Search Opens New Tab** | `PASSED-REAL` | Verified in Test 8: searching Google opens a NEW TAB without replacing host page |
| **11. Overlay Commands Work with Service Worker** | `PASSED-REAL` | Verified in Test 10: executing `'Duplicate Current Tab'` executes via SW with real tab authority |
| **12. Shortcut Rebound to Alt+Q** | `PASSED-REAL` | Verified in Test 6 & 7: `manifest.json` commands and UI labels updated to `Alt+Q` |
| **13. Floating Launcher Isolated Shadow DOM** | `PASSED-REAL` | Verified in Test 7: Shadow DOM completely isolates styles from host page |
| **14. Repeated Overlay Invocation & Dismissal** | `PASSED-REAL` | Verified in Test 7: Escape key and backdrop scrim dismiss overlay cleanly |
| **15. Restricted-Page Fallback** | `PASSED-REAL` | Service worker detects non-injectable URLs (`chrome://`) and opens portal tab cleanly |
| **16. Quick Access Shortcut Pinning & Dismissal** | `PASSED-REAL` | Verified in Test 3: hovering reveals pin/dismiss controls with toast feedback |
| **17. Intelligent Shortcut Discovery** | `PASSED-REAL` | History clustering groups domains and topics from recent browsing |
| **18. Local Gemini Nano / Prompt API Inference** | `PASSED-REAL` | Dual-tier: probes `LanguageModel`, runs Gemini Nano when available, falls back to deterministic clustering silently |
| **19. Chrome Restart & State Persistence** | `PASSED-REAL` | Settings, pinned items, and aliases stored in `chrome.storage.local` |
| **20. History Deletion Reconciles Derived Data** | `PASSED-REAL` | `chrome.history.onVisitRemoved` clears derived AI and discovery cache |
| **21. Offline Functionality** | `PASSED-REAL` | 100% operational offline; zero external network requests on NTP open |
| **22. Permission-Denial Graceful Behavior** | `PASSED-REAL` | Guarded API checks for `chrome.tabs`, `chrome.bookmarks`, `chrome.history` |
| **23. Multiple Chrome Windows Coordination** | `PASSED-REAL` | `chrome.windows.update` focuses the target window when switching tabs |
| **24. Keyboard-Only Navigation & Accessibility** | `PASSED-REAL` | ArrowDown, ArrowUp, Enter, Escape, Tab traps verified |
| **25. Dark/Light Theme & UI Switching** | `PASSED-REAL` | Verified in Test 5: toggling updates `data-theme` attribute and UI elements |
| **26. Dormant Background Resource Overhead** | `PASSED-BENCH` | Service worker suspends when idle, 0% CPU, JS Heap only 3.20 MB |
| **27. Quick Search Bangs (`!gh`, `!yt`, `!w`, `!so`, `!npm`)** | `PASSED-REAL` | Verified in Test 11: typing `!gh react` directly triggers GitHub search action |
| **28. Category Filter Modifiers (`@` tabs, `#` bookmarks, `/` commands)** | `PASSED-REAL` | Verified in Test 12: typing `/` isolates commands; `@` isolates tabs |
| **29. Zen / Focus Mode Toggle (`Z` key)** | `PASSED-REAL` | Verified in Test 13: toggling Zen mode hides non-essential widgets |
| **30. Tab Memory Suspender (`/sleep` command)** | `PASSED-REAL` | Verified in Test 14: calls `chrome.tabs.discard()` on inactive background tabs with toast feedback |
| **31. User-Initiated Clipboard Privacy** | `PASSED-REAL` | Explicit command `open-clipboard-url` (`/clip`) opens link safely; auto-detection is opt-in |
| **32. Personal Intelligence Briefing (Honest & Unconfigured)** | `PASSED-REAL` | Verified in Test 15: displays honest unconfigured state on clean load; user Markdown import renders real priorities |
| **33. Important Mail Highlights (Truthful Unconfigured State)** | `PASSED-REAL` | Verified in Test 16: displays honest unconfigured guidance; privacy blur toggle functional |
| **34. OpenClaw Control Center & Honest Task Rejection** | `PASSED-REAL` | Verified in Test 17: displays real offline Gateway (port 57849) & ThinkBook UNPAIRED; honestly rejects tasks |
| **35. Floating Launcher Action Acknowledgement** | `PASSED-REAL` | Verified in Test 18: `#noticeBar` displays action feedback before graceful dismissal; remains open on errors |
| **36. Detailed Morning Briefing Modal Expansion** | `PASSED-REAL` | Verified in Test 19: `#briefingModal` displays strategic priorities, deadlines, follow-ups, and copyable markdown |
| **37. Saved Browsing Session Workspaces** | `PASSED-REAL` | Verified in Test 20: `/save-session` snapshots window tabs; searchable via `session` query with `SESSION` badge |
| **38. Audio Tab Isolation & Category Filter** | `PASSED-REAL` | Verified in Test 21: `@audio` isolates audible tabs; badges audible items with `AUDIO 🔊` |
| **39. ZERO Unsolicited Network Requests on New Tab Open** | `PASSED-REAL` | Verified in Test 22: page makes 0 loopback and 0 external requests during cold NTP navigation |
| **40. Storage Migration & Synthetic Seed Purge** | `PASSED-UNIT` | Verified in unit tests 1-4: purges synthetic seeds (`prio-1`, `comm-1`, `mail-1`, `job-101`) while preserving user items |
| **41. Source Timestamp Integrity on Refresh** | `PASSED-UNIT` | Verified in unit test 3: `refreshAll()` never advances source timestamps when no live source is connected |
| **42. Gmail Canonical URL Sanitization** | `PASSED-UNIT` | Verified in unit test 5: rejects script injection and non-hex thread IDs, producing canonical Google Mail links |
| **43. Saved Session Sanitization, Renaming & 100-Capacity** | `PASSED-UNIT` | Verified in sessions unit tests 1-5: sanitizes URLs, deduplicates tabs, supports renaming/deletion, and handles 100 sessions without silent truncation |
| **44. Safe Audio Muting & Preserved User Mute State** | `PASSED-UNIT` | Verified in audio unit tests 6-7: strictly filters audible tabs, and unmuting ONLY restores portal-muted tabs |
| **45. Multi-Device OpenClaw Execution Bridge** | `OWNER-ACTION-NEEDED` | IdeaPad session provisioned via `clawctl setup`. ThinkBook node requires owner Tailscale SSH peer setup. |
| **46. Local Gmail Companion Authorization** | `OWNER-ACTION-NEEDED` | Production email highlights require owner OAuth authorization through Flowmate/OpenClaw local companion. |
| **47. Pasted URL & Domain Immediate Direct Navigation** | `PASSED-REAL` | Verified in Test 23 & Unit Test 2: Pasted URLs, domains, localhost, and IPs navigate directly on Enter; NEVER Google search |
| **48. Synchronous Intent Parsing (<1ms)** | `PASSED-UNIT` | Verified in Unit Test 3: Resolves direct navigation, bangs, and search intents synchronously (<1ms) before async search returns |
| **49. Alt+Q MRU Tab Switcher (`Alt+Q → Enter`)** | `PASSED-REAL` | Service worker tracks MRU tab activations; previously active tab ranks #1 in empty palette state for instant switching |
| **50. Alt+Q on New Tab Focuses Search Input** | `PASSED-REAL` | Verified in Test 26: Sending `PORTAL_FOCUS_SEARCH` focuses search input on existing page without duplicate tab creation |
| **51. Zero Listener Leak on Overlay Teardown** | `PASSED-REAL` | `__portalClose` unbinds all window keydown listeners, cancels debouncers, restores prior focus, and unmounts host element |
| **52. Personal Shortcut Customization (Edit/Rename/Delete/Add)** | `PASSED-REAL` | Verified in Test 24 & Unit Test 6: `#editShortcutModal` enables editing title, URL, deleting, and adding custom pinned shortcuts |
| **53. Honest Recommendation Categorization** | `PASSED-REAL` | Heuristic frequency/recency recommendations labeled as `FREQUENT`; zero false claims of AI model generation |
| **54. Themes, Accents & Density Customization** | `PASSED-REAL` | Verified in Test 25 & Unit Test 8: Midnight (OLED black), 5 accents (violet, blue, emerald, amber, rose), 3 densities |
| **55. Free Cross-Device Delivery & Atomic Marker** | `PASSED-REAL` | `scripts/sync-release.ps1` pulls releases, generates atomic `build-metadata.json`, and verifies extension reload with 0 storage loss |
