import { searchEngine } from '../core/search/engine';
import { storage } from '../core/storage';
import { intelligenceManager } from '../core/ai/intelligence';
import { promptApi } from '../core/ai/prompt-api';
import {
  SearchResult,
  PinnedShortcut,
  DestinationCandidate,
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
import { moduleRegistry, ModuleDescriptor } from '../core/modules/module-registry';
import { historyClusterer } from '../core/ai/clustering';
import { runStorageMigration } from '../core/migration';
import { resolveSynchronousIntent } from '../core/search/grammar';
import { cleanPastedInput, parseDirectUrl } from '../core/search/url-utils';

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

  // Modular Panels
  private tabPlacementBtn: HTMLElement | null = null;
  private tabCollabBtn: HTMLElement | null = null;
  private placementPanel: HTMLElement | null = null;
  private collabPanel: HTMLElement | null = null;

  // Search Sequence ID
  private searchSeq = 0;

  // Candidate Destinations for Add Shortcut Modal
  private candidateDestinations: DestinationCandidate[] = [];
  private currentAddFilter: string = 'all';
  private importBriefingBtn: HTMLElement | null = null;
  private importBriefingModal: HTMLElement | null = null;
  private closeImportModalBtn: HTMLElement | null = null;
  private briefingImportText: HTMLTextAreaElement | null = null;
  private submitImportBtn: HTMLElement | null = null;

  async init() {
    await runStorageMigration().catch(() => {});
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
    if (this.prefs.workspaceLayout !== 'focused' && this.prefs.showIntelligenceBriefing !== false) {
      this.loadIntelligenceSurfaces().catch(() => {});
    }
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
    this.tabPlacementBtn = document.getElementById('tabPlacementBtn') as HTMLElement;
    this.tabCollabBtn = document.getElementById('tabCollabBtn') as HTMLElement;
    this.briefingPanel = document.getElementById('briefingPanel') as HTMLElement;
    this.mailPanel = document.getElementById('mailPanel') as HTMLElement;
    this.placementPanel = document.getElementById('placementPanel') as HTMLElement;
    this.collabPanel = document.getElementById('collabPanel') as HTMLElement;
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
    this.applyAccent(this.prefs.accentColor || 'violet');
    this.applyDensity(this.prefs.density || 'comfortable');
    this.applyLayout(this.prefs.workspaceLayout || 'daily');

    const workspaceSelect = document.getElementById('workspaceSelect') as HTMLSelectElement | null;
    if (workspaceSelect) workspaceSelect.value = this.prefs.workspaceLayout || 'daily';

    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement | null;
    if (themeSelect) themeSelect.value = this.prefs.theme;

    const accentSelect = document.getElementById('accentSelect') as HTMLSelectElement | null;
    if (accentSelect) accentSelect.value = this.prefs.accentColor || 'violet';

    const densitySelect = document.getElementById('densitySelect') as HTMLSelectElement | null;
    if (densitySelect) densitySelect.value = this.prefs.density || 'comfortable';

    const searchSelect = document.getElementById('searchEngineSelect') as HTMLSelectElement | null;
    if (searchSelect) searchSelect.value = this.prefs.searchEngine;

    const toggleContextual = document.getElementById('toggleContextualSection') as HTMLInputElement | null;
    if (toggleContextual) toggleContextual.checked = this.prefs.showContextualSection !== false;

    const contextualSection = document.getElementById('contextualSection');
    if (contextualSection && this.prefs.showContextualSection === false) {
      contextualSection.classList.add('hidden');
    }
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

  private applyAccent(accent: string) {
    document.documentElement.setAttribute('data-accent', accent);
  }

  private applyDensity(density: string) {
    document.documentElement.setAttribute('data-density', density);
  }

  private applyLayout(layout: string) {
    document.body.setAttribute('data-layout', layout);
    const btns = document.querySelectorAll('#workspaceSelector .workspace-btn');
    btns.forEach((btn) => {
      const mode = (btn as HTMLElement).dataset.layout;
      btn.classList.toggle('active', mode === layout);
    });
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
    // Service Worker message listener (e.g. Alt+Q on new tab focuses search)
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === 'PORTAL_FOCUS_SEARCH') {
          this.searchInput?.focus();
          this.searchInput?.select();
        }
      });
    }

    // Only register window focus check if user explicitly opted in to clipboard auto-detection
    if (this.prefs.autoDetectClipboardUrl) {
      window.addEventListener('focus', () => {
        this.checkClipboardForUrl().catch(() => {});
      });
    }

    // '/' key anywhere focuses search (when not in an input/textarea)
    document.addEventListener('keydown', (e) => {
      if (
        e.key === '/' &&
        document.activeElement !== this.searchInput &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        this.searchInput?.focus();
        this.searchInput?.select();
      }
    });

    // Alt+Q focuses search input directly in New Tab
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        this.searchInput?.focus();
        this.searchInput?.select();
      }
    });

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
      this.applyTheme(theme);
      this.prefs = await storage.savePreferences({ theme });
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

    const accentSelect = document.getElementById('accentSelect') as HTMLSelectElement | null;
    accentSelect?.addEventListener('change', async () => {
      const accentColor = accentSelect.value as any;
      this.prefs = await storage.savePreferences({ accentColor });
      this.applyAccent(accentColor);
      this.showToast(`Accent color set to ${accentColor}`);
    });

    const densitySelect = document.getElementById('densitySelect') as HTMLSelectElement | null;
    densitySelect?.addEventListener('change', async () => {
      const density = densitySelect.value as any;
      this.prefs = await storage.savePreferences({ density });
      this.applyDensity(density);
      this.showToast(`Layout density set to ${density}`);
    });

    const toggleContextualSection = document.getElementById('toggleContextualSection') as HTMLInputElement | null;
    toggleContextualSection?.addEventListener('change', async () => {
      const showContextualSection = toggleContextualSection.checked;
      this.prefs = await storage.savePreferences({ showContextualSection });
      const sec = document.getElementById('contextualSection');
      if (sec) sec.classList.toggle('hidden', !showContextualSection);
    });

    const checkForUpdatesBtn = document.getElementById('checkForUpdatesBtn');
    checkForUpdatesBtn?.addEventListener('click', async () => {
      this.showToast('Checking GitHub for updates...');
      try {
        let localVersion = '1.4.0';
        let localCommit = 'HEAD';
        try {
          const localRes = await fetch(chrome.runtime.getURL('build-metadata.json'));
          if (localRes.ok) {
            const localMeta = await localRes.json();
            localVersion = localMeta.version || localVersion;
            localCommit = localMeta.commit || localCommit;
          }
        } catch {}

        try {
          const remoteRes = await fetch('https://raw.githubusercontent.com/Suvichan2005/Portal/feature/portal-next-level/public/build-metadata.json');
          if (remoteRes.ok) {
            const remoteMeta = await remoteRes.json();
            if (remoteMeta.commit && remoteMeta.commit.substring(0, 7) === localCommit.substring(0, 7)) {
              this.showToast(`Portal v${localVersion} is up to date (${localCommit.substring(0, 7)}).`);
            } else {
              this.showToast(`Update available: v${remoteMeta.version} (${remoteMeta.commit.substring(0, 7)}). Run .\\scripts\\sync-release.ps1`);
            }
            return;
          }
        } catch {}

        this.showToast(`Portal v${localVersion} (${localCommit.substring(0, 7)}). Offline / GitHub unreachable.`);
      } catch {
        this.showToast('Portal v1.4.0 (Local release)');
      }
    });

    // Workspace Mode selector listeners
    const workspaceSelector = document.getElementById('workspaceSelector');
    workspaceSelector?.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest('.workspace-btn') as HTMLElement | null;
      if (!btn) return;
      const layout = (btn.dataset.layout as 'focused' | 'daily' | 'studio') || 'daily';
      this.applyLayout(layout);
      this.prefs = await storage.savePreferences({ workspaceLayout: layout });
      const workspaceSelect = document.getElementById('workspaceSelect') as HTMLSelectElement | null;
      if (workspaceSelect) workspaceSelect.value = layout;
      this.showToast(`Switched to ${layout.charAt(0).toUpperCase() + layout.slice(1)} layout`);
    });

    const workspaceSelect = document.getElementById('workspaceSelect') as HTMLSelectElement | null;
    workspaceSelect?.addEventListener('change', async () => {
      const layout = (workspaceSelect.value as 'focused' | 'daily' | 'studio') || 'daily';
      this.applyLayout(layout);
      this.prefs = await storage.savePreferences({ workspaceLayout: layout });
      this.showToast(`Switched to ${layout.charAt(0).toUpperCase() + layout.slice(1)} layout`);
    });

    // Shortcut Modal listeners
    const addShortcutBtn = document.getElementById('addShortcutBtn');
    addShortcutBtn?.addEventListener('click', () => {
      this.openEditShortcutModal();
    });

    const closeEditShortcutModalBtn = document.getElementById('closeEditShortcutModalBtn');
    const editShortcutModal = document.getElementById('editShortcutModal');
    closeEditShortcutModalBtn?.addEventListener('click', () => {
      editShortcutModal?.classList.add('hidden');
    });
    editShortcutModal?.addEventListener('click', (e) => {
      if (e.target === editShortcutModal) editShortcutModal.classList.add('hidden');
    });

    // Modal Tabs: Suggested Destinations vs Custom URL
    const modalTabSuggested = document.getElementById('modalTabSuggested');
    const modalTabCustom = document.getElementById('modalTabCustom');
    const paneSuggested = document.getElementById('paneSuggestedDestinations');
    const paneCustom = document.getElementById('paneCustomUrl');

    modalTabSuggested?.addEventListener('click', () => {
      modalTabSuggested.classList.add('active');
      modalTabCustom?.classList.remove('active');
      paneSuggested?.classList.remove('hidden');
      paneCustom?.classList.add('hidden');
    });

    modalTabCustom?.addEventListener('click', () => {
      modalTabCustom.classList.add('active');
      modalTabSuggested?.classList.remove('active');
      paneCustom?.classList.remove('hidden');
      paneSuggested?.classList.add('hidden');
    });

    // Add search input inside discovery modal
    const addShortcutSearchInput = document.getElementById('addShortcutSearchInput') as HTMLInputElement | null;
    addShortcutSearchInput?.addEventListener('input', () => {
      this.renderCandidateDestinations(addShortcutSearchInput.value.trim());
    });

    // Filter chips inside discovery modal
    const filterChips = document.querySelectorAll('#addFilterChips .filter-chip');
    filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        filterChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentAddFilter = (chip as HTMLElement).dataset.filter || 'all';
        this.renderCandidateDestinations(addShortcutSearchInput?.value.trim() || '');
      });
    });

    // Auto-detect title on URL typing
    const shortcutUrlInput = document.getElementById('shortcutUrlInput') as HTMLInputElement | null;
    shortcutUrlInput?.addEventListener('input', () => {
      const titleInput = document.getElementById('shortcutTitleInput') as HTMLInputElement | null;
      if (titleInput && !titleInput.value.trim()) {
        try {
          const raw = shortcutUrlInput.value.trim();
          const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
          const domain = u.hostname.replace(/^www\./, '');
          const segs = u.pathname.split('/').filter(Boolean);
          if (domain === 'github.com' && segs.length >= 2) {
            titleInput.value = `${segs[0]}/${segs[1]}`;
          } else {
            titleInput.value = domain.charAt(0).toUpperCase() + domain.slice(1);
          }
        } catch {}
      }
    });

    const saveShortcutBtn = document.getElementById('saveShortcutBtn');
    saveShortcutBtn?.addEventListener('click', async () => {
      const idInput = document.getElementById('shortcutIdInput') as HTMLInputElement | null;
      const titleInput = document.getElementById('shortcutTitleInput') as HTMLInputElement | null;
      const urlInput = document.getElementById('shortcutUrlInput') as HTMLInputElement | null;

      const title = titleInput?.value.trim() || '';
      let url = urlInput?.value.trim() || '';
      if (!url) {
        this.showToast('Please provide a URL');
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('chrome://')) {
        url = `https://${url}`;
      }

      const id = idInput?.value;
      if (id) {
        await storage.updateShortcut(id, { title: title || url, customTitle: title, url });
        this.showToast('Shortcut updated');
      } else {
        await storage.pinShortcut({ title: title || url, customTitle: title, url });
        this.showToast('Shortcut pinned');
      }

      editShortcutModal?.classList.add('hidden');
      this.renderShortcuts();
    });

    const deleteShortcutBtn = document.getElementById('deleteShortcutBtn');
    deleteShortcutBtn?.addEventListener('click', async () => {
      const idInput = document.getElementById('shortcutIdInput') as HTMLInputElement | null;
      const id = idInput?.value;
      if (id) {
        await storage.unpinShortcut(id);
        this.showToast('Shortcut removed');
        editShortcutModal?.classList.add('hidden');
        this.renderShortcuts();
      }
    });

    // Tab switcher between Open Tabs, Recently Closed, and Bookmarks
    const tabOpenTabsBtn = document.getElementById('tabOpenTabsBtn');
    const tabRecentlyClosedBtn = document.getElementById('tabRecentlyClosedBtn');
    const tabBookmarksBtn = document.getElementById('tabBookmarksBtn');
    const openTabsContent = document.getElementById('openTabsContent');
    const recentlyClosedContent = document.getElementById('recentlyClosedContent');
    const bookmarksContent = document.getElementById('bookmarksContent');

    tabOpenTabsBtn?.addEventListener('click', () => {
      tabOpenTabsBtn.classList.add('active');
      tabRecentlyClosedBtn?.classList.remove('active');
      tabBookmarksBtn?.classList.remove('active');
      openTabsContent?.classList.remove('hidden');
      recentlyClosedContent?.classList.add('hidden');
      bookmarksContent?.classList.add('hidden');
      this.renderOpenTabs();
    });

    tabRecentlyClosedBtn?.addEventListener('click', () => {
      tabRecentlyClosedBtn.classList.add('active');
      tabOpenTabsBtn?.classList.remove('active');
      tabBookmarksBtn?.classList.remove('active');
      recentlyClosedContent?.classList.remove('hidden');
      openTabsContent?.classList.add('hidden');
      bookmarksContent?.classList.add('hidden');
      this.renderRecentlyClosed();
    });

    tabBookmarksBtn?.addEventListener('click', () => {
      tabBookmarksBtn.classList.add('active');
      tabOpenTabsBtn?.classList.remove('active');
      tabRecentlyClosedBtn?.classList.remove('active');
      bookmarksContent?.classList.remove('hidden');
      openTabsContent?.classList.add('hidden');
      recentlyClosedContent?.classList.add('hidden');
      this.renderBookmarks();
    });

    // Modular Shell Intelligence tabs
    const switchIntelTab = (activeBtn: HTMLElement | null, activePanel: HTMLElement | null) => {
      const allBtns = [this.tabBriefingBtn, this.tabMailBtn, this.tabPlacementBtn, this.tabCollabBtn, this.tabOpenClawBtn];
      const allPanels = [this.briefingPanel, this.mailPanel, this.placementPanel, this.collabPanel, this.openClawPanel];
      allBtns.forEach((b) => b?.classList.remove('active'));
      allPanels.forEach((p) => p?.classList.add('hidden'));
      activeBtn?.classList.add('active');
      activePanel?.classList.remove('hidden');
    };

    this.tabBriefingBtn?.addEventListener('click', () => switchIntelTab(this.tabBriefingBtn, this.briefingPanel));
    this.tabMailBtn?.addEventListener('click', () => switchIntelTab(this.tabMailBtn, this.mailPanel));
    this.tabPlacementBtn?.addEventListener('click', () => switchIntelTab(this.tabPlacementBtn, this.placementPanel));
    this.tabCollabBtn?.addEventListener('click', () => switchIntelTab(this.tabCollabBtn, this.collabPanel));
    this.tabOpenClawBtn?.addEventListener('click', () => switchIntelTab(this.tabOpenClawBtn, this.openClawPanel));

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
      ++this.searchSeq;
      clearTimeout(this.debounceTimer);
      this.currentSuggestions = [];
      this.hideSuggestions();
      return;
    }

    const currentSeq = ++this.searchSeq;
    const results = await searchEngine.search(query, this.prefs, { context: 'newtab' });
    if (currentSeq !== this.searchSeq) return; // Discard stale asynchronous responses

    this.currentSuggestions = results;
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

      // Quick result actions (Copy Link, Copy Markdown, Tab Close)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'suggestion-actions';

      if (item.url) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'suggestion-action-btn';
        copyBtn.title = 'Copy Link (Alt+C)';
        copyBtn.textContent = '🔗';
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(item.url!).then(() => {
            this.showToast(`Copied link: ${item.url}`);
          }).catch(() => {
            this.showToast('Could not copy link');
          });
        });
        actionsDiv.appendChild(copyBtn);

        const copyMdBtn = document.createElement('button');
        copyMdBtn.className = 'suggestion-action-btn';
        copyMdBtn.title = 'Copy Markdown (Alt+M)';
        copyMdBtn.textContent = '📋';
        copyMdBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const md = `[${item.title || item.url}](${item.url})`;
          navigator.clipboard.writeText(md).then(() => {
            this.showToast(`Copied markdown: ${md}`);
          }).catch(() => {
            this.showToast('Could not copy markdown');
          });
        });
        actionsDiv.appendChild(copyMdBtn);
      }

      if (item.type === 'tab' && item.tabId) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'suggestion-action-btn';
        closeBtn.title = 'Close Tab (Alt+W)';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof chrome !== 'undefined' && chrome.tabs?.remove) {
            chrome.tabs.remove(item.tabId!, () => {
              this.currentSuggestions = this.currentSuggestions.filter((r) => r.tabId !== item.tabId);
              if (this.selectedSuggestionIndex >= this.currentSuggestions.length) {
                this.selectedSuggestionIndex = Math.max(0, this.currentSuggestions.length - 1);
              }
              this.renderSuggestions();
              this.showToast(`Closed tab: ${item.title}`);
            });
          }
        });
        actionsDiv.appendChild(closeBtn);
      }

      if (actionsDiv.children.length > 0) {
        li.appendChild(actionsDiv);
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

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.currentSuggestions.length > 0) {
        this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.currentSuggestions.length;
        this.updateSelectedSuggestion();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.currentSuggestions.length > 0) {
        this.selectedSuggestionIndex =
          (this.selectedSuggestionIndex - 1 + this.currentSuggestions.length) % this.currentSuggestions.length;
        this.updateSelectedSuggestion();
      }
      return;
    }

    // Secondary action: Alt+W closes selected open tab directly from results
    if (e.altKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      const current = this.currentSuggestions[this.selectedSuggestionIndex];
      if (current && current.type === 'tab' && current.tabId) {
        if (typeof chrome !== 'undefined' && chrome.tabs?.remove) {
          chrome.tabs.remove(current.tabId, () => {
            this.currentSuggestions = this.currentSuggestions.filter((r) => r.tabId !== current.tabId);
            if (this.selectedSuggestionIndex >= this.currentSuggestions.length) {
              this.selectedSuggestionIndex = Math.max(0, this.currentSuggestions.length - 1);
            }
            this.renderSuggestions();
            this.showToast(`Closed tab: ${current.title}`);
          });
        }
      }
      return;
    }

    // Secondary action: Alt+C copies URL of selected result
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      const current = this.currentSuggestions[this.selectedSuggestionIndex];
      if (current && current.url) {
        navigator.clipboard.writeText(current.url).then(() => {
          this.showToast(`Copied link: ${current.url}`);
        }).catch(() => {
          this.showToast('Could not copy link');
        });
      }
      return;
    }

    // Secondary action: Alt+M copies Markdown link [title](url)
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      const current = this.currentSuggestions[this.selectedSuggestionIndex];
      if (current && current.url) {
        const md = `[${current.title || current.url}](${current.url})`;
        navigator.clipboard.writeText(md).then(() => {
          this.showToast(`Copied markdown: ${md}`);
        }).catch(() => {
          this.showToast('Could not copy markdown');
        });
      }
      return;
    }

    // Secondary action: Alt+D duplicates selected open tab
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      const current = this.currentSuggestions[this.selectedSuggestionIndex];
      if (current && current.type === 'tab' && current.tabId) {
        if (typeof chrome !== 'undefined' && chrome.tabs?.duplicate) {
          chrome.tabs.duplicate(current.tabId, () => {
            this.showToast(`Duplicated tab: ${current.title}`);
          });
        }
      }
      return;
    }

    // Secondary action: Alt+P pins/unpins selected open tab
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      const current = this.currentSuggestions[this.selectedSuggestionIndex];
      if (current && current.type === 'tab' && current.tabId) {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.update(current.tabId, { pinned: !current.pinned }, (tab) => {
            current.pinned = tab?.pinned;
            this.renderSuggestions();
            this.showToast(tab?.pinned ? 'Pinned tab' : 'Unpinned tab');
          });
        }
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(this.debounceTimer);
      const raw = cleanPastedInput(this.searchInput.value);
      if (!raw) return;

      // Priority 1: Unambiguous direct URL navigation when user hasn't explicitly navigated down to a suggestion
      const directMatch = parseDirectUrl(raw);
      if (directMatch.isUrl && this.selectedSuggestionIndex <= 0) {
        if (e.ctrlKey || e.metaKey) {
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: directMatch.normalizedUrl, active: false });
          } else {
            window.open(directMatch.normalizedUrl, '_blank');
          }
        } else {
          window.location.href = directMatch.normalizedUrl;
        }
        return;
      }

      if (this.selectedSuggestionIndex >= 0 && this.currentSuggestions[this.selectedSuggestionIndex]) {
        this.executeSuggestion(this.currentSuggestions[this.selectedSuggestionIndex], e);
        return;
      }

      // Enter pressed before suggestions loaded or suggestions empty: resolve synchronous intent
      const intent = resolveSynchronousIntent(raw, this.prefs.searchEngine);
      if (
        (intent.type === 'navigate_url' ||
          intent.type === 'provider_search' ||
          intent.type === 'web_search_fallback') &&
        intent.targetUrl
      ) {
        if (e.ctrlKey || e.metaKey) {
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: intent.targetUrl, active: false });
          } else {
            window.open(intent.targetUrl, '_blank');
          }
        } else {
          window.location.href = intent.targetUrl;
        }
      } else if (intent.type === 'command') {
        const cmd = COMMANDS.find((c) => c.id === intent.commandId || c.keywords.includes(raw.replace(/^\//, '')));
        if (cmd) {
          Promise.resolve(cmd.execute()).then((res: any) => {
            if (res && res.message) this.showToast(res.message);
          });
        }
      }
      return;
    }
  }

  private async executeSuggestion(item: SearchResult, e?: MouseEvent | KeyboardEvent) {
    // If selecting a bang guide entry (e.g. "!gh <query>" or "@gh <query>"), fill bang into input to let user type query
    if (item.badge === 'BANG' && (item.title.startsWith('!') || item.title.startsWith('@'))) {
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

    // Workspace Session restoration
    if (item.type === 'session' || (item.commandId === 'restore-saved-session' && item.sessionId)) {
      const sId = item.sessionId || (item.id ? item.id.replace(/^session-/, '') : '');
      const res = await storage.restoreSession(sId);
      this.showToast(res.message);
      this.hideSuggestions();
      return;
    }

    if (item.type === 'command' && item.commandId) {
      const cmd = COMMANDS.find((c) => c.id === item.commandId);
      if (cmd) {
        const res = await cmd.execute({
          sessionId: item.sessionId,
          tabId: item.tabId,
          windowId: item.windowId,
        });
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
      type?: 'url' | 'session' | 'search' | 'action';
      sessionId?: string;
      tabCount?: number;
      searchQuery?: string;
      isAiSuggested?: boolean;
      cluster?: HistoryCluster;
    }[] = [];

    pinned.forEach((p) => {
      itemsToRender.push({
        id: p.id,
        title: p.customTitle || p.title,
        url: p.url,
        isPinned: true,
        type: p.type || 'url',
        sessionId: p.sessionId,
        tabCount: p.tabCount,
        searchQuery: p.searchQuery,
      });
    });

    // Add clusters that are not already pinned
    clusters.forEach((c) => {
      const isSearch = c.topic.startsWith('Research:');
      if (!pinned.some((p) => p.url === c.primaryUrl)) {
        itemsToRender.push({
          id: c.id,
          title: c.topic,
          url: c.primaryUrl,
          isPinned: false,
          isAiSuggested: true,
          type: isSearch ? 'search' : 'url',
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
      card.className = `shortcut-card ${item.type === 'session' ? 'session-card' : ''}`;
      card.tabIndex = 0;

      if (item.isAiSuggested && item.cluster?.isAiGenerated) {
        const aiPill = document.createElement('span');
        aiPill.className = 'ai-pill';
        aiPill.textContent = '✦ AI';
        aiPill.title = item.cluster.aiGeneratedReason || 'Generated by on-device model';
        card.appendChild(aiPill);
      }
      card.title = item.type === 'session'
        ? `Workspace: ${item.title} (${item.tabCount || 0} tabs)`
        : item.cluster ? `${item.title} (${item.cluster.domain})` : item.title;

      // Actions (Pin / Edit / Dismiss)
      const actions = document.createElement('div');
      actions.className = 'shortcut-actions';

      if (item.isPinned) {
        const editBtn = document.createElement('button');
        editBtn.className = 'shortcut-action-btn';
        editBtn.innerHTML = Icons.edit;
        editBtn.title = 'Edit shortcut';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEditShortcutModal(item.id, item.title, item.url);
        });
        actions.appendChild(editBtn);
      }

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
            type: item.type,
            sessionId: item.sessionId,
            tabCount: item.tabCount,
            searchQuery: item.searchQuery,
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
      if (item.type === 'session') {
        iconSlot.innerHTML = Icons.folder;
      } else if (item.type === 'search') {
        iconSlot.innerHTML = Icons.search;
      } else {
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
      }
      card.appendChild(iconSlot);

      // Label & Domain
      const name = document.createElement('div');
      name.className = 'shortcut-name';
      name.textContent = item.title;
      card.appendChild(name);

      const domain = document.createElement('div');
      domain.className = 'shortcut-domain';
      if (item.type === 'session') {
        domain.textContent = `Workspace • ${item.tabCount || 0} tabs`;
      } else if (item.type === 'search') {
        domain.textContent = 'Search Query';
      } else {
        try {
          domain.textContent = new URL(item.url).hostname.replace(/^www\./, '');
        } catch {
          domain.textContent = item.url;
        }
      }
      card.appendChild(domain);

      // Destination Execution (Workspace restore, search, or direct navigation)
      const executeDestination = async (e: MouseEvent | KeyboardEvent) => {
        if (item.type === 'session' && item.sessionId) {
          e.stopPropagation();
          const res = await storage.restoreSession(item.sessionId);
          this.showToast(res.message);
          return;
        }

        if (item.type === 'search') {
          const targetUrl = item.url || resolveSynchronousIntent(item.title, this.prefs.searchEngine).targetUrl;
          if (targetUrl) {
            if (e.ctrlKey || (e as any).metaKey) {
              if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.create({ url: targetUrl, active: false });
              } else {
                window.open(targetUrl, '_blank');
              }
            } else {
              window.location.href = targetUrl;
            }
          }
          return;
        }

        if (e.ctrlKey || (e as any).metaKey) {
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: item.url, active: false });
          } else {
            window.open(item.url, '_blank');
          }
        } else {
          window.location.href = item.url;
        }
      };

      card.addEventListener('click', executeDestination);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          executeDestination(e);
        }
      });

      this.shortcutsGrid.appendChild(card);
    });
  }

  private async loadCandidateDestinations() {
    this.candidateDestinations = [];
    const seenKeys = new Set<string>();

    const pinnedShortcuts = await storage.getPinnedShortcuts();
    const pinnedUrls = new Set(pinnedShortcuts.map((p) => p.url));
    const pinnedSessionIds = new Set(pinnedShortcuts.filter((p) => p.sessionId).map((p) => p.sessionId!));

    // 1. Saved Sessions (First-class Workspaces)
    try {
      const sessions = await storage.getSavedSessions();
      for (const s of sessions) {
        if (s.tabs.length > 0 && !seenKeys.has(`session:${s.id}`)) {
          seenKeys.add(`session:${s.id}`);
          const isPinned = pinnedSessionIds.has(s.id);
          this.candidateDestinations.push({
            id: `candidate-session-${s.id}`,
            title: s.name,
            url: s.tabs[0]?.url || `portal://session/${s.id}`,
            source: 'session',
            type: 'session',
            sessionId: s.id,
            tabCount: s.tabCount,
            score: 200 + Math.min(20, s.tabCount),
            domain: `Workspace • ${s.tabCount} tabs`,
            subtitle: `Saved workspace containing ${s.tabCount} tabs`,
            isPinned,
            badge: 'WORKSPACE',
          });
        }
      }
    } catch {}

    // 2. Open Tabs
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
          const normUrl = historyClusterer.normalizeUrl(tab.url);
          if (!seenKeys.has(normUrl)) {
            seenKeys.add(normUrl);
            const isPinned = pinnedUrls.has(tab.url) || pinnedUrls.has(normUrl);
            const cleanTitle = historyClusterer.cleanPageTitle(tab.title || '') || tab.title || tab.url;
            let host = '';
            try { host = new URL(tab.url).hostname.replace(/^www\./, ''); } catch {}
            this.candidateDestinations.push({
              id: `candidate-tab-${tab.id}`,
              title: cleanTitle,
              url: tab.url,
              source: 'tab',
              type: 'url',
              score: tab.active ? 160 : 120,
              domain: host,
              subtitle: `Active tab • ${host}`,
              isPinned,
              badge: 'TAB',
            });
          }
        }
      } catch {}
    }

    // 3. Frequent history & intelligent clusters (including repeated research queries)
    try {
      const intel = await storage.getIntelligence();
      if (intel?.clusters) {
        for (const c of intel.clusters) {
          const isSearch = c.topic.startsWith('Research:');
          const normUrl = historyClusterer.normalizeUrl(c.primaryUrl);
          if (!seenKeys.has(normUrl) && !seenKeys.has(c.topic)) {
            seenKeys.add(normUrl);
            seenKeys.add(c.topic);
            const isPinned = pinnedUrls.has(c.primaryUrl) || pinnedUrls.has(normUrl);
            this.candidateDestinations.push({
              id: `candidate-history-${c.id}`,
              title: c.topic,
              url: c.primaryUrl,
              source: isSearch ? 'search' : 'history',
              type: isSearch ? 'search' : 'url',
              searchQuery: isSearch ? c.topic.replace(/^Research:\s*"?/, '').replace(/"?$/, '') : undefined,
              score: c.score || 100,
              domain: c.domain,
              subtitle: isSearch ? `Frequent search query (${c.visits} visits)` : `Frequently visited (${c.visits} visits) • ${c.domain}`,
              isPinned,
              badge: isSearch ? 'SEARCH' : 'FREQUENT',
            });
          }
        }
      }
    } catch {}

    // 4. Bookmarks
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      try {
        const bookmarks = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) => {
          chrome.bookmarks.getRecent(20, resolve);
        });
        for (const b of bookmarks) {
          if (!b.url || b.url.startsWith('chrome://')) continue;
          const normUrl = historyClusterer.normalizeUrl(b.url);
          if (!seenKeys.has(normUrl)) {
            seenKeys.add(normUrl);
            const isPinned = pinnedUrls.has(b.url) || pinnedUrls.has(normUrl);
            const cleanTitle = historyClusterer.cleanPageTitle(b.title || '') || b.title || b.url;
            let host = '';
            try { host = new URL(b.url).hostname.replace(/^www\./, ''); } catch {}
            this.candidateDestinations.push({
              id: `candidate-bm-${b.id}`,
              title: cleanTitle,
              url: b.url,
              source: 'bookmark',
              type: 'url',
              score: 90,
              domain: host,
              subtitle: `Bookmark • ${host}`,
              isPinned,
              badge: 'BOOKMARK',
            });
          }
        }
      } catch {}
    }

    // Sort candidates by score descending
    this.candidateDestinations.sort((a, b) => b.score - a.score);
  }

  private renderCandidateDestinations(filterText = '') {
    const listEl = document.getElementById('suggestedDestinationsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const lowerQ = filterText.toLowerCase();
    const filtered = this.candidateDestinations.filter((item) => {
      if (this.currentAddFilter !== 'all') {
        if (this.currentAddFilter === 'tabs' && item.source !== 'tab') return false;
        if (this.currentAddFilter === 'bookmarks' && item.source !== 'bookmark') return false;
        if (this.currentAddFilter === 'history' && item.source !== 'history') return false;
        if (this.currentAddFilter === 'sessions' && item.source !== 'session') return false;
        if (this.currentAddFilter === 'searches' && item.source !== 'search') return false;
      }
      if (!lowerQ) return true;
      return (
        item.title.toLowerCase().includes(lowerQ) ||
        item.url.toLowerCase().includes(lowerQ) ||
        item.subtitle.toLowerCase().includes(lowerQ) ||
        item.domain.toLowerCase().includes(lowerQ)
      );
    });

    if (filtered.length === 0) {
      listEl.innerHTML =
        '<div style="color:var(--text-muted);font-size:13px;padding:14px;text-align:center;">No matching destinations found. Use the Custom URL tab to add manually.</div>';
      return;
    }

    for (const item of filtered.slice(0, 25)) {
      const card = document.createElement('div');
      card.className = `suggested-item-card ${item.isPinned ? 'already-pinned' : ''}`;

      const info = document.createElement('div');
      info.className = 'suggested-item-info';

      // Icon: Workspace icon for session, search icon for search, favicon for URL
      const iconSlot = document.createElement('div');
      iconSlot.className = 'suggested-item-icon-slot';
      if (item.type === 'session') {
        iconSlot.innerHTML = Icons.folder;
      } else if (item.type === 'search') {
        iconSlot.innerHTML = Icons.search;
      } else {
        const icon = document.createElement('img');
        icon.className = 'suggested-item-icon';
        icon.src = getFaviconUrl(item.url);
        icon.onerror = () => {
          iconSlot.innerHTML = Icons.globe;
        };
        iconSlot.appendChild(icon);
      }

      const text = document.createElement('div');
      text.className = 'suggested-item-text';

      const title = document.createElement('div');
      title.className = 'suggested-item-title';
      title.textContent = item.title;

      const sub = document.createElement('div');
      sub.className = 'suggested-item-url';
      sub.textContent = item.subtitle;

      text.appendChild(title);
      text.appendChild(sub);
      info.appendChild(iconSlot);
      info.appendChild(text);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '8px';

      const badge = document.createElement('span');
      badge.className = 'source-badge';
      badge.textContent = item.badge || item.source.toUpperCase();

      const pinBtn = document.createElement('button');
      pinBtn.className = `suggested-pin-btn ${item.isPinned ? 'pinned' : ''}`;
      pinBtn.textContent = item.isPinned ? '✓ Pinned' : '+ Pin';
      if (item.isPinned) {
        pinBtn.disabled = true;
      }

      const handlePin = async (e: Event) => {
        e.stopPropagation();
        if (item.isPinned) return;
        await storage.pinShortcut({
          title: item.title,
          url: item.url,
          type: item.type,
          sessionId: item.sessionId,
          searchQuery: item.searchQuery,
          tabCount: item.tabCount,
          actionId: item.actionId,
        });
        item.isPinned = true;
        this.showToast(`Pinned "${item.title}" to Quick Access`);
        const modal = document.getElementById('editShortcutModal');
        modal?.classList.add('hidden');
        await this.renderShortcuts();
      };

      pinBtn.addEventListener('click', handlePin);
      if (!item.isPinned) {
        card.addEventListener('click', handlePin);
      }

      right.appendChild(badge);
      right.appendChild(pinBtn);
      card.appendChild(info);
      card.appendChild(right);
      listEl.appendChild(card);
    }
  }

  private async openEditShortcutModal(id?: string, title?: string, url?: string) {
    const modal = document.getElementById('editShortcutModal');
    const modalTitle = document.getElementById('editShortcutModalTitle');
    const idInput = document.getElementById('shortcutIdInput') as HTMLInputElement | null;
    const titleInput = document.getElementById('shortcutTitleInput') as HTMLInputElement | null;
    const urlInput = document.getElementById('shortcutUrlInput') as HTMLInputElement | null;
    const deleteBtn = document.getElementById('deleteShortcutBtn');

    const modalTabSuggested = document.getElementById('modalTabSuggested');
    const modalTabCustom = document.getElementById('modalTabCustom');
    const paneSuggested = document.getElementById('paneSuggestedDestinations');
    const paneCustom = document.getElementById('paneCustomUrl');

    if (idInput) idInput.value = id || '';
    if (titleInput) titleInput.value = title || '';
    if (urlInput) urlInput.value = url || '';
    if (deleteBtn) deleteBtn.style.display = id ? 'inline-block' : 'none';

    if (id) {
      // Editing existing shortcut: switch to Custom / Edit tab directly
      modalTabSuggested?.classList.remove('active');
      modalTabCustom?.classList.add('active');
      paneSuggested?.classList.add('hidden');
      paneCustom?.classList.remove('hidden');
      if (modalTitle) modalTitle.textContent = 'Edit Shortcut';
    } else {
      // Adding new shortcut: show both manual entry and Suggested Destinations
      modalTabSuggested?.classList.add('active');
      modalTabCustom?.classList.remove('active');
      paneSuggested?.classList.remove('hidden');
      paneCustom?.classList.remove('hidden');
      if (modalTitle) modalTitle.textContent = 'Add Destination';
      await this.loadCandidateDestinations();
      this.renderCandidateDestinations();
    }

    modal?.classList.remove('hidden');
    if (id && titleInput) titleInput.focus();
    else document.getElementById('addShortcutSearchInput')?.focus();
  }

  // --- Contextual Section: Open Tabs & Recently Closed & Bookmarks ---

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

  private async renderRecentlyClosed() {
    const container = document.getElementById('recentlyClosedGrid');
    if (!container) return;
    container.innerHTML = '';

    if (typeof chrome === 'undefined' || !chrome.sessions || !chrome.sessions.getRecentlyClosed) {
      container.innerHTML =
        '<div style="color:var(--text-muted);font-size:13px;padding:8px;">Recently closed sessions available in Chrome extension mode</div>';
      return;
    }

    try {
      const sessions = await new Promise<chrome.sessions.Session[]>((resolve) => {
        chrome.sessions.getRecentlyClosed({ maxResults: 15 }, resolve);
      });

      if (!sessions || sessions.length === 0) {
        container.innerHTML =
          '<div style="color:var(--text-muted);font-size:13px;padding:8px;">No recently closed tabs or windows</div>';
        return;
      }

      sessions.forEach((s) => {
        if (s.tab) {
          const tab = s.tab;
          const row = document.createElement('div');
          row.className = 'tab-item-row';

          const iconSlot = document.createElement('div');
          iconSlot.className = 'tab-icon';
          if (tab.favIconUrl) {
            const img = document.createElement('img');
            img.src = tab.favIconUrl;
            img.onerror = () => {
              iconSlot.innerHTML = Icons.history;
            };
            iconSlot.appendChild(img);
          } else {
            iconSlot.innerHTML = Icons.history;
          }
          row.appendChild(iconSlot);

          const title = document.createElement('div');
          title.className = 'tab-title';
          title.textContent = tab.title || tab.url || 'Closed tab';
          row.appendChild(title);

          const badge = document.createElement('span');
          badge.className = 'suggestion-badge';
          badge.textContent = 'RESTORE';
          row.appendChild(badge);

          row.addEventListener('click', async () => {
            if (tab.sessionId) {
              await chrome.sessions.restore(tab.sessionId);
              this.showToast(`Restored: ${tab.title || 'Tab'}`);
              this.renderRecentlyClosed();
            }
          });

          container.appendChild(row);
        } else if (s.window && s.window.tabs) {
          const winTabs = s.window.tabs;
          const row = document.createElement('div');
          row.className = 'tab-item-row';

          const iconSlot = document.createElement('div');
          iconSlot.className = 'tab-icon';
          iconSlot.innerHTML = Icons.tab;
          row.appendChild(iconSlot);

          const title = document.createElement('div');
          title.className = 'tab-title';
          title.textContent = `Window (${winTabs.length} tabs: ${winTabs
            .map((t) => t.title)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')}...)`;
          row.appendChild(title);

          const badge = document.createElement('span');
          badge.className = 'suggestion-badge';
          badge.textContent = 'RESTORE WINDOW';
          row.appendChild(badge);

          row.addEventListener('click', async () => {
            if (s.window?.sessionId) {
              await chrome.sessions.restore(s.window.sessionId);
              this.showToast(`Restored window (${winTabs.length} tabs)`);
              this.renderRecentlyClosed();
            }
          });

          container.appendChild(row);
        }
      });
    } catch (err) {
      console.warn('Error loading recently closed sessions:', err);
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
      // Load and project registered modules
      const modules = await moduleRegistry.getModules();
      this.renderModulesFromRegistry(modules);

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

  private renderModulesFromRegistry(modules: ModuleDescriptor[]) {
    // 1. Placement OS
    const placementMod = modules.find((m) => m.id === 'placement');
    const placementTag = document.getElementById('placementFreshnessTag');
    if (placementTag && placementMod) {
      placementTag.textContent = placementMod.statusText;
    }

    // 2. AgenticCollab
    const collabMod = modules.find((m) => m.id === 'agentic_collab');
    const collabTag = document.getElementById('collabFreshnessTag');
    if (collabTag && collabMod) {
      collabTag.textContent = collabMod.statusText;
    }

    // 3. OpenClaw
    const openclawMod = modules.find((m) => m.id === 'openclaw');
    if (openclawMod && this.openclawGatewayLabel) {
      this.openclawGatewayLabel.textContent = openclawMod.statusText;
    }
  }

  // --- Intelligence Status Badge ---

  private async updateAiStatusBadge() {
    try {
      const labelEl = document.getElementById('aiBadgeLabel');
      const badgeEl = document.getElementById('aiStatusBadge');
      const status = await promptApi.checkStatus();

      if (status.stage === 'inference_applied') {
        if (labelEl) labelEl.textContent = 'Gemini Nano Active';
        if (badgeEl) badgeEl.title = status.details || 'Chrome on-device Gemini Nano has refined suggestions locally.';
      } else if (status.stage === 'model_ready') {
        if (labelEl) labelEl.textContent = 'Gemini Nano Ready';
        if (badgeEl) badgeEl.title = 'Chrome on-device model downloaded and ready for local inference.';
      } else if (status.stage === 'model_downloadable') {
        if (labelEl) labelEl.textContent = 'Downloading Model...';
        if (badgeEl) badgeEl.title = 'Chrome is downloading the on-device model component.';
      } else {
        if (labelEl) labelEl.textContent = 'Local Discovery (Deterministic)';
        if (badgeEl) badgeEl.title = '100% on-device recency/frequency ranking. 0 external network requests.';
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
