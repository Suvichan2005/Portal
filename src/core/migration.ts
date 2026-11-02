import {
  PersonalBriefing,
  ImportantMailSnapshot,
  OpenClawSystemStatus,
  BriefingItem,
  ImportantMailItem,
} from './types';

export const CURRENT_SCHEMA_VERSION = 2;

export const KNOWN_SEED_SIGNATURES = {
  briefingItemIds: new Set(['prio-1', 'prio-2', 'comm-1', 'comm-2', 'fol-1', 'fol-2']),
  briefingTitles: new Set([
    'Portal v1.3 Browser & Device Orchestration Release',
    'IdeaPad & ThinkBook OpenClaw Gateway Coordination',
    'Chrome MV3 Extension Review & Performance Audit',
    'Flowmate Journal Incremental Sync Check',
    'Check ThinkBook Tailscale / SSH Node Pairing Key',
    'Flowmate REA Parent-Pointer Architecture Validation',
  ]),
  mailItemIds: new Set(['mail-1', 'mail-2', 'mail-3']),
  mailThreadIds: new Set(['th-recruiter-991', 'th-aws-billing-102', 'th-github-security-88']),
  openClawJobIds: new Set(['job-101']),
};

export function isSeededBriefingItem(item: BriefingItem): boolean {
  if (KNOWN_SEED_SIGNATURES.briefingItemIds.has(item.id)) return true;
  if (KNOWN_SEED_SIGNATURES.briefingTitles.has(item.title)) return true;
  return false;
}

export function isSeededMailItem(item: ImportantMailItem): boolean {
  if (KNOWN_SEED_SIGNATURES.mailItemIds.has(item.id)) return true;
  if (KNOWN_SEED_SIGNATURES.mailThreadIds.has(item.threadId)) return true;
  return false;
}

export function migrateBriefing(raw: any): PersonalBriefing {
  if (!raw) {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      generatedAt: 0,
      lastCachedAt: 0,
      sourceIdentity: 'Unconfigured',
      status: 'unconfigured',
      topPriorities: [],
      upcomingCommitments: [],
      followUps: [],
    };
  }

  const topPriorities = Array.isArray(raw.topPriorities)
    ? (raw.topPriorities as BriefingItem[]).filter((item) => !isSeededBriefingItem(item))
    : [];
  const upcomingCommitments = Array.isArray(raw.upcomingCommitments)
    ? (raw.upcomingCommitments as BriefingItem[]).filter((item) => !isSeededBriefingItem(item))
    : [];
  const followUps = Array.isArray(raw.followUps)
    ? (raw.followUps as BriefingItem[]).filter((item) => !isSeededBriefingItem(item))
    : [];

  const hasRemainingItems =
    topPriorities.length > 0 || upcomingCommitments.length > 0 || followUps.length > 0;

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    generatedAt: hasRemainingItems ? Number(raw.generatedAt) || 0 : 0,
    lastCachedAt: Date.now(),
    sourceIdentity: hasRemainingItems
      ? String(raw.sourceIdentity || 'Imported Projection')
      : 'Unconfigured',
    status: hasRemainingItems ? 'connected' : 'unconfigured',
    topPriorities,
    upcomingCommitments,
    followUps,
  };
}

export function migrateMailSnapshot(raw: any): ImportantMailSnapshot {
  if (!raw) {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastChecked: 0,
      lastCachedAt: 0,
      status: 'unconfigured',
      account: '',
      items: [],
    };
  }

  const items = Array.isArray(raw.items)
    ? (raw.items as ImportantMailItem[]).filter((item) => !isSeededMailItem(item))
    : [];

  const hasRemainingItems = items.length > 0;

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastChecked: hasRemainingItems ? Number(raw.lastChecked) || 0 : 0,
    lastCachedAt: Date.now(),
    status: hasRemainingItems ? 'connected' : 'unconfigured',
    account: raw.account || '',
    items,
  };
}

export function migrateOpenClawStatus(raw: any): OpenClawSystemStatus {
  if (!raw) {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      gatewayState: 'stopped',
      gatewayPort: 57849,
      agentId: 'A9-T7',
      sessionState: 'running',
      activeHost: 'ideapad',
      coordinatorNode: {
        id: 'node-ideapad',
        name: 'IdeaPad (Coordinator)',
        host: '127.0.0.1',
        status: 'offline',
        role: 'coordinator',
        note: 'Gateway service stopped',
      },
      workstationNode: {
        id: 'node-thinkbook',
        name: 'ThinkBook (Workstation)',
        host: '',
        status: 'unpaired',
        role: 'worker',
        note: 'Unpaired (Requires Tailscale SSH setup)',
      },
      recentJobs: [],
      lastObservedAt: 0,
      lastCachedAt: Date.now(),
      status: 'disconnected',
    };
  }

  // Filter out any fabricated jobs matching known seed job IDs
  const rawJobs = Array.isArray(raw.recentJobs) ? raw.recentJobs : [];
  const filteredJobs = rawJobs.filter((job: any) => !KNOWN_SEED_SIGNATURES.openClawJobIds.has(job.id));

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    gatewayState: raw.gatewayState === 'running' ? 'running' : 'stopped',
    gatewayPort: 57849,
    agentId: raw.agentId || 'A9-T7',
    sessionState: raw.sessionState === 'running' ? 'running' : 'stopped',
    activeHost: 'ideapad',
    coordinatorNode: {
      id: 'node-ideapad',
      name: 'IdeaPad (Coordinator)',
      host: '127.0.0.1',
      status: raw.gatewayState === 'running' ? 'online' : 'offline',
      role: 'coordinator',
      note: raw.gatewayState === 'running' ? 'Loopback Gateway active' : 'Gateway stopped',
    },
    workstationNode: {
      id: 'node-thinkbook',
      name: 'ThinkBook (Workstation)',
      host: '',
      status: 'unpaired',
      role: 'worker',
      note: 'Unpaired (Requires Tailscale SSH setup)',
    },
    recentJobs: filteredJobs,
    lastObservedAt: Number(raw.lastObservedAt) || 0,
    lastCachedAt: Date.now(),
    status: raw.gatewayState === 'running' ? 'connected' : 'disconnected',
  };
}

export async function runStorageMigration(): Promise<{
  migrated: boolean;
  version: number;
}> {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return { migrated: false, version: CURRENT_SCHEMA_VERSION };
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['portal_schema_version', 'portal_cached_briefing', 'portal_cached_mail', 'portal_cached_openclaw'],
      (data) => {
        const currentVersion = Number(data['portal_schema_version']) || 1;
        if (currentVersion >= CURRENT_SCHEMA_VERSION) {
          resolve({ migrated: false, version: currentVersion });
          return;
        }

        const cleanBriefing = migrateBriefing(data['portal_cached_briefing']);
        const cleanMail = migrateMailSnapshot(data['portal_cached_mail']);
        const cleanOpenClaw = migrateOpenClawStatus(data['portal_cached_openclaw']);

        chrome.storage.local.set(
          {
            portal_schema_version: CURRENT_SCHEMA_VERSION,
            portal_cached_briefing: cleanBriefing,
            portal_cached_mail: cleanMail,
            portal_cached_openclaw: cleanOpenClaw,
          },
          () => {
            resolve({ migrated: true, version: CURRENT_SCHEMA_VERSION });
          },
        );
      },
    );
  });
}
