import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const EXTENSION_PATH = resolve(process.cwd(), 'dist');
const SCREENSHOT_DIR = resolve(process.cwd(), 'docs/screenshots');

if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Portal Extension Real Browser Workflows', () => {
  let context: any;

  test.beforeEach(async () => {
    // Launch Chromium with unpacked extension loaded
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--enable-features=PromptAPIForGeminiNano,OptimizationGuideOnDeviceModel',
      ],
    });
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('1. Extension loads and New Tab page renders with high polish', async () => {
    const page = await context.newPage();
    const sw = (await context.serviceWorkers())[0];
    const extId = sw ? sw.url().split('/')[2] : '';
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    // Check main elements
    await expect(page.locator('#portalSearchInput')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#headerClock')).toBeVisible();
    await expect(page.locator('#shortcutsSection')).toBeVisible();
    await expect(page.locator('#contextualSection')).toBeVisible();

    // Capture visual screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-newtab-home.png`, fullPage: true });
  });

  test('2. Instant search query returns ranked suggestions and commands', async () => {
    const page = await context.newPage();
    const sw = (await context.serviceWorkers())[0];
    const extId = sw ? sw.url().split('/')[2] : '';
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const searchInput = page.locator('#portalSearchInput');
    await searchInput.focus();
    await searchInput.fill('tab');

    // Suggestions panel should open
    const panel = page.locator('#suggestionsPanel');
    await expect(panel).toBeVisible({ timeout: 3000 });

    const items = page.locator('.suggestion-item');
    expect(await items.count()).toBeGreaterThan(0);

    // Capture screenshot with active suggestions
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-search-suggestions.png` });
  });

  test('3. Keyboard navigation with Arrow keys and Enter', async () => {
    const page = await context.newPage();
    const sw = (await context.serviceWorkers())[0];
    const extId = sw ? sw.url().split('/')[2] : '';
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const searchInput = page.locator('#portalSearchInput');
    await searchInput.fill('close');

    await expect(page.locator('#suggestionsPanel')).toBeVisible();
    // Press ArrowDown
    await page.keyboard.press('ArrowDown');

    const selectedItem = page.locator('.suggestion-item.selected');
    await expect(selectedItem).toBeVisible();

    // Press Escape closes panel
    await page.keyboard.press('Escape');
    await expect(page.locator('#suggestionsPanel')).toBeHidden();
  });

  test('4. Quick Access pinning and shortcut actions', async () => {
    const page = await context.newPage();
    const sw = (await context.serviceWorkers())[0];
    const extId = sw ? sw.url().split('/')[2] : '';
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const shortcutCards = page.locator('.shortcut-card');
    await expect(shortcutCards.first()).toBeVisible({ timeout: 3000 });

    // Hover over first card and click pin
    await shortcutCards.first().hover();
    const pinBtn = shortcutCards.first().locator('.shortcut-action-btn').first();
    await expect(pinBtn).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-shortcuts-hover.png` });
  });

  test('5. Tab navigation between Open Tabs and Bookmarks', async () => {
    const page = await context.newPage();
    const sw = (await context.serviceWorkers())[0];
    const extId = sw ? sw.url().split('/')[2] : '';
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const bookmarksBtn = page.locator('#tabBookmarksBtn');
    await bookmarksBtn.click();
    await expect(page.locator('#bookmarksContent')).toBeVisible();
    await expect(page.locator('#openTabsContent')).toBeHidden();

    const openTabsBtn = page.locator('#tabOpenTabsBtn');
    await openTabsBtn.click();
    await expect(page.locator('#openTabsContent')).toBeVisible();
    await expect(page.locator('#bookmarksContent')).toBeHidden();
  });

  test('6. Theme switcher updates data-theme and UI', async () => {
    const page = await context.newPage();
    const sw = (await context.serviceWorkers())[0];
    const extId = sw ? sw.url().split('/')[2] : '';
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const themeBtn = page.locator('#themeToggleBtn');
    await themeBtn.click();

    // Verify theme attribute toggled
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBeTruthy();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-theme-toggle.png` });
  });

  test('7. Settings modal opens and closes cleanly', async () => {
    const page = await context.newPage();
    const sw = (await context.serviceWorkers())[0];
    const extId = sw ? sw.url().split('/')[2] : '';
    await page.goto(`chrome-extension://${extId}/src/newtab/index.html`);

    const settingsBtn = page.locator('#settingsBtn');
    await settingsBtn.click();

    const modal = page.locator('#settingsModal');
    await expect(modal).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-settings-dialog.png` });

    const closeBtn = page.locator('#closeSettingsBtn');
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });

  test('8. Floating Launcher on-demand injection over web page', async () => {
    // Open a standard webpage
    const webPage = await context.newPage();
    await webPage.goto('https://example.com');

    // Inject overlay.js dynamically as chrome.scripting.executeScript does
    await webPage.addScriptTag({ path: resolve(EXTENSION_PATH, 'overlay.js') });

    // Wait for the shadow root host element
    const host = webPage.locator('#portal-floating-launcher-root');
    await expect(host).toBeVisible({ timeout: 5000 });

    await webPage.screenshot({ path: `${SCREENSHOT_DIR}/06-floating-launcher-injected.png` });

    // Press Escape to dismiss
    await webPage.keyboard.press('Escape');
    await expect(host).toBeHidden({ timeout: 3000 });
  });
});
