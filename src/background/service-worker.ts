import { intelligenceManager } from '../core/ai/intelligence';
import { storage } from '../core/storage';
import { searchEngine } from '../core/search/engine';

console.log('[Portal Service Worker] Loaded.');

// 1. Installation & Setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Portal] Extension installed/updated:', details.reason);
  // Perform quiet background analysis to prime suggestions
  intelligenceManager.runAnalysis().catch((err) => console.warn('Initial intelligence prime error:', err));
});

// 2. Keyboard Command Handler (Floating Launcher)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-launcher') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) return;

    // Check if the URL is eligible for script injection
    const isInjectable = tab.url.startsWith('http://') || tab.url.startsWith('https://');

    if (isInjectable) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['overlay.js'],
        });
      } catch (err) {
        console.warn('[Portal] Script injection error:', err);
        // Fallback: open Portal tab if injection failed
        await openFallbackTab();
      }
    } else {
      // Restricted page (chrome://, edge://, about:blank, etc.)
      console.log('[Portal] Cannot inject on restricted page:', tab.url);
      await openFallbackTab();
    }
  }
});

async function openFallbackTab() {
  const portalUrl = chrome.runtime.getURL('src/newtab/index.html');
  // Check if a portal tab is already open in current window
  const existingTabs = await chrome.tabs.query({ currentWindow: true, url: portalUrl });
  if (existingTabs.length > 0 && existingTabs[0].id) {
    await chrome.tabs.update(existingTabs[0].id, { active: true });
  } else {
    await chrome.tabs.create({ url: portalUrl });
  }
}

// 3. Omnibox Integration (Keyword: "p <query>")
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  try {
    const prefs = await storage.getPreferences();
    const results = await searchEngine.search(text, prefs);

    const suggestions: chrome.omnibox.SuggestResult[] = results
      .filter((r) => !!r.url)
      .slice(0, 5)
      .map((r) => ({
        content: r.url!,
        description: `<match>${escapeXml(r.title)}</match> <dim>(${escapeXml(r.description || r.url || '')})</dim>`,
      }));

    suggest(suggestions);
  } catch (err) {
    console.warn('[Portal Omnibox] Error searching:', err);
  }
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  let targetUrl = text;
  if (!text.startsWith('http://') && !text.startsWith('https://') && !text.startsWith('chrome://')) {
    // If not a URL, treat as search query
    const prefs = await storage.getPreferences();
    const engine = prefs.searchEngine || 'google';
    targetUrl =
      engine === 'duckduckgo'
        ? `https://duckduckgo.com/?q=${encodeURIComponent(text)}`
        : `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  }

  // Switch tab if already open!
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

// 4. Privacy & History Cleanup Listener
if (chrome.history?.onVisitRemoved) {
  chrome.history.onVisitRemoved.addListener(async (removed) => {
    if (removed.allHistory) {
      console.log('[Portal] Full history wiped — clearing derived AI caches.');
      await storage.clearDerivedData();
    } else {
      // Re-trigger analysis when entries are selectively removed
      intelligenceManager.runAnalysis().catch(() => {});
    }
  });
}

// 5. Message bus for Overlay actions
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'close-tab' && message.tabId) {
    chrome.tabs.remove(message.tabId).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.action === 'switch-tab' && message.tabId && message.windowId) {
    chrome.windows.update(message.windowId, { focused: true }).then(() => {
      chrome.tabs.update(message.tabId, { active: true }).then(() => sendResponse({ success: true }));
    });
    return true;
  }
  return false;
});
