import { SearchResult, ResultType, UserPreferences } from '../types';
import { scoreStringMatch, computeRecencyBonus, computeFrequencyBonus } from './ranking';
import { COMMANDS } from '../commands/registry';
import { storage } from '../storage';
import { getFaviconUrl } from '../icons/svg-icons';

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
   * Detects whether input is intended as a direct URL navigation.
   */
  private isDirectUrl(q: string): boolean {
    const trimmed = q.trim();
    if (trimmed.includes(' ') || trimmed.length < 3) return false;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('localhost:')) {
      return true;
    }
    // Domain pattern: e.g. "github.com", "news.ycombinator.com", "vite.dev"
    return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed);
  }

  /**
   * Executes a full multi-source search across Open Tabs, Bookmarks, History, TopSites, Commands, and Aliases.
   */
  async search(
    query: string,
    preferences: UserPreferences,
    options?: { context?: 'overlay' | 'newtab'; currentTabId?: number },
  ): Promise<SearchResult[]> {
    const q = query.trim();
    const resultsMap = new Map<string, SearchResult>();

    // 1. Check custom aliases first
    if (q.length > 0) {
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
            score: 3000,
            badge: 'ALIAS',
            pinned: true,
          });
        }
      }
    }

    // 2. Direct URL intent
    if (this.isDirectUrl(q)) {
      const fullUrl = q.startsWith('http://') || q.startsWith('https://') ? q : `https://${q}`;
      const norm = this.normalizeUrl(fullUrl);
      if (!resultsMap.has(norm)) {
        resultsMap.set(norm, {
          id: `direct-url-${norm}`,
          type: 'web',
          title: `Navigate to ${q}`,
          url: fullUrl,
          description: fullUrl,
          favicon: getFaviconUrl(fullUrl),
          score: 2200,
          badge: 'VISIT',
        });
      }
    }

    // 3. Search browser commands
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
      if (bestScore > 120 || (!q && (cmd.id === 'restore-closed-tab' || cmd.id === 'close-duplicates'))) {
        resultsMap.set(`cmd-${cmd.id}`, {
          id: `cmd-${cmd.id}`,
          type: 'command',
          title: cmd.title,
          description: cmd.description,
          score: bestScore > 0 ? bestScore + 150 : 60,
          commandId: cmd.id,
          badge: 'COMMAND',
        });
      }
    }

    // 4. Search open tabs
    if (this.isExt() && chrome.tabs) {
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (!tab.url || tab.url.startsWith('chrome://newtab')) continue;
          // In overlay context, omit current tab from tab switcher suggestions
          if (options?.context === 'overlay' && options?.currentTabId && tab.id === options.currentTabId) {
            continue;
          }

          const norm = this.normalizeUrl(tab.url);
          const titleMatch = scoreStringMatch(q, tab.title || '');
          const urlMatch = scoreStringMatch(q, tab.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.8);

          if (bestMatch > 0 || !q) {
            // Significant Tab switch bonus when matching
            const score = bestMatch > 0 ? bestMatch + 350 : 200;
            const existing = resultsMap.get(norm);
            if (!existing || existing.score < score) {
              resultsMap.set(norm, {
                id: `tab-${tab.id}`,
                type: 'tab',
                title: tab.title || tab.url,
                url: tab.url,
                description: `Open tab • ${new URL(tab.url).hostname}`,
                favicon: tab.favIconUrl || getFaviconUrl(tab.url),
                score,
                tabId: tab.id,
                windowId: tab.windowId,
                badge: 'SWITCH TAB',
              });
            } else if (existing) {
              existing.badge = 'OPEN TAB';
              existing.tabId = tab.id;
              existing.windowId = tab.windowId;
            }
          }
        }
      } catch (err) {
        console.warn('Error querying tabs:', err);
      }
    }

    // 5. Search Bookmarks
    if (this.isExt() && chrome.bookmarks) {
      try {
        const bookmarks = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) => {
          if (!q) {
            chrome.bookmarks.getRecent(10, resolve);
          } else {
            chrome.bookmarks.search(q, resolve);
          }
        });

        for (const bm of bookmarks) {
          if (!bm.url) continue;
          const norm = this.normalizeUrl(bm.url);
          const titleMatch = scoreStringMatch(q, bm.title);
          const urlMatch = scoreStringMatch(q, bm.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.8);

          if (bestMatch > 0 || !q) {
            const score = bestMatch > 0 ? bestMatch + 160 : 120;
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

    // 6. Search History
    if (this.isExt() && chrome.history) {
      try {
        const historyItems = await new Promise<chrome.history.HistoryItem[]>((resolve) => {
          chrome.history.search(
            {
              text: q,
              maxResults: 25,
              startTime: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days
            },
            resolve,
          );
        });

        for (const item of historyItems) {
          if (!item.url) continue;
          const norm = this.normalizeUrl(item.url);
          if (await storage.isDismissed(norm)) continue;

          const titleMatch = scoreStringMatch(q, item.title || '');
          const urlMatch = scoreStringMatch(q, item.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.7);

          if (bestMatch > 0 || !q) {
            const recency = computeRecencyBonus(item.lastVisitTime);
            const freq = computeFrequencyBonus(item.visitCount);
            const totalScore = (bestMatch > 0 ? bestMatch + 50 : 50) + recency + freq;

            const existing = resultsMap.get(norm);
            if (!existing) {
              resultsMap.set(norm, {
                id: `hist-${item.id || norm}`,
                type: 'history',
                title: item.title || item.url,
                url: item.url,
                description: new URL(item.url).hostname,
                favicon: getFaviconUrl(item.url),
                score: totalScore,
                lastVisitTime: item.lastVisitTime,
                visitCount: item.visitCount,
                badge: 'HISTORY',
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error querying history:', err);
      }
    }

    // 7. Top Sites Integration (especially when query is empty)
    if (!q && this.isExt() && chrome.topSites) {
      try {
        const topSites = await new Promise<chrome.topSites.MostVisitedURL[]>((resolve) => {
          chrome.topSites.get(resolve);
        });
        for (const site of topSites.slice(0, 8)) {
          const norm = this.normalizeUrl(site.url);
          if (await storage.isDismissed(norm)) continue;
          if (!resultsMap.has(norm)) {
            resultsMap.set(norm, {
              id: `topsite-${norm}`,
              type: 'topsite',
              title: site.title || site.url,
              url: site.url,
              description: `Top site • ${new URL(site.url).hostname}`,
              favicon: getFaviconUrl(site.url),
              score: 180,
              badge: 'TOP SITE',
            });
          }
        }
      } catch (err) {
        console.warn('Error querying top sites:', err);
      }
    }

    // 8. Pinned shortcuts
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
            score: bestMatch > 0 ? bestMatch + 350 : 250,
            pinned: true,
            badge: 'PINNED',
          });
        }
      }
    }

    // 9. Intelligent AI History Clusters (for empty query)
    if (!q) {
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
              description: cluster.aiGeneratedReason || `Discovered topic • ${cluster.domain}`,
              favicon: getFaviconUrl(cluster.primaryUrl),
              score: 190,
              badge: '✦ AI',
            });
          }
        }
      }
    }

    // 10. Web Search fallback when query is typed
    if (q.length > 0) {
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
        score: 40,
        badge: 'SEARCH',
      });
    }

    // Convert map to array and sort by descending score
    const sorted = Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);

    const maxLimit = preferences.maxSuggestions || 10;
    return sorted.slice(0, maxLimit);
  }
}

export const searchEngine = new SearchEngine();
