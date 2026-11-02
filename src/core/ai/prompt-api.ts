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
   * Completely resilient against disabled feature flags and hardware limits.
   */
  async checkStatus(): Promise<PromptApiStatus> {
    try {
      const lm = (globalThis as any).LanguageModel || (globalThis as any).ai?.languageModel;
      if (!lm || typeof lm.availability !== 'function') {
        return {
          available: false,
          model: 'heuristic_fallback',
          status: 'unavailable',
          details: 'Prompt API not exposed or supported on this device.',
        };
      }

      // Provide expectedOutputs and expectedInputs to satisfy Chrome Prompt API language attestation
      const lmOptions = {
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
      };

      // Check availability with complete error suppression to prevent Chrome extension error logs
      let availability: string = 'unavailable';
      try {
        availability = await lm.availability(lmOptions);
      } catch {
        try {
          availability = await lm.availability();
        } catch {
          // Feature flag gating model execution is disabled or hardware threshold unmet.
          // Return unavailable cleanly without console noise.
          return {
            available: false,
            model: 'heuristic_fallback',
            status: 'unavailable',
            details: 'Chrome on-device model execution flag is disabled or unsupported.',
          };
        }
      }

      if (availability === 'readily' || availability === 'available') {
        return {
          available: true,
          model: 'gemini_nano',
          status: 'readily',
          details: 'Chrome Gemini Nano is ready for on-device inference.',
        };
      } else if (availability === 'after-download' || availability === 'downloadable' || availability === 'downloading') {
        return {
          available: false,
          model: 'gemini_nano',
          status: 'after-download',
          details: 'Model is downloading in Chrome.',
        };
      }
    } catch {
      // Entire probe safe from bubbling
    }

    return {
      available: false,
      model: 'heuristic_fallback',
      status: 'unavailable',
      details: 'Hardware or component constraints (falling back to local heuristic ranking).',
    };
  }

  /**
   * Refines candidate topic clusters using on-device Gemini Nano if available.
   * Uses structured JSON response constraints per Chrome Modern Web Guidance.
   */
  async refineClustersWithNano(clusters: HistoryCluster[]): Promise<HistoryCluster[]> {
    const status = await this.checkStatus();
    if (!status.available || status.status !== 'readily' || clusters.length === 0) {
      return clusters;
    }

    let session: any = null;
    try {
      const lm = (globalThis as any).LanguageModel || (globalThis as any).ai?.languageModel;
      if (!lm || typeof lm.create !== 'function') return clusters;

      // Create short-lived session with structured schema and explicit output language
      session = await lm.create({
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
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
    } catch {
      // Graceful silent fallback to deterministic cluster data
    } finally {
      // Crucial: always destroy model session to prevent memory leak
      if (session && typeof session.destroy === 'function') {
        try {
          session.destroy();
        } catch {}
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
    if (!status.available || status.status !== 'readily' || candidates.length === 0) {
      return [];
    }

    let session: any = null;
    try {
      const lm = (globalThis as any).LanguageModel || (globalThis as any).ai?.languageModel;
      if (!lm || typeof lm.create !== 'function') return [];

      session = await lm.create({
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
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
    } catch {
      // Graceful silent fallback
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
