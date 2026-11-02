import { searchEngine } from '../core/search/engine';
import { storage } from '../core/storage';
import { intelligenceManager } from '../core/ai/intelligence';
import { promptApi } from '../core/ai/prompt-api';
import {
  SearchResult,
  PinnedShortcut,
  HistoryCluster,
  UserPreferences,
  PersonalBriefing,
  ImportantMailSnapshot,
  OpenClawSystemStatus,
} from '../core/types';
import { Icons, getFaviconUrl } from '../core/icons/svg-icons';
import { COMMANDS } from '../core/commands/registry';
import { briefingService } from '../core/intelligence/briefing-service';
import { openClawBridge } from '../core/bridge/openclaw-bridge';
import { runStorageMigration } from '../core/migration';

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
  private clipboardChip!: HTMLElement;
  private clipboardChipUrl!: HTMLElement;
  private currentClipboardUrl: string | null = null;

  private currentSuggestions: SearchResult[] = [];
  private selectedSuggestionIndex = -1;
  private debounceTimer: any = null;

  // Intelligence Surface Elements
  private intelSection!: HTMLElement;
  private tabBriefingBtn!: HTMLElement;
  private tabMailBtn!: HTMLElement;
  private tabOpenClawBtn!: HTMLElement;
  private briefingPanel!: HTMLElement;
  private mailPanel!: HTMLElement;
  private openClawPanel!: HTMLElement;
  private refreshIntelBtn!: HTMLElement;
  private collapseIntelBtn!: HTMLElement;
  private briefingPrioritiesList!: HTMLElement;
  private briefingScheduleList!: HTMLElement;
  private briefingFreshnessTag!: HTMLElement;
  private mailHighlightsList!: HTMLElement;
  private mailPrivacyToggle!: HTMLElement;
  private openclawStatusDot!: HTMLElement;
  private openclawGatewayLabel!: HTMLElement;
  private openclawNodesRow!: HTMLElement;
  private openclawJobsList!: HTMLElement;
  private openclawTaskForm!: HTMLFormElement;
  private openclawTaskInput!: HTMLInputElement;
  private openclawHostSelect!: HTMLSelectElement;

  // Detailed Briefing Modal Elements
  private expandBriefingBtn: HTMLElement | null = null;
  private briefingModal: HTMLElement | null = null;
  private closeBriefingModalBtn: HTMLElement | null = null;
  private briefingModalPriorities: HTMLElement | null = null;
  private briefingModalSchedule: HTMLElement | null = null;
  private briefingModalFollowUps: HTMLElement | null = null;
  private copyBriefingSummaryBtn: HTMLElement | null = null;
  private currentBriefing: PersonalBriefing | null = null;

  // Import Briefing Modal Elements
  private importBriefingBtn: HTMLElement | null = null;
  private importBriefingModal: HTMLElement | null = null;
  private closeImportModalBtn: HTMLElement | null = null;
  private briefingImportText: HTMLTextAreaElement | null = null;
  private submitImportBtn: HTMLElement | null = null;

  async init() {
    await runStorageMigration().catch(() => {});
    this.bindDomElements();
    this.bindDomElements();
    this.setupIcons();
    this.setupClock();
    this.setupEventListeners();
    await this.loadPreferences();

    // Check Zen Mode state from user preferences or storage
    if (this.prefs.zenMode || localStorage.getItem('portal_zen_mode') === 'true') {
      document.body.classList.add('zen-mode');
    }

    // Only auto-probe clipboard if user explicitly enabled the privacy setting
    if (this.prefs.autoDetectClipboardUrl) {
      this.checkClipboardForUrl().catch(() => {});
    }

    // Fast parallel loads with error isolation
    this.renderShortcuts().catch(() => {});
    this.renderOpenTabs().catch(() => {});
    this.renderBookmarks().catch(() => {});
    this.loadIntelligenceSurfaces().catch(() => {});
    this.updateAiStatusBadge().catch(() => {});
  }

  private bindDomElements() {
    this.searchInput = document.getElementById('portalSearchInput') as HTMLInputElement;
    this.suggestionsPanel = document.getElementById('suggestionsPanel') as HTMLElement;
    this.suggestionsList = document.getElementById('suggestionsList') as HTMLElement;
    this.shortcutsGrid = document.getElementById('shortcutsGrid') as HTMLElement;
    this.openTabsGrid = document.getElementById('openTabsGrid') as HTMLElement;
    this.bookmarksTree = document.getElementById('bookmarksTree') as HTMLElement;
    this.toastEl = document.getElementById('portalToast') as HTMLElement;
    this.clipboardChip = document.getElementById('clipboardChip') as HTMLElement;
    this.clipboardChipUrl = document.getElementById('clipboardChipUrl') as HTMLElement;

    // Intelligence surface elements
    this.intelSection = document.getElementById('intelSurfaceSection') as HTMLElement;
    this.tabBriefingBtn = document.getElementById('tabBriefingBtn') as HTMLElement;
    this.tabMailBtn = document.getElementById('tabMailBtn') as HTMLElement;
    this.tabOpenClawBtn = document.getElementById('tabOpenClawBtn') as HTMLElement;
    this.briefingPanel = document.getElementById('briefingPanel') as HTMLElement;
    this.mailPanel = document.getElementById('mailPanel') as HTMLElement;
    this.openClawPanel = document.getElementById('openClawPanel') as HTMLElement;
    this.refreshIntelBtn = document.getElementById('refreshIntelBtn') as HTMLElement;
    this.collapseIntelBtn = document.getElementById('collapseIntelBtn') as HTMLElement;
    this.briefingPrioritiesList = document.getElementById('briefingPrioritiesList') as HTMLElement;
    this.briefingScheduleList = document.getElementById('briefingScheduleList') as HTMLElement;
    this.briefingFreshnessTag = document.getElementById('briefingFreshnessTag') as HTMLElement;
    this.mailHighlightsList = document.getElementById('mailHighlightsList') as HTMLElement;
    this.mailPrivacyToggle = document.getElementById('mailPrivacyToggle') as HTMLElement;
    this.openclawStatusDot = document.getElementById('openclawStatusDot') as HTMLElement;
    this.openclawGatewayLabel = document.getElementById('openclawGatewayLabel') as HTMLElement;
    this.openclawNodesRow = document.getElementById('openclawNodesRow') as HTMLElement;
    this.openclawJobsList = document.getElementById('openclawJobsList') as HTMLElement;
    this.openclawTaskForm = document.getElementById('openclawTaskForm') as HTMLFormElement;
    this.openclawTaskInput = document.getElementById('openclawTaskInput') as HTMLInputElement;
    this.openclawHostSelect = document.getElementById('openclawHostSelect') as HTMLSelectElement;

    // Detailed Briefing Modal Bindings
    this.expandBriefingBtn = document.getElementById('expandBriefingBtn');
    this.briefingModal = document.getElementById('briefingModal');
    this.closeBriefingModalBtn = document.getElementById('closeBriefingModalBtn');
    this.briefingModalPriorities = document.getElementById('briefingModalPriorities');
    this.briefingModalSchedule = document.getElementById('briefingModalSchedule');
    this.briefingModalFollowUps = document.getElementById('briefingModalFollowUps');
    this.copyBriefingSummaryBtn = document.getElementById('copyBriefingSummaryBtn');

    // Import Briefing Modal Bindings
    this.importBriefingBtn = document.getElementById('importBriefingBtn');
    this.importBriefingModal = document.getElementById('importBriefingModal');
    this.closeImportModalBtn = document.getElementById('closeImportModalBtn');
    this.briefingImportText = document.getElementById('briefingImportText') as HTMLTextAreaElement | null;
    this.submitImportBtn = document.getElementById('submitImportBtn');
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

  private async toggleZenMode() {
    const isZen = document.body.classList.toggle('zen-mode');
    this.prefs = await storage.savePreferences({ zenMode: isZen });
    try {
      localStorage.setItem('portal_zen_mode', isZen ? 'true' : 'false');
    } catch {}
    this.showToast(isZen ? 'Zen mode enabled (Press Z to exit)' : 'Zen mode disabled');
  }

  private async checkClipboardForUrl() {
    if (!navigator.clipboard?.readText) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('chrome://')) {
        this.currentClipboardUrl = text;
        if (this.clipboardChip && this.clipboardChipUrl) {
          this.clipboardChipUrl.textContent = text;
          this.clipboardChip.classList.remove('hidden');
        }
      } else {
        this.currentClipboardUrl = null;
        if (this.clipboardChip) this.clipboardChip.classList.add('hidden');
      }
    } catch {
      // Gracefully handle clipboard permission denial or lack of focus
    }
  }

  private setupEventListeners() {
    // Only register window focus check if user explicitly opted in to clipboard auto-detection
    if (this.prefs.autoDetectClipboardUrl) {
      window.addEventListener('focus', () => {
        this.checkClipboardForUrl().catch(() => {});
      });
    }

    // Zen Mode toggle button & keyboard shortcut (Z)
    const zenBtn = document.getElementById('zenToggleBtn');
    zenBtn?.addEventListener('click', () => this.toggleZenMode());

    document.addEventListener('keydown', (e) => {
      if (
        e.key.toLowerCase() === 'z' &&
        document.activeElement !== this.searchInput &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        this.toggleZenMode();
      }
    });

    // Clipboard chip click
    this.clipboardChip?.addEventListener('click', () => {
      if (this.currentClipboardUrl) {
        window.location.href = this.currentClipboardUrl;
      }
    });

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

    // Intelligence tabs
    this.tabBriefingBtn?.addEventListener('click', () => {
      this.tabBriefingBtn.classList.add('active');
      this.tabMailBtn?.classList.remove('active');
      this.tabOpenClawBtn?.classList.remove('active');
      this.briefingPanel?.classList.remove('hidden');
      this.mailPanel?.classList.add('hidden');
      this.openClawPanel?.classList.add('hidden');
    });

    this.tabMailBtn?.addEventListener('click', () => {
      this.tabMailBtn.classList.add('active');
      this.tabBriefingBtn?.classList.remove('active');
      this.tabOpenClawBtn?.classList.remove('active');
      this.mailPanel?.classList.remove('hidden');
      this.briefingPanel?.classList.add('hidden');
      this.openClawPanel?.classList.add('hidden');
    });

    this.tabOpenClawBtn?.addEventListener('click', () => {
      this.tabOpenClawBtn.classList.add('active');
      this.tabBriefingBtn?.classList.remove('active');
      this.tabMailBtn?.classList.remove('active');
      this.openClawPanel?.classList.remove('hidden');
      this.briefingPanel?.classList.add('hidden');
      this.mailPanel?.classList.add('hidden');
    });

    // Refresh Intelligence button
    this.refreshIntelBtn?.addEventListener('click', () => {
      this.refreshIntelligenceSurfaces();
    });

    // Collapse section button
    this.collapseIntelBtn?.addEventListener('click', () => {
      const isCollapsed = this.intelSection.classList.toggle('collapsed');
      this.collapseIntelBtn.textContent = isCollapsed ? '▸' : '▾';
    });

    // Mail privacy toggle
    this.mailPrivacyToggle?.addEventListener('click', () => {
      const isHidden = this.mailPanel.classList.toggle('hide-previews');
      this.mailPrivacyToggle.textContent = isHidden ? 'Show Previews' : 'Hide Previews';
    });

    // OpenClaw Task submission form
    this.openclawTaskForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const taskText = this.openclawTaskInput?.value.trim();
      const host = (this.openclawHostSelect?.value as 'ideapad' | 'thinkbook') || 'ideapad';
      if (!taskText) return;

      const res = await openClawBridge.submitTask(taskText, host);
      if (res.success) {
        this.showToast(res.message);
        if (this.openclawTaskInput) this.openclawTaskInput.value = '';
      } else {
        this.showToast(`Task error: ${res.message}`);
      }
      const updatedStatus = await openClawBridge.getCachedStatus();
      if (updatedStatus) this.renderOpenClaw(updatedStatus);
    });

    // Expand Detailed Morning Briefing Modal
    this.expandBriefingBtn?.addEventListener('click', () => {
      this.openBriefingModal();
    });

    this.closeBriefingModalBtn?.addEventListener('click', () => {
      this.briefingModal?.classList.add('hidden');
    });

    this.copyBriefingSummaryBtn?.addEventListener('click', () => {
      this.copyBriefingSummary();
    });

    // Import Briefing Modal Listeners
    this.importBriefingBtn?.addEventListener('click', () => {
      this.importBriefingModal?.classList.remove('hidden');
    });

    this.closeImportModalBtn?.addEventListener('click', () => {
      this.importBriefingModal?.classList.add('hidden');
    });

    this.submitImportBtn?.addEventListener('click', async () => {
      const text = this.briefingImportText?.value.trim() || '';
      if (!text) {
        this.showToast('Please enter briefing markdown or JSON');
        return;
      }
      const res = await briefingService.importBriefing(text);
      if (res.success && res.briefing) {
        this.renderBriefing(res.briefing);
        this.importBriefingModal?.classList.add('hidden');
        if (this.briefingImportText) this.briefingImportText.value = '';
        this.showToast(res.message);
      } else {
        this.showToast(res.message);
      }
    });

    // Settings checkboxes
    const toggleIntelBriefing = document.getElementById('toggleIntelBriefing') as HTMLInputElement | null;
    toggleIntelBriefing?.addEventListener('change', async () => {
      this.prefs = await storage.savePreferences({ showIntelligenceBriefing: toggleIntelBriefing.checked });
      if (this.intelSection) {
        this.intelSection.classList.toggle('hidden', !toggleIntelBriefing.checked);
      }
    });

    const toggleOpenClaw = document.getElementById('toggleOpenClaw') as HTMLInputElement | null;
    toggleOpenClaw?.addEventListener('change', async () => {
      this.prefs = await storage.savePreferences({ showOpenClawStatus: toggleOpenClaw.checked });
      if (this.tabOpenClawBtn) {
        this.tabOpenClawBtn.classList.toggle('hidden', !toggleOpenClaw.checked);
      }
    });

    const toggleClipboardDetect = document.getElementById('toggleClipboardDetect') as HTMLInputElement | null;
    toggleClipboardDetect?.addEventListener('change', async () => {
      this.prefs = await storage.savePreferences({ autoDetectClipboardUrl: toggleClipboardDetect.checked });
      this.showToast(`Clipboard auto-detection ${toggleClipboardDetect.checked ? 'enabled' : 'disabled'}`);
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
    // If selecting a bang guide entry (e.g. "!gh <query>"), fill bang into input to let user type query
    if (item.badge === 'BANG' && item.title.startsWith('!')) {
      const bangPrefix = item.title.split(' ')[0] + ' ';
      this.searchInput.value = bangPrefix;
      this.searchInput.focus();
      this.handleSearchInput();
      return;
    }

    // User-initiated clipboard action
    if (item.commandId === 'open-clipboard-url') {
      this.hideSuggestions();
      if (navigator.clipboard?.readText) {
        try {
          const text = (await navigator.clipboard.readText()).trim();
          if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('chrome://')) {
            window.location.href = text;
            return;
          }
          this.showToast('Clipboard does not contain a valid URL');
        } catch {
          this.showToast('Clipboard read access was not permitted');
        }
      } else {
        this.showToast('Clipboard API unavailable in this browser context');
      }
      return;
    }

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

  // --- Personal Intelligence & OpenClaw Surface ---

  private async loadIntelligenceSurfaces() {
    if (!this.intelSection) return;

    if (this.prefs.showIntelligenceBriefing === false) {
      this.intelSection.classList.add('hidden');
      return;
    }
    this.intelSection.classList.remove('hidden');

    try {
      const briefing = (await storage.getBriefing()) || (await briefingService.getBriefing());
      const mailSnapshot = (await storage.getMailSnapshot()) || (await briefingService.getMailSnapshot());
      const openClawStatus = (await storage.getOpenClawStatus()) || (await openClawBridge.getCachedStatus());

      this.renderBriefing(briefing);
      this.renderMail(mailSnapshot);
      this.renderOpenClaw(openClawStatus);
    } catch (err) {
      console.warn('[Portal] Error loading intelligence surfaces:', err);
    }
  }

  private async refreshIntelligenceSurfaces() {
    if (this.refreshIntelBtn) {
      this.refreshIntelBtn.classList.add('spinning');
    }
    this.showToast('Refreshing personal intelligence & probing gateway...');

    try {
      const refreshed = await briefingService.refreshAll();
      const openClawStatus = await openClawBridge.probeGateway(1200);

      this.renderBriefing(refreshed.briefing);
      this.renderMail(refreshed.mailSnapshot);
      this.renderOpenClaw(openClawStatus);

      if (openClawStatus.gatewayState === 'running') {
        this.showToast('Gateway online on 127.0.0.1:57849');
      } else {
        this.showToast('Gateway is stopped or unreachable');
      }
    } catch {
      this.showToast('Could not refresh intelligence data');
    } finally {
      if (this.refreshIntelBtn) {
        this.refreshIntelBtn.classList.remove('spinning');
      }
    }
  }

  private renderBriefing(briefing: PersonalBriefing) {
    this.currentBriefing = briefing;
    const sourcePill = document.getElementById('briefingSourcePill');
    if (sourcePill) {
      sourcePill.textContent = briefing.sourceIdentity || 'Unconfigured';
    }

    if (this.briefingFreshnessTag) {
      if (briefing.generatedAt > 0) {
        const minsAgo = Math.max(1, Math.round((Date.now() - briefing.generatedAt) / (1000 * 60)));
        this.briefingFreshnessTag.textContent = `Updated ${minsAgo}m ago • ${briefing.status.toUpperCase()}`;
      } else {
        this.briefingFreshnessTag.textContent = 'Not connected';
      }
    }

    // Top Priorities
    if (this.briefingPrioritiesList) {
      this.briefingPrioritiesList.innerHTML = '';
      if (!briefing.topPriorities || briefing.topPriorities.length === 0) {
        this.briefingPrioritiesList.innerHTML = `
          <li style="color:var(--text-muted);font-size:12px;padding:8px 0;">
            No priorities configured. Click "Import Briefing" to load Flowmate context or personal tasks.
          </li>`;
      } else {
        briefing.topPriorities.forEach((item) => {
          const li = document.createElement('li');
          li.className = 'briefing-item';
          li.innerHTML = `
            <div class="briefing-item-title">
              <span>${this.escapeHtml(item.title)}</span>
              ${item.actionRequired ? '<span class="briefing-due-badge">Action Required</span>' : ''}
            </div>
            <div class="briefing-item-summary">${this.escapeHtml(item.summary)}</div>
          `;
          this.briefingPrioritiesList.appendChild(li);
        });
      }
    }

    // Schedule
    if (this.briefingScheduleList) {
      this.briefingScheduleList.innerHTML = '';
      if (!briefing.upcomingCommitments || briefing.upcomingCommitments.length === 0) {
        this.briefingScheduleList.innerHTML = `
          <li style="color:var(--text-muted);font-size:12px;padding:8px 0;">
            No upcoming schedule or calendar commitments loaded.
          </li>`;
      } else {
        briefing.upcomingCommitments.forEach((item) => {
          const li = document.createElement('li');
          li.className = 'briefing-item';
          li.innerHTML = `
            <div class="briefing-item-title">
              <span>${this.escapeHtml(item.title)}</span>
              ${item.dueTime ? `<span class="briefing-due-badge">${this.escapeHtml(item.dueTime)}</span>` : ''}
            </div>
            <div class="briefing-item-summary">${this.escapeHtml(item.summary)}</div>
          `;
          this.briefingScheduleList.appendChild(li);
        });
      }
    }
  }

  private openBriefingModal() {
    if (!this.briefingModal || !this.currentBriefing) return;
    this.briefingModal.classList.remove('hidden');

    const b = this.currentBriefing;
    const minsAgo = b.generatedAt > 0 ? Math.max(1, Math.round((Date.now() - b.generatedAt) / (1000 * 60))) : 0;
    const freshnessEl = document.getElementById('briefingModalFreshness');
    if (freshnessEl) {
      freshnessEl.textContent = b.generatedAt > 0 ? `Updated ${minsAgo}m ago • ${b.status.toUpperCase()}` : 'Not connected';
    }

    if (this.briefingModalPriorities) {
      this.briefingModalPriorities.innerHTML = '';
      if (!b.topPriorities || b.topPriorities.length === 0) {
        this.briefingModalPriorities.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:6px 0;">No priorities loaded.</div>';
      } else {
        b.topPriorities.forEach((item) => {
          const el = document.createElement('div');
          el.className = 'briefing-item';
          el.innerHTML = `
            <div class="briefing-item-title">
              <span>${this.escapeHtml(item.title)}</span>
              <span class="source-pill">${this.escapeHtml(item.source)}</span>
            </div>
            <div class="briefing-item-summary">${this.escapeHtml(item.summary)}</div>
          `;
          this.briefingModalPriorities!.appendChild(el);
        });
      }
    }

    if (this.briefingModalSchedule) {
      this.briefingModalSchedule.innerHTML = '';
      if (!b.upcomingCommitments || b.upcomingCommitments.length === 0) {
        this.briefingModalSchedule.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:6px 0;">No schedule loaded.</div>';
      } else {
        b.upcomingCommitments.forEach((item) => {
          const el = document.createElement('div');
          el.className = 'briefing-item';
          el.innerHTML = `
            <div class="briefing-item-title">
              <span>${this.escapeHtml(item.title)}</span>
              ${item.dueTime ? `<span class="briefing-due-badge">${this.escapeHtml(item.dueTime)}</span>` : ''}
            </div>
            <div class="briefing-item-summary">${this.escapeHtml(item.summary)}</div>
          `;
          this.briefingModalSchedule!.appendChild(el);
        });
      }
    }

    if (this.briefingModalFollowUps) {
      this.briefingModalFollowUps.innerHTML = '';
      if (!b.followUps || b.followUps.length === 0) {
        this.briefingModalFollowUps.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:6px 0;">No unresolved follow-ups.</div>';
      } else {
        b.followUps.forEach((item) => {
          const el = document.createElement('div');
          el.className = 'briefing-item';
          el.innerHTML = `
            <div class="briefing-item-title">
              <span>${this.escapeHtml(item.title)}</span>
              <span class="briefing-due-badge">${this.escapeHtml(item.priority.toUpperCase())}</span>
            </div>
            <div class="briefing-item-summary">${this.escapeHtml(item.summary)}</div>
          `;
          this.briefingModalFollowUps!.appendChild(el);
        });
      }
    }
  }

  private async copyBriefingSummary() {
    if (!this.currentBriefing) return;
    const b = this.currentBriefing;
    const lines = [
      `# Morning Command Briefing (${b.generatedAt > 0 ? new Date(b.generatedAt).toLocaleDateString() : 'Unconfigured'})`,
      `Source: ${b.sourceIdentity} • Status: ${b.status}`,
      '',
      '## Top Priorities',
      ...(b.topPriorities.length > 0
        ? b.topPriorities.map((p) => `- [ ] **${p.title}**: ${p.summary}`)
        : ['- (No priorities configured)']),
      '',
      '## Upcoming Schedule',
      ...(b.upcomingCommitments.length > 0
        ? b.upcomingCommitments.map((c) => `- **${c.dueTime || 'Today'}**: ${c.title} — ${c.summary}`)
        : ['- (No schedule loaded)']),
      '',
      '## Follow-Ups',
      ...(b.followUps.length > 0
        ? b.followUps.map((f) => `- [ ] ${f.title}: ${f.summary}`)
        : ['- (None)']),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      this.showToast('Briefing markdown copied to clipboard');
    } catch {
      this.showToast('Failed to copy to clipboard');
    }
  }

  private renderMail(mailSnapshot: ImportantMailSnapshot) {
    if (!this.mailHighlightsList) return;
    this.mailHighlightsList.innerHTML = '';

    if (!mailSnapshot.items || mailSnapshot.items.length === 0) {
      this.mailHighlightsList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px;">No email connector configured. Authorize Gmail via local companion to view actionable highlights.</div>';
      return;
    }

    mailSnapshot.items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'mail-item-card';
      card.innerHTML = `
        <div class="mail-item-main">
          <div class="mail-from">${this.escapeHtml(item.from)}</div>
          <div class="mail-subject">${this.escapeHtml(item.subject)}</div>
          <div class="mail-snippet">${this.escapeHtml(item.snippet)}</div>
          <div class="mail-urgency-tag">✦ ${this.escapeHtml(item.urgencyReason)}</div>
        </div>
        <a href="${item.threadUrl}" target="_blank" rel="noopener noreferrer" class="mail-open-btn">Open Thread ↗</a>
      `;
      this.mailHighlightsList.appendChild(card);
    });
  }

  private renderOpenClaw(status: OpenClawSystemStatus) {
    if (this.openclawStatusDot && this.openclawGatewayLabel) {
      if (status.gatewayState === 'running') {
        this.openclawStatusDot.className = 'status-dot online';
        this.openclawGatewayLabel.textContent = `Gateway: Online (Port ${status.gatewayPort})`;
      } else {
        this.openclawStatusDot.className = 'status-dot stopped';
        this.openclawGatewayLabel.textContent = `Gateway: Stopped (Port ${status.gatewayPort})`;
      }
    }

    if (this.openclawNodesRow) {
      this.openclawNodesRow.innerHTML = '';

      const coordPill = document.createElement('span');
      coordPill.className = `node-pill coordinator ${status.coordinatorNode?.status === 'online' ? 'online' : ''}`;
      coordPill.textContent = `${status.coordinatorNode?.name || 'IdeaPad (Coordinator)'} [${(status.coordinatorNode?.status || 'offline').toUpperCase()}]`;
      this.openclawNodesRow.appendChild(coordPill);

      const workerPill = document.createElement('span');
      workerPill.className = `node-pill ${status.workstationNode?.status || 'unpaired'}`;
      workerPill.textContent = `${status.workstationNode?.name || 'ThinkBook (Workstation)'} [${(status.workstationNode?.status || 'unpaired').toUpperCase()}]`;
      this.openclawNodesRow.appendChild(workerPill);
    }

    if (this.openclawJobsList) {
      this.openclawJobsList.innerHTML = '';
      if (!status.recentJobs || status.recentJobs.length === 0) {
        this.openclawJobsList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px 0;">No automation jobs recorded.</div>';
      } else {
        status.recentJobs.forEach((job) => {
          const row = document.createElement('div');
          row.className = 'job-item-row';
          row.innerHTML = `
            <span class="job-item-task" title="${this.escapeHtml(job.task)}">${this.escapeHtml(job.task)}</span>
            <span class="job-host-badge">${job.host.toUpperCase()}</span>
            <span class="job-status-badge ${job.status}">${job.status.toUpperCase()}</span>
          `;
          this.openclawJobsList.appendChild(row);
        });
      }
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Intelligence Status Badge ---

  private async updateAiStatusBadge() {
    try {
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
    } catch {
      // Safe fallback: never bubble error
    }
  }
}

// Instantiate and initialize with unhandled rejection protection
const portalApp = new PortalNewTabController();
const startApp = () => {
  portalApp.init().catch((err) => {
    console.log('[Portal] Application initialized with local fallback:', err);
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
