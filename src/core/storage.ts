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
} as const;

class StorageService {
  private memoryFallback = new Map<string, string>();

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
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.PREFERENCES], (result) => {
          resolve({ ...DEFAULT_PREFERENCES, ...(result[STORAGE_KEYS.PREFERENCES] || {}) });
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.PREFERENCES);
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  async savePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
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
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.PINNED], (result) => {
          resolve(result[STORAGE_KEYS.PINNED] || []);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.PINNED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async pinShortcut(shortcut: Omit<PinnedShortcut, 'id' | 'addedAt'>): Promise<PinnedShortcut[]> {
    const current = await this.getPinnedShortcuts();
    const existingIndex = current.findIndex((p) => p.url === shortcut.url);
    const item: PinnedShortcut = {
      id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: shortcut.title,
      url: shortcut.url,
      customTitle: shortcut.customTitle,
      addedAt: Date.now(),
    };

    let updated: PinnedShortcut[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...current].slice(0, 16);
    }

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
          ...updates,
          id: p.id, // preserve id
        };
      }
      return p;
    });
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
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.ALIASES], (result) => {
          resolve(result[STORAGE_KEYS.ALIASES] || []);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.ALIASES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveAlias(alias: CustomAlias): Promise<CustomAlias[]> {
    const current = await this.getAliases();
    const filtered = current.filter((a) => a.keyword.toLowerCase() !== alias.keyword.toLowerCase());
    const updated = [alias, ...filtered].slice(0, 50);
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
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(
          [
            STORAGE_KEYS.INTELLIGENCE,
            STORAGE_KEYS.DISMISSED,
            STORAGE_KEYS.BRIEFING,
            STORAGE_KEYS.MAIL_SNAPSHOT,
            STORAGE_KEYS.OPENCLAW_STATUS,
          ],
          () => resolve(),
        );
      });
    }
    this.removeRaw(STORAGE_KEYS.INTELLIGENCE);
    this.removeRaw(STORAGE_KEYS.DISMISSED);
    this.removeRaw(STORAGE_KEYS.BRIEFING);
    this.removeRaw(STORAGE_KEYS.MAIL_SNAPSHOT);
    this.removeRaw(STORAGE_KEYS.OPENCLAW_STATUS);
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
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SESSIONS], (result) => {
          resolve(result[STORAGE_KEYS.SESSIONS] || []);
        });
      });
    }
    try {
      const stored = this.getRaw(STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
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
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: updated }, () => resolve());
      });
    } else {
      this.setRaw(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    }
    return true;
  }
}

export const storage = new StorageService();
