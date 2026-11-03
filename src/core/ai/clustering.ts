import { HistoryCluster } from '../types';
import { storage } from '../storage';

const SENSITIVE_DOMAINS = [
  'accounts.google.com',
  'login.',
  'signin.',
  'auth.',
  'bank',
  'paypal.com',
  'stripe.com',
  'checkout.',
  'password',
  'localhost',
  '127.0.0.1',
];

const SEARCH_ENGINE_HOSTS = new Set(['google.com', 'www.google.com', 'duckduckgo.com', 'bing.com', 'www.bing.com']);

const GENERIC_TITLES = new Set([
  'home',
  'sign in',
  'signin',
  'log in',
  'login',
  'dashboard',
  'overview',
  'welcome',
  'untitled',
  'new tab',
  'loading',
  'index',
  'account',
  'my account',
  'new chat',
  'chatgpt',
  'untitled document',
  'google docs',
  'google sheets',
  'sign in to your account',
]);

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'msclkid',
  'ncid',
  'usp',
]);

export class HistoryClusterer {
  /**
   * Normalizes URLs by removing tracking query parameters and trailing slashes.
   */
  public normalizeUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      const searchParams = new URLSearchParams(u.search);
      for (const param of Array.from(searchParams.keys())) {
        if (TRACKING_PARAMS.has(param.toLowerCase())) {
          searchParams.delete(param);
        }
      }
      const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '') || '/'}${searchStr}`;
    } catch {
      return urlStr;
    }
  }

  /**
   * Detects whether a URL is a search engine query and extracts query terms.
   */
  public extractSearchQuery(url: URL): string | null {
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (SEARCH_ENGINE_HOSTS.has(host) || host.endsWith('.google.com')) {
      if (url.pathname.includes('/search') || url.pathname === '/' || host.includes('duckduckgo.com')) {
        const q = url.searchParams.get('q');
        if (q && q.trim().length >= 2) {
          return q.trim();
        }
      }
    }
    return null;
  }

  /**
   * Filters out sensitive, authentication, and transient private URLs.
   */
  public isSafeUrl(urlStr: string): boolean {
    try {
      const u = new URL(urlStr);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      const host = u.hostname.toLowerCase();
      const href = u.href.toLowerCase();

      for (const sens of SENSITIVE_DOMAINS) {
        if (host.includes(sens) || href.includes(sens)) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generates a deep-path aware grouping key to prevent collapsing distinct
   * conversations, documents, repositories, or repeated research searches into generic buckets.
   */
  public getGroupKey(url: URL): string {
    // Check if repeated search query
    const searchQuery = this.extractSearchQuery(url);
    if (searchQuery) {
      return `search:${searchQuery.toLowerCase()}`;
    }

    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const pathParts = url.pathname.split('/').filter(Boolean);

    // 1. ChatGPT conversations: chatgpt.com/c/<id> or chat.openai.com/c/<id>
    if ((host === 'chatgpt.com' || host === 'chat.openai.com') && pathParts.length >= 2 && pathParts[0] === 'c') {
      return `${host}/c/${pathParts[1]}`;
    }

    // 2. GitHub repositories: github.com/:owner/:repo
    if (host === 'github.com' && pathParts.length >= 2) {
      return `github.com/${pathParts[0]}/${pathParts[1]}`;
    }

    // 3. Google Docs, Sheets & Slides: docs.google.com/(document|spreadsheets|presentation)/d/<id>
    if (host === 'docs.google.com' && pathParts.length >= 3 && pathParts[1] === 'd') {
      return `docs.google.com/${pathParts[0]}/d/${pathParts[2]}`;
    }

    // 4. Notion / Linear pages
    if ((host === 'notion.so' || host.endsWith('.notion.site') || host === 'linear.app') && pathParts.length >= 1) {
      return `${host}/${pathParts[0]}`;
    }

    // 5. Documentation paths with version/package: e.g. docs.rs, vite.dev/guide
    if (host.includes('docs.') && pathParts.length >= 1) {
      return `${host}/${pathParts[0]}`;
    }

    // Standard domain fallback
    return host;
  }

  /**
   * Derives a clean cluster topic name from domain, deep path, and sample title.
   */
  public extractTopicName(urlStr: string, sampleTitle: string): { topic: string; domain: string } {
    try {
      const u = new URL(urlStr);
      const domain = u.hostname.replace(/^www\./, '');
      const pathParts = u.pathname.split('/').filter(Boolean);

      // Repeated Research Query
      const searchQuery = this.extractSearchQuery(u);
      if (searchQuery) {
        return { topic: `Research: "${searchQuery}"`, domain: 'Google / Web' };
      }

      // ChatGPT conversation title
      if ((domain === 'chatgpt.com' || domain === 'chat.openai.com') && pathParts[0] === 'c') {
        const cleanTitle = this.cleanPageTitle(sampleTitle);
        if (cleanTitle && !cleanTitle.toLowerCase().includes('chatgpt') && !cleanTitle.toLowerCase().includes('new chat')) {
          return { topic: cleanTitle, domain: 'chatgpt.com' };
        }
        const idSnippet = pathParts[1] ? ` (${pathParts[1].substring(0, 6)})` : '';
        return { topic: `ChatGPT Conversation${idSnippet}`, domain: 'chatgpt.com' };
      }

      // Google Docs, Sheets, Presentations
      if (domain === 'docs.google.com' && pathParts.length >= 3 && pathParts[1] === 'd') {
        const docType = pathParts[0] === 'spreadsheets' ? 'Sheet' : pathParts[0] === 'presentation' ? 'Slides' : 'Doc';
        const cleanTitle = this.cleanPageTitle(sampleTitle);
        if (cleanTitle && !cleanTitle.toLowerCase().startsWith('google doc') && !cleanTitle.toLowerCase().startsWith('untitled')) {
          return { topic: `${cleanTitle} (${docType})`, domain: 'docs.google.com' };
        }
        const idSnippet = pathParts[2] ? ` (${pathParts[2].substring(0, 6)})` : '';
        return { topic: `Google ${docType}${idSnippet}`, domain: 'docs.google.com' };
      }

      // GitHub: github.com/user/repo
      if (domain === 'github.com' && pathParts.length >= 2) {
        return { topic: `${pathParts[0]}/${pathParts[1]}`, domain: 'github.com' };
      }

      // Documentation portals
      if (domain === 'developer.chrome.com') {
        return { topic: 'Chrome Docs', domain };
      }

      if (domain === 'news.ycombinator.com') {
        return { topic: 'Hacker News', domain };
      }

      // Clean page title
      const cleanTitle = this.cleanPageTitle(sampleTitle);
      if (cleanTitle) {
        return { topic: cleanTitle, domain };
      }

      return { topic: domain, domain };
    } catch {
      return { topic: 'Web', domain: 'unknown' };
    }
  }

  /**
   * Strips generic words, site suffixes, and delimiter noise from page titles.
   */
  public cleanPageTitle(rawTitle: string): string | null {
    if (!rawTitle) return null;
    // Strip common site suffix tags like "- Google Docs", "| GitHub", "- YouTube"
    const cleaned = rawTitle
      .replace(/ - Google Docs$/i, '')
      .replace(/ - Google Sheets$/i, '')
      .replace(/ - Google Slides$/i, '')
      .replace(/ - ChatGPT$/i, '')
      .replace(/ \| GitHub$/i, '')
      .replace(/ - YouTube$/i, '')
      .trim();

    const segments = cleaned.split(/[-|•–—:]/).map((s) => s.trim()).filter(Boolean);
    for (const segment of segments) {
      const lower = segment.toLowerCase();
      if (!GENERIC_TITLES.has(lower) && segment.length >= 3 && segment.length <= 50) {
        return segment;
      }
    }
    const fallback = cleaned.trim();
    if (fallback.length >= 3 && fallback.length <= 50 && !GENERIC_TITLES.has(fallback.toLowerCase())) {
      return fallback;
    }
    return null;
  }

  /**
   * Clusters recent browser history into high-value intelligent shortcuts.
   */
  async clusterHistory(historyItems: chrome.history.HistoryItem[]): Promise<HistoryCluster[]> {
    const groupMap = new Map<
      string,
      {
        primaryUrl: string;
        title: string;
        visits: number;
        lastVisitTime: number;
        recentTitles: string[];
        subUrls: string[];
        isSearchQuery?: boolean;
      }
    >();

    for (const item of historyItems) {
      if (!item.url || !this.isSafeUrl(item.url)) continue;
      if (await storage.isDismissed(item.url)) continue;

      try {
        const normalized = this.normalizeUrl(item.url);
        const u = new URL(normalized);
        const searchQuery = this.extractSearchQuery(u);

        // One-off transient search queries are excluded; repeated searches (>= 2 visits) are kept
        if (searchQuery && (item.visitCount || 1) < 2) {
          continue;
        }

        const groupKey = this.getGroupKey(u);
        if (await storage.isDismissed(groupKey)) continue;

        const existing = groupMap.get(groupKey);
        const count = item.visitCount || 1;
        const time = item.lastVisitTime || Date.now();
        const title = (item.title || u.hostname).trim();

        if (!existing) {
          groupMap.set(groupKey, {
            primaryUrl: normalized,
            title,
            visits: count,
            lastVisitTime: time,
            recentTitles: [title],
            subUrls: [normalized],
            isSearchQuery: !!searchQuery,
          });
        } else {
          existing.visits += count;
          if (time > existing.lastVisitTime) {
            existing.lastVisitTime = time;
            existing.primaryUrl = normalized;
            existing.title = title;
          }
          if (title && !existing.recentTitles.includes(title)) {
            existing.recentTitles.push(title);
          }
          if (!existing.subUrls.includes(normalized)) {
            existing.subUrls.push(normalized);
          }
        }
      } catch {
        continue;
      }
    }

    const clusters: HistoryCluster[] = [];

    for (const [key, group] of groupMap.entries()) {
      // Must have at least 2 visits or recency within 5 days to qualify as a candidate
      const daysAgo = (Date.now() - group.lastVisitTime) / (1000 * 60 * 60 * 24);
      if (group.visits < 2 && daysAgo > 5) continue;

      const { topic, domain } = this.extractTopicName(group.primaryUrl, group.title);

      // Score: exponential recency decay + log frequency + session depth bonus
      const recencyScore = Math.round(100 * Math.exp(-daysAgo / 3));
      const frequencyScore = Math.min(100, Math.round(Math.log2(group.visits + 1) * 25));
      const depthBonus = Math.min(25, group.subUrls.length * 5);
      const score = recencyScore + frequencyScore + depthBonus;

      clusters.push({
        id: `cluster-${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
        topic,
        domain,
        primaryUrl: group.primaryUrl,
        title: group.title,
        visits: group.visits,
        score,
        recentTitles: group.recentTitles.slice(0, 5),
        aiGeneratedReason: group.isSearchQuery
          ? `Frequent research query (${group.visits} searches)`
          : `Frequently visited (${group.visits} times, active recently)`,
      });
    }

    // Sort by descending score
    return clusters.sort((a, b) => b.score - a.score).slice(0, 12);
  }
}

export const historyClusterer = new HistoryClusterer();
