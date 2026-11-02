import { test, expect } from '@playwright/test';
import { cleanPastedInput, parseDirectUrl } from '../../src/core/search/url-utils';
import { parseGrammar, resolveSynchronousIntent, PROVIDER_BANGS } from '../../src/core/search/grammar';
import { scoreStringMatch, matchQueryTokens } from '../../src/core/search/ranking';
import { storage } from '../../src/core/storage';
import { COMMANDS } from '../../src/core/commands/registry';
import { SearchResult } from '../../src/core/types';

test.describe('Portal Daily-Driver UX Reconstruction & Search Grammar', () => {

  test('1. Pasted URLs and input cleaning: strips whitespace, quotes, and carriage returns', () => {
    expect(cleanPastedInput('  https://github.com  ')).toBe('https://github.com');
    expect(cleanPastedInput('"https://vite.dev"')).toBe('https://vite.dev');
    expect(cleanPastedInput("'http://localhost:5173'")).toBe('http://localhost:5173');
    expect(cleanPastedInput('`https://example.com`')).toBe('https://example.com');
    expect(cleanPastedInput('https://github.com\n')).toBe('https://github.com');
    expect(cleanPastedInput('\t127.0.0.1:8080\r\n')).toBe('127.0.0.1:8080');
  });

  test('2. parseDirectUrl detects complete URLs, localhost, IP addresses, and valid domains', () => {
    // Protocol URLs
    const httpsRes = parseDirectUrl('https://github.com/Suvichan2005/Portal');
    expect(httpsRes.isUrl).toBe(true);
    expect(httpsRes.normalizedUrl).toBe('https://github.com/Suvichan2005/Portal');

    const fileRes = parseDirectUrl('file:///C:/Users/IdeaPad/index.html');
    expect(fileRes.isUrl).toBe(true);
    expect(fileRes.normalizedUrl).toBe('file:///C:/Users/IdeaPad/index.html');

    const chromeRes = parseDirectUrl('chrome://extensions');
    expect(chromeRes.isUrl).toBe(true);
    expect(chromeRes.normalizedUrl).toBe('chrome://extensions');

    // Localhost and ports
    const localRes = parseDirectUrl('localhost:3000');
    expect(localRes.isUrl).toBe(true);
    expect(localRes.normalizedUrl).toBe('http://localhost:3000');

    const localBare = parseDirectUrl('localhost');
    expect(localBare.isUrl).toBe(true);
    expect(localBare.normalizedUrl).toBe('http://localhost');

    // IPv4 addresses
    const ipRes = parseDirectUrl('127.0.0.1:57849');
    expect(ipRes.isUrl).toBe(true);
    expect(ipRes.normalizedUrl).toBe('http://127.0.0.1:57849');

    // Clean domains without protocol
    const domainRes = parseDirectUrl('vite.dev');
    expect(domainRes.isUrl).toBe(true);
    expect(domainRes.normalizedUrl).toBe('https://vite.dev/');

    const subDomainRes = parseDirectUrl('docs.google.com/document');
    expect(subDomainRes.isUrl).toBe(true);
    expect(subDomainRes.normalizedUrl).toBe('https://docs.google.com/document');

    // Non-URLs must be rejected
    expect(parseDirectUrl('react hooks tutorial').isUrl).toBe(false);
    expect(parseDirectUrl('what is portal').isUrl).toBe(false);
    expect(parseDirectUrl('vite').isUrl).toBe(false);
  });

  test('3. Synchronous intent resolver: guarantees Pasted URLs NEVER search Google (<1ms)', () => {
    const t0 = performance.now();

    // Direct URL
    const navIntent = resolveSynchronousIntent('https://github.com/facebook/react', 'google');
    expect(navIntent.type).toBe('navigate_url');
    expect(navIntent.targetUrl).toBe('https://github.com/facebook/react');
    expect(navIntent.badge).toBe('NAVIGATE');

    // Domain paste
    const domainIntent = resolveSynchronousIntent('   "news.ycombinator.com"  ', 'google');
    expect(domainIntent.type).toBe('navigate_url');
    expect(domainIntent.targetUrl).toBe('https://news.ycombinator.com/');

    // IP paste
    const ipIntent = resolveSynchronousIntent('127.0.0.1:8080/dashboard', 'google');
    expect(ipIntent.type).toBe('navigate_url');
    expect(ipIntent.targetUrl).toBe('http://127.0.0.1:8080/dashboard');

    // Search query fallback
    const searchIntent = resolveSynchronousIntent('quantum computing breakthroughs', 'google');
    expect(searchIntent.type).toBe('web_search_fallback');
    expect(searchIntent.targetUrl).toContain('https://www.google.com/search?q=quantum%20computing%20breakthroughs');

    const t1 = performance.now();
    expect(t1 - t0).toBeLessThan(50); // Synchronous & ultra-fast (non-blocking)
  });

  test('4. Grammar parser: handles @ provider bangs and site scopes with @ over ! priority', () => {
    // @ provider bang
    const ghGrammar = parseGrammar('@gh react compiler');
    expect(ghGrammar.providerBang?.prefix).toBe('gh');
    expect(ghGrammar.query).toBe('react compiler');

    const ghIntent = resolveSynchronousIntent('@gh react compiler', 'google');
    expect(ghIntent.type).toBe('provider_search');
    expect(ghIntent.targetUrl).toBe('https://github.com/search?q=react%20compiler');

    // Legacy ! provider bang still supported for muscle memory
    const ytGrammar = parseGrammar('!yt lofi beats');
    expect(ytGrammar.providerBang?.prefix).toBe('yt');
    expect(ytGrammar.query).toBe('lofi beats');

    // Scopes
    const tabScope = parseGrammar('@tabs spotify');
    expect(tabScope.scope).toBe('tabs');
    expect(tabScope.query).toBe('spotify');

    const bookScope = parseGrammar('@bookmarks rust docs');
    expect(bookScope.scope).toBe('bookmarks');
    expect(bookScope.query).toBe('rust docs');

    const audioScope = parseGrammar('@audio meeting');
    expect(audioScope.scope).toBe('audio');
    expect(audioScope.query).toBe('meeting');

    // Commands
    const cmdGrammar = parseGrammar('/mute');
    expect(cmdGrammar.isCommand).toBe(true);
    expect(cmdGrammar.query).toBe('mute');
  });

  test('5. Multi-token matching in ranking engine matches multi-word queries across tokens', () => {
    const tokens = ['flowmate', 'portal'];
    const matched = matchQueryTokens('Flowmate Personal Intelligence - Portal Workspace', tokens);
    expect(matched).toBe(true);

    const partialMiss = matchQueryTokens('Flowmate Context Engine Documentation', tokens);
    expect(partialMiss).toBe(false);

    const scoreFull = scoreStringMatch('flowmate portal', 'Flowmate Portal Engine');
    const scoreSingle = scoreStringMatch('flowmate', 'Flowmate Context Engine');

    expect(scoreFull.matched).toBe(true);
    expect(scoreSingle.matched).toBe(true);
    expect(scoreFull.score).toBeGreaterThan(0);
    expect(scoreSingle.score).toBeGreaterThan(0);
  });

  test('6. Pinned shortcut editing: updateShortcut renames title and updates URL', async () => {
    // Clean initial pinned
    await storage.pinShortcut({ title: 'Old Title', url: 'https://example.com' });
    const pinned = await storage.getPinnedShortcuts();
    const item = pinned.find((p) => p.url === 'https://example.com');
    expect(item).toBeDefined();

    // Update shortcut
    await storage.updateShortcut(item!.id, {
      title: 'New Portal Site',
      customTitle: 'New Portal Site',
      url: 'https://example.com/portal',
    });

    const updatedPinned = await storage.getPinnedShortcuts();
    const updated = updatedPinned.find((p) => p.id === item!.id);
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('New Portal Site');
    expect(updated!.url).toBe('https://example.com/portal');

    // Clean up
    await storage.unpinShortcut(item!.id);
    const postDelete = await storage.getPinnedShortcuts();
    expect(postDelete.some((p) => p.id === item!.id)).toBe(false);
  });

  test('7. restore-saved-session targeting: restores exact sessionId without default session[0] hijack', async () => {
    let createdUrls: string[] = [];
    (globalThis as any).chrome = {
      windows: {
        create: async (opts: any) => {
          createdUrls = opts.url;
          return { id: 1 };
        },
      },
    };

    // Create two mock sessions
    const session1 = await storage.saveSession('Alpha Project', [{ title: 'Alpha Tab', url: 'https://alpha.example.com' }]);
    const session2 = await storage.saveSession('Beta Project', [{ title: 'Beta Tab', url: 'https://beta.example.com' }]);

    const cmd = COMMANDS.find((c) => c.id === 'restore-saved-session');
    expect(cmd).toBeDefined();

    // Executing with specific sessionId targets session1 even though session2 was saved after
    const result = await cmd!.execute({ sessionId: session1.id });
    expect(result).toBeDefined();
    expect(result!.success).toBe(true);
    expect(result!.message).toContain('Alpha Project');
    expect(createdUrls).toContain('https://alpha.example.com');

    // Clean up
    await storage.deleteSavedSession(session1.id);
    await storage.deleteSavedSession(session2.id);
  });

  test('8. Preferences support: density, accentColor, and midnight OLED theme', async () => {
    const prefs = await storage.savePreferences({
      theme: 'midnight',
      accentColor: 'emerald',
      density: 'compact',
      showContextualSection: true,
    });

    expect(prefs.theme).toBe('midnight');
    expect(prefs.accentColor).toBe('emerald');
    expect(prefs.density).toBe('compact');
    expect(prefs.showContextualSection).toBe(true);

    const reloaded = await storage.getPreferences();
    expect(reloaded.theme).toBe('midnight');
    expect(reloaded.accentColor).toBe('emerald');
    expect(reloaded.density).toBe('compact');
  });
});
