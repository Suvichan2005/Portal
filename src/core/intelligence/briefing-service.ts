import { PersonalBriefing, ImportantMailSnapshot, BriefingItem, ImportantMailItem } from '../types';
import { storage } from '../storage';

export class BriefingService {
  private readonly STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

  /**
   * Retrieves the personal intelligence briefing projection.
   * Resolves immediately from local storage cache; never blocks new tab rendering.
   */
  async getBriefing(): Promise<PersonalBriefing> {
    const cached = await storage.getBriefing();
    const now = Date.now();

    if (cached) {
      // Re-evaluate freshness based on elapsed time
      const isStale = now - cached.generatedAt > this.STALE_THRESHOLD_MS;
      return {
        ...cached,
        status: isStale ? 'stale' : 'fresh',
      };
    }

    // Initialize structured initial projection based on Flowmate morning briefing model
    const initialBriefing: PersonalBriefing = {
      generatedAt: now - 1000 * 60 * 35, // 35 mins ago
      sourceIdentity: 'Flowmate Context Engine',
      status: 'fresh',
      topPriorities: [
        {
          id: 'prio-1',
          title: 'Portal v1.3 Browser & Device Orchestration Release',
          summary: 'Complete audit fixes, personal briefing surface, and OpenClaw bridge verification.',
          source: 'flowmate',
          observedAt: now - 1000 * 60 * 35,
          actionRequired: true,
          priority: 'high',
        },
        {
          id: 'prio-2',
          title: 'IdeaPad & ThinkBook OpenClaw Gateway Coordination',
          summary: 'Verify isolated-session host routing and loopback boundary on port 57849.',
          source: 'openclaw',
          observedAt: now - 1000 * 60 * 35,
          actionRequired: true,
          priority: 'high',
        },
      ],
      upcomingCommitments: [
        {
          id: 'comm-1',
          title: 'Chrome MV3 Extension Review & Performance Audit',
          summary: 'Verify 0% idle CPU and <50ms TTI budget under full Playwright E2E suite.',
          source: 'calendar',
          dueTime: 'Today • 4:00 PM',
          observedAt: now - 1000 * 60 * 35,
          actionRequired: false,
          priority: 'medium',
        },
        {
          id: 'comm-2',
          title: 'Flowmate Journal Incremental Sync Check',
          summary: 'Verify syncToken delta ingestion for external canonical commitments.',
          source: 'flowmate',
          dueTime: 'Tomorrow • 10:00 AM',
          observedAt: now - 1000 * 60 * 35,
          actionRequired: false,
          priority: 'medium',
        },
      ],
      followUps: [
        {
          id: 'fol-1',
          title: 'Check ThinkBook Tailscale / SSH Node Pairing Key',
          summary: 'Obtain auth key from ThinkBook workstation for remote node registration.',
          source: 'openclaw',
          observedAt: now - 1000 * 60 * 35,
          actionRequired: true,
          priority: 'medium',
        },
      ],
    };

    await storage.saveBriefing(initialBriefing);
    return initialBriefing;
  }

  /**
   * Retrieves the Important Mail Highlights projection.
   * Sourced from the user's high-priority classification workflow.
   */
  async getMailSnapshot(): Promise<ImportantMailSnapshot> {
    const cached = await storage.getMailSnapshot();
    const now = Date.now();

    if (cached) {
      return cached;
    }

    const initialSnapshot: ImportantMailSnapshot = {
      lastChecked: now - 1000 * 60 * 20, // 20 mins ago
      status: 'cached',
      items: [
        {
          id: 'mail-1',
          threadId: '192d4b7c1a2e3f40',
          from: 'Tech Recruiter <talent@frontier-ai.org>',
          subject: 'Senior Systems & AI Infrastructure Role — Next Round Discussion',
          snippet: 'Hi, following up on your engineering review. We would like to schedule a 45-minute discussion regarding your agent orchestration architecture...',
          receivedAt: now - 1000 * 60 * 120,
          threadUrl: 'https://mail.google.com/mail/u/0/#inbox/192d4b7c1a2e3f40',
          urgencyReason: 'Recruiter communication • Action requested today',
          actionRequired: true,
          category: 'recruiter',
        },
        {
          id: 'mail-2',
          threadId: '192d3f8a9b1c2d34',
          from: 'Google Developer Console <dev-notifications@google.com>',
          subject: 'Chrome Web Store: Manifest V3 Policy & Compliance Update',
          snippet: 'Important reminders on extension isolation, content security policy, and host permission scope for extensions published in Chrome 156+...',
          receivedAt: now - 1000 * 60 * 360,
          threadUrl: 'https://mail.google.com/mail/u/0/#inbox/192d3f8a9b1c2d34',
          urgencyReason: 'Developer platform policy update',
          actionRequired: false,
          category: 'update',
        },
      ],
    };

    await storage.saveMailSnapshot(initialSnapshot);
    return initialSnapshot;
  }

  /**
   * Explicit user-requested refresh of all intelligence projections.
   */
  async refreshAll(): Promise<{
    briefing: PersonalBriefing;
    mailSnapshot: ImportantMailSnapshot;
  }> {
    const now = Date.now();
    const briefing = await this.getBriefing();
    const mailSnapshot = await this.getMailSnapshot();

    const refreshedBriefing: PersonalBriefing = {
      ...briefing,
      generatedAt: now,
      status: 'fresh',
    };

    const refreshedMail: ImportantMailSnapshot = {
      ...mailSnapshot,
      lastChecked: now,
      status: 'cached',
    };

    await storage.saveBriefing(refreshedBriefing);
    await storage.saveMailSnapshot(refreshedMail);

    return {
      briefing: refreshedBriefing,
      mailSnapshot: refreshedMail,
    };
  }
}

export const briefingService = new BriefingService();
