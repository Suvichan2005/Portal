import {
  PersonalBriefing,
  ImportantMailSnapshot,
  BriefingItem,
  ImportantMailItem,
  ConnectionStatus,
} from '../types';
import { storage } from '../storage';
import { CURRENT_SCHEMA_VERSION, migrateBriefing, migrateMailSnapshot } from '../migration';

export class BriefingService {
  private readonly STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

  /**
   * Safe helper to construct a verified, canonical Gmail thread URL.
   * Rejects arbitrary or unverified URL schemes.
   */
  static buildGmailThreadUrl(threadId: string, accountIndex = 0): string {
    const cleanId = threadId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanIndex = Math.max(0, Math.floor(accountIndex));
    return `https://mail.google.com/mail/u/${cleanIndex}/#inbox/${encodeURIComponent(cleanId)}`;
  }

  /**
   * Retrieves the personal intelligence briefing projection.
   * Resolves immediately from local storage cache; never blocks new tab rendering.
   * If no cache exists, returns an honest unconfigured state. Never generates synthetic personal data.
   */
  async getBriefing(): Promise<PersonalBriefing> {
    const raw = await storage.getBriefing();
    const now = Date.now();

    if (!raw) {
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        generatedAt: 0,
        lastCachedAt: now,
        sourceIdentity: 'Unconfigured',
        status: 'unconfigured',
        topPriorities: [],
        upcomingCommitments: [],
        followUps: [],
      };
    }

    // Run migration if needed
    const briefing = raw.schemaVersion === CURRENT_SCHEMA_VERSION ? raw : migrateBriefing(raw);

    if (briefing.topPriorities.length === 0 && briefing.upcomingCommitments.length === 0 && briefing.followUps.length === 0) {
      return {
        ...briefing,
        status: 'unconfigured',
      };
    }

    // Re-evaluate freshness based on elapsed source observation time
    const isStale = briefing.generatedAt > 0 && now - briefing.generatedAt > this.STALE_THRESHOLD_MS;
    return {
      ...briefing,
      status: isStale ? 'stale' : 'connected',
    };
  }

  /**
   * Retrieves the Important Mail Highlights projection.
   * Resolves immediately from local storage cache; never blocks new tab rendering.
   * If no cache exists, returns an honest unconfigured state. Never generates synthetic emails.
   */
  async getMailSnapshot(): Promise<ImportantMailSnapshot> {
    const raw = await storage.getMailSnapshot();
    const now = Date.now();

    if (!raw) {
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        lastChecked: 0,
        lastCachedAt: now,
        status: 'unconfigured',
        account: '',
        items: [],
      };
    }

    const snapshot = raw.schemaVersion === CURRENT_SCHEMA_VERSION ? raw : migrateMailSnapshot(raw);

    if (snapshot.items.length === 0) {
      return {
        ...snapshot,
        status: 'unconfigured',
      };
    }

    const isStale = snapshot.lastChecked > 0 && now - snapshot.lastChecked > this.STALE_THRESHOLD_MS;
    return {
      ...snapshot,
      status: isStale ? 'stale' : 'connected',
    };
  }

  /**
   * Explicit user-triggered import of a structured briefing record
   * (e.g. from Flowmate, daily markdown notes, or clipboard export).
   */
  async importBriefing(
    input: string | Partial<PersonalBriefing>,
  ): Promise<{ success: boolean; message: string; briefing?: PersonalBriefing }> {
    try {
      let data: any;
      if (typeof input === 'string') {
        const trimmed = input.trim();
        if (trimmed.startsWith('{')) {
          data = JSON.parse(trimmed);
        } else {
          // Parse structured markdown bullets
          data = this.parseMarkdownBriefing(trimmed);
        }
      } else {
        data = input;
      }

      const topPriorities: BriefingItem[] = Array.isArray(data.topPriorities)
        ? data.topPriorities.map((item: any, idx: number) => ({
            id: String(item.id || `imp-prio-${idx}-${Date.now()}`),
            title: String(item.title || 'Untitled Priority').slice(0, 150),
            summary: String(item.summary || '').slice(0, 500),
            source: 'user_import' as const,
            observedAt: Number(item.observedAt) || Date.now(),
            actionRequired: Boolean(item.actionRequired),
            priority: (['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium') as any,
          }))
        : [];

      const upcomingCommitments: BriefingItem[] = Array.isArray(data.upcomingCommitments)
        ? data.upcomingCommitments.map((item: any, idx: number) => ({
            id: String(item.id || `imp-comm-${idx}-${Date.now()}`),
            title: String(item.title || 'Untitled Commitment').slice(0, 150),
            summary: String(item.summary || '').slice(0, 500),
            source: 'user_import' as const,
            observedAt: Number(item.observedAt) || Date.now(),
            dueTime: item.dueTime ? String(item.dueTime).slice(0, 50) : undefined,
            actionRequired: Boolean(item.actionRequired),
            priority: (['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium') as any,
          }))
        : [];

      const followUps: BriefingItem[] = Array.isArray(data.followUps)
        ? data.followUps.map((item: any, idx: number) => ({
            id: String(item.id || `imp-fol-${idx}-${Date.now()}`),
            title: String(item.title || 'Untitled Follow-up').slice(0, 150),
            summary: String(item.summary || '').slice(0, 500),
            source: 'user_import' as const,
            observedAt: Number(item.observedAt) || Date.now(),
            actionRequired: Boolean(item.actionRequired),
            priority: (['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium') as any,
          }))
        : [];

      if (topPriorities.length === 0 && upcomingCommitments.length === 0 && followUps.length === 0) {
        return {
          success: false,
          message: 'No valid briefing items found in import. Expected topPriorities, upcomingCommitments, or followUps.',
        };
      }

      const now = Date.now();
      const newBriefing: PersonalBriefing = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        generatedAt: Number(data.generatedAt) || now,
        lastCachedAt: now,
        sourceIdentity: String(data.sourceIdentity || 'User Imported Projection'),
        status: 'connected',
        topPriorities,
        upcomingCommitments,
        followUps,
      };

      await storage.saveBriefing(newBriefing);
      return {
        success: true,
        message: `Imported briefing with ${topPriorities.length} priorities, ${upcomingCommitments.length} commitments`,
        briefing: newBriefing,
      };
    } catch (err: any) {
      return { success: false, message: `Failed to import briefing: ${err.message}` };
    }
  }

  /**
   * Helper to parse markdown bullet lists into briefing items
   */
  private parseMarkdownBriefing(text: string): Partial<PersonalBriefing> {
    const lines = text.split('\n');
    const priorities: BriefingItem[] = [];
    const commitments: BriefingItem[] = [];
    let currentSection: 'priorities' | 'commitments' | 'followups' | 'none' = 'none';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const lower = line.toLowerCase();
      if (lower.includes('priorit')) {
        currentSection = 'priorities';
        continue;
      } else if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('commitment')) {
        currentSection = 'commitments';
        continue;
      } else if (lower.includes('follow') || lower.includes('action')) {
        currentSection = 'followups';
        continue;
      }

      if (line.startsWith('-') || line.startsWith('*')) {
        const content = line.replace(/^[-*]\s*(\[[ xX]\]\s*)?/, '').trim();
        if (!content) continue;
        const parts = content.split(/[:—–-]\s*/);
        const title = parts[0]?.trim() || content;
        const summary = parts.slice(1).join(' — ').trim() || title;

        const item: BriefingItem = {
          id: `md-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: title.slice(0, 120),
          summary: summary.slice(0, 300),
          source: 'user_import',
          observedAt: Date.now(),
          actionRequired: true,
          priority: 'medium',
        };

        if (currentSection === 'commitments') {
          commitments.push(item);
        } else {
          priorities.push(item);
        }
      }
    }

    return {
      sourceIdentity: 'User Imported Markdown',
      generatedAt: Date.now(),
      topPriorities: priorities,
      upcomingCommitments: commitments,
      followUps: [],
    };
  }

  /**
   * Explicit user-requested refresh of intelligence projections.
   * CRITICAL DATA INTEGRITY INVARIANT:
   * When no external source adapter is connected, refresh re-checks local cache freshness
   * and MUST NEVER advance the source observation timestamp (generatedAt / lastChecked).
   */
  async refreshAll(): Promise<{
    briefing: PersonalBriefing;
    mailSnapshot: ImportantMailSnapshot;
    sourceRefreshed: boolean;
  }> {
    const briefing = await this.getBriefing();
    const mailSnapshot = await this.getMailSnapshot();

    // In local-first unconfigured mode, we do NOT fake new source timestamps
    return {
      briefing,
      mailSnapshot,
      sourceRefreshed: false,
    };
  }
}

export const briefingService = new BriefingService();
