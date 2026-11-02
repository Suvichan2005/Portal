import { CachedIntelligence, HistoryCluster } from '../types';
import { historyClusterer } from './clustering';
import { promptApi } from './prompt-api';
import { storage } from '../storage';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export class IntelligenceManager {
  private isAnalyzing = false;

  /**
   * Returns cached clusters immediately if available and fresh (< 6 hours).
   * Otherwise triggers background update without blocking the user.
   */
  async getOrRefreshShortcuts(forceRefresh = false): Promise<HistoryCluster[]> {
    const cached = await storage.getIntelligence();
    const now = Date.now();

    if (cached && !forceRefresh && now - cached.lastAnalyzed < SIX_HOURS_MS) {
      return cached.clusters;
    }

    // Trigger analysis in background with error isolation
    if (!this.isAnalyzing) {
      this.runAnalysis().catch(() => {});
    }

    return cached ? cached.clusters : [];
  }

  /**
   * Executes full discovery pipeline:
   * 1. Query browser history
   * 2. Deterministic clustering & scoring
   * 3. Prompt API / Gemini Nano refinement if available
   * 4. Cache results in chrome.storage.local
   */
  async runAnalysis(): Promise<CachedIntelligence> {
    if (this.isAnalyzing) {
      const existing = await storage.getIntelligence();
      return (
        existing || {
          clusters: [],
          lastAnalyzed: Date.now(),
          modelStatus: 'heuristic_active',
        }
      );
    }

    this.isAnalyzing = true;
    try {
      let historyItems: chrome.history.HistoryItem[] = [];

      if (typeof chrome !== 'undefined' && chrome.history) {
        historyItems = await new Promise<chrome.history.HistoryItem[]>((resolve) => {
          chrome.history.search(
            {
              text: '',
              maxResults: 200,
              startTime: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days
            },
            resolve,
          );
        });
      }

      // 1. Deterministic baseline clustering
      let clusters = await historyClusterer.clusterHistory(historyItems);

      // 2. Check Prompt API status
      const aiStatus = await promptApi.checkStatus();

      // 3. Optional Gemini Nano enhancement
      if (aiStatus.available) {
        clusters = await promptApi.refineClustersWithNano(clusters);
      }

      const intelligence: CachedIntelligence = {
        clusters,
        lastAnalyzed: Date.now(),
        modelStatus: aiStatus.available ? 'gemini_nano_active' : 'heuristic_active',
        deviceModelName: aiStatus.available ? 'Chrome Gemini Nano (Prompt API)' : 'Local Heuristic Engine',
      };

      await storage.saveIntelligence(intelligence);
      return intelligence;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Converts an intelligent cluster into a permanent user-pinned shortcut.
   */
  async pinCluster(cluster: HistoryCluster): Promise<void> {
    await storage.pinShortcut({
      id: cluster.id,
      title: cluster.topic,
      url: cluster.primaryUrl,
      customTitle: cluster.topic,
    });
  }

  /**
   * Dismisses an intelligent suggestion and removes it from future suggestions.
   */
  async dismissCluster(cluster: HistoryCluster): Promise<HistoryCluster[]> {
    await storage.dismissItem(cluster.primaryUrl);
    await storage.dismissItem(cluster.domain);
    const cached = await storage.getIntelligence();
    if (cached) {
      cached.clusters = cached.clusters.filter((c) => c.id !== cluster.id);
      await storage.saveIntelligence(cached);
      return cached.clusters;
    }
    return [];
  }
}

export const intelligenceManager = new IntelligenceManager();
