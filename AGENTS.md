# PORTAL — Autonomous Project & Agent Directives

## Mission
Build and deliver a polished, genuinely useful personal Chrome homepage and browser launcher ("Portal") that substantially improves the experience of opening websites, finding previously visited information, managing tabs, accessing bookmarks, discovering useful shortcuts, and performing common browser actions.

## Core Mandates & Principles
1. **Speed & Lightweight Resource Contract**: The product must remain as close as reasonably achievable to Chrome's native New Tab experience in startup speed, resource consumption, and ordinary browsing overhead. No heavy frameworks, no bloated dependencies, no continuous background CPU drain.
2. **Keyboard-First & Omnibox Harmony**: Do NOT hijack, degrade, or compete with native Chrome omnibox behavior. Portal complements the omnibox and provides a lightning-fast floating command palette over web pages when summoned via shortcut.
3. **Real Browser Intelligence**: High-value local AI integration using Chrome's built-in Gemini Nano / Prompt API where available, paired with deterministic recency/frequency scoring. Real grounding in user history/bookmarks; zero fabricated links.
4. **Strict Local-First & Zero Telemetry**: Zero remote telemetry, zero external AI API costs, fully offline functional for all deterministic features, rebuildable caches, respectful of sensitive history.

## Environment & Tooling
- OS: Windows 11 Desktop (IdeaPad)
- Primary Browser: Google Chrome 156+ (`C:\Program Files\Google\Chrome\Application\chrome.exe`)
- Runtime: Node.js LTS, TypeScript, Vite / Rollup for lightweight Manifest V3 build
- Automation & Testing: Playwright for automated E2E tests, Cua Driver for Windows GUI/system testing, Chrome DevTools for performance profiling

## Durable Files & Documentation Structure
- `AGENTS.md`: Core mission, constraints, and architecture rules.
- `docs/BUILD_STATE.md`: Real-time implementation status, branch/commit, verified features, next steps.
- `docs/DECISIONS.md`: Consequential design and engineering choices, rejected alternatives, rationale.
- `docs/ACCEPTANCE.md`: Verification matrix across all 25+ real user journeys and edge cases.
- `docs/PERFORMANCE.md`: Native Chrome baseline vs. Portal measurements (startup, latency, memory, worker lifecycle).
- `README.md`: User-facing installation, architecture, and feature overview.
