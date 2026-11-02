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

const SEARCH_ENGINES = [
  'google.com/search',
  'duckduckgo.com/?q=',
  'bing.com/search',
];

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
]);

export class HistoryClusterer {
  /**
   * Filters out sensitive, authentication, and transient search result URLs.
   */
  private isSafeUrl(urlStr: string): boolean {
    try {
      const u = new URL(urlStr);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      const host = u.hostname.toLowerCase();
      const href = u.href.toLowerCase();

      for (const sens of SENSITIVE_DOMAINS) {
        if (host.includes(sens) || href.includes(sens)) return false;
      }
      for (const se of SEARCH_ENGINES) {
        if (href.includes(se)) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generates a deep-path aware grouping key to prevent collapsing distinct
   * conversations, documents, and repositories into generic domain buckets.
   */
  public getGroupKey(url: URL): string {
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

    // 3. Google Docs & Sheets: docs.google.com/document/d/<id>
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
  private extractTopicName(urlStr: string, sampleTitle: string): { topic: string; domain: string } {
    try {
      const u = new URL(urlStr);
      const domain = u.hostname.replace(/^www\./, '');
      const pathParts = u.pathname.split('/').filter(Boolean);

      // E.g. ChatGPT conversation title
      if ((domain === 'chatgpt.com' || domain === 'chat.openai.com') && pathParts[0] === 'c') {
        const cleanTitle = this.cleanPageTitle(sampleTitle);
        if (cleanTitle && !cleanTitle.toLowerCase().includes('chatgpt')) {
          return { topic: cleanTitle, domain };
        }
        return { topic: 'ChatGPT Conversation', domain };
      }

      // E.g. github.com/user/repo -> "Repo (GitHub)"
      if (domain === 'github.com' && pathParts.length >= 2) {
        return { topic: `${pathParts[0]}/${pathParts[1]}`, domain };
      }

      // E.g. developer.chrome.com/docs/... -> "Chrome Docs"
      if (domain === 'developer.chrome.com') {
        return { topic: 'Chrome Docs', domain };
      }

      // E.g. news.ycombinator.com -> "Hacker News"
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
  private cleanPageTitle(rawTitle: string): string | null {
    if (!rawTitle) return null;
    const segments = rawTitle.split(/[-|•–—:]/).map((s) => s.trim()).filter(Boolean);
    for (const segment of segments) {
      const lower = segment.toLowerCase();
      if (!GENERIC_TITLES.has(lower) && segment.length >= 3 && segment.length <= 40) {
        return segment;
      }
    }
    const fallback = rawTitle.trim();
    if (fallback.length >= 3 && fallback.length <= 40 && !GENERIC_TITLES.has(fallback.toLowerCase())) {
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
      }
    >();

    for (const item of historyItems) {
      if (!item.url || !this.isSafeUrl(item.url)) continue;
      if (await storage.isDismissed(item.url)) continue;

      try {
        const u = new URL(item.url);
        const groupKey = this.getGroupKey(u);

        if (await storage.isDismissed(groupKey)) continue;

        const existing = groupMap.get(groupKey);
        const count = item.visitCount || 1;
        const time = item.lastVisitTime || Date.now();
        const title = (item.title || u.hostname).trim();

        if (!existing) {
          groupMap.set(groupKey, {
            primaryUrl: item.url,
            title,
            visits: count,
            lastVisitTime: time,
            recentTitles: [title],
            subUrls: [item.url],
          });
        } else {
          existing.visits += count;
          if (time > existing.lastVisitTime) {
            existing.lastVisitTime = time;
            existing.primaryUrl = item.url;
            existing.title = title;
          }
          if (title && !existing.recentTitles.includes(title)) {
            existing.recentTitles.push(title);
          }
          if (!existing.subUrls.includes(item.url)) {
            existing.subUrls.push(item.url);
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
        aiGeneratedReason: `Frequently visited (${group.visits} times, active recently)`,
      });
    }

    // Sort by descending score
    return clusters.sort((a, b) => b.score - a.score).slice(0, 12);
  }
}

export const historyClusterer = new HistoryClusterer();
