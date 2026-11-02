import { SearchResult, ResultType, UserPreferences } from '../types';
import { scoreStringMatch, computeRecencyBonus, computeFrequencyBonus } from './ranking';
import { COMMANDS } from '../commands/registry';
import { storage } from '../storage';
import { getFaviconUrl } from '../icons/svg-icons';
import { matchBang, findMatchingBangs } from './bangs';

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
   * Executes a full multi-source search across Open Tabs, Bookmarks, History, TopSites, Commands, Bangs, and Aliases.
   */
  async search(
    query: string,
    preferences: UserPreferences,
    options?: { context?: 'overlay' | 'newtab'; currentTabId?: number },
  ): Promise<SearchResult[]> {
    const rawQ = query.trim();
    const resultsMap = new Map<string, SearchResult>();

    // 0. Detect prefix filters:
    // "!" -> Bang search (!gh, !yt, !w, !so, !r, !npm, !m, !x, etc.)
    // "@audio", "@sound", "@music" -> Audible playing tabs only
    // "@" -> Open tabs only (@portal, @github)
    // "#" or "*" -> Bookmarks only (#dev, *docs)
    // "/" -> Browser commands only (/theme, /sleep, /clean)
    let filterMode: 'all' | 'bangs' | 'tabs' | 'audio' | 'bookmarks' | 'commands' = 'all';
    let q = rawQ;

    if (rawQ.startsWith('!')) {
      filterMode = 'bangs';
    } else if (rawQ.startsWith('@audio') || rawQ.startsWith('@sound') || rawQ.startsWith('@music')) {
      filterMode = 'audio';
      q = rawQ.replace(/^@(audio|sound|music)/i, '').trim();
    } else if (rawQ.startsWith('@')) {
      filterMode = 'tabs';
      q = rawQ.slice(1).trim();
    } else if (rawQ.startsWith('#') || rawQ.startsWith('*')) {
      filterMode = 'bookmarks';
      q = rawQ.slice(1).trim();
    } else if (rawQ.startsWith('/')) {
      filterMode = 'commands';
      q = rawQ.slice(1).trim();
    }

    // Bang search handling
    if (filterMode === 'bangs') {
      const bangMatch = matchBang(rawQ);
      if (bangMatch && bangMatch.hasQuery) {
        const targetUrl = bangMatch.bang.urlTemplate.replace('{q}', encodeURIComponent(bangMatch.searchQuery));
        resultsMap.set('bang-direct', {
          id: `bang-${bangMatch.bang.prefix}`,
          type: 'web',
          title: `Search ${bangMatch.bang.name} for "${bangMatch.searchQuery}"`,
          url: targetUrl,
          description: `${bangMatch.bang.description} • Opens in new tab`,
          favicon: getFaviconUrl(targetUrl),
          score: 3500,
          badge: `!${bangMatch.bang.prefix.toUpperCase()}`,
        });
      } else {
        const matching = findMatchingBangs(rawQ);
        matching.slice(0, preferences.maxSuggestions || 8).forEach((b) => {
          resultsMap.set(`bang-${b.prefix}`, {
            id: `bang-${b.prefix}`,
            type: 'web',
            title: `!${b.prefix} <query>`,
            url: b.urlTemplate.replace('{q}', ''),
            description: `${b.name}: ${b.description}`,
            favicon: getFaviconUrl(`https://${b.domain}`),
            score: 2500,
            badge: 'BANG',
          });
        });
      }
      return Array.from(resultsMap.values()).slice(0, preferences.maxSuggestions || 10);
    }

    // 1. Check custom aliases first (only in general search)
    if (filterMode === 'all' && q.length > 0) {
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

    // 2. Direct URL intent (only in general search)
    if (filterMode === 'all' && this.isDirectUrl(q)) {
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

    // 3. Search browser commands (when in all or commands mode)
    if (filterMode === 'all' || filterMode === 'commands') {
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
          cmd.id === 'openclaw-status';
        const isDefaultCmd = !q && isPriorityCmd;
        if (bestScore > 100 || (filterMode === 'commands' && !q) || isDefaultCmd) {
          const priorityBonus = isPriorityCmd && !q ? 80 : 0;
          resultsMap.set(`cmd-${cmd.id}`, {
            id: `cmd-${cmd.id}`,
            type: 'command',
            title: cmd.title,
            description: cmd.description,
            score: filterMode === 'commands' ? (bestScore > 0 ? bestScore + 500 : 200 + priorityBonus) : (bestScore > 0 ? bestScore + 150 : 60 + priorityBonus),
            commandId: cmd.id,
            badge: 'COMMAND',
          });
        }
      }
    }

    // 4. Search open tabs (when in all, tabs, or audio mode)
    if ((filterMode === 'all' || filterMode === 'tabs' || filterMode === 'audio') && this.isExt() && chrome.tabs) {
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (!tab.url || tab.url.startsWith('chrome://newtab')) continue;
          if (filterMode === 'audio' && !tab.audible) continue;
          if (options?.context === 'overlay' && options?.currentTabId && tab.id === options.currentTabId) {
            continue;
          }

          const norm = this.normalizeUrl(tab.url);
          const titleMatch = scoreStringMatch(q, tab.title || '');
          const urlMatch = scoreStringMatch(q, tab.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.8);

          if (bestMatch > 0 || !q || filterMode === 'audio') {
            const audioBonus = tab.audible ? 180 : 0;
            const score = filterMode === 'audio'
              ? 850 + (bestMatch > 0 ? bestMatch : 0)
              : filterMode === 'tabs'
                ? (bestMatch > 0 ? bestMatch + 600 : 300) + audioBonus
                : (bestMatch > 0 ? bestMatch + 350 : 200) + audioBonus;

            const existing = resultsMap.get(norm);
            if (!existing || existing.score < score) {
              resultsMap.set(norm, {
                id: `tab-${tab.id}`,
                type: 'tab',
                title: tab.title || tab.url,
                url: tab.url,
                description: tab.audible ? `Playing audio 🔊 • ${new URL(tab.url).hostname}` : `Open tab • ${new URL(tab.url).hostname}`,
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

    // 4.5 Search saved sessions (when query mentions session or in commands mode)
    if (q.toLowerCase().includes('session') || filterMode === 'commands') {
      try {
        const sessions = await storage.getSavedSessions();
        for (const s of sessions) {
          const match = scoreStringMatch(q, s.name);
          if (match.score > 0 || q.toLowerCase().includes('session')) {
            resultsMap.set(`saved-${s.id}`, {
              id: `saved-${s.id}`,
              type: 'command',
              title: `Restore Session: ${s.name}`,
              description: `Saved workspace with ${s.tabCount} tab(s) • ${new Date(s.savedAt).toLocaleDateString()}`,
              score: 280 + (match.score > 0 ? match.score : 40),
              commandId: 'restore-saved-session',
              badge: 'SESSION',
            });
          }
        }
      } catch {}
    }

    // 5. Search Bookmarks (when in all or bookmarks mode)
    if ((filterMode === 'all' || filterMode === 'bookmarks') && this.isExt() && chrome.bookmarks) {
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
          const norm = this.normalizeUrl(bm.url);
          const titleMatch = scoreStringMatch(q, bm.title);
          const urlMatch = scoreStringMatch(q, bm.url);
          const bestMatch = Math.max(titleMatch.score, urlMatch.score * 0.8);

          if (bestMatch > 0 || !q) {
            const score = filterMode === 'bookmarks' ? (bestMatch > 0 ? bestMatch + 500 : 250) : (bestMatch > 0 ? bestMatch + 160 : 120);
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

    // If explicit category filter was specified, return now without mixing history/web search
    if (filterMode !== 'all') {
      const sortedFiltered = Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);
      return sortedFiltered.slice(0, preferences.maxSuggestions || 10);
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
