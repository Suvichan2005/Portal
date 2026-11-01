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
  | { type: 'PORTAL_PIN_SHORTCUT'; shortcut: Omit<PinnedShortcut, 'addedAt'> };
