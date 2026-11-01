import { searchEngine } from '../core/search/engine';
import { storage } from '../core/storage';
import { intelligenceManager } from '../core/ai/intelligence';
import { promptApi } from '../core/ai/prompt-api';
import { SearchResult, PinnedShortcut, HistoryCluster, UserPreferences } from '../core/types';
import { Icons, getFaviconUrl } from '../core/icons/svg-icons';
import { COMMANDS } from '../core/commands/registry';

class PortalNewTabController {
  private prefs: UserPreferences = {
    theme: 'system',
    searchEngine: 'google',
    maxSuggestions: 8,
    showRecentTabs: true,
    showIntelligentShortcuts: true,
    reducedMotion: false,
    density: 'comfortable',
  };

  private searchInput!: HTMLInputElement;
  private suggestionsPanel!: HTMLElement;
  private suggestionsList!: HTMLElement;
  private shortcutsGrid!: HTMLElement;
  private openTabsGrid!: HTMLElement;
  private bookmarksTree!: HTMLElement;
  private toastEl!: HTMLElement;

  private currentSuggestions: SearchResult[] = [];
  private selectedSuggestionIndex = -1;
  private debounceTimer: any = null;

  async init() {
    this.bindDomElements();
    this.setupIcons();
    this.setupClock();
    this.setupEventListeners();
    await this.loadPreferences();

    // Fast parallel loads
    this.renderShortcuts();
    this.renderOpenTabs();
    this.renderBookmarks();
    this.updateAiStatusBadge();
  }

  private bindDomElements() {
    this.searchInput = document.getElementById('portalSearchInput') as HTMLInputElement;
    this.suggestionsPanel = document.getElementById('suggestionsPanel') as HTMLElement;
    this.suggestionsList = document.getElementById('suggestionsList') as HTMLElement;
    this.shortcutsGrid = document.getElementById('shortcutsGrid') as HTMLElement;
    this.openTabsGrid = document.getElementById('openTabsGrid') as HTMLElement;
    this.bookmarksTree = document.getElementById('bookmarksTree') as HTMLElement;
    this.toastEl = document.getElementById('portalToast') as HTMLElement;
  }

  private setupIcons() {
    const searchSlot = document.getElementById('searchIconSlot');
    if (searchSlot) searchSlot.innerHTML = Icons.search;

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.innerHTML = Icons.moon;

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.innerHTML = Icons.settings;

    const aiIcon = document.getElementById('aiBadgeIcon');
    if (aiIcon) aiIcon.innerHTML = Icons.sparkles;
  }

  private setupClock() {
    const clockEl = document.getElementById('headerClock');
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      if (clockEl) clockEl.textContent = `${dateStr} • ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000 * 30);
  }

  private async loadPreferences() {
    this.prefs = await storage.getPreferences();
    this.applyTheme(this.prefs.theme);

    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement | null;
    if (themeSelect) themeSelect.value = this.prefs.theme;

    const searchSelect = document.getElementById('searchEngineSelect') as HTMLSelectElement | null;
    if (searchSelect) searchSelect.value = this.prefs.searchEngine;
  }

  private applyTheme(theme: string) {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'light' ? Icons.sun : Icons.moon;
    }
  }

  private showToast(message: string) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 2800);
  }

  private setupEventListeners() {
    // Search input
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.handleSearchInput();
      }, 35);
    });

    this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));

    // Outside click closes suggestions
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!this.searchInput.contains(target) && !this.suggestionsPanel.contains(target)) {
        this.hideSuggestions();
      }
    });

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn?.addEventListener('click', async () => {
      const current = this.prefs.theme;
      const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
      this.prefs = await storage.savePreferences({ theme: next });
      this.applyTheme(next);
      const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement | null;
      if (themeSelect) themeSelect.value = next;
      this.showToast(`Theme switched to ${next}`);
    });

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    settingsBtn?.addEventListener('click', () => settingsModal?.classList.remove('hidden'));
    closeSettingsBtn?.addEventListener('click', () => settingsModal?.classList.add('hidden'));
    settingsModal?.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    // Settings inputs
    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement | null;
    themeSelect?.addEventListener('change', async () => {
      const theme = themeSelect.value as any;
      this.prefs = await storage.savePreferences({ theme });
      this.applyTheme(theme);
    });

    const searchSelect = document.getElementById('searchEngineSelect') as HTMLSelectElement | null;
    searchSelect?.addEventListener('change', async () => {
      const searchEngine = searchSelect.value as any;
      this.prefs = await storage.savePreferences({ searchEngine });
      this.showToast(`Search engine set to ${searchEngine}`);
    });

    // Clear data button
    const clearBtn = document.getElementById('clearDataBtn');
    clearBtn?.addEventListener('click', async () => {
      if (confirm('Clear cached browsing recommendations and AI clusters?')) {
        await storage.clearDerivedData();
        this.showToast('Discovery cache cleared');
        setTimeout(() => window.location.reload(), 500);
      }
    });

    // Tab switcher between Open Tabs and Bookmarks
    const tabOpenTabsBtn = document.getElementById('tabOpenTabsBtn');
    const tabBookmarksBtn = document.getElementById('tabBookmarksBtn');
    const openTabsContent = document.getElementById('openTabsContent');
    const bookmarksContent = document.getElementById('bookmarksContent');

    tabOpenTabsBtn?.addEventListener('click', () => {
      tabOpenTabsBtn.classList.add('active');
      tabBookmarksBtn?.classList.remove('active');
      openTabsContent?.classList.remove('hidden');
      bookmarksContent?.classList.add('hidden');
      this.renderOpenTabs();
    });

    tabBookmarksBtn?.addEventListener('click', () => {
      tabBookmarksBtn.classList.add('active');
      tabOpenTabsBtn?.classList.remove('active');
      bookmarksContent?.classList.remove('hidden');
      openTabsContent?.classList.add('hidden');
      this.renderBookmarks();
    });
  }

  // --- Dynamic Search Suggestions ---

  private async handleSearchInput() {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.hideSuggestions();
      return;
    }

    this.currentSuggestions = await searchEngine.search(query, this.prefs, { context: 'newtab' });
    this.selectedSuggestionIndex = this.currentSuggestions.length > 0 ? 0 : -1;
    this.renderSuggestions();
  }

  private renderSuggestions() {
    this.suggestionsList.innerHTML = '';
    if (this.currentSuggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.currentSuggestions.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = `suggestion-item ${index === this.selectedSuggestionIndex ? 'selected' : ''}`;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'suggestion-icon';

      if (item.favicon) {
        const img = document.createElement('img');
        img.src = item.favicon;
        img.onerror = () => {
          iconDiv.innerHTML = this.getFallbackIcon(item.type);
        };
        iconDiv.appendChild(img);
      } else {
        iconDiv.innerHTML = this.getFallbackIcon(item.type);
      }

      const content = document.createElement('div');
      content.className = 'suggestion-content';

      const title = document.createElement('div');
      title.className = 'suggestion-title';
      title.textContent = item.title;

      const desc = document.createElement('div');
      desc.className = 'suggestion-desc';
      desc.textContent = item.description || item.url || '';

      content.appendChild(title);
      content.appendChild(desc);

      li.appendChild(iconDiv);
      li.appendChild(content);

      if (item.badge) {
        const badge = document.createElement('span');
        badge.className = 'suggestion-badge';
        badge.textContent = item.badge;
        li.appendChild(badge);
      }

      li.addEventListener('click', (e) => this.executeSuggestion(item, e));
      li.addEventListener('mouseenter', () => {
        this.selectedSuggestionIndex = index;
        this.updateSelectedSuggestion();
      });

      this.suggestionsList.appendChild(li);
    });

    this.suggestionsPanel.classList.remove('hidden');
  }

  private hideSuggestions() {
    this.suggestionsPanel.classList.add('hidden');
    this.selectedSuggestionIndex = -1;
  }

  private getFallbackIcon(type: string): string {
    switch (type) {
      case 'tab':
        return Icons.tab;
      case 'bookmark':
        return Icons.bookmark;
      case 'history':
        return Icons.history;
      case 'command':
        return Icons.command;
      case 'shortcut':
        return Icons.pinFilled;
      case 'ai_cluster':
        return Icons.sparkles;
      default:
        return Icons.globe;
    }
  }

  private updateSelectedSuggestion() {
    const items = this.suggestionsList.querySelectorAll('.suggestion-item');
    items.forEach((item, idx) => {
      if (idx === this.selectedSuggestionIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  private handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.hideSuggestions();
      this.searchInput.blur();
      return;
    }

    if (this.currentSuggestions.length === 0) {
      if (e.key === 'Enter' && this.searchInput.value.trim()) {
        const q = this.searchInput.value.trim();
        const searchUrl =
          this.prefs.searchEngine === 'duckduckgo'
            ? `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
            : this.prefs.searchEngine === 'bing'
              ? `https://www.bing.com/search?q=${encodeURIComponent(q)}`
              : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
        window.location.href = searchUrl;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.currentSuggestions.length;
      this.updateSelectedSuggestion();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedSuggestionIndex =
        (this.selectedSuggestionIndex - 1 + this.currentSuggestions.length) % this.currentSuggestions.length;
      this.updateSelectedSuggestion();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.selectedSuggestionIndex >= 0 && this.currentSuggestions[this.selectedSuggestionIndex]) {
        this.executeSuggestion(this.currentSuggestions[this.selectedSuggestionIndex], e);
      }
    }
  }

  private async executeSuggestion(item: SearchResult, e?: MouseEvent | KeyboardEvent) {
    if (item.type === 'command' && item.commandId) {
      const cmd = COMMANDS.find((c) => c.id === item.commandId);
      if (cmd) {
        const res = await cmd.execute();
        if (res && res.message) {
          this.showToast(res.message);
        }
        this.hideSuggestions();
      }
      return;
    }

    if (item.type === 'tab' && item.tabId) {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        if (item.windowId) {
          await chrome.windows.update(item.windowId, { focused: true });
        }
        await chrome.tabs.update(item.tabId, { active: true });
        return;
      }
    }

    if (item.url) {
      if (e?.ctrlKey || (e as any)?.metaKey) {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          await chrome.tabs.create({ url: item.url, active: false });
          this.showToast('Opened in background tab');
        } else {
          window.open(item.url, '_blank');
        }
      } else {
        window.location.href = item.url;
      }
    }
  }

  // --- Quick Access Shortcuts Grid ---

  private async renderShortcuts() {
    this.shortcutsGrid.innerHTML = '';

    // 1. User Pinned Shortcuts
    const pinned = await storage.getPinnedShortcuts();

    // 2. Intelligent AI clusters / recommendations
    const clusters = await intelligenceManager.getOrRefreshShortcuts();

    const itemsToRender: {
      id: string;
      title: string;
      url: string;
      isPinned: boolean;
      isAiSuggested?: boolean;
      cluster?: HistoryCluster;
    }[] = [];

    pinned.forEach((p) => {
      itemsToRender.push({
        id: p.id,
        title: p.customTitle || p.title,
        url: p.url,
        isPinned: true,
      });
    });

    // Add clusters that are not already pinned
    clusters.forEach((c) => {
      if (!pinned.some((p) => p.url === c.primaryUrl)) {
        itemsToRender.push({
          id: c.id,
          title: c.topic,
          url: c.primaryUrl,
          isPinned: false,
          isAiSuggested: true,
          cluster: c,
        });
      }
    });

    if (itemsToRender.length === 0) {
      // Clean starter suggestions if fresh profile
      const starterShortcuts = [
        { id: 'start-github', title: 'GitHub', url: 'https://github.com', isPinned: true },
        { id: 'start-hn', title: 'Hacker News', url: 'https://news.ycombinator.com', isPinned: true },
        { id: 'start-docs', title: 'Chrome Docs', url: 'https://developer.chrome.com', isPinned: true },
      ];
      starterShortcuts.forEach((s) => itemsToRender.push(s));
    }

    itemsToRender.slice(0, 16).forEach((item) => {
      const card = document.createElement('div');
      card.className = 'shortcut-card';
      card.tabIndex = 0;

      if (item.isAiSuggested) {
        const aiPill = document.createElement('span');
        aiPill.className = 'ai-pill';
        aiPill.textContent = '✦ AI';
        aiPill.title = item.cluster?.aiGeneratedReason || 'Discovered from recent browsing';
        card.appendChild(aiPill);
      }

      // Actions (Pin / Dismiss)
      const actions = document.createElement('div');
      actions.className = 'shortcut-actions';

      const pinBtn = document.createElement('button');
      pinBtn.className = 'shortcut-action-btn';
      pinBtn.innerHTML = item.isPinned ? Icons.pinFilled : Icons.pin;
      pinBtn.title = item.isPinned ? 'Unpin' : 'Pin to Quick Access';
      pinBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (item.isPinned) {
          await storage.unpinShortcut(item.id);
          this.showToast(`Unpinned ${item.title}`);
        } else {
          await storage.pinShortcut({
            id: item.id,
            title: item.title,
            url: item.url,
          });
          this.showToast(`Pinned ${item.title} to Quick Access`);
        }
        this.renderShortcuts();
      });
      actions.appendChild(pinBtn);

      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'shortcut-action-btn';
      dismissBtn.innerHTML = Icons.close;
      dismissBtn.title = 'Dismiss suggestion';
      dismissBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (item.cluster) {
          await intelligenceManager.dismissCluster(item.cluster);
          this.showToast(`Dismissed ${item.title}`);
        } else {
          await storage.unpinShortcut(item.id);
        }
        this.renderShortcuts();
      });
      actions.appendChild(dismissBtn);

      card.appendChild(actions);

      // Icon
      const iconSlot = document.createElement('div');
      iconSlot.className = 'shortcut-icon';
      const favUrl = getFaviconUrl(item.url);
      if (favUrl) {
        const img = document.createElement('img');
        img.src = favUrl;
        img.onerror = () => {
          iconSlot.innerHTML = Icons.globe;
        };
        iconSlot.appendChild(img);
      } else {
        iconSlot.innerHTML = Icons.globe;
      }
      card.appendChild(iconSlot);

      // Label & Domain
      const name = document.createElement('div');
      name.className = 'shortcut-name';
      name.textContent = item.title;
      card.appendChild(name);

      const domain = document.createElement('div');
      domain.className = 'shortcut-domain';
      try {
        domain.textContent = new URL(item.url).hostname.replace(/^www\./, '');
      } catch {
        domain.textContent = item.url;
      }
      card.appendChild(domain);

      // Click to navigate
      card.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) {
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: item.url, active: false });
          } else {
            window.open(item.url, '_blank');
          }
        } else {
          window.location.href = item.url;
        }
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          window.location.href = item.url;
        }
      });

      this.shortcutsGrid.appendChild(card);
    });
  }

  // --- Contextual Section: Open Tabs & Bookmarks ---

  private async renderOpenTabs() {
    this.openTabsGrid.innerHTML = '';
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      this.openTabsGrid.innerHTML =
        '<div style="color:var(--text-muted);font-size:13px;padding:8px;">Tabs available in Chrome extension mode</div>';
      return;
    }

    try {
      const tabs = await chrome.tabs.query({});
      const eligibleTabs = tabs.filter((t) => t.url && !t.url.startsWith('chrome://newtab'));

      if (eligibleTabs.length === 0) {
        this.openTabsGrid.innerHTML =
          '<div style="color:var(--text-muted);font-size:13px;padding:8px;">No other open tabs</div>';
        return;
      }

      eligibleTabs.forEach((tab) => {
        const row = document.createElement('div');
        row.className = 'tab-item-row';

        const iconSlot = document.createElement('div');
        iconSlot.className = 'tab-icon';
        if (tab.favIconUrl) {
          const img = document.createElement('img');
          img.src = tab.favIconUrl;
          img.onerror = () => {
            iconSlot.innerHTML = Icons.tab;
          };
          iconSlot.appendChild(img);
        } else {
          iconSlot.innerHTML = Icons.tab;
        }
        row.appendChild(iconSlot);

        const title = document.createElement('div');
        title.className = 'tab-title';
        title.textContent = tab.title || tab.url || 'Tab';
        row.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close-btn';
        closeBtn.innerHTML = Icons.close;
        closeBtn.title = 'Close tab';
        closeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (tab.id) {
            await chrome.tabs.remove(tab.id);
            row.remove();
            this.showToast('Tab closed');
          }
        });
        row.appendChild(closeBtn);

        row.addEventListener('click', async () => {
          if (tab.id) {
            if (tab.windowId) {
              await chrome.windows.update(tab.windowId, { focused: true });
            }
            await chrome.tabs.update(tab.id, { active: true });
          }
        });

        this.openTabsGrid.appendChild(row);
      });
    } catch (err) {
      console.warn('Error loading open tabs:', err);
    }
  }

  private async renderBookmarks() {
    this.bookmarksTree.innerHTML = '';
    if (typeof chrome === 'undefined' || !chrome.bookmarks) {
      this.bookmarksTree.innerHTML =
        '<div style="color:var(--text-muted);font-size:13px;padding:8px;">Bookmarks available in Chrome extension mode</div>';
      return;
    }

    try {
      // Fetch full bookmark tree to support folder navigation
      const tree = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) => {
        chrome.bookmarks.getTree(resolve);
      });

      const rootNodes = tree[0]?.children || [];
      if (rootNodes.length === 0) {
        this.bookmarksTree.innerHTML =
          '<div style="color:var(--text-muted);font-size:13px;padding:8px;">No saved bookmarks found</div>';
        return;
      }

      this.renderBookmarkNodes(rootNodes, this.bookmarksTree, 0);
      if (this.bookmarksTree.children.length === 0) {
        this.bookmarksTree.innerHTML =
          '<div style="color:var(--text-muted);font-size:13px;padding:12px;text-align:center;">No saved bookmarks found</div>';
      }
    } catch (err) {
      console.warn('Error loading bookmarks tree:', err);
    }
  }

  private renderBookmarkNodes(nodes: chrome.bookmarks.BookmarkTreeNode[], container: HTMLElement, depth: number) {
    nodes.forEach((node) => {
      if (node.url) {
        // Bookmark item
        const a = document.createElement('a');
        a.className = 'bookmark-item';
        a.href = node.url;
        a.style.paddingLeft = `${depth * 14 + 10}px`;

        const iconSlot = document.createElement('div');
        iconSlot.className = 'tab-icon';
        const favUrl = getFaviconUrl(node.url);
        if (favUrl) {
          const img = document.createElement('img');
          img.src = favUrl;
          img.onerror = () => {
            iconSlot.innerHTML = Icons.bookmark;
          };
          iconSlot.appendChild(img);
        } else {
          iconSlot.innerHTML = Icons.bookmark;
        }
        a.appendChild(iconSlot);

        const title = document.createElement('span');
        title.style.flex = '1';
        title.style.overflow = 'hidden';
        title.style.textOverflow = 'ellipsis';
        title.style.whiteSpace = 'nowrap';
        title.textContent = node.title || node.url;
        a.appendChild(title);

        a.addEventListener('click', (e) => {
          if (e.ctrlKey || e.metaKey) {
            chrome.tabs.create({ url: node.url, active: false });
          } else {
            window.location.href = node.url!;
          }
        });

        container.appendChild(a);
      } else if (node.children && node.children.length > 0) {
        // Bookmark folder
        const folderDiv = document.createElement('div');
        folderDiv.className = 'bookmark-folder-row';
        folderDiv.style.paddingLeft = `${depth * 14 + 8}px`;
        folderDiv.style.display = 'flex';
        folderDiv.style.alignItems = 'center';
        folderDiv.style.gap = '8px';
        folderDiv.style.paddingTop = '6px';
        folderDiv.style.paddingBottom = '6px';
        folderDiv.style.cursor = 'pointer';
        folderDiv.style.color = 'var(--text-secondary)';
        folderDiv.style.fontSize = '12px';
        folderDiv.style.fontWeight = '600';

        const folderIcon = document.createElement('div');
        folderIcon.className = 'tab-icon';
        folderIcon.innerHTML = Icons.folder;
        folderDiv.appendChild(folderIcon);

        const folderName = document.createElement('span');
        folderName.textContent = node.title || 'Folder';
        folderDiv.appendChild(folderName);

        const childContainer = document.createElement('div');
        childContainer.className = 'folder-children';
        childContainer.style.display = depth === 0 ? 'block' : 'none'; // Default open top-level

        folderDiv.addEventListener('click', () => {
          const isHidden = childContainer.style.display === 'none';
          childContainer.style.display = isHidden ? 'block' : 'none';
        });

        container.appendChild(folderDiv);
        container.appendChild(childContainer);

        this.renderBookmarkNodes(node.children, childContainer, depth + 1);
      }
    });
  }

  // --- Intelligence Status Badge ---

  private async updateAiStatusBadge() {
    const labelEl = document.getElementById('aiBadgeLabel');
    const badgeEl = document.getElementById('aiStatusBadge');
    const status = await promptApi.checkStatus();

    if (status.available) {
      if (labelEl) labelEl.textContent = 'Gemini Nano Active';
      if (badgeEl) badgeEl.title = 'Chrome on-device Gemini Nano is active and refining suggestions locally.';
    } else {
      if (labelEl) labelEl.textContent = 'Intelligent Discovery';
      if (badgeEl) badgeEl.title = 'Frequency-recency clustering active. 100% on-device & private.';
    }
  }
}

// Instantiate and initialize
const portalApp = new PortalNewTabController();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => portalApp.init());
} else {
  portalApp.init();
}
