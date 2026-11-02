import { SearchResult, UserPreferences } from '../types';
import { scoreStringMatch, computeRecencyBonus, computeFrequencyBonus } from './ranking';
import { COMMANDS } from '../commands/registry';
import { storage } from '../storage';
import { getFaviconUrl } from '../icons/svg-icons';
import { parseDirectUrl, cleanPastedInput } from './url-utils';
import { parseGrammar, PROVIDER_BANGS, FilterScope } from './grammar';

export class SearchEngine {
  private isExt(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.tabs;
  }

  /**
   * Normalizes URLs for deduplication (strips trailing slashes, fragments, standard port).
   */
  private normalizeUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      let path = u.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return `${u.protocol}//${u.host}${path}${u.search}`.toLowerCase();
    } catch {
      return urlStr.toLowerCase().trim();
    }
  }

  /**
   * Executes a full multi-source search across Open Tabs, Bookmarks, History, Commands, Bangs, and Aliases.
   */
  async search(
    query: string,
    preferences: UserPreferences,
    options?: { context?: 'overlay' | 'newtab'; currentTabId?: number },
  ): Promise<SearchResult[]> {
    const rawQ = cleanPastedInput(query);
    const resultsMap = new Map<string, SearchResult>();

    // 1. Direct URL check: Pasted URLs or direct domain inputs get TOP priority (score: 5000)
    // They must NEVER be hijacked into Google searches!
    const directMatch = parseDirectUrl(rawQ);
    if (directMatch.isUrl) {
      resultsMap.set('direct-url-top', {
        id: `direct-url-${directMatch.normalizedUrl}`,
        type: 'web',
        title: directMatch.displayTitle,
        url: directMatch.normalizedUrl,
        description: `${directMatch.normalizedUrl} • Press Enter to navigate directly`,
        favicon: getFaviconUrl(directMatch.normalizedUrl),
        score: 5000,
        badge: 'NAVIGATE',
      });
    }

    // 2. Parse token-aware grammar:
    // "@gh react", "@yt lofi", "@tabs query", "@history query", "@bookmarks query", "@audio", "@chatgpt query", "/command"
    const grammar = parseGrammar(rawQ);
    const filterScope: FilterScope = grammar.scope;
    const q = grammar.query;

    // 3. Provider Web Search Bangs (e.g. "@gh react", "@yt lofi", "!gh react")
    if (grammar.providerBang) {
      const bang = grammar.providerBang;
      if (q.length > 0) {
        const targetUrl = bang.urlTemplate.replace('{q}', encodeURIComponent(q));
        resultsMap.set('bang-direct', {
          id: `bang-${bang.prefix}`,
          type: 'web',
          title: `Search ${bang.name} for "${q}"`,
          url: targetUrl,
          description: `${bang.description} • Opens in new tab`,
          favicon: getFaviconUrl(targetUrl),
          score: 4500,
          badge: `@${bang.prefix.toUpperCase()}`,
        });
      } else {
        PROVIDER_BANGS.slice(0, preferences.maxSuggestions || 8).forEach((b) => {
          resultsMap.set(`bang-${b.prefix}`, {
            id: `bang-${b.prefix}`,
            type: 'web',
            title: `@${b.prefix} <query>`,
            url: b.urlTemplate.replace('{q}', ''),
            description: `${b.name}: ${b.description}`,
            favicon: getFaviconUrl(`https://${b.domain}`),
            score: 3000,
            badge: `@${b.prefix.toUpperCase()}`,
          });
        });
      }
      return Array.from(resultsMap.values()).slice(0, preferences.maxSuggestions || 10);
    }

    // 4. Custom aliases (in general search)
    if (filterScope === 'all' && q.length > 0) {
      const aliases = await storage.getAliases();
      for (const alias of aliases) {
        if (alias.keyword.toLowerCase() === q.toLowerCase()) {
          const norm = this.normalizeUrl(alias.destinationUrl);
          resultsMap.set(norm, {
            id: `alias-${alias.keyword}`,
            type: 'shortcut',
            title: alias.title || alias.keyword,
            url: alias.destinationUrl,
            description: `Custom alias: ${alias.keyword} → ${alias.destinationUrl}`,
            favicon: getFaviconUrl(alias.destinationUrl),
            score: 4200,
            badge: 'ALIAS',
            pinned: true,
          });
        }
      }
    }

    // 5. Browser Commands (when in all or commands mode)
    if (filterScope === 'all' || filterScope === 'commands') {
      for (const cmd of COMMANDS) {
        const titleMatch = scoreStringMatch(q, cmd.title);
        const descMatch = scoreStringMatch(q, cmd.description);
        let keywordScore = 0;
        for (const kw of cmd.keywords) {
          const kwMatch = scoreStringMatch(q, kw);
          if (kwMatch.matched) {
            keywordScore = Math.max(keywordScore, kwMatch.score);
          }
        }

        const bestScore = Math.max(titleMatch.score, descMatch.score * 0.7, keywordScore);
        const isPriorityCmd =
          cmd.id === 'sleep-inactive-tabs' ||
          cmd.id === 'restore-closed-tab' ||
          cmd.id === 'close-duplicates' ||
          cmd.id === 'toggle-zen-mode' ||
          cmd.id === 'open-clipboard-url' ||
          cmd.id === 'save-current-session';

        const isDefaultCmd = !q && isPriorityCmd;
        if (bestScore > 100 || (filterScope === 'commands' && !q) || isDefaultCmd) {
          const priorityBonus = isPriorityCmd && !q ? 80 : 0;
          resultsMap.set(`cmd-${cmd.id}`, {
            id: `cmd-${cmd.id}`,
            type: 'command',
            title: cmd.title,
            description: cmd.description,
            score: filterScope === 'commands'
              ? (bestScore > 0 ? bestScore + 800 : 400 + priorityBonus)
              : (bestScore > 0 ? bestScore + 180 : 70 + priorityBonus),
            commandId: cmd.id,
            badge: 'COMMAND',
          });
        }
      }
    }

    // 6. Search Saved Sessions (in all, commands, or tabs mode)
    if (filterScope === 'all' || filterScope === 'commands' || filterScope === 'tabs') {
      try {
        const sessions = await storage.getSavedSessions();
        for (const s of sessions) {
          const nameMatch = scoreStringMatch(q, s.name);
          let tabMatchScore = 0;
          for (const tab of s.tabs.slice(0, 5)) {
            const tm = scoreStringMatch(q, tab.title || tab.url);
            if (tm.score > tabMatchScore) tabMatchScore = tm.score;
          }
          const bestScore = Math.max(nameMatch.score, tabMatchScore * 0.7);
          const shouldInclude = bestScore > 0 || (q.toLowerCase().includes('session') && !nameMatch.score) || (!q && filterScope === 'commands');
          if (shouldInclude) {
            resultsMap.set(`saved-${s.id}`, {
              id: `saved-${s.id}`,
              type: 'command',
              title: `Restore Session: ${s.name}`,
              description: `Saved workspace with ${s.tabCount} tab(s) • ${new Date(s.savedAt).toLocaleDateString()}`,
              score: 350 + (bestScore > 0 ? bestScore : 40),
              commandId: 'restore-saved-session',
              sessionId: s.id, // Explicit target session ID!
              badge: 'SESSION',
            });
          }
        }
      } catch {}
    }

    // 7. Search Open Tabs (when in all, tabs, audio, or site scope)
    if (
      (filterScope === 'all' || filterScope === 'tabs' || filterScope === 'audio' || filterScope === 'site') &&
      this.isExt() &&
      chrome.tabs
    ) {
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (!tab.url || tab.url.startsWith('chrome://newtab')) continue;
          if (filterScope === 'audio' && !tab.audible) continue;
          if (filterScope === 'site' && grammar.siteDomain && !tab.url.toLowerCase().includes(grammar.siteDomain)) {
            continue;
          }
          if (options?.context === 'overlay' && options?.currentTabId && tab.id === options.currentTabId && !q) {
            continue; // Skip the active tab itself in overlay empty state
          }

          const norm = this.normalizeUrl(tab.url);
          const titleMatch = scoreStringMatch(q, tab.title || '');
          const urlMatch = scoreStringMatch(q, tab.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.85);

          if (bestMatch > 0 || !q || filterScope === 'audio') {
            const audioBonus = tab.audible ? 250 : 0;
            // Tabs have strong preference over reopening the same URL from web or history
            const baseTabScore = 800;
            const score = filterScope === 'audio'
              ? 1200 + (bestMatch > 0 ? bestMatch : 0)
              : filterScope === 'tabs'
                ? (bestMatch > 0 ? bestMatch + 900 : 500) + audioBonus
                : (bestMatch > 0 ? bestMatch + baseTabScore : 300) + audioBonus;

            const existing = resultsMap.get(norm);
            if (!existing || existing.score < score) {
              resultsMap.set(norm, {
                id: `tab-${tab.id}`,
                type: 'tab',
                title: tab.title || tab.url,
                url: tab.url,
                description: tab.audible
                  ? `Playing audio 🔊 • ${new URL(tab.url).hostname}`
                  : `Open tab • ${new URL(tab.url).hostname}`,
                favicon: tab.favIconUrl || getFaviconUrl(tab.url),
                score,
                tabId: tab.id,
                windowId: tab.windowId,
                badge: tab.audible ? 'AUDIO 🔊' : 'SWITCH TAB',
                audible: tab.audible,
                muted: tab.mutedInfo?.muted,
              });
            } else if (existing) {
              existing.badge = tab.audible ? 'AUDIO 🔊' : 'OPEN TAB';
              existing.tabId = tab.id;
              existing.windowId = tab.windowId;
              existing.audible = tab.audible;
            }
          }
        }
      } catch (err) {
        console.warn('[SearchEngine] Open tabs query error:', err);
      }
    }

    // 8. Search Bookmarks (when in all, bookmarks, or site scope)
    if ((filterScope === 'all' || filterScope === 'bookmarks' || filterScope === 'site') && this.isExt() && chrome.bookmarks) {
      try {
        const bookmarks = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) => {
          if (!q) {
            chrome.bookmarks.getRecent(12, resolve);
          } else {
            chrome.bookmarks.search(q, resolve);
          }
        });

        for (const bm of bookmarks) {
          if (!bm.url) continue;
          if (filterScope === 'site' && grammar.siteDomain && !bm.url.toLowerCase().includes(grammar.siteDomain)) {
            continue;
          }
          const norm = this.normalizeUrl(bm.url);
          const titleMatch = scoreStringMatch(q, bm.title);
          const urlMatch = scoreStringMatch(q, bm.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.8);

          if (bestMatch > 0 || !q) {
            const score = filterScope === 'bookmarks'
              ? (bestMatch > 0 ? bestMatch + 600 : 350)
              : (bestMatch > 0 ? bestMatch + 220 : 140);
            const existing = resultsMap.get(norm);
            if (!existing) {
              resultsMap.set(norm, {
                id: `bm-${bm.id}`,
                type: 'bookmark',
                title: bm.title || bm.url,
                url: bm.url,
                description: `Bookmark • ${new URL(bm.url).hostname}`,
                favicon: getFaviconUrl(bm.url),
                score,
                badge: 'BOOKMARK',
              });
            } else {
              existing.badge = existing.badge ? `${existing.badge} • STARRED` : 'BOOKMARK';
            }
          }
        }
      } catch (err) {
        console.warn('Error querying bookmarks:', err);
      }
    }

    // 9. Search History (when in all, history, or site scope)
    if ((filterScope === 'all' || filterScope === 'history' || filterScope === 'site') && this.isExt() && chrome.history) {
      try {
        const searchText = filterScope === 'site' && grammar.siteDomain
          ? (q ? q : grammar.siteDomain)
          : q;
        const maxResults = filterScope === 'site' ? 100 : 40;
        const startTime = Date.now() - (filterScope === 'site' ? 90 : 30) * 24 * 60 * 60 * 1000;

        const historyItems = await new Promise<chrome.history.HistoryItem[]>((resolve) => {
          chrome.history.search(
            {
              text: searchText,
              maxResults,
              startTime,
            },
            resolve,
          );
        });

        for (const item of historyItems) {
          if (!item.url || item.url.startsWith('chrome://newtab')) continue;
          if (filterScope === 'site' && grammar.siteDomain && !item.url.toLowerCase().includes(grammar.siteDomain)) {
            continue;
          }
          const norm = this.normalizeUrl(item.url);
          const titleMatch = scoreStringMatch(q, item.title || '');
          const urlMatch = scoreStringMatch(q, item.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.8);

          if (bestMatch > 0 || !q) {
            const recencyBonus = computeRecencyBonus(item.lastVisitTime);
            const frequencyBonus = computeFrequencyBonus(item.visitCount);
            const score = filterScope === 'history'
              ? (bestMatch > 0 ? bestMatch + 500 : 250) + recencyBonus + frequencyBonus
              : (bestMatch > 0 ? bestMatch + 160 : 80) + recencyBonus + frequencyBonus;

            const existing = resultsMap.get(norm);
            if (!existing) {
              resultsMap.set(norm, {
                id: `hist-${item.id}`,
                type: 'history',
                title: item.title || item.url,
                url: item.url,
                description: `Visited • ${new URL(item.url).hostname}`,
                favicon: getFaviconUrl(item.url),
                score,
                visitCount: item.visitCount,
                lastVisitTime: item.lastVisitTime,
                badge: 'HISTORY',
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error querying history:', err);
      }
    }

    // 10. Pinned Shortcuts (in general search)
    if (filterScope === 'all') {
      const pinned = await storage.getPinnedShortcuts();
      for (const p of pinned) {
        const norm = this.normalizeUrl(p.url);
        const titleMatch = scoreStringMatch(q, p.customTitle || p.title);
        const urlMatch = scoreStringMatch(q, p.url);
        const bestMatch = Math.max(titleMatch.score, urlMatch.score);

        if (bestMatch > 0 || !q) {
          const existing = resultsMap.get(norm);
          if (existing) {
            existing.pinned = true;
            existing.score += 250;
          } else {
            resultsMap.set(norm, {
              id: `pin-${p.id}`,
              type: 'shortcut',
              title: p.customTitle || p.title,
              url: p.url,
              description: new URL(p.url).hostname,
              favicon: getFaviconUrl(p.url),
              score: bestMatch > 0 ? bestMatch + 400 : 320,
              pinned: true,
              badge: 'PINNED',
            });
          }
        }
      }
    }

    // 11. Intelligent History Recommendations (for empty query)
    if (!q && filterScope === 'all') {
      const intel = await storage.getIntelligence();
      if (intel && intel.clusters) {
        for (const cluster of intel.clusters.slice(0, 6)) {
          const norm = this.normalizeUrl(cluster.primaryUrl);
          if (await storage.isDismissed(norm)) continue;
          if (!resultsMap.has(norm)) {
            resultsMap.set(norm, {
              id: cluster.id,
              type: 'ai_cluster',
              title: cluster.topic,
              url: cluster.primaryUrl,
              description: `Frequent destination • ${cluster.domain}`,
              favicon: getFaviconUrl(cluster.primaryUrl),
              score: 220,
              badge: 'FREQUENT',
            });
          }
        }
      }
    }

    // 12. Web Search Fallback (when query is typed and not in scoped modes)
    if (q.length > 0 && filterScope === 'all') {
      const searchEngine = preferences.searchEngine || 'google';
      const searchUrl =
        searchEngine === 'duckduckgo'
          ? `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
          : searchEngine === 'bing'
            ? `https://www.bing.com/search?q=${encodeURIComponent(q)}`
            : `https://www.google.com/search?q=${encodeURIComponent(q)}`;

      resultsMap.set('web-search-fallback', {
        id: 'web-search-fallback',
        type: 'web',
        title: `Search ${searchEngine === 'duckduckgo' ? 'DuckDuckGo' : searchEngine === 'bing' ? 'Bing' : 'Google'} for "${q}"`,
        url: searchUrl,
        description: `Web Search • Opens in new tab`,
        score: 30,
        badge: 'SEARCH',
      });
    }

    // Sort by descending score
    return Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);
  }
}

export const searchEngine = new SearchEngine();
