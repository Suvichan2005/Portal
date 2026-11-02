export type ResultType =
  | 'tab'
  | 'bookmark'
  | 'history'
  | 'topsite'
  | 'command'
  | 'shortcut'
  | 'ai_cluster'
  | 'web';

export interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  url?: string;
  description?: string;
  favicon?: string;
  score: number;
  tabId?: number;
  windowId?: number;
  folderPath?: string[];
  commandId?: string;
  badge?: string;
  pinned?: boolean;
  clusterTopic?: string;
  visitCount?: number;
  lastVisitTime?: number;
  audible?: boolean;
  muted?: boolean;
  sessionId?: string;
}

export interface SavedSession {
  id: string;
  name: string;
  savedAt: number;
  tabCount: number;
  tabs: { title: string; url: string; favicon?: string }[];
}

export interface PinnedShortcut {
  id: string;
  title: string;
  url: string;
  customTitle?: string;
  addedAt: number;
}

export interface DismissedItem {
  urlOrDomain: string;
  dismissedAt: number;
}

export interface CustomAlias {
  keyword: string;
  destinationUrl: string;
  title?: string;
}

export interface UserPreferences {
  theme: 'system' | 'dark' | 'light';
  searchEngine: 'google' | 'duckduckgo' | 'bing';
  maxSuggestions: number;
  showRecentTabs: boolean;
  showIntelligentShortcuts: boolean;
  reducedMotion: boolean;
  density: 'compact' | 'comfortable';
  zenMode?: boolean;
  autoDetectClipboardUrl?: boolean;
  showIntelligenceBriefing?: boolean;
  showImportantMail?: boolean;
  showOpenClawStatus?: boolean;
  hideMailPreviews?: boolean;
}

export interface HistoryCluster {
  id: string;
  topic: string;
  domain: string;
  primaryUrl: string;
  title: string;
  visits: number;
  score: number;
  recentTitles: string[];
  aiGeneratedReason?: string;
}

export interface CachedIntelligence {
  clusters: HistoryCluster[];
  lastAnalyzed: number;
  modelStatus: 'gemini_nano_active' | 'heuristic_active' | 'unavailable';
  deviceModelName?: string;
}

export interface BrowserCommand {
  id: string;
  title: string;
  description: string;
  category: 'tabs' | 'navigation' | 'settings' | 'history';
  keywords: string[];
  execute: () => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string } | void;
}

export interface InitialLauncherState {
  pinned: PinnedShortcut[];
  recentClusters: HistoryCluster[];
  openTabs: SearchResult[];
  preferences: UserPreferences;
  shortcutLabel: string;
  modelStatus: string;
}

export interface BriefingItem {
  id: string;
  title: string;
  summary: string;
  source: 'flowmate' | 'openclaw' | 'google_tasks' | 'calendar' | 'system';
  sourceUrl?: string;
  observedAt: number;
  dueTime?: string;
  actionRequired: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface PersonalBriefing {
  generatedAt: number;
  sourceIdentity: string;
  status: 'fresh' | 'stale' | 'offline_cached' | 'disconnected';
  topPriorities: BriefingItem[];
  upcomingCommitments: BriefingItem[];
  followUps: BriefingItem[];
}

export interface ImportantMailItem {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: number;
  threadUrl: string;
  urgencyReason: string;
  actionRequired: boolean;
  category: 'recruiter' | 'deadline' | 'priority' | 'update';
}

export interface ImportantMailSnapshot {
  lastChecked: number;
  status: 'connected' | 'disconnected' | 'cached' | 'unauthorized';
  items: ImportantMailItem[];
}

export interface OpenClawJobSummary {
  id: string;
  task: string;
  host: 'ideapad' | 'thinkbook' | 'sandbox' | 'unknown';
  status: 'running' | 'queued' | 'completed' | 'failed' | 'requires_approval';
  startedAt: number;
  completedAt?: number;
  resultSummary?: string;
}

export interface OpenClawSystemStatus {
  gatewayOnline: boolean;
  gatewayPort: number;
  agentId: string;
  sessionState: 'ready' | 'running' | 'stopped' | 'unconfigured';
  activeHost: 'ideapad' | 'thinkbook';
  pairedNodes: {
    name: string;
    host: string;
    status: 'connected' | 'pairing_available' | 'offline';
    isCoordinator: boolean;
  }[];
  recentJobs: OpenClawJobSummary[];
  lastConfirmedUpdate: number;
}

export type PortalMessage =
  | { type: 'PORTAL_SEARCH'; query: string; context: 'overlay' | 'newtab' }
  | {
      type: 'PORTAL_EXECUTE_ACTION';
      item: SearchResult;
      context: 'overlay' | 'newtab';
      modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean };
    }
  | { type: 'PORTAL_GET_INITIAL_STATE'; context: 'overlay' | 'newtab' }
  | { type: 'PORTAL_CLOSE_TAB'; tabId: number }
  | { type: 'PORTAL_SWITCH_TAB'; tabId: number; windowId?: number }
  | { type: 'PORTAL_DISMISS_SHORTCUT'; urlOrDomain: string }
  | { type: 'PORTAL_PIN_SHORTCUT'; shortcut: Omit<PinnedShortcut, 'addedAt'> }
  | { type: 'PORTAL_GET_INTELLIGENCE_SNAPSHOT' }
  | { type: 'PORTAL_REFRESH_INTELLIGENCE' }
  | { type: 'PORTAL_GET_OPENCLAW_STATUS' }
  | { type: 'PORTAL_SUBMIT_OPENCLAW_ACTION'; action: string; host?: string };
