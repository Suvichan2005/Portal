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
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        return { success: false, message: 'Tabs API not available' };
      }
      const tabs = await chrome.tabs.query({});
      const seenUrls = new Set<string>();
      const toClose: number[] = [];

      for (const tab of tabs) {
        if (!tab.url || !tab.id || tab.url.startsWith('chrome://newtab')) continue;
        const norm = tab.url.toLowerCase().split('#')[0].replace(/\/$/, '');
        if (seenUrls.has(norm)) {
          toClose.push(tab.id);
        } else {
          seenUrls.add(norm);
        }
      }

      if (toClose.length > 0) {
        await chrome.tabs.remove(toClose);
        return { success: true, message: `Closed ${toClose.length} duplicate tab${toClose.length > 1 ? 's' : ''}` };
      }
      return { success: true, message: 'No duplicate tabs found' };
    },
  },
  {
    id: 'restore-closed-tab',
    title: 'Restore Closed Tab',
    description: 'Reopen the most recently closed tab or window',
    category: 'tabs',
    keywords: ['restore', 'reopen', 'undo', 'closed', 'tab'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.sessions) {
        return { success: false, message: 'Sessions API not available' };
      }
      try {
        const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
        if (sessions.length > 0) {
          const session = sessions[0];
          if (session.tab?.sessionId) {
            await chrome.sessions.restore(session.tab.sessionId);
            return { success: true, message: 'Restored closed tab' };
          } else if (session.window?.sessionId) {
            await chrome.sessions.restore(session.window.sessionId);
            return { success: true, message: 'Restored closed window' };
          }
        }
        return { success: false, message: 'No recently closed tabs to restore' };
      } catch (err: any) {
        return { success: false, message: `Failed to restore tab: ${err.message}` };
      }
    },
  },
  {
    id: 'duplicate-current-tab',
    title: 'Duplicate Current Tab',
    description: 'Create an exact duplicate of the active tab',
    category: 'tabs',
    keywords: ['duplicate', 'clone', 'tab', 'copy'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.tabs) return { success: false };
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.duplicate(tab.id);
        return { success: true, message: 'Tab duplicated' };
      }
      return { success: false };
    },
  },
  {
    id: 'pin-current-tab',
    title: 'Toggle Pin on Tab',
    description: 'Pin or unpin the currently active tab',
    category: 'tabs',
    keywords: ['pin', 'unpin', 'tab', 'dock'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.tabs) return { success: false };
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.update(tab.id, { pinned: !tab.pinned });
        return { success: true, message: tab.pinned ? 'Tab unpinned' : 'Tab pinned' };
      }
      return { success: false };
    },
  },
  {
    id: 'new-incognito-window',
    title: 'New Incognito Window',
    description: 'Open a private browsing window',
    category: 'navigation',
    keywords: ['incognito', 'private', 'secret', 'window', 'new'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.windows) return { success: false };
      await chrome.windows.create({ incognito: true });
      return { success: true, message: 'Incognito window opened' };
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
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
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
      return { success: true, message: `Theme switched to ${nextTheme}` };
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
      return { success: true, message: 'AI discovery cache cleared' };
    },
  },
  {
    id: 'sleep-inactive-tabs',
    title: 'Sleep Inactive Tabs (Save Memory)',
    description: 'Discard tabs inactive for >10 mins to reclaim RAM while keeping tab titles',
    category: 'tabs',
    keywords: ['sleep', 'suspend', 'discard', 'memory', 'ram', 'free', 'clean', 'tabs', 'performance'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        return { success: false, message: 'Tabs API not available' };
      }
      try {
        const tabs = await chrome.tabs.query({ active: false, currentWindow: true });
        const now = Date.now();
        const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes safe threshold
        let suspendedCount = 0;
        let recentCount = 0;

        for (const tab of tabs) {
          if (tab.id && !tab.discarded && !tab.pinned && !tab.audible) {
            // Check lastAccessed threshold
            const lastActive = tab.lastAccessed || 0;
            if (now - lastActive >= INACTIVITY_MS || !tab.lastAccessed) {
              try {
                await chrome.tabs.discard(tab.id);
                suspendedCount++;
              } catch {
                // Ignore tabs that cannot be discarded
              }
            } else {
              recentCount++;
            }
          }
        }

        if (suspendedCount > 0) {
          return {
            success: true,
            message: `Put ${suspendedCount} inactive background tab${suspendedCount > 1 ? 's' : ''} to sleep`,
          };
        }

        if (recentCount > 0) {
          return {
            success: true,
            message: `${recentCount} background tab${recentCount > 1 ? 's were' : ' was'} used recently (<10m). Use /sleep-all to force.`,
          };
        }

        return { success: true, message: 'All background tabs are already sleeping' };
      } catch (err: any) {
        return { success: false, message: `Could not suspend tabs: ${err.message}` };
      }
    },
  },
  {
    id: 'force-sleep-all-tabs',
    title: 'Force Sleep All Background Tabs',
    description: 'Immediately discard all background tabs regardless of recent activity',
    category: 'tabs',
    keywords: ['force', 'sleep', 'all', 'tabs', 'ram', 'memory', 'discard', 'hibernate'],
    execute: async () => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        return { success: false, message: 'Tabs API not available' };
      }
      try {
        const tabs = await chrome.tabs.query({ active: false, currentWindow: true });
        let suspendedCount = 0;
        for (const tab of tabs) {
          if (tab.id && !tab.discarded && !tab.pinned && !tab.audible) {
            try {
              await chrome.tabs.discard(tab.id);
              suspendedCount++;
            } catch {}
          }
        }
        if (suspendedCount > 0) {
          return {
            success: true,
            message: `Force-suspended ${suspendedCount} background tab${suspendedCount > 1 ? 's' : ''}`,
          };
        }
        return { success: true, message: 'No suspendable background tabs found' };
      } catch (err: any) {
        return { success: false, message: `Could not suspend tabs: ${err.message}` };
      }
    },
  },
  {
    id: 'toggle-zen-mode',
    title: 'Toggle Zen / Focus Mode',
    description: 'Switch between full dashboard and distraction-free minimal view',
    category: 'settings',
    keywords: ['zen', 'focus', 'minimal', 'clean', 'distraction', 'hide', 'mode'],
    execute: async () => {
      const prefs = await storage.getPreferences();
      const nextZen = !prefs.zenMode;
      await storage.savePreferences({ zenMode: nextZen });

      // Apply to active document if in webpage/newtab context
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('zen-mode', nextZen);
        try {
          localStorage.setItem('portal_zen_mode', nextZen ? 'true' : 'false');
        } catch {}
      }

      return {
        success: true,
        message: nextZen ? 'Zen mode enabled (Press Z to exit)' : 'Zen mode disabled',
      };
    },
  },
  {
    id: 'open-clipboard-url',
    title: 'Open Link from Clipboard',
    description: 'Read copied URL from clipboard and navigate to it',
    category: 'navigation',
    keywords: ['clipboard', 'paste', 'url', 'link', 'open', 'go'],
    execute: async () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        try {
          const text = (await navigator.clipboard.readText()).trim();
          if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('chrome://')) {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
              await chrome.tabs.create({ url: text });
            } else {
              window.location.href = text;
            }
            return { success: true, message: `Opening ${new URL(text).hostname}` };
          }
          return { success: false, message: 'Clipboard does not contain a valid URL' };
        } catch (err: any) {
          return { success: false, message: `Clipboard read denied: ${err.message}` };
        }
      }
      return { success: false, message: 'Clipboard API not available in this context' };
    },
  },
  {
    id: 'openclaw-status',
    title: 'OpenClaw Gateway & Dashboard',
    description: 'Open the OpenClaw orchestration dashboard (localhost:57849)',
    category: 'navigation',
    keywords: ['openclaw', 'gateway', 'dashboard', 'jobs', 'agents', 'status'],
    execute: async () => {
      const gatewayUrl = 'http://127.0.0.1:57849/';
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: gatewayUrl });
      } else {
        window.open(gatewayUrl, '_blank');
      }
      return { success: true, message: 'Opening OpenClaw Gateway Dashboard' };
    },
  },
  {
    id: 'open-chrome-flags',
    title: 'Chrome Experiments & AI Flags',
    description: 'Configure on-device Gemini Nano & Prompt API flags',
    category: 'settings',
    keywords: ['flags', 'ai', 'nano', 'gemini', 'prompt', 'experiments'],
    execute: async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'chrome://flags' });
      } else {
        window.open('chrome://flags', '_blank');
      }
      return { success: true };
    },
  },
  {
    id: 'open-chrome-components',
    title: 'Chrome Components & Model Updater',
    description: 'Inspect On-Device Model and browser component updates',
    category: 'settings',
    keywords: ['components', 'updater', 'model', 'nano', 'ai'],
    execute: async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        await chrome.tabs.create({ url: 'chrome://components' });
      } else {
        window.open('chrome://components', '_blank');
      }
      return { success: true };
    },
  },
];
