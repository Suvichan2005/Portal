import {
  UserPreferences,
  PinnedShortcut,
  DismissedItem,
  CustomAlias,
  CachedIntelligence,
} from './types';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  searchEngine: 'google',
  maxSuggestions: 8,
  showRecentTabs: true,
  showIntelligentShortcuts: true,
  reducedMotion: false,
  density: 'comfortable',
};

const STORAGE_KEYS = {
  PREFERENCES: 'portal_preferences',
  PINNED: 'portal_pinned_shortcuts',
  DISMISSED: 'portal_dismissed_items',
  ALIASES: 'portal_custom_aliases',
  INTELLIGENCE: 'portal_cached_intelligence',
} as const;

class StorageService {
  private isExtensionEnvironment(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
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
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
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
        chrome.storage.local.set({ [STORAGE_KEYS.PREFERENCES]: updated }, () => resolve(updated));
      });
    }
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
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
      const stored = localStorage.getItem(STORAGE_KEYS.PINNED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async pinShortcut(shortcut: Omit<PinnedShortcut, 'addedAt'>): Promise<PinnedShortcut[]> {
    const current = await this.getPinnedShortcuts();
    const existingIndex = current.findIndex((p) => p.url === shortcut.url || p.id === shortcut.id);
    const item: PinnedShortcut = {
      ...shortcut,
      addedAt: Date.now(),
    };
    let updated: PinnedShortcut[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...current];
    }
    // Limit to max 24 pinned items
    updated = updated.slice(0, 24);

    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.PINNED]: updated }, () => resolve());
      });
    } else {
      localStorage.setItem(STORAGE_KEYS.PINNED, JSON.stringify(updated));
    }
    return updated;
  }

  async unpinShortcut(urlOrId: string): Promise<PinnedShortcut[]> {
    const current = await this.getPinnedShortcuts();
    const updated = current.filter((p) => p.id !== urlOrId && p.url !== urlOrId);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.PINNED]: updated }, () => resolve());
      });
    } else {
      localStorage.setItem(STORAGE_KEYS.PINNED, JSON.stringify(updated));
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
      const stored = localStorage.getItem(STORAGE_KEYS.DISMISSED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async dismissItem(urlOrDomain: string): Promise<DismissedItem[]> {
    const current = await this.getDismissedItems();
    const cleanKey = urlOrDomain.toLowerCase().trim();
    if (current.some((d) => d.urlOrDomain === cleanKey)) return current;

    const updated = [{ urlOrDomain: cleanKey, dismissedAt: Date.now() }, ...current].slice(0, 100);
    if (this.isExtensionEnvironment()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.DISMISSED]: updated }, () => resolve());
      });
    } else {
      localStorage.setItem(STORAGE_KEYS.DISMISSED, JSON.stringify(updated));
    }
    return updated;
  }

  async isDismissed(urlOrDomain: string): Promise<boolean> {
    const dismissed = await this.getDismissedItems();
    const lower = urlOrDomain.toLowerCase().trim();
    try {
      const host = new URL(urlOrDomain).hostname.toLowerCase();
      return dismissed.some((d) => d.urlOrDomain === lower || d.urlOrDomain === host);
    } catch {
      return dismissed.some((d) => d.urlOrDomain === lower);
    }
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
      const stored = localStorage.getItem(STORAGE_KEYS.ALIASES);
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
      localStorage.setItem(STORAGE_KEYS.ALIASES, JSON.stringify(updated));
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
      const stored = localStorage.getItem(STORAGE_KEYS.INTELLIGENCE);
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
    localStorage.setItem(STORAGE_KEYS.INTELLIGENCE, JSON.stringify(intel));
  }

  async clearDerivedData(): Promise<void> {
    if (this.isExtensionEnvironment()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([STORAGE_KEYS.INTELLIGENCE, STORAGE_KEYS.DISMISSED], () => resolve());
      });
    }
    localStorage.removeItem(STORAGE_KEYS.INTELLIGENCE);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED);
  }
}

export const storage = new StorageService();
