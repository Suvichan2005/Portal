import { chromium } from '@playwright/test';
import { resolve } from 'path';

const EXTENSION_PATH = resolve(process.cwd(), 'dist');

async function benchmarkPortal() {
  console.log('=== Benchmarking Portal Performance Against Native NTP Baseline ===');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });

  const sw = (await context.serviceWorkers())[0];
  const extId = sw ? sw.url().split('/')[2] : '';
  const portalUrl = `chrome-extension://${extId}/src/newtab/index.html`;

  const page = await context.newPage();

  // 1. Navigation Timings (5 runs: 1 cold, 4 warm)
  const navTimings: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded' });
    const elapsed = performance.now() - t0;
    navTimings.push(elapsed);
    console.log(`Portal NTP Navigation Run ${i + 1}: ${elapsed.toFixed(2)} ms`);
  }

  const perfMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;
    return {
      domInteractive: nav ? nav.domInteractive : 0,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
      loadEvent: nav ? nav.loadEventEnd : 0,
      jsHeapUsedMB: memory ? (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A',
    };
  });

  console.log('Navigation Timing metrics:', perfMetrics);

  // 2. Search typing responsiveness
  const searchInput = page.locator('#portalSearchInput');
  await searchInput.focus();

  const typingLatencies: number[] = [];
  const testQuery = 'github';
  for (const char of testQuery) {
    const t0 = performance.now();
    await searchInput.pressSequentially(char, { delay: 10 });
    const t1 = performance.now();
    typingLatencies.push(t1 - t0);
  }

  const avgTypingLatency = typingLatencies.reduce((a, b) => a + b, 0) / typingLatencies.length;
  console.log(`Average Keypress Response Latency: ${avgTypingLatency.toFixed(2)} ms`);

  // 3. Floating Launcher Injection Latency via Service Worker
  const webPage = await context.newPage();
  await webPage.goto('https://example.com');

  const targetUrl = webPage.url();
  const tInjectStart = performance.now();
  await sw.evaluate(async (url: string) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t: any) => t.url === url);
    if (!tab || !tab.id) throw new Error('Tab not found');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['overlay.js'],
    });
  }, targetUrl);

  await webPage.waitForSelector('#portal-floating-launcher-root', { state: 'visible' });
  const overlayLatency = performance.now() - tInjectStart;

  console.log(`Floating Launcher Summon & Render Latency: ${overlayLatency.toFixed(2)} ms`);

  await context.close();

  const coldRun = navTimings[0];
  const warmAvg = navTimings.slice(1).reduce((a, b) => a + b, 0) / 4;

  console.log('\n=== SUMMARY RESULTS ===');
  console.log(`Cold Run: ${coldRun.toFixed(2)} ms (Baseline: 242.34 ms)`);
  console.log(`Warm Average: ${warmAvg.toFixed(2)} ms (Baseline: 72.90 ms)`);
  console.log(`DOM Interactive: ${perfMetrics.domInteractive.toFixed(2)} ms (Baseline: 18.30 ms)`);
  console.log(`DOM Content Loaded: ${perfMetrics.domContentLoaded.toFixed(2)} ms (Baseline: 18.40 ms)`);
  console.log(`JS Heap Used: ${perfMetrics.jsHeapUsedMB} MB`);
  console.log(`Summon Latency: ${overlayLatency.toFixed(2)} ms`);
}

benchmarkPortal().catch(console.error);
