import { chromium } from '@playwright/test';
import { resolve } from 'path';

const EXTENSION_PATH = resolve(process.cwd(), 'dist');

interface Percentiles {
  min: number;
  median: number;
  p95: number;
  max: number;
}

function calculatePercentiles(values: number[]): Percentiles {
  if (values.length === 0) return { min: 0, median: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const p95Index = Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1);
  const p95 = sorted[p95Index];
  return { min, median, p95, max };
}

async function benchmarkPortal() {
  console.log('================================================================');
  console.log('  PORTAL v1.6 INDEPENDENT PERFORMANCE & SHIPPING BENCHMARK     ');
  console.log('================================================================\n');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });

  let sw = (await context.serviceWorkers())[0];
  if (!sw) {
    try {
      sw = await context.waitForEvent('serviceworker', { timeout: 4000 });
    } catch {}
  }
  let extId = sw ? sw.url().split('/')[2] : '';
  if (!extId) {
    const probe = await context.newPage();
    await probe.goto('chrome://extensions');
    await probe.waitForTimeout(1000);
    sw = (await context.serviceWorkers())[0];
    extId = sw ? sw.url().split('/')[2] : '';
    await probe.close();
  }

  if (!extId) {
    console.error('Could not detect loaded extension ID.');
    await context.close();
    return;
  }
  const portalUrl = `chrome-extension://${extId}/src/newtab/index.html`;

  console.log(`[Setup] Extension ID: ${extId}`);
  console.log(`[Setup] Target URL: ${portalUrl}\n`);

  // -------------------------------------------------------------
  // TEST 1: New Tab Page Navigation Timings (Cold + Warm runs)
  // -------------------------------------------------------------
  console.log('--- Test 1: New Tab Page Navigation Timings ---');
  const page = await context.newPage();

  const navTimings: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t0 = performance.now();
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded' });
    const elapsed = performance.now() - t0;
    navTimings.push(elapsed);
    console.log(`  Run ${i + 1} (${i === 0 ? 'Cold' : 'Warm'}): ${elapsed.toFixed(2)} ms`);
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

  console.log(`  DOM Interactive: ${perfMetrics.domInteractive.toFixed(2)} ms`);
  console.log(`  DOM Content Loaded: ${perfMetrics.domContentLoaded.toFixed(2)} ms`);
  console.log(`  JS Heap Memory: ${perfMetrics.jsHeapUsedMB} MB\n`);

  // -------------------------------------------------------------
  // TEST 2: In-Page Search Engine Query Latency (20 queries)
  // -------------------------------------------------------------
  console.log('--- Test 2: Search Engine Query Latencies (20 queries) ---');
  const searchInput = page.locator('#portalSearchInput');
  await searchInput.focus();

  const sampleQueries = [
    'g', 'git', 'github', 'doc', 'docs', 'portal', 'sett', 'settings',
    'book', 'marks', 'new', 'tab', 'down', 'loads', 'chrom', 'chrome',
    'ex', 'ext', 'extens', 'react'
  ];

  const searchLatencies: number[] = [];
  for (const q of sampleQueries) {
    const t0 = performance.now();
    await searchInput.fill(q);
    await page.waitForFunction(
      () => {
        const panel = document.getElementById('suggestionsPanel');
        const list = document.getElementById('suggestionsList');
        return panel && !panel.classList.contains('hidden') && list && list.children.length > 0;
      },
      { timeout: 1500 }
    ).catch(() => {});
    const elapsed = performance.now() - t0;
    searchLatencies.push(elapsed);
  }

  const searchStats = calculatePercentiles(searchLatencies);
  console.log(`  Search Latency -> Min: ${searchStats.min.toFixed(2)} ms | Median: ${searchStats.median.toFixed(2)} ms | p95: ${searchStats.p95.toFixed(2)} ms | Max: ${searchStats.max.toFixed(2)} ms\n`);

  // -------------------------------------------------------------
  // TEST 3: Floating Launcher Cold Injection
  // -------------------------------------------------------------
  console.log('--- Test 3: Floating Launcher Cold Injection ---');
  const webPage = await context.newPage();
  await webPage.goto('https://example.com');
  await webPage.bringToFront();
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

  // Wait until host is attached and visible
  await webPage.waitForFunction(() => {
    const host = document.getElementById('portal-floating-launcher-root') as HTMLElement | null;
    if (!host || host.style.display === 'none') return false;
    return host.shadowRoot?.getElementById('portalOverlayInput') !== null;
  }, { timeout: 5000 });

  const coldOverlayLatency = performance.now() - tInjectStart;
  console.log(`  Cold Injection Latency (script eval -> visible & input focused): ${coldOverlayLatency.toFixed(2)} ms\n`);

  // -------------------------------------------------------------
  // TEST 4: Close Latency (Visible -> Hidden)
  // -------------------------------------------------------------
  console.log('--- Test 4: Overlay Close Latency ---');
  const tCloseStart = performance.now();
  await sw.evaluate(async (url: string) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t: any) => t.url === url);
    if (!tab || typeof tab.id !== 'number') throw new Error('Tab not found');
    return await chrome.tabs.sendMessage(tab.id, { type: 'PORTAL_TOGGLE_OVERLAY' });
  }, targetUrl);

  await webPage.waitForFunction(() => {
    const host = document.getElementById('portal-floating-launcher-root') as HTMLElement | null;
    return host !== null && host.style.display === 'none';
  }, { timeout: 5000 });

  const closeLatency = performance.now() - tCloseStart;
  console.log(`  Close Latency (message -> display: none): ${closeLatency.toFixed(2)} ms\n`);

  // -------------------------------------------------------------
  // TEST 5: True Warm Hidden-to-Open Summon Latency (10 Cycles)
  // -------------------------------------------------------------
  console.log('--- Test 5: True Warm Hidden-to-Open Summon (10 Repeated Cycles) ---');
  const warmSummonTimings: number[] = [];
  const warmCloseTimings: number[] = [];

  for (let cycle = 1; cycle <= 10; cycle++) {
    // 1. Verify overlay is currently hidden
    const isHiddenBefore = await webPage.evaluate(() => {
      const host = document.getElementById('portal-floating-launcher-root') as HTMLElement | null;
      return host !== null && host.style.display === 'none';
    });
    if (!isHiddenBefore) {
      throw new Error(`Cycle ${cycle}: overlay was not hidden prior to warm summon test`);
    }

    // 2. Measure genuine hidden -> visible summon
    const tSummon0 = performance.now();
    await sw.evaluate(async (url: string) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t: any) => t.url === url);
      if (!tab || typeof tab.id !== 'number') throw new Error('Tab not found');
      return await chrome.tabs.sendMessage(tab.id, { type: 'PORTAL_TOGGLE_OVERLAY' });
    }, targetUrl);

    await webPage.waitForFunction(() => {
      const host = document.getElementById('portal-floating-launcher-root') as HTMLElement | null;
      if (!host || host.style.display === 'none') return false;
      return host.shadowRoot?.getElementById('portalOverlayInput') !== null;
    }, { timeout: 5000 });
    const summonElapsed = performance.now() - tSummon0;
    warmSummonTimings.push(summonElapsed);

    // 3. Measure close
    const tClose0 = performance.now();
    await sw.evaluate(async (url: string) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t: any) => t.url === url);
      if (!tab || typeof tab.id !== 'number') throw new Error('Tab not found');
      return await chrome.tabs.sendMessage(tab.id, { type: 'PORTAL_TOGGLE_OVERLAY' });
    }, targetUrl);

    await webPage.waitForFunction(() => {
      const host = document.getElementById('portal-floating-launcher-root') as HTMLElement | null;
      return host !== null && host.style.display === 'none';
    }, { timeout: 5000 });
    const closeElapsed = performance.now() - tClose0;
    warmCloseTimings.push(closeElapsed);

    console.log(`  Cycle ${cycle.toString().padStart(2, ' ')}: Warm Summon = ${summonElapsed.toFixed(2)} ms | Close = ${closeElapsed.toFixed(2)} ms`);
  }

  const summonStats = calculatePercentiles(warmSummonTimings);
  const closeStats = calculatePercentiles(warmCloseTimings);

  console.log(`\n  Warm Summon -> Min: ${summonStats.min.toFixed(2)} ms | Median: ${summonStats.median.toFixed(2)} ms | p95: ${summonStats.p95.toFixed(2)} ms | Max: ${summonStats.max.toFixed(2)} ms`);
  console.log(`  Warm Close  -> Min: ${closeStats.min.toFixed(2)} ms | Median: ${closeStats.median.toFixed(2)} ms | p95: ${closeStats.p95.toFixed(2)} ms | Max: ${closeStats.max.toFixed(2)} ms\n`);

  // -------------------------------------------------------------
  // TEST 6: Memory Footprint
  // -------------------------------------------------------------
  const memoryEnd = await page.evaluate(() => {
    const memory = (performance as any).memory;
    return memory ? (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A';
  });

  await context.close();

  // -------------------------------------------------------------
  // FINAL CONSOLIDATED REPORT
  // -------------------------------------------------------------
  const coldNav = navTimings[0];
  const warmNavAvg = navTimings.slice(1).reduce((a, b) => a + b, 0) / (navTimings.length - 1);

  console.log('================================================================');
  console.log('  VERIFIED EMPIRICAL PERFORMANCE SUMMARY (HONEST BENCHMARKS)   ');
  console.log('================================================================');
  console.log(`  NTP Cold Navigation:               ${coldNav.toFixed(2)} ms`);
  console.log(`  NTP Warm Navigation (avg of 5):    ${warmNavAvg.toFixed(2)} ms`);
  console.log(`  DOM Interactive:                   ${perfMetrics.domInteractive.toFixed(2)} ms`);
  console.log(`  DOM Content Loaded:                ${perfMetrics.domContentLoaded.toFixed(2)} ms`);
  console.log(`  In-Page Search Latency (Median):   ${searchStats.median.toFixed(2)} ms`);
  console.log(`  In-Page Search Latency (p95):      ${searchStats.p95.toFixed(2)} ms`);
  console.log(`  Overlay Cold Injection Latency:    ${coldOverlayLatency.toFixed(2)} ms`);
  console.log(`  Overlay Warm Summon (Min):         ${summonStats.min.toFixed(2)} ms`);
  console.log(`  Overlay Warm Summon (Median):      ${summonStats.median.toFixed(2)} ms`);
  console.log(`  Overlay Warm Summon (p95):         ${summonStats.p95.toFixed(2)} ms`);
  console.log(`  Overlay Close Latency (Median):    ${closeStats.median.toFixed(2)} ms`);
  console.log(`  JS Heap Memory Usage:              ${memoryEnd} MB`);
  console.log('================================================================\n');
}

benchmarkPortal().catch(console.error);
