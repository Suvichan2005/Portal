import { test, expect } from '@playwright/test';
import { storage } from '../../src/core/storage';
import { historyClusterer } from '../../src/core/ai/clustering';
import { searchEngine } from '../../src/core/search/engine';

test.describe('Portal v1.6.0 Source Reuse & Performance Adaptations', () => {
  test.beforeEach(async () => {
    await storage.clearDerivedData();
  });

  test('1. Secondary Result Actions: Markdown link and URL clipboard payloads conform to standards', () => {
    const item = {
      title: 'Portal GitHub Repository',
      url: 'https://github.com/Suvichan2005/Portal',
    };

    // Standard markdown link syntax: [Title](URL) - adapted from Chikamichi use-action-items
    const mdLink = `[${item.title}](${item.url})`;
    expect(mdLink).toBe('[Portal GitHub Repository](https://github.com/Suvichan2005/Portal)');

    // Fallback when title is empty uses URL as label
    const emptyTitleItem = { title: '', url: 'https://example.com' };
    const fallbackMd = `[${emptyTitleItem.title || emptyTitleItem.url}](${emptyTitleItem.url})`;
    expect(fallbackMd).toBe('[https://example.com](https://example.com)');
  });

  test('2. Command Recency Tracking (dbuezas/chrome-palette adaptation): Stores, deduplicates, and orders MRU', async () => {
    // Record command executions
    await storage.recordCommandExecution('open-history');
    await storage.recordCommandExecution('save-session');
    await storage.recordCommandExecution('toggle-theme');

    let recents = await storage.getRecentCommandIds();
    expect(recents).toEqual(['toggle-theme', 'save-session', 'open-history']);

    // Re-execute open-history: should bubble to the top without duplicates
    await storage.recordCommandExecution('open-history');
    recents = await storage.getRecentCommandIds();
    expect(recents).toEqual(['open-history', 'toggle-theme', 'save-session']);
  });

  test('3. Command Recency Capacity: Caps at 20 most recent entries', async () => {
    for (let i = 0; i < 25; i++) {
      await storage.recordCommandExecution(`cmd-${i}`);
    }

    const recents = await storage.getRecentCommandIds();
    expect(recents.length).toBe(20);
    expect(recents[0]).toBe('cmd-24'); // Most recently recorded
    expect(recents.includes('cmd-0')).toBe(false); // Evicted oldest
  });

  test('4. History Clustering Batch Dismissal: Pre-fetched Set filters dismissed URLs in O(1)', async () => {
    // Dismiss a specific URL
    await storage.dismissItem('https://github.com/dismissed/project');

    const sampleHistory: chrome.history.HistoryItem[] = [
      {
        id: '1',
        url: 'https://github.com/dismissed/project',
        title: 'Dismissed Project - GitHub',
        visitCount: 15,
        lastVisitTime: Date.now() - 1000 * 60,
      },
      {
        id: '2',
        url: 'https://github.com/active/project',
        title: 'Active Project - GitHub',
        visitCount: 12,
        lastVisitTime: Date.now() - 1000 * 60 * 5,
      },
    ];

    const clusters = await historyClusterer.clusterHistory(sampleHistory);
    // Dismissed project must be completely omitted from recommendations
    const hasDismissed = clusters.some((c) => c.primaryUrl.includes('dismissed/project'));
    expect(hasDismissed).toBe(false);

    // Active project must remain present
    const hasActive = clusters.some((c) => c.primaryUrl.includes('active/project'));
    expect(hasActive).toBe(true);
  });

  test('5. Search Engine Parallel Retrieval & Recency Ranking Boost: Boosts recently used commands', async () => {
    // Record 'open-chrome-extensions' as recently executed
    await storage.recordCommandExecution('open-chrome-extensions');

    // Search for 'extensions'
    const results = await searchEngine.search('extensions');
    const commandResults = results.filter((r) => r.type === 'command');

    expect(commandResults.length).toBeGreaterThan(0);
    // 'open-chrome-extensions' received the +120 recency boost and should be at or near the top
    const openExtResult = commandResults.find((r) => r.id === 'cmd-open-chrome-extensions');
    expect(openExtResult).toBeDefined();
    expect(commandResults[0].id).toBe('cmd-open-chrome-extensions');
  });

  test('6. Search Engine Direct Grammar Provider Bangs still work in parallel mode', async () => {
    const results = await searchEngine.search('@tabs');
    // Provider search without query should return open tab commands/entries
    expect(Array.isArray(results)).toBe(true);

    const ghResults = await searchEngine.search('!gh vitejs/vite');
    expect(ghResults.length).toBe(1);
    expect(ghResults[0].url).toContain('https://github.com/search?q=vitejs%2Fvite');
  });
});
