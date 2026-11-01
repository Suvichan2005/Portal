import { HistoryCluster } from '../types';

export interface PromptApiStatus {
  available: boolean;
  model: 'gemini_nano' | 'heuristic_fallback';
  status: 'readily' | 'after-download' | 'unavailable';
  details?: string;
}

export class ChromePromptApiService {
  /**
   * Probes Chrome on-device LanguageModel availability.
   */
  async checkStatus(): Promise<PromptApiStatus> {
    try {
      if (typeof (globalThis as any).LanguageModel !== 'undefined') {
        const availability = await (globalThis as any).LanguageModel.availability();
        if (availability === 'readily') {
          return {
            available: true,
            model: 'gemini_nano',
            status: 'readily',
            details: 'Chrome Gemini Nano is ready for on-device inference.',
          };
        } else if (availability === 'after-download') {
          return {
            available: false,
            model: 'gemini_nano',
            status: 'after-download',
            details: 'Model is downloading in Chrome.',
          };
        } else {
          return {
            available: false,
            model: 'heuristic_fallback',
            status: 'unavailable',
            details: 'Hardware or component constraints (falling back to local heuristic ranking).',
          };
        }
      }
    } catch (err: any) {
      console.warn('LanguageModel probe error:', err);
    }

    return {
      available: false,
      model: 'heuristic_fallback',
      status: 'unavailable',
      details: 'Prompt API not exposed or supported on this device.',
    };
  }

  /**
   * Refines candidate topic clusters using on-device Gemini Nano if available.
   * Uses structured JSON response constraints per Chrome Modern Web Guidance.
   */
  async refineClustersWithNano(clusters: HistoryCluster[]): Promise<HistoryCluster[]> {
    const status = await this.checkStatus();
    if (!status.available || clusters.length === 0) {
      return clusters;
    }

    let session: any = null;
    try {
      // Create short-lived session with structured schema
      session = await (globalThis as any).LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content:
              'You are an intelligent browser assistant. Given browsing activity clusters, assign a concise, human-friendly topic name (max 3 words) and a 1-sentence explanation of why it is useful.',
          },
        ],
      });

      const clusterSummaries = clusters.slice(0, 6).map((c, i) => ({
        index: i,
        domain: c.domain,
        titles: c.recentTitles.slice(0, 3),
      }));

      const promptText = `Analyze these browsing clusters and return an array of refined topics: ${JSON.stringify(clusterSummaries)}`;

      // Use structured JSON schema if supported
      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'number' },
            topic: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['index', 'topic', 'reason'],
        },
      };

      const result = await session.prompt(promptText, { responseConstraint: schema });
      const refined = JSON.parse(result);

      if (Array.isArray(refined)) {
        for (const r of refined) {
          if (clusters[r.index]) {
            if (r.topic && r.topic.length > 1 && r.topic.length < 30) {
              clusters[r.index].topic = r.topic;
            }
            if (r.reason) {
              clusters[r.index].aiGeneratedReason = `Gemini Nano: ${r.reason}`;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Gemini Nano refinement error (falling back safely):', err);
    } finally {
      // Crucial: always destroy model session to prevent memory leak
      if (session && typeof session.destroy === 'function') {
        try {
          session.destroy();
        } catch {
          // Ignore disposal errors
        }
      }
    }

    return clusters;
  }

  /**
   * Natural language retrieval: Matches approximate descriptions using Gemini Nano when available.
   */
  async matchNaturalLanguage(
    query: string,
    candidates: { id: string; title: string; url: string }[],
  ): Promise<{ id: string; relevanceScore: number }[]> {
    const status = await this.checkStatus();
    if (!status.available || candidates.length === 0) {
      return [];
    }

    let session: any = null;
    try {
      session = await (globalThis as any).LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content:
              'Given a user search query describing a previously visited website, rate the relevance of each candidate from 0 to 100.',
          },
        ],
      });

      const items = candidates.slice(0, 10).map((c) => ({
        id: c.id,
        title: c.title,
        url: c.url,
      }));

      const promptText = `Query: "${query}"\nCandidates: ${JSON.stringify(items)}`;

      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            score: { type: 'number' },
          },
          required: ['id', 'score'],
        },
      };

      const result = await session.prompt(promptText, { responseConstraint: schema });
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => ({ id: p.id, relevanceScore: p.score || 0 }));
      }
    } catch (err) {
      console.warn('Prompt API natural language retrieval error:', err);
    } finally {
      if (session && typeof session.destroy === 'function') {
        try {
          session.destroy();
        } catch {}
      }
    }

    return [];
  }
}

export const promptApi = new ChromePromptApiService();
