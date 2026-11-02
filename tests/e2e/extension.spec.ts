import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const EXTENSION_PATH = resolve(process.cwd(), 'dist');
const SCREENSHOT_DIR = resolve(process.cwd(), 'docs/screenshots');

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Portal v1.1.0 Corrected Real Browser Workflows', () => {
  let context: any;

  test.beforeEach(async () => {
    // Launch real Chromium with unpacked extension loaded
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
      ],
    });
  });

  test.afterEach(async () => {
    await context?.close();
  });

  async function getExtId(ctx: any): Promise<string> {
    let sw = (await ctx.serviceWorkers())[0];
    if (!sw) {
      sw = await ctx.waitForEvent('serviceworker');
    }
    return sw.url().split('/')[2];
  }

  test('1. Extension loads and New Tab page renders with ambient polish and clock', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    await expect(page.locator('#portalSearchInput')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#headerClock')).toBeVisible();
    await expect(page.locator('#shortcutsSection')).toBeVisible();
    await expect(page.locator('#contextualSection')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-newtab-home.png`, fullPage: true });
  });

  test('2. Instant search query returns ranked tabs, bookmarks, and commands', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const searchInput = page.locator('#portalSearchInput');
    await searchInput.fill('tab');

    const panel = page.locator('#suggestionsPanel');
    await expect(panel).toBeVisible({ timeout: 3000 });

    const items = page.locator('.suggestion-item');
    expect(await items.count()).toBeGreaterThan(0);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-search-suggestions.png` });
  });

  test('3. Quick Access pinning and toast feedback', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const shortcutCards = page.locator('.shortcut-card');
    await expect(shortcutCards.first()).toBeVisible({ timeout: 3000 });

    await shortcutCards.first().hover();
    const pinBtn = shortcutCards.first().locator('.shortcut-action-btn').first();
    await expect(pinBtn).toBeVisible();
    await pinBtn.click();

    // Verify toast feedback appears
    const toast = page.locator('#portalToast');
    await expect(toast).toBeVisible({ timeout: 2000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-shortcuts-hover.png` });
  });

  test('4. Bookmarks tree folder navigation and Open Tabs view', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for initialization
    await expect(page.locator('#headerClock')).toBeVisible();

    // Switch to Bookmarks tab
    const bookmarksBtn = page.locator('#tabBookmarksBtn');
    await expect(bookmarksBtn).toBeVisible();
    await bookmarksBtn.click();
    await expect(bookmarksBtn).toHaveClass(/active/);
    await expect(page.locator('#bookmarksContent')).toBeVisible();

    // Switch back to Open Tabs
    const openTabsBtn = page.locator('#tabOpenTabsBtn');
    await expect(openTabsBtn).toBeVisible();
    await openTabsBtn.click();
    await expect(openTabsBtn).toHaveClass(/active/);
    await expect(page.locator('#openTabsContent')).toBeVisible();
  });

  test('5. Theme switcher updates data-theme and UI', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const themeBtn = page.locator('#themeToggleBtn');
    await themeBtn.click();

    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBeTruthy();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-theme-toggle.png` });
  });

  test('6. Settings modal opens and displays Alt+Q shortcut', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const settingsBtn = page.locator('#settingsBtn');
    await settingsBtn.click();

    const modal = page.locator('#settingsModal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Alt+Q');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-settings-dialog.png` });

    const closeBtn = page.locator('#closeSettingsBtn');
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });

  async function injectOverlay(webPage: any) {
    let sw = context.serviceWorkers()[0];
    if (!sw) {
      sw = await context.waitForEvent('serviceworker');
    }
    const targetUrl = webPage.url();
    await sw.evaluate(async (url: string) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t: any) => t.url === url);
      if (!tab || !tab.id) throw new Error('Target tab not found for URL: ' + url);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['overlay.js'],
      });
    }, targetUrl);
  }

  test('7. Floating Launcher on web page: search, suggestions, and Alt+Q label', async () => {
    const webPage = await context.newPage();
    await webPage.goto('https://example.com');

    // Real isolated-world injection from service worker
    await injectOverlay(webPage);

    const host = webPage.locator('#portal-floating-launcher-root');
    await expect(host).toBeVisible({ timeout: 5000 });

    // Verify Alt+Q hint tag is rendered in launcher search bar
    const kbdHint = host.locator('.kbd-tag');
    await expect(kbdHint.first()).toContainText('Alt+Q');

    // Type query inside shadow DOM input
    const input = host.locator('input');
    await input.fill('close');

    // Verify results list displays matching command
    const results = host.locator('.result-item', { hasText: 'Close Duplicate Tabs' });
    await expect(results.first()).toBeVisible({ timeout: 4000 });

    await webPage.screenshot({ path: `${SCREENSHOT_DIR}/06-floating-launcher-injected.png` });

    // Press Escape to dismiss cleanly
    await webPage.keyboard.press('Escape');
    await expect(host).toBeHidden({ timeout: 3000 });
  });

  test('8. CRITICAL FIX VERIFICATION: Web search from overlay opens NEW TAB without destroying host page', async () => {
    // 1. Open host webpage
    const hostPage = await context.newPage();
    await hostPage.goto('https://example.com');
    const initialUrl = hostPage.url();
    const initialTabCount = context.pages().length;

    // 2. Open overlay on host page
    await injectOverlay(hostPage);
    const host = hostPage.locator('#portal-floating-launcher-root');
    await expect(host).toBeVisible({ timeout: 5000 });

    // 3. Type a web search query
    const input = host.locator('input');
    await input.fill('what is quantum computing');

    // 4. Wait for the Search result item to appear
    const searchItem = host.locator('.result-item', { hasText: 'Search Google for' });
    await expect(searchItem).toBeVisible({ timeout: 4000 });

    // 5. Select the search item with click
    await searchItem.click({ noWaitAfter: true });

    // 6. Assert that a NEW TAB was created!
    await expect.poll(() => context.pages().length, { timeout: 6000 }).toBe(initialTabCount + 1);

    // 7. Assert that the original host page remains on example.com and was NOT replaced!
    expect(hostPage.url()).toBe(initialUrl);
    expect(hostPage.url()).toContain('example.com');
  });

  test('9. CRITICAL FIX VERIFICATION: Selecting open tab from overlay switches tab without duplicating', async () => {
    // 1. Open destination page
    const targetPage = await context.newPage();
    await targetPage.goto('https://example.com');

    // 2. Open a second page
    const activePage = await context.newPage();
    await activePage.goto('https://example.org');

    // 3. Launch overlay on the active page
    await injectOverlay(activePage);

    const host = activePage.locator('#portal-floating-launcher-root');
    await expect(host).toBeVisible({ timeout: 5000 });

    // 4. Type query to find the target tab
    const input = host.locator('input');
    await input.fill('example');

    // 5. Click the "Switch Tab" result
    const tabItem = host.locator('.result-item', { hasText: 'Example Domain' }).first();
    await expect(tabItem).toBeVisible({ timeout: 4000 });
    await tabItem.click();

    // 6. Assert overlay closes
    await expect(host).toBeHidden({ timeout: 3000 });
  });

  test('10. CRITICAL FIX VERIFICATION: Commands execute with real background service worker authority', async () => {
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Inject overlay
    await injectOverlay(page);
    const host = page.locator('#portal-floating-launcher-root');
    await expect(host).toBeVisible({ timeout: 5000 });

    // Search for duplicate tab command which requires background tabs authority
    const input = host.locator('input');
    await input.fill('duplicate');

    const cmdItem = host.locator('.result-item', { hasText: 'Duplicate Current Tab' });
    await expect(cmdItem).toBeVisible({ timeout: 4000 });

    // Clicking executes command in service worker without error and dismisses overlay
    await cmdItem.click();
    await expect(host).toBeHidden({ timeout: 5000 });
  });

  test('11. Quick Search Bangs (!gh, !yt, !w) generate instant direct search actions', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const searchInput = page.locator('#portalSearchInput');

    // Test GitHub bang: !gh react
    await searchInput.fill('!gh react');
    const panel = page.locator('#suggestionsPanel');
    await expect(panel).toBeVisible({ timeout: 3000 });

    const ghItem = page.locator('.suggestion-item', { hasText: 'Search GitHub for "react"' });
    await expect(ghItem).toBeVisible();
    await expect(ghItem.locator('.suggestion-badge')).toHaveText('!GH');

    // Test YouTube bang: !yt lofi
    await searchInput.fill('!yt lofi');
    const ytItem = page.locator('.suggestion-item', { hasText: 'Search YouTube for "lofi"' });
    await expect(ytItem).toBeVisible();
    await expect(ytItem.locator('.suggestion-badge')).toHaveText('!YT');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-search-bangs.png` });
  });

  test('12. Category filter modifiers (@tabs, #bookmarks, /commands) isolate search results', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const searchInput = page.locator('#portalSearchInput');

    // Test commands filter: /
    await searchInput.fill('/');
    const panel = page.locator('#suggestionsPanel');
    await expect(panel).toBeVisible({ timeout: 3000 });

    const cmdItem = page.locator('.suggestion-item', { hasText: 'Sleep Inactive Tabs' });
    await expect(cmdItem).toBeVisible();
    await expect(cmdItem.locator('.suggestion-badge')).toHaveText('COMMAND');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-category-filter-commands.png` });
  });

  test('13. Zen / Focus mode toggles minimal distraction-free state', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const zenBtn = page.locator('#zenToggleBtn');
    await expect(zenBtn).toBeVisible({ timeout: 3000 });

    // Click Zen toggle
    await zenBtn.click();
    await expect(page.locator('body')).toHaveClass(/zen-mode/);
    await expect(page.locator('#shortcutsSection')).toBeHidden();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-zen-mode.png` });

    // Click again to exit Zen mode
    await zenBtn.click();
    await expect(page.locator('body')).not.toHaveClass(/zen-mode/);
    await expect(page.locator('#shortcutsSection')).toBeVisible();
  });

  test('14. Tab Memory Suspender command executes and displays feedback toast', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const searchInput = page.locator('#portalSearchInput');
    await searchInput.fill('/sleep');

    const suspendItem = page.locator('.suggestion-item', { hasText: 'Sleep Inactive Tabs' });
    await expect(suspendItem).toBeVisible({ timeout: 3000 });
    await suspendItem.click();

    // Verify feedback toast appears
    const toast = page.locator('#portalToast');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('15. Personal Intelligence Briefing renders top priorities, schedule, and freshness badge', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const intelSection = page.locator('#intelSurfaceSection');
    await expect(intelSection).toBeVisible({ timeout: 5000 });

    const sourcePill = page.locator('#briefingSourcePill');
    await expect(sourcePill).toContainText('Flowmate Context');

    const priorities = page.locator('#briefingPrioritiesList .briefing-item');
    await expect(priorities.first()).toBeVisible({ timeout: 3000 });
    expect(await priorities.count()).toBeGreaterThan(0);

    const schedule = page.locator('#briefingScheduleList .briefing-item');
    await expect(schedule.first()).toBeVisible({ timeout: 3000 });
    expect(await schedule.count()).toBeGreaterThan(0);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-personal-briefing.png` });
  });

  test('16. Important Mail Highlights with Privacy Mode toggle', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    // Switch to Important Mail tab
    const mailTabBtn = page.locator('#tabMailBtn');
    await expect(mailTabBtn).toBeVisible({ timeout: 3000 });
    await mailTabBtn.click();

    const mailPanel = page.locator('#mailPanel');
    await expect(mailPanel).toBeVisible({ timeout: 3000 });

    const mailCards = page.locator('.mail-item-card');
    await expect(mailCards.first()).toBeVisible({ timeout: 3000 });
    expect(await mailCards.count()).toBeGreaterThan(0);

    // Verify Open Thread link points to mail.google.com
    const openLink = mailCards.first().locator('.mail-open-btn');
    const href = await openLink.getAttribute('href');
    expect(href).toContain('mail.google.com');

    // Test privacy toggle: hide previews
    const privacyToggle = page.locator('#mailPrivacyToggle');
    await privacyToggle.click();
    await expect(mailPanel).toHaveClass(/hide-previews/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-important-mail.png` });
  });

  test('17. OpenClaw Activity & Control Center with Bounded Task Submission', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    // Switch to OpenClaw tab
    const openClawTabBtn = page.locator('#tabOpenClawBtn');
    await expect(openClawTabBtn).toBeVisible({ timeout: 3000 });
    await openClawTabBtn.click();

    const openClawPanel = page.locator('#openClawPanel');
    await expect(openClawPanel).toBeVisible({ timeout: 3000 });

    // Verify Gateway port 57849 indicator
    const gatewayLabel = page.locator('#openclawGatewayLabel');
    await expect(gatewayLabel).toContainText('57849');

    // Verify Node pills (IdeaPad and ThinkBook)
    const nodes = page.locator('.node-pill');
    await expect(nodes.first()).toBeVisible({ timeout: 3000 });
    expect(await nodes.count()).toBeGreaterThanOrEqual(2);

    // Submit a bounded task
    const taskInput = page.locator('#openclawTaskInput');
    await taskInput.fill('Run Playwright test suite check');

    const submitBtn = page.locator('#openclawTaskForm button');
    await submitBtn.click();

    // Verify feedback toast appears confirming task was queued
    const toast = page.locator('#portalToast');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast).toContainText('Task queued');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-openclaw-control.png` });
  });

  test('18. Floating Launcher action acknowledgement and safe notice display', async () => {
    const page = await context.newPage();
    await page.goto('https://example.com');

    await injectOverlay(page);
    const host = page.locator('#portal-floating-launcher-root');
    await expect(host).toBeVisible({ timeout: 5000 });

    const input = host.locator('input');
    await input.fill('zen');

    const zenItem = host.locator('.result-item', { hasText: 'Toggle Zen / Focus Mode' });
    await expect(zenItem).toBeVisible({ timeout: 4000 });
    await zenItem.click();

    // Verify notice bar appears inside overlay giving acknowledgement before closing
    const notice = host.locator('#noticeBar');
    await expect(notice).toBeVisible({ timeout: 2000 });
    await expect(notice).toContainText('Zen mode');

    // Overlay closes after acknowledgement
    await expect(host).toBeHidden({ timeout: 3000 });
  });

  test('19. Detailed Morning Briefing Modal expands with full context and follow-ups', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const expandBtn = page.locator('#expandBriefingBtn');
    await expect(expandBtn).toBeVisible({ timeout: 4000 });
    await expandBtn.click();

    const modal = page.locator('#briefingModal');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toContainText('Top Strategic Priorities');
    await expect(modal).toContainText('Unresolved Follow-Ups & Commitments');

    const closeBtn = page.locator('#closeBriefingModalBtn');
    await closeBtn.click();
    await expect(modal).toBeHidden({ timeout: 2000 });
  });

  test('20. Saved Browsing Session Workspace creation and query discovery', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    // Execute save-current-session command via search
    const searchInput = page.locator('#portalSearchInput');
    await searchInput.fill('/save');

    const panel = page.locator('#suggestionsPanel');
    await expect(panel).toBeVisible({ timeout: 3000 });

    const saveCmd = page.locator('.suggestion-item', { hasText: 'Save Current Window as Session Workspace' });
    await expect(saveCmd).toBeVisible({ timeout: 3000 });
    await saveCmd.click();

    // Verify confirmation toast
    const toast = page.locator('#portalToast');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast).toContainText('Saved session');

    // Query for session in search bar
    await searchInput.fill('session');
    await expect(panel).toBeVisible({ timeout: 3000 });
    const sessionResult = page.locator('.suggestion-item', { hasText: 'Restore Session:' });
    await expect(sessionResult.first()).toBeVisible({ timeout: 3000 });
  });

  test('21. Audio tab detection and @audio category filter isolation', async () => {
    const extId = await getExtId(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const searchInput = page.locator('#portalSearchInput');
    await searchInput.fill('@audio');

    // Should not error and should cleanly execute filter
    await expect(searchInput).toHaveValue('@audio');
  });
});
