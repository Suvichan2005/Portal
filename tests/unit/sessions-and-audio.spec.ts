import { test, expect } from '@playwright/test';
import { storage } from '../../src/core/storage';
import { COMMANDS } from '../../src/core/commands/registry';
import { SearchEngine } from '../../src/core/search/engine';

test.describe('Saved Sessions & Audio Controls Rigorous Verification', () => {
  test.beforeEach(async () => {
    // Reset in-memory storage before each test
    const all = await storage.getSavedSessions();
    for (const s of all) {
      await storage.deleteSavedSession(s.id);
    }
  });

  test('1. saveSession sanitizes URLs, rejects invalid protocols, and deduplicates within session', async () => {
    const rawTabs = [
      { title: 'Google', url: 'https://google.com' },
      { title: 'Google Dup', url: 'https://google.com/' }, // duplicate with trailing slash
      { title: 'Malicious Script', url: 'javascript:alert(1)' }, // invalid protocol
      { title: 'About Blank', url: 'about:blank' }, // invalid scheme
      { title: 'GitHub', url: 'https://github.com/Suvichan2005' },
    ];

    const session = await storage.saveSession('Dev Project', rawTabs);
    expect(session.name).toBe('Dev Project');
    expect(session.tabCount).toBe(2);
    expect(session.tabs.map((t) => t.url)).toEqual([
      'https://google.com',
      'https://github.com/Suvichan2005',
    ]);
  });

  test('2. renameSavedSession updates name and persists change', async () => {
    const session = await storage.saveSession('Original Name', [
      { title: 'Docs', url: 'https://docs.google.com' },
    ]);

    const updated = await storage.renameSavedSession(session.id, 'Renamed Workspace');
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Renamed Workspace');

    const retrieved = await storage.getSessionById(session.id);
    expect(retrieved?.name).toBe('Renamed Workspace');
  });

  test('3. deleteSavedSession removes target session without touching others', async () => {
    const s1 = await storage.saveSession('Session 1', [{ title: 'T1', url: 'https://example.com/1' }]);
    const s2 = await storage.saveSession('Session 2', [{ title: 'T2', url: 'https://example.com/2' }]);

    const deleted = await storage.deleteSavedSession(s1.id);
    expect(deleted).toBe(true);

    const remaining = await storage.getSavedSessions();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(s2.id);
  });

  test('4. Capacity holds up to 100 sessions without premature 20-item silent truncation', async () => {
    for (let i = 1; i <= 25; i++) {
      await storage.saveSession(`Session ${i}`, [{ title: `Tab ${i}`, url: `https://example.com/${i}` }]);
    }

    const sessions = await storage.getSavedSessions();
    // All 25 sessions must exist — never truncated to 20
    expect(sessions.length).toBe(25);
    expect(sessions[0].name).toBe('Session 25'); // latest first
  });

  test('5. restore-saved-session handles empty or invalid session gracefully with error reporting', async () => {
    (globalThis as any).chrome = {
      windows: {
        create: async () => ({ id: 1 }),
      },
    };

    const restoreCmd = COMMANDS.find((c) => c.id === 'restore-saved-session');
    expect(restoreCmd).toBeDefined();

    // No sessions saved
    const emptyRes: any = await restoreCmd!.execute();
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.message).toContain('No saved sessions found');
  });

  test('6. Audio tab search strictly isolates audible tabs when @audio prefix is used', async () => {
    // Setup mock chrome tabs query
    const mockTabs = [
      { id: 101, title: 'Spotify Web', url: 'https://open.spotify.com', audible: true, mutedInfo: { muted: false } },
      { id: 102, title: 'YouTube Lofi', url: 'https://youtube.com/watch?v=123', audible: true, mutedInfo: { muted: false } },
      { id: 103, title: 'Silent Docs', url: 'https://docs.google.com', audible: false, mutedInfo: { muted: false } },
      { id: 104, title: 'GitHub PR', url: 'https://github.com/pr', audible: false, mutedInfo: { muted: false } },
    ];

    (globalThis as any).chrome = {
      tabs: {
        query: async (queryInfo: any) => {
          if (queryInfo.audible) {
            return mockTabs.filter((t) => t.audible);
          }
          return mockTabs;
        },
      },
    };

    const engine = new SearchEngine();
    const results = await engine.search('@audio', { maxSuggestions: 10 } as any, { context: 'newtab' });

    // ONLY the 2 audible tabs should be returned
    expect(results.length).toBe(2);
    expect(results.every((r) => r.audible === true)).toBe(true);
    expect(results.every((r) => r.badge === 'AUDIO 🔊')).toBe(true);
    expect(results.map((r) => r.title)).toContain('Spotify Web');
    expect(results.map((r) => r.title)).toContain('YouTube Lofi');
  });

  test('7. mute-all-audio-tabs mutes audible tabs and unmuting ONLY restores portal-muted tabs', async () => {
    const mockTabs: any[] = [
      { id: 201, title: 'Playing Music', url: 'https://music.com', audible: true, mutedInfo: { muted: false } },
      { id: 202, title: 'User Pre-Muted Tab', url: 'https://quiet.com', audible: false, mutedInfo: { muted: true } },
    ];

    (globalThis as any).chrome = {
      tabs: {
        query: async (queryInfo: any) => {
          if (queryInfo.audible) {
            return mockTabs.filter((t) => t.audible && !t.mutedInfo.muted);
          }
          if (queryInfo.muted) {
            return mockTabs.filter((t) => t.mutedInfo.muted);
          }
          return mockTabs;
        },
        get: async (tabId: number) => mockTabs.find((t) => t.id === tabId),
        update: async (tabId: number, updateProps: any) => {
          const tab = mockTabs.find((t) => t.id === tabId);
          if (tab && updateProps.muted !== undefined) {
            tab.mutedInfo.muted = updateProps.muted;
          }
          return tab;
        },
      },
    };

    const muteCmd = COMMANDS.find((c) => c.id === 'mute-all-audio-tabs');
    expect(muteCmd).toBeDefined();

    // 1. First execution: mutes tab 201
    const res1: any = await muteCmd!.execute();
    expect(res1.success).toBe(true);
    expect(res1.message).toContain('Muted 1 audio tab');
    expect(mockTabs[0].mutedInfo.muted).toBe(true);

    // 2. Second execution (now 0 audible tabs): unmuting
    // Must ONLY unmute tab 201 (muted by Portal). Must NOT unmute tab 202 (deliberately muted by user)!
    const res2: any = await muteCmd!.execute();
    expect(res2.success).toBe(true);
    expect(res2.message).toContain('Unmuted 1 tab');
    expect(mockTabs[0].mutedInfo.muted).toBe(false); // tab 201 unmuted
    expect(mockTabs[1].mutedInfo.muted).toBe(true);  // tab 202 remains muted!
  });
});
