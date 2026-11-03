import {
  UserPreferences,
  PinnedShortcut,
  DismissedItem,
  CustomAlias,
  CachedIntelligence,
  PersonalBriefing,
  ImportantMailSnapshot,
  OpenClawSystemStatus,
  SavedSession,
} from './types';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  searchEngine: 'google',
  maxSuggestions: 8,
  showRecentTabs: true,
  showIntelligentShortcuts: true,
  reducedMotion: false,
  density: 'comfortable',
  zenMode: false,
  autoDetectClipboardUrl: false,
  showIntelligenceBriefing: true,
  showImportantMail: true,
  showOpenClawStatus: true,
  hideMailPreviews: false,
  workspaceLayout: 'daily',
  enabledModules: ['flowmate', 'placement', 'agentic_collab', 'openclaw'],
};

const STORAGE_KEYS = {
  PREFERENCES: 'portal_preferences',
  PINNED: 'portal_pinned_shortcuts',
  DISMISSED: 'portal_dismissed_items',
  ALIASES: 'portal_custom_aliases',
  INTELLIGENCE: 'portal_cached_intelligence',
  BRIEFING: 'portal_cached_briefing',
  MAIL_SNAPSHOT: 'portal_cached_mail',
  OPENCLAW_STATUS: 'portal_cached_openclaw',
  SESSIONS: 'portal_saved_sessions',
  COMMAND_RECENCY: 'portal_recent_commands',
} as const;

class StorageService {
  private memoryFallback = new Map<string, string>();
  private memoryCache = new Map<string, any>();

  constructor() {
    if (this.isExtensionEnvironment() && chrome.storage.onChanged) {
      try {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local') {
            for (const key of Object.keys(changes)) {
              this.memoryCache.delete(key);
            }
          }
        });
      } catch {}
    }
  }

  private isExtensionEnvironment(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
  }

  private getRaw(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return this.memoryFallback.get(key) || null;
  }

  private setRaw(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      this.memoryFallback.set(key, value);
    }
  }

  private removeRaw(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    } else {
      this.memoryFallback.delete(key);
    }
  }

  async getPreferences(): Promise<UserPreferences> {
    if (this.memoryCache.has(STORAGE_KEYS.PREFERENCES)) {
      return this.memoryCache.get(STORAGE_KEYS.PREFERENCES);
    }
    let res: UserPreferences;
    if (this.isExtensionEnvironment()) {
      res = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.PREFERENCES], (result) => {
          resolve({ ...DEFAULT_PREFERENCES, ...(result[STORAGE_KEYS.PREFERENCES] || {}) });
        });
      });
    } else {
      try {
        const stored = this.getRaw(STORAGE_KEYS.PREFERENCES);
        res = stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
      } catch {
        res = DEFAULT_PREFERENCES;
      }
    }
    this.memoryCache.set(STORAGE_KEYS.PREFERENCES, res);
    return res;
  }

  async savePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    this.memoryCache.set(STORAGE_KEYS.PREFERENCES, updated);
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.PREFERENCES]: updated }, () => {
          resolve(updated);
        });
      });
    }
    this.setRaw(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return updated;
  }

  async getPinnedShortcuts(): Promise<PinnedShortcut[]> {
    if (this.memoryCache.has(STORAGE_KEYS.PINNED)) {
      return this.memoryCache.get(STORAGE_KEYS.PINNED);
    }
    let res: PinnedShortcut[];
    if (this.isExtensionEnvironment()) {
      res = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.PINNED], (result) => {
          resolve(result[STORAGE_KEYS.PINNED] || []);
        });
      });
    } else {
      try {
        const stored = this.getRaw(STORAGE_KEYS.PINNED);
        res = stored ? JSON.parse(stored) : [];
      } catch {
        res = [];
      }
    }
    this.memoryCache.set(STORAGE_KEYS.PINNED, res);
    return res;
  }

  async pinShortcut(shortcut: Omit<PinnedShortcut, 'id' | 'addedAt'>): Promise<PinnedShortcut[]> {
    const current = await this.getPinnedShortcuts();
    const existingIndex = current.findIndex((p) => {
      if (shortcut.type === 'session' && shortcut.sessionId) {
        return p.sessionId === shortcut.sessionId;
      }
      return p.url === shortcut.url;
    });
    const item: PinnedShortcut = {
      id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: shortcut.title,
      url: shortcut.url,
      customTitle: shortcut.customTitle,
      type: shortcut.type || 'url',
      sessionId: shortcut.sessionId,
      searchQuery: shortcut.searchQuery,
      tabCount: shortcut.tabCount,
      actionId: shortcut.actionId,
      addedAt: Date.now(),
    };

    let updated: PinnedShortcut[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...current].slice(0, 16);
    }

    this.memoryCache.set(STORAGE_KEYS.PINNED, updated);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.PINNED]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.PINNED, JSON.stringify(updated));
    }
    return updated;
  }

  async unpinShortcut(idOrUrl: string): Promise<PinnedShortcut[]> {
    const current = await this.getPinnedShortcuts();
    const updated = current.filter((p) => p.id !== idOrUrl && p.url !== idOrUrl);
    this.memoryCache.set(STORAGE_KEYS.PINNED, updated);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.PINNED]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.PINNED, JSON.stringify(updated));
    }
    return updated;
  }

  async updateShortcut(id: string, updates: Partial<PinnedShortcut>): Promise<PinnedShortcut[]> {
    const current = await this.getPinnedShortcuts();
    const updated = current.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          customTitle: updates.customTitle !== undefined ? updates.customTitle : p.customTitle,
          title: updates.title !== undefined ? updates.title : p.title,
          url: updates.url !== undefined ? updates.url : p.url,
        };
      }
      return p;
    });
    this.memoryCache.set(STORAGE_KEYS.PINNED, updated);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.PINNED]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.PINNED, JSON.stringify(updated));
    }
    return updated;
  }

  async getDismissedItems(): Promise<DismissedItem[]> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.DISMISSED], (result) => {
          resolve(result[STORAGE_KEYS.DISMISSED] || []);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.DISMISSED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async dismissItem(urlOrDomain: string): Promise<void> {
    const current = await this.getDismissedItems();
    const clean = urlOrDomain.toLowerCase().trim();
    const filtered = current.filter((d) => d.urlOrDomain !== clean);
    const updated = [{ urlOrDomain: clean, dismissedAt: Date.now() }, ...filtered].slice(0, 100);

    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.DISMISSED]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.DISMISSED, JSON.stringify(updated));
    }
  }

  async isDismissed(urlOrDomain: string): Promise<boolean> {
    const dismissed = await this.getDismissedItems();
    const target = urlOrDomain.toLowerCase().trim();
    return dismissed.some((d) => d.urlOrDomain === target);
  }

  async getAliases(): Promise<CustomAlias[]> {
    if (this.memoryCache.has(STORAGE_KEYS.ALIASES)) {
      return this.memoryCache.get(STORAGE_KEYS.ALIASES);
    }
    let res: CustomAlias[];
    if (this.isExtensionEnvironment()) {
      res = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.ALIASES], (result) => {
          resolve(result[STORAGE_KEYS.ALIASES] || []);
        });
      });
    } else {
      try {
        const stored = this.getRaw(STORAGE_KEYS.ALIASES);
        res = stored ? JSON.parse(stored) : [];
      } catch {
        res = [];
      }
    }
    this.memoryCache.set(STORAGE_KEYS.ALIASES, res);
    return res;
  }

  async saveAlias(alias: CustomAlias): Promise<CustomAlias[]> {
    const current = await this.getAliases();
    const filtered = current.filter((a) => a.keyword.toLowerCase() !== alias.keyword.toLowerCase());
    const updated = [alias, ...filtered].slice(0, 50);
    this.memoryCache.set(STORAGE_KEYS.ALIASES, updated);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.ALIASES]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.ALIASES, JSON.stringify(updated));
    }
    return updated;
  }

  async getIntelligence(): Promise<CachedIntelligence | null> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.INTELLIGENCE], (result) => {
          resolve(result[STORAGE_KEYS.INTELLIGENCE] || null);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.INTELLIGENCE);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async saveIntelligence(intel: CachedIntelligence): Promise<void> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.INTELLIGENCE]: intel }, () => resolve());
      });
    }
    this.setRaw(STORAGE_KEYS.INTELLIGENCE, JSON.stringify(intel));
  }

  async clearDerivedData(): Promise<void> {
    this.memoryCache.clear();
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(
          [
            STORAGE_KEYS.INTELLIGENCE,
            STORAGE_KEYS.DISMISSED,
            STORAGE_KEYS.BRIEFING,
            STORAGE_KEYS.MAIL_SNAPSHOT,
            STORAGE_KEYS.OPENCLAW_STATUS,
            STORAGE_KEYS.COMMAND_RECENCY,
          ],
          () => resolve(),
        );
      });
    }
    this.memoryFallback.delete(STORAGE_KEYS.INTELLIGENCE);
    this.memoryFallback.delete(STORAGE_KEYS.DISMISSED);
    this.memoryFallback.delete(STORAGE_KEYS.BRIEFING);
    this.memoryFallback.delete(STORAGE_KEYS.MAIL_SNAPSHOT);
    this.memoryFallback.delete(STORAGE_KEYS.OPENCLAW_STATUS);
    this.memoryFallback.delete(STORAGE_KEYS.COMMAND_RECENCY);
    this.removeRaw(STORAGE_KEYS.INTELLIGENCE);
    this.removeRaw(STORAGE_KEYS.DISMISSED);
    this.removeRaw(STORAGE_KEYS.BRIEFING);
    this.removeRaw(STORAGE_KEYS.MAIL_SNAPSHOT);
    this.removeRaw(STORAGE_KEYS.OPENCLAW_STATUS);
    this.removeRaw(STORAGE_KEYS.COMMAND_RECENCY);
  }

  // --- Personal Intelligence Briefing Cache ---
  async getBriefing(): Promise<PersonalBriefing | null> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.BRIEFING], (result) => {
          resolve(result[STORAGE_KEYS.BRIEFING] || null);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.BRIEFING);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async saveBriefing(briefing: PersonalBriefing): Promise<void> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.BRIEFING]: briefing }, () => resolve());
      });
    }
    this.setRaw(STORAGE_KEYS.BRIEFING, JSON.stringify(briefing));
  }

  // --- Important Mail Highlights Cache ---
  async getMailSnapshot(): Promise<ImportantMailSnapshot | null> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.MAIL_SNAPSHOT], (result) => {
          resolve(result[STORAGE_KEYS.MAIL_SNAPSHOT] || null);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.MAIL_SNAPSHOT);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async saveMailSnapshot(snapshot: ImportantMailSnapshot): Promise<void> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.MAIL_SNAPSHOT]: snapshot }, () => resolve());
      });
    }
    this.setRaw(STORAGE_KEYS.MAIL_SNAPSHOT, JSON.stringify(snapshot));
  }

  // --- OpenClaw Activity & System Status Cache ---
  async getOpenClawStatus(): Promise<OpenClawSystemStatus | null> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.OPENCLAW_STATUS], (result) => {
          resolve(result[STORAGE_KEYS.OPENCLAW_STATUS] || null);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.OPENCLAW_STATUS);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async saveOpenClawStatus(status: OpenClawSystemStatus): Promise<void> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.OPENCLAW_STATUS]: status }, () => resolve());
      });
    }
    this.setRaw(STORAGE_KEYS.OPENCLAW_STATUS, JSON.stringify(status));
  }

  // --- Saved Browsing Workspaces & Recoverable Sessions ---
  async getSavedSessions(): Promise<SavedSession[]> {
    if (this.memoryCache.has(STORAGE_KEYS.SESSIONS)) {
      return this.memoryCache.get(STORAGE_KEYS.SESSIONS);
    }
    let res: SavedSession[];
    if (this.isExtensionEnvironment()) {
      res = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
          resolve(result[STORAGE_KEYS.SESSIONS] || []);
        });
      });
    } else {
      try {
        const stored = this.getRaw(STORAGE_KEYS.SESSIONS);
        res = stored ? JSON.parse(stored) : [];
      } catch {
        res = [];
      }
    }
    this.memoryCache.set(STORAGE_KEYS.SESSIONS, res);
    return res;
  }

  async getSessionById(id: string): Promise<SavedSession | null> {
    const sessions = await this.getSavedSessions();
    return sessions.find((s) => s.id === id) || null;
  }

  async saveSession(name: string, tabs: { title: string; url: string; favicon?: string }[]): Promise<SavedSession> {
    const existing = await this.getSavedSessions();

    // 1. Sanitize and validate tabs: must be valid http, https, or extension URLs
    const seenUrls = new Set<string>();
    const validTabs: { title: string; url: string; favicon?: string }[] = [];

    for (const tab of tabs) {
      if (!tab.url) continue;
      const trimmed = tab.url.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('chrome-extension://')) {
        continue;
      }
      const norm = trimmed.toLowerCase().split('#')[0].replace(/\/$/, '');
      if (seenUrls.has(norm)) continue;
      seenUrls.add(norm);
      validTabs.push({
        title: tab.title?.trim() || trimmed,
        url: trimmed,
        favicon: tab.favicon,
      });
    }

    const session: SavedSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      savedAt: Date.now(),
      tabCount: validTabs.length,
      tabs: validTabs,
    };

    // Capacity up to 100 sessions to avoid premature silent dropping
    const updated = [session, ...existing].slice(0, 100);
    this.memoryCache.set(STORAGE_KEYS.SESSIONS, updated);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    }
    return session;
  }

  async renameSavedSession(id: string, newName: string): Promise<SavedSession | null> {
    const trimmed = newName.trim();
    if (!trimmed) return null;
    const existing = await this.getSavedSessions();
    const target = existing.find((s) => s.id === id);
    if (!target) return null;
    target.name = trimmed;
    this.memoryCache.set(STORAGE_KEYS.SESSIONS, existing);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: existing }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.SESSIONS, JSON.stringify(existing));
    }
    return target;
  }

  async deleteSavedSession(id: string): Promise<boolean> {
    const existing = await this.getSavedSessions();
    const updated = existing.filter((s) => s.id !== id);
    if (updated.length === existing.length) return false;
    this.memoryCache.set(STORAGE_KEYS.SESSIONS, updated);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    }
    return true;
  }

  async restoreSession(id: string): Promise<{ success: boolean; tabCount: number; message: string }> {
    const session = await this.getSessionById(id);
    if (!session || session.tabs.length === 0) {
      return { success: false, tabCount: 0, message: 'Workspace session not found or contains no tabs.' };
    }
    const validUrls = session.tabs
      .map((t) => t.url)
      .filter((url) => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('chrome-extension://')));
    if (validUrls.length === 0) {
      return { success: false, tabCount: 0, message: 'No valid URLs found in session.' };
    }
    if (typeof chrome !== 'undefined' && chrome.windows?.create) {
      await chrome.windows.create({ url: validUrls });
    } else if (typeof window !== 'undefined') {
      validUrls.forEach((u) => window.open(u, '_blank'));
    }
    return { success: true, tabCount: validUrls.length, message: `Restored workspace "${session.name}" (${validUrls.length} tabs)` };
  }

  async getRecentCommandIds(): Promise<string[]> {
    if (this.memoryCache.has(STORAGE_KEYS.COMMAND_RECENCY)) {
      return this.memoryCache.get(STORAGE_KEYS.COMMAND_RECENCY);
    }
    let res: string[];
    if (this.isExtensionEnvironment()) {
      res = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.COMMAND_RECENCY], (result) => {
          resolve(result[STORAGE_KEYS.COMMAND_RECENCY] || []);
        });
      });
    } else {
      try {
        const stored = this.getRaw(STORAGE_KEYS.COMMAND_RECENCY);
        res = stored ? JSON.parse(stored) : [];
      } catch {
        res = [];
      }
    }
    this.memoryCache.set(STORAGE_KEYS.COMMAND_RECENCY, res);
    return res;
  }

  async recordCommandExecution(commandId: string): Promise<void> {
    const trimmed = commandId ? commandId.trim() : '';
    if (!trimmed) return;
    const current = await this.getRecentCommandIds();
    const updated = [trimmed, ...current.filter((id) => id !== trimmed)].slice(0, 20);
    this.memoryCache.set(STORAGE_KEYS.COMMAND_RECENCY, updated);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.COMMAND_RECENCY]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.COMMAND_RECENCY, JSON.stringify(updated));
    }
  }
}

export const storage = new StorageService();
