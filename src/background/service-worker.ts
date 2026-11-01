import { intelligenceManager } from '../core/ai/intelligence';
import { storage } from '../core/storage';
import { searchEngine } from '../core/search/engine';
import { COMMANDS } from '../core/commands/registry';
import { PortalMessage, SearchResult } from '../core/types';

console.log('[Portal Service Worker] Initializing v1.1.0...');

// 1. Installation & Setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Portal] Extension installed/updated:', details.reason);
  try {
    await intelligenceManager.runAnalysis();
  } catch (err) {
    console.warn('[Portal] Initial intelligence prime error:', err);
  }
});

// 2. Action (Toolbar Icon) Click Handler
chrome.action.onClicked.addListener(async (tab) => {
  await handleToggleLauncher(tab);
});

// 3. Keyboard Command Handler (Alt+Q)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-launcher') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await handleToggleLauncher(tab);
  }
});

async function handleToggleLauncher(tab?: chrome.tabs.Tab) {
  if (!tab || !tab.id || !tab.url) {
    await openOrFocusPortalTab();
    return;
  }

  // Eligible URLs for script injection (standard http / https pages)
  const isInjectable = tab.url.startsWith('http://') || tab.url.startsWith('https://');

  if (isInjectable) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['overlay.js'],
      });
    } catch (err) {
      console.warn('[Portal] Script injection error, falling back to tab:', err);
      await openOrFocusPortalTab();
    }
  } else {
    // Restricted Chrome page (chrome://, chrome-extension://, edge://, etc.)
    console.log('[Portal] Cannot inject into restricted URL, opening Portal tab:', tab.url);
    await openOrFocusPortalTab();
  }
}

async function openOrFocusPortalTab() {
  const portalUrl = chrome.runtime.getURL('src/newtab/index.html');
  const existingTabs = await chrome.tabs.query({ currentWindow: true, url: portalUrl });
  if (existingTabs.length > 0 && existingTabs[0].id) {
    await chrome.tabs.update(existingTabs[0].id, { active: true });
  } else {
    await chrome.tabs.create({ url: portalUrl, active: true });
  }
}

// 4. Omnibox Integration (Keyword: "p <query>")
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  try {
    const prefs = await storage.getPreferences();
    const results = await searchEngine.search(text, prefs, { context: 'newtab' });

    const suggestions: chrome.omnibox.SuggestResult[] = results
      .filter((r) => !!r.url)
      .slice(0, 6)
      .map((r) => ({
        content: r.url!,
        description: `<match>${escapeXml(r.title)}</match> <dim>(${escapeXml(r.description || r.url || '')})</dim>`,
      }));

    suggest(suggestions);
  } catch (err) {
    console.warn('[Portal Omnibox] Search error:', err);
  }
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  let targetUrl = text.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('chrome://')) {
    const prefs = await storage.getPreferences();
    const engine = prefs.searchEngine || 'google';
    targetUrl =
      engine === 'duckduckgo'
        ? `https://duckduckgo.com/?q=${encodeURIComponent(text)}`
        : engine === 'bing'
          ? `https://www.bing.com/search?q=${encodeURIComponent(text)}`
          : `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  }

  // If already open, switch to it!
  const tabs = await chrome.tabs.query({});
  const existingTab = tabs.find((t) => t.url && t.url.toLowerCase() === targetUrl.toLowerCase());

  if (existingTab && existingTab.id && existingTab.windowId) {
    await chrome.windows.update(existingTab.windowId, { focused: true });
    await chrome.tabs.update(existingTab.id, { active: true });
    return;
  }

  if (disposition === 'currentTab') {
    await chrome.tabs.update({ url: targetUrl });
  } else if (disposition === 'newForegroundTab') {
    await chrome.tabs.create({ url: targetUrl, active: true });
  } else {
    await chrome.tabs.create({ url: targetUrl, active: false });
  }
});

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

// 5. Privacy & History Cleanup Listener
if (chrome.history?.onVisitRemoved) {
  chrome.history.onVisitRemoved.addListener(async (removed) => {
    if (removed.allHistory) {
      console.log('[Portal] All history wiped — clearing derived AI caches.');
      await storage.clearDerivedData();
    } else {
      intelligenceManager.runAnalysis().catch(() => {});
    }
  });
}

// 6. Central Message Bus for Extension Actions (Overlay & NewTab)
chrome.runtime.onMessage.addListener((message: PortalMessage, sender, sendResponse) => {
  handlePortalMessage(message, sender)
    .then((res) => sendResponse(res))
    .catch((err) => sendResponse({ success: false, error: err.message }));
  return true; // Keep message channel open for async response
});

async function handlePortalMessage(message: PortalMessage, sender: chrome.runtime.MessageSender): Promise<any> {
  const currentTabId = sender.tab?.id;

  switch (message.type) {
    case 'PORTAL_SEARCH': {
      const prefs = await storage.getPreferences();
      const results = await searchEngine.search(message.query, prefs, {
        context: message.context,
        currentTabId,
      });
      return { success: true, results };
    }

    case 'PORTAL_GET_INITIAL_STATE': {
      const prefs = await storage.getPreferences();
      const pinned = await storage.getPinnedShortcuts();
      const intel = await storage.getIntelligence();
      const recentClusters = intel?.clusters || [];
      const tabs = await chrome.tabs.query({});
      const openTabs: SearchResult[] = tabs
        .filter((t) => t.url && !t.url.startsWith('chrome://newtab') && (!currentTabId || t.id !== currentTabId))
        .map((t) => ({
          id: `tab-${t.id}`,
          type: 'tab',
          title: t.title || t.url || 'Tab',
          url: t.url,
          description: `Open tab • ${new URL(t.url || '').hostname}`,
          tabId: t.id,
          windowId: t.windowId,
          badge: 'SWITCH TAB',
          score: 100,
        }));

      return {
        success: true,
        pinned,
        recentClusters: recentClusters.slice(0, 6),
        openTabs: openTabs.slice(0, 10),
        preferences: prefs,
        shortcutLabel: 'Alt+Q',
        modelStatus: intel?.modelStatus || 'heuristic_active',
      };
    }

    case 'PORTAL_EXECUTE_ACTION': {
      return await executePortalAction(message.item, message.context, sender, message.modifiers);
    }

    case 'PORTAL_CLOSE_TAB': {
      if (message.tabId) {
        await chrome.tabs.remove(message.tabId);
        return { success: true };
      }
      return { success: false, error: 'No tabId provided' };
    }

    case 'PORTAL_SWITCH_TAB': {
      if (message.tabId) {
        if (message.windowId) {
          await chrome.windows.update(message.windowId, { focused: true });
        }
        await chrome.tabs.update(message.tabId, { active: true });
        return { success: true };
      }
      return { success: false, error: 'No tabId provided' };
    }

    case 'PORTAL_PIN_SHORTCUT': {
      const updated = await storage.pinShortcut(message.shortcut);
      return { success: true, pinned: updated };
    }

    case 'PORTAL_DISMISS_SHORTCUT': {
      const updated = await storage.dismissItem(message.urlOrDomain);
      return { success: true, dismissed: updated };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Context-aware action execution logic.
 */
async function executePortalAction(
  item: SearchResult,
  context: 'overlay' | 'newtab',
  sender: chrome.runtime.MessageSender,
  modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean },
): Promise<{ success: boolean; message?: string }> {
  // 1. Command execution
  if (item.type === 'command' && item.commandId) {
    const cmd = COMMANDS.find((c) => c.id === item.commandId);
    if (cmd) {
      const res = await cmd.execute();
      return res || { success: true };
    }
    return { success: false, message: `Command ${item.commandId} not found` };
  }

  // 2. Tab switching
  if (item.type === 'tab' && item.tabId) {
    if (item.windowId) {
      await chrome.windows.update(item.windowId, { focused: true });
    }
    await chrome.tabs.update(item.tabId, { active: true });
    return { success: true, message: `Switched to ${item.title}` };
  }

  // 3. URL Navigation / Web Search
  if (item.url) {
    // If the URL is already open in an existing tab, prefer switching to it!
    const tabs = await chrome.tabs.query({});
    const cleanTarget = item.url.toLowerCase().split('#')[0].replace(/\/$/, '');
    const existing = tabs.find(
      (t) => t.url && t.url.toLowerCase().split('#')[0].replace(/\/$/, '') === cleanTarget,
    );

    if (existing && existing.id && existing.windowId) {
      await chrome.windows.update(existing.windowId, { focused: true });
      await chrome.tabs.update(existing.id, { active: true });
      return { success: true, message: `Switched to existing tab: ${item.title}` };
    }

    // Destination handling:
    // In Overlay: NEVER replace current host webpage by default!
    // Open in new foreground tab, preserving host page.
    if (context === 'overlay') {
      if (modifiers?.shift || modifiers?.alt) {
        // Explicit modifier requested in-place navigation
        if (sender.tab?.id) {
          await chrome.tabs.update(sender.tab.id, { url: item.url });
          return { success: true };
        }
      }
      // Default for overlay: create new tab
      await chrome.tabs.create({ url: item.url, active: true });
      return { success: true, message: `Opened in new tab` };
    }

    // In New Tab:
    // If current tab is New Tab, update current tab (avoids creating duplicate blank tab)
    if (context === 'newtab') {
      if (modifiers?.ctrl || modifiers?.meta) {
        await chrome.tabs.create({ url: item.url, active: false });
        return { success: true };
      }
      if (sender.tab?.id) {
        await chrome.tabs.update(sender.tab.id, { url: item.url });
        return { success: true };
      }
      await chrome.tabs.create({ url: item.url, active: true });
      return { success: true };
    }
  }

  return { success: false, message: 'No valid action or destination' };
}
