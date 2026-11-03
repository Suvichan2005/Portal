import { HistoryCluster, PromptApiStage, PromptApiStatus } from '../types';

export class ChromePromptApiService {
  private currentStage: PromptApiStage = 'api_unavailable';
  private inferenceApplied = false;
  private lastInferenceTime = 0;
  private inferenceCount = 0;

  /**
   * Returns the current lifecycle stage of on-device intelligence.
   */
  getStage(): PromptApiStage {
    return this.currentStage;
  }

  /**
   * Returns whether genuine on-device inference was executed and applied to recommendations.
   */
  hasInferenceBeenApplied(): boolean {
    return this.inferenceApplied;
  }

  /**
   * Probes Chrome on-device LanguageModel availability.
   * Completely resilient against disabled feature flags and hardware limits.
   * Distinguishes: API exists, Model downloadable, Model ready, Session creation, Inference applied.
   */
  async checkStatus(): Promise<PromptApiStatus> {
    try {
      const lm = (globalThis as any).LanguageModel || (globalThis as any).ai?.languageModel;
      if (!lm || typeof lm.availability !== 'function') {
        this.currentStage = 'api_unavailable';
        return {
          available: false,
          model: 'heuristic_fallback',
          status: 'unavailable',
          stage: 'api_unavailable',
          details: 'Prompt API not exposed or supported on this device.',
        };
      }

      // Explicit expectedInputs and expectedOutputs to satisfy Chrome Prompt API language safety attestation
      const lmOptions = {
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
      };

      let availability: string = 'unavailable';
      try {
        availability = await lm.availability(lmOptions);
      } catch (err) {
        try {
          // Fallback probe without options
          availability = await lm.availability();
        } catch {
          this.currentStage = 'flag_disabled';
          return {
            available: false,
            model: 'heuristic_fallback',
            status: 'unavailable',
            stage: 'flag_disabled',
            details: 'Chrome on-device model execution flag is disabled or hardware threshold unmet.',
          };
        }
      }

      if (availability === 'readily' || availability === 'available') {
        // Model is downloaded and ready, but inference has not yet been executed in this session
        if (!this.inferenceApplied) {
          this.currentStage = 'model_ready';
        }
        return {
          available: true,
          model: 'gemini_nano',
          status: 'readily',
          stage: this.inferenceApplied ? 'inference_applied' : 'model_ready',
          details: this.inferenceApplied
            ? `Gemini Nano active • ${this.inferenceCount} inferences applied locally.`
            : 'Chrome Gemini Nano is ready for on-device inference.',
          inferenceApplied: this.inferenceApplied,
          lastInferenceTime: this.lastInferenceTime,
        };
      } else if (availability === 'after-download' || availability === 'downloadable' || availability === 'downloading') {
        this.currentStage = 'model_downloadable';
        return {
          available: false,
          model: 'gemini_nano',
          status: 'after-download',
          stage: 'model_downloadable',
          details: 'Model is downloading in Chrome.',
        };
      }
    } catch {
      // Entire probe safe from bubbling
    }

    this.currentStage = 'heuristic_deterministic';
    return {
      available: false,
      model: 'heuristic_fallback',
      status: 'unavailable',
      stage: 'heuristic_deterministic',
      details: 'Deterministic frequency-recency ranking active. Zero external network calls.',
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

      // Session creation with explicit output language and attestation
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

      this.currentStage = 'session_created';

      const clusterSummaries = clusters.slice(0, 6).map((c, i) => ({
        index: i,
        domain: c.domain,
        titles: c.recentTitles.slice(0, 3),
      }));

      const promptText = `Analyze these browsing clusters and return an array of refined topics: ${JSON.stringify(clusterSummaries)}`;

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

      if (Array.isArray(refined) && refined.length > 0) {
        let appliedAny = false;
        for (const r of refined) {
          if (clusters[r.index]) {
            if (r.topic && r.topic.length > 1 && r.topic.length < 30) {
              clusters[r.index].topic = r.topic;
              appliedAny = true;
            }
            if (r.reason) {
              clusters[r.index].aiGeneratedReason = `Gemini Nano: ${r.reason}`;
            }
          }
        }
        if (appliedAny) {
          this.inferenceApplied = true;
          this.inferenceCount++;
          this.lastInferenceTime = Date.now();
          this.currentStage = 'inference_applied';
        }
      }
    } catch {
      // Graceful silent fallback to deterministic cluster data
    } finally {
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
            relevanceScore: { type: 'number' },
          },
          required: ['id', 'relevanceScore'],
        },
      };

      const result = await session.prompt(promptText, { responseConstraint: schema });
      const matches = JSON.parse(result);
      if (Array.isArray(matches)) {
        return matches;
      }
    } catch {
      return [];
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
