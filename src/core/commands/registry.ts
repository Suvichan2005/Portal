import { BrowserCommand } from '../types';
import { storage } from '../storage';

export const COMMANDS: BrowserCommand[] = [
  {
    id: 'close-duplicates',
    title: 'Close Duplicate Tabs',
    description: 'Find and close duplicate tabs across all open windows',
    category: 'tabs',
    keywords: ['close', 'duplicate', 'dedupe', 'clean', 'tabs', 'memory'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.tabs) return;
      const tabs = await chrome.tabs.query({});
      const seenUrls = new Set<string>();
      const toClose: number[] = [];

      for (const tab of tabs) {
        if (!tab.url || !tab.id) continue;
        if (seenUrls.has(tab.url)) {
          toClose.push(tab.id);
        } else {
          seenUrls.add(tab.url);
        }
      }

      if (toClose.length > 0) {
        await chrome.tabs.remove(toClose);
      }
    },
  },
  {
    id: 'restore-closed-tab',
    title: 'Restore Closed Tab',
    description: 'Reopen the most recently closed tab or window',
    category: 'tabs',
    keywords: ['restore', 'reopen', 'undo', 'closed', 'tab'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.sessions) return;
      const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
      if (sessions.length > 0) {
        const session = sessions[0];
        if (session.tab?.sessionId) {
          await chrome.sessions.restore(session.tab.sessionId);
        } else if (session.window?.sessionId) {
          await chrome.sessions.restore(session.window.sessionId);
        }
      }
    },
  },
  {
    id: 'new-incognito-window',
    title: 'New Incognito Window',
    description: 'Open a private browsing window',
    category: 'navigation',
    keywords: ['incognito', 'private', 'secret', 'window', 'new'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.windows) return;
      await chrome.windows.create({ incognito: true });
    },
  },
  {
    id: 'open-chrome-bookmarks',
    title: 'Open Bookmarks Manager',
    description: 'Manage all saved bookmarks and folders',
    category: 'navigation',
    keywords: ['bookmarks', 'star', 'saved', 'manager', 'folder'],
    execute: async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'chrome://bookmarks' });
      } else {
        window.open('chrome://bookmarks', '_blank');
      }
    },
  },
  {
    id: 'open-chrome-history',
    title: 'Open History',
    description: 'View full browsing history',
    category: 'history',
    keywords: ['history', 'recent', 'visited', 'log'],
    execute: async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'chrome://history' });
      } else {
        window.open('chrome://history', '_blank');
      }
    },
  },
  {
    id: 'open-chrome-downloads',
    title: 'Open Downloads',
    description: 'View downloaded files and status',
    category: 'navigation',
    keywords: ['downloads', 'files', 'saved'],
    execute: async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'chrome://downloads' });
      } else {
        window.open('chrome://downloads', '_blank');
      }
    },
  },
  {
    id: 'open-chrome-extensions',
    title: 'Manage Extensions',
    description: 'Open Chrome extension settings and permissions',
    category: 'settings',
    keywords: ['extensions', 'plugins', 'addons', 'manage'],
    execute: async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'chrome://extensions' });
      } else {
        window.open('chrome://extensions', '_blank');
      }
    },
  },
  {
    id: 'open-chrome-settings',
    title: 'Chrome Settings',
    description: 'Open browser preferences and configuration',
    category: 'settings',
    keywords: ['settings', 'preferences', 'config', 'options'],
    execute: async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'chrome://settings' });
      } else {
        window.open('chrome://settings', '_blank');
      }
    },
  },
  {
    id: 'toggle-theme',
    title: 'Toggle Theme',
    description: 'Switch between light, dark, and system theme',
    category: 'settings',
    keywords: ['theme', 'dark', 'light', 'mode', 'color', 'toggle'],
    execute: async () => {
      const prefs = await storage.getPreferences();
      const nextTheme = prefs.theme === 'dark' ? 'light' : prefs.theme === 'light' ? 'system' : 'dark';
      await storage.savePreferences({ theme: nextTheme });
      document.documentElement.setAttribute('data-theme', nextTheme);
    },
  },
  {
    id: 'clear-ai-cache',
    title: 'Clear Recommendation & AI Cache',
    description: 'Remove cached browsing recommendations and start fresh',
    category: 'settings',
    keywords: ['clear', 'cache', 'ai', 'recommendations', 'reset', 'privacy'],
    execute: async () => {
      await storage.clearDerivedData();
      window.location.reload();
    },
  },
];
