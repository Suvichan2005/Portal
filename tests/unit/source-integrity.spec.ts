import { test, expect } from '@playwright/test';
import { briefingService, BriefingService } from '../../src/core/intelligence/briefing-service';
import { openClawBridge } from '../../src/core/bridge/openclaw-bridge';
import { storage } from '../../src/core/storage';

test.describe('Source Integrity & Truthful Operation', () => {
  test.beforeEach(async () => {
    // Clear test storage before each test
    await storage.clearDerivedData();
  });

  test('1. Briefing service on clean state returns honest unconfigured status with 0 fake items', async () => {
    const briefing = await briefingService.getBriefing();

    expect(briefing.status).toBe('unconfigured');
    expect(briefing.topPriorities.length).toBe(0);
    expect(briefing.upcomingCommitments.length).toBe(0);
    expect(briefing.followUps.length).toBe(0);
    expect(briefing.generatedAt).toBe(0);
  });

  test('2. Mail service on clean state returns honest unconfigured status with 0 fake emails', async () => {
    const mail = await briefingService.getMailSnapshot();

    expect(mail.status).toBe('unconfigured');
    expect(mail.items.length).toBe(0);
    expect(mail.lastChecked).toBe(0);
  });

  test('3. RefreshAll without live source does NOT advance source observation timestamps', async () => {
    // Seed an initial user-imported briefing with fixed timestamp
    const originalTime = 1730500000000;
    await storage.saveBriefing({
      schemaVersion: 2,
      generatedAt: originalTime,
      lastCachedAt: originalTime,
      sourceIdentity: 'User Verified Projection',
      status: 'connected',
      topPriorities: [
        {
          id: 'test-1',
          title: 'Review production pull request',
          summary: 'Check performance deltas',
          source: 'user_import',
          observedAt: originalTime,
          actionRequired: true,
          priority: 'high',
        },
      ],
      upcomingCommitments: [],
      followUps: [],
    });

    const refreshed = await briefingService.refreshAll();

    // Source observed timestamp MUST remain equal to original time
    expect(refreshed.briefing.generatedAt).toBe(originalTime);
    expect(refreshed.sourceRefreshed).toBe(false);
  });

  test('4. Briefing import parses structured markdown, sets connected status and real items', async () => {
    const md = `
# Daily Morning Briefing
## Top Priorities
- [ ] Complete Security Audit: Verify zero unauthenticated Gateway proxy endpoints
- [ ] Implement Canonical URL Validator: Sanitize mail thread links

## Upcoming Schedule
- 3:00 PM: Project Sync with team
    `;

    const res = await briefingService.importBriefing(md);

    expect(res.success).toBe(true);
    expect(res.briefing).toBeDefined();
    expect(res.briefing!.status).toBe('connected');
    expect(res.briefing!.topPriorities.length).toBe(2);
    expect(res.briefing!.topPriorities[0].title).toBe('Complete Security Audit');
    expect(res.briefing!.upcomingCommitments.length).toBe(1);
  });

  test('5. Gmail thread URL builder generates verified URLs and rejects malicious characters', () => {
    const valid = BriefingService.buildGmailThreadUrl('192d4b7c1a2e3f40', 0);
    expect(valid).toBe('https://mail.google.com/mail/u/0/#inbox/192d4b7c1a2e3f40');

    // Test rejection of path traversal / injection characters
    const sanitized = BriefingService.buildGmailThreadUrl('../../alert(1)//192d', 1);
    expect(sanitized).toBe('https://mail.google.com/mail/u/1/#inbox/alert1192d');
    expect(sanitized).not.toContain('..');
  });

  test('6. OpenClaw bridge returns disconnected status without fabricating completed jobs', async () => {
    const status = await openClawBridge.getCachedStatus();

    expect(status.status).toBe('disconnected');
    expect(status.recentJobs.length).toBe(0);
    expect(status.workstationNode.status).toBe('unpaired');
  });

  test('7. Task submission against stopped gateway is honestly rejected with clear error', async () => {
    // When port 57849 is stopped, submitTask must fail and NOT claim "Task queued"
    const originalProbe = openClawBridge.probeGateway;
    openClawBridge.probeGateway = async () => ({
      schemaVersion: 1,
      gatewayState: 'stopped',
      gatewayPort: 57849,
      sessionState: 'stopped',
      activeHost: 'ideapad',
      coordinatorNode: { id: 'node-ideapad', name: 'IdeaPad', host: '127.0.0.1', status: 'offline', role: 'coordinator' },
      workstationNode: { id: 'node-thinkbook', name: 'ThinkBook', host: '', status: 'unpaired', role: 'worker' },
      recentJobs: [],
      lastObservedAt: Date.now(),
      lastCachedAt: Date.now(),
      status: 'disconnected',
    });

    try {
      const res = await openClawBridge.submitTask('Run test suite on IdeaPad', 'ideapad');

      expect(res.success).toBe(false);
      expect(res.status).toBe('rejected');
      expect(res.message).toContain('OpenClaw Gateway is not running');
      expect(res.job).toBeDefined();
      expect(res.job!.status).toBe('rejected');
    } finally {
      openClawBridge.probeGateway = originalProbe;
    }
  });

  test('8. Task submission to ThinkBook while unpaired is rejected with pairing instructions', async () => {
    const res = await openClawBridge.submitTask('Run heavy compilation on ThinkBook', 'thinkbook');

    expect(res.success).toBe(false);
    expect(res.status).toBe('rejected');
    expect(res.message).toContain('unpaired');
  });
});
