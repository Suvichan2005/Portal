import { test, expect } from '@playwright/test';
import { historyClusterer } from '../../src/core/ai/clustering';
import { storage } from '../../src/core/storage';
import { promptApi } from '../../src/core/ai/prompt-api';
import { moduleRegistry } from '../../src/core/modules/module-registry';
import { parseDirectUrl, cleanPastedInput } from '../../src/core/search/url-utils';

test.describe('Portal v1.5 Release Reconciliation & Recommendation Quality', () => {
  test.beforeEach(async () => {
    // Clear in-memory mock storage
    await storage.clearDerivedData();
  });

  test('1. Realistic Browsing History: Distinguishes distinct ChatGPT chats, Google Docs, and GitHub repos without collapse', async () => {
    const realisticHistory: chrome.history.HistoryItem[] = [
      // 2 different ChatGPT conversations
      {
        id: '1',
        url: 'https://chatgpt.com/c/6710-arch-module?utm_source=chatgpt.com',
        title: 'Modular System Architecture - ChatGPT',
        visitCount: 7,
        lastVisitTime: Date.now() - 1000 * 60 * 30, // 30 mins ago
      },
      {
        id: '2',
        url: 'https://chatgpt.com/c/6711-perf-debug',
        title: 'Memory Leak & Worker Debugging - ChatGPT',
        visitCount: 5,
        lastVisitTime: Date.now() - 1000 * 60 * 60, // 1 hour ago
      },
      // 2 different Google Docs
      {
        id: '3',
        url: 'https://docs.google.com/document/d/1ABC123XYZ/edit?usp=sharing',
        title: 'Q4 Product Roadmap & Delivery - Google Docs',
        visitCount: 12,
        lastVisitTime: Date.now() - 1000 * 60 * 15,
      },
      {
        id: '4',
        url: 'https://docs.google.com/spreadsheets/d/2DEF456UVW/edit',
        title: 'Sprint Velocity Metrics - Google Sheets',
        visitCount: 6,
        lastVisitTime: Date.now() - 1000 * 60 * 120,
      },
      // 2 different GitHub Repositories
      {
        id: '5',
        url: 'https://github.com/facebook/react',
        title: 'facebook/react: The library for web and native user interfaces',
        visitCount: 14,
        lastVisitTime: Date.now() - 1000 * 60 * 45,
      },
      {
        id: '6',
        url: 'https://github.com/microsoft/playwright/pull/1234',
        title: 'Fix Chromium teardown timeout in Playwright - GitHub',
        visitCount: 8,
        lastVisitTime: Date.now() - 1000 * 60 * 90,
      },
    ];

    const clusters = await historyClusterer.clusterHistory(realisticHistory);

    // Verify ChatGPT conversations are clustered distinctly with cleaned titles
    const chatgptClusters = clusters.filter((c) => c.domain === 'chatgpt.com');
    expect(chatgptClusters.length).toBe(2);
    expect(chatgptClusters[0].topic).not.toContain('- ChatGPT');
    expect(chatgptClusters[1].topic).not.toContain('- ChatGPT');
    expect(chatgptClusters.map((c) => c.topic)).toContain('Modular System Architecture');
    expect(chatgptClusters.map((c) => c.topic)).toContain('Memory Leak & Worker Debugging');

    // Verify Google Docs are clustered distinctly with cleaned titles and doc types
    const docsClusters = clusters.filter((c) => c.domain === 'docs.google.com');
    expect(docsClusters.length).toBe(2);
    expect(docsClusters.map((c) => c.topic)).toContain('Q4 Product Roadmap & Delivery (Doc)');
    expect(docsClusters.map((c) => c.topic)).toContain('Sprint Velocity Metrics (Sheet)');

    // Verify GitHub repositories are clustered by repository
    const ghClusters = clusters.filter((c) => c.domain === 'github.com');
    expect(ghClusters.length).toBe(2);
    expect(ghClusters.map((c) => c.topic)).toContain('facebook/react');
    expect(ghClusters.map((c) => c.topic)).toContain('microsoft/playwright');
  });

  test('2. Repeated Research Queries: Clusters queries with >= 2 visits, filters transient one-off searches', async () => {
    const searchHistory: chrome.history.HistoryItem[] = [
      // Repeated research query (3 visits)
      {
        id: 's1',
        url: 'https://www.google.com/search?q=chrome+manifest+v3+prompt+api+language+attestation',
        title: 'chrome manifest v3 prompt api language attestation - Google Search',
        visitCount: 3,
        lastVisitTime: Date.now() - 1000 * 60 * 10,
      },
      // Another repeated research query (2 visits)
      {
        id: 's2',
        url: 'https://duckduckgo.com/?q=typescript+strict+null+checks+best+practices',
        title: 'typescript strict null checks best practices at DuckDuckGo',
        visitCount: 2,
        lastVisitTime: Date.now() - 1000 * 60 * 20,
      },
      // One-off transient search (1 visit)
      {
        id: 's3',
        url: 'https://www.google.com/search?q=weather+today',
        title: 'weather today - Google Search',
        visitCount: 1,
        lastVisitTime: Date.now() - 1000 * 60 * 5,
      },
    ];

    const clusters = await historyClusterer.clusterHistory(searchHistory);

    // Repeated searches should be clustered as Research destinations
    const researchClusters = clusters.filter((c) => c.topic.startsWith('Research:'));
    expect(researchClusters.length).toBe(2);
    expect(researchClusters[0].topic).toContain('chrome manifest v3 prompt api language attestation');
    expect(researchClusters[1].topic).toContain('typescript strict null checks best practices');

    // One-off search "weather today" must NOT be in clusters
    const weather = clusters.find((c) => c.topic.includes('weather today'));
    expect(weather).toBeUndefined();
  });

  test('3. Saved Workspace Restoration: Restores entire workspace instead of navigating to first tab', async () => {
    // Save a workspace session with 3 tabs
    const saved = await storage.saveSession('Engineering Sprint', [
      { title: 'GitHub PR', url: 'https://github.com/Suvichan2005/Portal/pull/1' },
      { title: 'Architecture Doc', url: 'https://docs.google.com/document/d/123/edit' },
      { title: 'Linear Board', url: 'https://linear.app/issue/123' },
    ]);

    expect(saved.tabCount).toBe(3);

    // Restore the session via first-class storage method
    const restoreResult = await storage.restoreSession(saved.id);
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.tabCount).toBe(3);
    expect(restoreResult.message).toContain('Engineering Sprint');
    expect(restoreResult.message).toContain('3 tabs');

    // Pinning a session shortcut preserves typed attributes
    const pinned = await storage.pinShortcut({
      title: saved.name,
      url: saved.tabs[0].url,
      type: 'session',
      sessionId: saved.id,
      tabCount: saved.tabCount,
    });

    const sessionPin = pinned.find((p) => p.sessionId === saved.id);
    expect(sessionPin).toBeDefined();
    expect(sessionPin?.type).toBe('session');
    expect(sessionPin?.tabCount).toBe(3);
  });

  test('4. Prompt API Capability Lifecycle: Distinguishes readiness from verified inference application', async () => {
    // On simulated environment without model
    const initialStatus = await promptApi.checkStatus();
    expect(initialStatus.stage).toBeDefined();
    expect(promptApi.hasInferenceBeenApplied()).toBe(false);

    // Test with simulated ready LanguageModel
    const fakeNano = {
      availability: async (opts?: any) => {
        if (!opts?.expectedOutputs) {
          throw new Error('No output language was specified in a LanguageModel API request.');
        }
        return 'readily';
      },
      create: async (opts: any) => {
        return {
          prompt: async () => JSON.stringify([{ index: 0, topic: 'Refined By Nano', reason: 'Verified' }]),
          destroy: () => {},
        };
      },
    };

    (globalThis as any).LanguageModel = fakeNano;

    // Check availability alone: should be 'model_ready', NOT 'inference_applied'
    const statusReady = await promptApi.checkStatus();
    expect(statusReady.available).toBe(true);
    expect(statusReady.stage).toBe('model_ready');
    expect(promptApi.hasInferenceBeenApplied()).toBe(false);

    // Run inference: now stage advances to 'inference_applied'
    const testClusters = [
      {
        id: 'c1',
        topic: 'Original Topic',
        domain: 'example.com',
        primaryUrl: 'https://example.com',
        title: 'Example',
        visits: 5,
        score: 100,
        recentTitles: ['Example'],
        aiGeneratedReason: 'Test reason',
      },
    ];

    const refined = await promptApi.refineClustersWithNano(testClusters);
    expect(refined[0].topic).toBe('Refined By Nano');
    expect(promptApi.hasInferenceBeenApplied()).toBe(true);
    expect(promptApi.getStage()).toBe('inference_applied');

    delete (globalThis as any).LanguageModel;
  });

  test('5. Operational Module Registry: Truthful states for Flowmate, Placement, AgenticCollab, and OpenClaw', async () => {
    const modules = await moduleRegistry.getModules();
    expect(modules.length).toBe(4);

    const flowmate = modules.find((m) => m.id === 'flowmate')!;
    const placement = modules.find((m) => m.id === 'placement')!;
    const collab = modules.find((m) => m.id === 'agentic_collab')!;
    const openclaw = modules.find((m) => m.id === 'openclaw')!;

    // Flowmate: honest unconfigured or connected, NO fake .local URL
    expect(flowmate.primaryDeepLink).toBeUndefined();
    expect(flowmate.status).toBe('unconfigured');

    // Placement: honest unconfigured, NO fake .local URL
    expect(placement.primaryDeepLink).toBeUndefined();
    expect(placement.status).toBe('unconfigured');

    // AgenticCollab: honest ready/unconfigured with reference to local workspace
    expect(collab.statusText).toContain('codex-chatgpt-collab');

    // OpenClaw: live gateway detection (tested against 127.0.0.1:57849)
    expect(openclaw.primaryDeepLink).toContain('57849');

    // Contextual action dispatching
    const actionResult = await moduleRegistry.executeAction('openclaw', 'open-gateway');
    expect(actionResult.success).toBe(true);
    expect(actionResult.url).toContain('57849');
  });

  test('6. Synchronous Intent & Direct URL Navigation: Enter on unambiguous URL navigates directly', () => {
    const testPasted = '   https://news.ycombinator.com/item?id=123456\r\n  ';
    const cleaned = cleanPastedInput(testPasted);
    const parsed = parseDirectUrl(cleaned);

    expect(parsed.isUrl).toBe(true);
    expect(parsed.normalizedUrl).toBe('https://news.ycombinator.com/item?id=123456');

    // Bare domains and IP addresses
    expect(parseDirectUrl('github.com/facebook/react').isUrl).toBe(true);
    expect(parseDirectUrl('127.0.0.1:57849').isUrl).toBe(true);
    expect(parseDirectUrl('localhost:3000').isUrl).toBe(true);
  });
});
