export type ResultType =
  | 'tab'
  | 'bookmark'
  | 'history'
  | 'topsite'
  | 'command'
  | 'shortcut'
  | 'ai_cluster'
  | 'web'
  | 'session';

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
  type?: 'url' | 'session' | 'search' | 'action';
  sessionId?: string;
  searchQuery?: string;
  tabCount?: number;
  actionId?: string;
}

export type CandidateSource = 'tab' | 'bookmark' | 'history' | 'session' | 'search';

export interface DestinationCandidate {
  id: string;
  title: string;
  url: string;
  source: CandidateSource;
  type: 'url' | 'session' | 'search' | 'action';
  sessionId?: string;
  searchQuery?: string;
  tabCount?: number;
  actionId?: string;
  score: number;
  domain: string;
  isPinned: boolean;
  subtitle: string;
  badge?: string;
}

export type PromptApiStage =
  | 'api_unavailable'
  | 'flag_disabled'
  | 'model_downloadable'
  | 'model_ready'
  | 'session_created'
  | 'inference_applied'
  | 'heuristic_deterministic';

export interface PromptApiStatus {
  available: boolean;
  model: 'gemini_nano' | 'heuristic_fallback';
  status: 'readily' | 'after-download' | 'unavailable';
  stage: PromptApiStage;
  details?: string;
  inferenceApplied?: boolean;
  lastInferenceTime?: number;
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
  theme: 'system' | 'dark' | 'light' | 'midnight';
  accentColor?: 'violet' | 'blue' | 'emerald' | 'amber' | 'rose';
  searchEngine: 'google' | 'duckduckgo' | 'bing';
  maxSuggestions: number;
  showRecentTabs: boolean;
  showIntelligentShortcuts: boolean;
  reducedMotion: boolean;
  density: 'compact' | 'comfortable' | 'relaxed';
  zenMode?: boolean;
  autoDetectClipboardUrl?: boolean;
  showIntelligenceBriefing?: boolean;
  showImportantMail?: boolean;
  showOpenClawStatus?: boolean;
  hideMailPreviews?: boolean;
  showContextualSection?: boolean;
  workspaceLayout?: 'focused' | 'daily' | 'studio';
  enabledModules?: string[];
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
  aiGeneratedReason: string;
  isAiGenerated?: boolean;
}

export interface CachedIntelligence {
  clusters: HistoryCluster[];
  lastAnalyzed: number;
  modelStatus: string;
  deviceModelName?: string;
}

export interface CommandExecutionContext {
  windowId?: number;
  tabId?: number;
  sessionId?: string;
}

export interface BrowserCommand {
  id: string;
  title: string;
  description: string;
  category: 'tabs' | 'navigation' | 'settings' | 'history';
  keywords: string[];
  execute: (context?: CommandExecutionContext) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string } | void;
}

export interface InitialLauncherState {
  pinned: PinnedShortcut[];
  recentClusters: HistoryCluster[];
  openTabs: SearchResult[];
  preferences: UserPreferences;
  shortcutLabel: string;
  modelStatus: string;
}

export type ConnectionStatus =
  | 'unconfigured'
  | 'connecting'
  | 'connected'
  | 'stale'
  | 'disconnected'
  | 'unauthorized'
  | 'error';

export type TaskExecutionStatus =
  | 'draft'
  | 'requested_locally'
  | 'transport_accepted'
  | 'runner_accepted'
  | 'runner_queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'timed_out'
  | 'unknown';

export interface BriefingItem {
  id: string;
  title: string;
  summary: string;
  source: 'flowmate' | 'openclaw' | 'google_tasks' | 'calendar' | 'system' | 'user_import';
  sourceUrl?: string;
  observedAt: number;
  dueTime?: string;
  actionRequired: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface PersonalBriefing {
  schemaVersion: number;
  generatedAt: number;
  lastCachedAt: number;
  sourceIdentity: string;
  status: ConnectionStatus;
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
  schemaVersion: number;
  lastChecked: number;
  lastCachedAt: number;
  status: ConnectionStatus;
  account?: string;
  items: ImportantMailItem[];
}

export interface OpenClawNodeInfo {
  id: string;
  name: string;
  host: string;
  status: 'online' | 'offline' | 'unpaired' | 'unreachable';
  role: 'coordinator' | 'worker';
  note?: string;
}

export interface OpenClawJobSummary {
  id: string;
  correlationId?: string;
  task: string;
  host: 'ideapad' | 'thinkbook' | 'sandbox' | 'unknown';
  status: TaskExecutionStatus;
  submittedAt: number;
  startedAt?: number;
  completedAt?: number;
  resultSummary?: string;
  errorMessage?: string;
}

export interface OpenClawSystemStatus {
  schemaVersion: number;
  gatewayState: 'running' | 'stopped' | 'unreachable' | 'unknown';
  gatewayPort: number;
  agentId?: string;
  sessionState: 'running' | 'stopped' | 'unknown';
  activeHost: 'ideapad' | 'thinkbook';
  coordinatorNode: OpenClawNodeInfo;
  workstationNode: OpenClawNodeInfo;
  recentJobs: OpenClawJobSummary[];
  lastObservedAt: number;
  lastCachedAt: number;
  status: ConnectionStatus;
}

export interface TaskSubmissionResponse {
  success: boolean;
  status: TaskExecutionStatus;
  message: string;
  correlationId: string;
  runnerJobId?: string;
  job?: OpenClawJobSummary;
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
  | { type: 'PORTAL_SUBMIT_OPENCLAW_ACTION'; action: string; host?: string }
  | { type: 'PORTAL_TOGGLE_PIN_TAB'; tabId: number; pinned: boolean }
  | { type: 'PORTAL_TOGGLE_MUTE_TAB'; tabId: number; muted: boolean }
  | { type: 'PORTAL_DUPLICATE_TAB'; tabId: number }
  | { type: 'PORTAL_FOCUS_SEARCH' };
