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
   * Derives a clean cluster topic name from domain and path.
   */
  private extractTopicName(urlStr: string, sampleTitle: string): { topic: string; domain: string } {
    try {
      const u = new URL(urlStr);
      const domain = u.hostname.replace(/^www\./, '');
      const pathParts = u.pathname.split('/').filter(Boolean);

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

      // Clean page title or domain
      const cleanTitle = sampleTitle.split(/[-|•–—:]/)[0].trim();
      if (cleanTitle && cleanTitle.length > 2 && cleanTitle.length < 35) {
        return { topic: cleanTitle, domain };
      }

      return { topic: domain, domain };
    } catch {
      return { topic: 'Web', domain: 'unknown' };
    }
  }

  /**
   * Clusters recent browser history into high-value intelligent shortcuts.
   */
  async clusterHistory(historyItems: chrome.history.HistoryItem[]): Promise<HistoryCluster[]> {
    const domainGroups = new Map<
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
        // Base key: domain + first path segment for doc/project sites
        const pathSegments = u.pathname.split('/').filter(Boolean);
        const groupKey =
          pathSegments.length > 0 && (u.hostname === 'github.com' || u.hostname.includes('docs.'))
            ? `${u.hostname}/${pathSegments[0]}`
            : u.hostname;

        if (await storage.isDismissed(groupKey)) continue;

        const existing = domainGroups.get(groupKey);
        const count = item.visitCount || 1;
        const time = item.lastVisitTime || Date.now();
        const title = (item.title || u.hostname).trim();

        if (!existing) {
          domainGroups.set(groupKey, {
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

    for (const [key, group] of domainGroups.entries()) {
      // Must have at least 2 visits or recency within 3 days to qualify as a candidate
      const daysAgo = (Date.now() - group.lastVisitTime) / (1000 * 60 * 60 * 24);
      if (group.visits < 2 && daysAgo > 3) continue;

      const { topic, domain } = this.extractTopicName(group.primaryUrl, group.title);

      // Score: log(visits) * 20 + recency bonus
      const recencyBonus = Math.max(0, 100 - daysAgo * 15);
      const frequencyBonus = Math.min(100, Math.log2(group.visits + 1) * 25);
      const score = Math.round(recencyBonus + frequencyBonus);

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
