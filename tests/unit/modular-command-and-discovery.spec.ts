import { test, expect } from '@playwright/test';
import { historyClusterer } from '../../src/core/ai/clustering';
import { moduleRegistry } from '../../src/core/modules/module-registry';
import { searchEngine } from '../../src/core/search/engine';
import { storage } from '../../src/core/storage';
import { promptApi } from '../../src/core/ai/prompt-api';

test.describe('Portal v1.5.0 Modular Command Shell & Discovery Tests', () => {
  test('1. Deep-path aware clustering: distinguishes distinct ChatGPT chats, GitHub repos, and Google Docs', () => {
    // ChatGPT conversations
    const chat1 = new URL('https://chatgpt.com/c/conv-12345-arch');
    const chat2 = new URL('https://chatgpt.com/c/conv-67890-prompt');
    const chatGeneric = new URL('https://chatgpt.com/');

    expect(historyClusterer.getGroupKey(chat1)).toBe('chatgpt.com/c/conv-12345-arch');
    expect(historyClusterer.getGroupKey(chat2)).toBe('chatgpt.com/c/conv-67890-prompt');
    expect(historyClusterer.getGroupKey(chatGeneric)).toBe('chatgpt.com');

    // GitHub repositories
    const repo1 = new URL('https://github.com/Suvichan2005/Portal');
    const repo2 = new URL('https://github.com/Suvichan2005/Flowmate');
    expect(historyClusterer.getGroupKey(repo1)).toBe('github.com/Suvichan2005/Portal');
    expect(historyClusterer.getGroupKey(repo2)).toBe('github.com/Suvichan2005/Flowmate');

    // Google Docs
    const doc1 = new URL('https://docs.google.com/document/d/doc-abc-123/edit');
    expect(historyClusterer.getGroupKey(doc1)).toBe('docs.google.com/document/d/doc-abc-123');
  });

  test('2. Title cleaning: filters out generic "Home", "Sign in", "Overview" titles', async () => {
    const historyItems: chrome.history.HistoryItem[] = [
      {
        id: '1',
        url: 'https://notion.so/workspace/page-1',
        title: 'Home - Product Roadmap - Notion',
        visitCount: 15,
        lastVisitTime: Date.now() - 1000 * 60 * 60, // 1 hr ago
      },
      {
        id: '2',
        url: 'https://chatgpt.com/c/conv-react-1',
        title: 'React Architecture Discussion - ChatGPT',
        visitCount: 8,
        lastVisitTime: Date.now() - 1000 * 60 * 60 * 2, // 2 hrs ago
      },
    ];

    const clusters = await historyClusterer.clusterHistory(historyItems);
    expect(clusters.length).toBeGreaterThan(0);

    const notionCluster = clusters.find((c) => c.primaryUrl.includes('notion.so'));
    expect(notionCluster).toBeDefined();
    // Must NOT be the generic word "Home"
    expect(notionCluster?.topic).not.toBe('Home');

    const chatCluster = clusters.find((c) => c.primaryUrl.includes('chatgpt.com'));
    expect(chatCluster).toBeDefined();
    expect(chatCluster?.topic).toContain('React Architecture Discussion');
  });

  test('3. Module Registry: exposes Flowmate, Placement OS, AgenticCollab, and OpenClaw with honest status', async () => {
    const modules = await moduleRegistry.getModules();
    expect(modules.length).toBe(4);

    const flowmate = modules.find((m) => m.id === 'flowmate');
    expect(flowmate).toBeDefined();
    expect(flowmate?.name).toBe('Flowmate');
    expect(flowmate?.status).toBe('unconfigured');

    const placement = modules.find((m) => m.id === 'placement');
    expect(placement).toBeDefined();
    expect(placement?.name).toBe('Placement OS');
    expect(placement?.status).toBe('unconfigured');

    const collab = modules.find((m) => m.id === 'agentic_collab');
    expect(collab).toBeDefined();
    expect(collab?.name).toBe('AgenticCollab');
    expect(collab?.primaryDeepLink).toContain('8765');

    const openclaw = modules.find((m) => m.id === 'openclaw');
    expect(openclaw).toBeDefined();
    expect(openclaw?.name).toBe('OpenClaw');
    expect(openclaw?.primaryDeepLink).toContain('57849');
  });

  test('4. Saved Sessions: discovers saved session by workspace name without requiring keyword "session"', async () => {
    // Save a session with a distinct name
    const session = await storage.saveSession('Career Intelligence Sprint', [
      { title: 'Google Careers', url: 'https://careers.google.com' },
      { title: 'Anthropic Jobs', url: 'https://anthropic.com/careers' },
    ]);
    expect(session).toBeDefined();

    const prefs = await storage.getPreferences();

    // Query using a name keyword ("Career" or "Sprint") rather than "session"
    const results = await searchEngine.search('Sprint', prefs, { context: 'newtab' });
    const sessionResult = results.find((r) => r.sessionId === session.id);

    expect(sessionResult).toBeDefined();
    expect(sessionResult?.title).toContain('Career Intelligence Sprint');
    expect(sessionResult?.badge).toBe('SESSION');

    // Clean up
    await storage.deleteSavedSession(session.id);
  });

  test('5. Prompt API compatibility: passes expectedOutputs language attestation to prevent Chrome console errors', async () => {
    // Mock LanguageModel with inspection spy
    let capturedOptions: any = null;
    (globalThis as any).LanguageModel = {
      availability: async (options?: any) => {
        capturedOptions = options;
        return 'available';
      },
    };

    const status = await promptApi.checkStatus();
    expect(status.available).toBe(true);
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.expectedOutputs).toBeDefined();
    expect(capturedOptions.expectedOutputs[0].languages).toContain('en');

    // Clean up
    delete (globalThis as any).LanguageModel;
  });
});
