import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync } from 'fs';

async function measureNativeBaseline() {
  console.log('--- Measuring Native Chrome NTP Baseline ---');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chromium',
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const timings: number[] = [];
  const warmRuns = 5;

  for (let i = 0; i < warmRuns; i++) {
    const start = performance.now();
    await page.goto('chrome://newtab', { waitUntil: 'domcontentloaded' }).catch(async () => {
      // If chrome://newtab is restricted in automated driver, fallback to local empty benchmark page
      await page.goto('about:blank', { waitUntil: 'load' });
    });
    const duration = performance.now() - start;
    timings.push(duration);
    console.log(`Run ${i + 1}: ${duration.toFixed(2)}ms`);
  }

  // Get performance metrics
  const perfData = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domInteractive: nav ? nav.domInteractive : 0,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
      loadEvent: nav ? nav.loadEventEnd : 0,
    };
  });

  console.log('Perf Metrics from Navigation Timing:', perfData);

  const avgDuration = timings.reduce((a, b) => a + b, 0) / timings.length;
  console.log(`Average NTP Navigation: ${avgDuration.toFixed(2)}ms`);

  await browser.close();
  return { avgDuration, perfData };
}

measureNativeBaseline().catch(console.error);
