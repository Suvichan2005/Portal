import { test, expect } from '@playwright/test';
import {
  migrateBriefing,
  migrateMailSnapshot,
  migrateOpenClawStatus,
  CURRENT_SCHEMA_VERSION,
} from '../../src/core/migration';

test.describe('Portal Storage Migration & Seed Purge', () => {
  test('1. Purges known seeded briefing items while leaving genuine user items intact', () => {
    const rawWithSeedsAndUser = {
      generatedAt: 1730540000000,
      sourceIdentity: 'Mixed Source',
      status: 'fresh',
      topPriorities: [
        {
          id: 'prio-1', // SEED
          title: 'Portal v1.3 Browser & Device Orchestration Release',
          summary: 'Seed summary',
          source: 'flowmate',
          observedAt: 1730540000000,
          actionRequired: true,
          priority: 'high',
        },
        {
          id: 'user-prio-99', // GENUINE USER ITEM
          title: 'Complete Quarter 4 Tax Filing',
          summary: 'Submit returns before Friday deadline',
          source: 'user_import',
          observedAt: 1730541000000,
          actionRequired: true,
          priority: 'high',
        },
      ],
      upcomingCommitments: [
        {
          id: 'comm-1', // SEED
          title: 'Chrome MV3 Extension Review & Performance Audit',
          summary: 'Seed summary',
          source: 'calendar',
          observedAt: 1730540000000,
          actionRequired: false,
          priority: 'medium',
        },
      ],
      followUps: [],
    };

    const migrated = migrateBriefing(rawWithSeedsAndUser);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.topPriorities.length).toBe(1);
    expect(migrated.topPriorities[0].id).toBe('user-prio-99');
    expect(migrated.topPriorities[0].title).toBe('Complete Quarter 4 Tax Filing');
    expect(migrated.upcomingCommitments.length).toBe(0);
    expect(migrated.status).toBe('connected');
  });

  test('2. Resets to honest unconfigured state when cache only contained seeds', () => {
    const rawOnlySeeds = {
      generatedAt: 1730540000000,
      sourceIdentity: 'Flowmate Context Engine',
      status: 'fresh',
      topPriorities: [
        {
          id: 'prio-1',
          title: 'Portal v1.3 Browser & Device Orchestration Release',
          summary: 'Seed summary',
          source: 'flowmate',
          observedAt: 1730540000000,
          actionRequired: true,
          priority: 'high',
        },
      ],
      upcomingCommitments: [],
      followUps: [],
    };

    const migrated = migrateBriefing(rawOnlySeeds);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.topPriorities.length).toBe(0);
    expect(migrated.status).toBe('unconfigured');
    expect(migrated.generatedAt).toBe(0);
  });

  test('3. Purges fabricated recruiter mail while preserving user email items', () => {
    const rawMail = {
      lastChecked: 1730540000000,
      status: 'connected',
      items: [
        {
          id: 'mail-1', // SEED
          threadId: 'th-recruiter-991',
          from: 'sarah.recruiting@anthropic.com',
          subject: 'Interview Schedule',
          snippet: 'Seed recruiter snippet',
          receivedAt: 1730540000000,
          threadUrl: 'https://mail.google.com/mail/u/0/#inbox/th-recruiter-991',
          urgencyReason: 'Interview',
          actionRequired: true,
          category: 'recruiter',
        },
        {
          id: 'user-mail-12', // GENUINE USER ITEM
          threadId: 'real-thread-789',
          from: 'colleague@company.com',
          subject: 'Sprint Planning Meeting Notes',
          snippet: 'Action items from our morning sync',
          receivedAt: 1730542000000,
          threadUrl: 'https://mail.google.com/mail/u/0/#inbox/real-thread-789',
          urgencyReason: 'Follow-up',
          actionRequired: false,
          category: 'priority',
        },
      ],
    };

    const migrated = migrateMailSnapshot(rawMail);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.items.length).toBe(1);
    expect(migrated.items[0].id).toBe('user-mail-12');
    expect(migrated.items[0].from).toBe('colleague@company.com');
  });

  test('4. Purges fabricated OpenClaw jobs and sets ThinkBook node to unpaired', () => {
    const rawOpenClaw = {
      gatewayState: 'stopped',
      gatewayPort: 57849,
      agentId: 'A9-T7',
      sessionState: 'running',
      recentJobs: [
        {
          id: 'job-101', // SEED
          task: 'Verify OpenClaw isolated session A9-T7',
          status: 'completed',
          host: 'ideapad',
          startedAt: 1730540000000,
        },
      ],
    };

    const migrated = migrateOpenClawStatus(rawOpenClaw);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.recentJobs.length).toBe(0);
    expect(migrated.workstationNode.status).toBe('unpaired');
    expect(migrated.workstationNode.note).toContain('Unpaired');
  });
});
