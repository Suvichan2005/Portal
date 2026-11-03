import { SearchResult, InitialLauncherState } from '../core/types';
import { Icons, getFaviconUrl } from '../core/icons/svg-icons';
import { resolveSynchronousIntent } from '../core/search/grammar';
import { cleanPastedInput, parseDirectUrl } from '../core/search/url-utils';

(function initPortalFloatingLauncher() {
  const ROOT_ID = 'portal-floating-launcher-root';
  const existingRoot = document.getElementById(ROOT_ID);

  // If already open or injected, toggle cleanly
  if (existingRoot) {
    if (typeof (existingRoot as any).__portalToggle === 'function') {
      (existingRoot as any).__portalToggle();
    } else if (typeof (existingRoot as any).__portalClose === 'function') {
      (existingRoot as any).__portalClose();
    } else {
      existingRoot.remove();
    }
    return;
  }

  // Preserve previous active element to restore focus on close
  let previousActiveElement: HTMLElement | null = null;

  // Create host and Shadow Root for complete CSS isolation from the host webpage
  const host = document.createElement('div');
  host.id = ROOT_ID;
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100vw';
  host.style.height = '100vh';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'auto';

  const shadow = host.attachShadow({ mode: 'open' });

  // Styles isolated inside Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .scrim {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 14vh;
      animation: fadeIn 0.12s ease-out;
    }
    .modal {
      width: 640px;
      max-width: 92vw;
      background: #121316;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideDown 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .search-row {
      display: flex;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 12px;
    }
    .search-icon {
      width: 20px;
      height: 20px;
      color: #71717a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f4f4f6;
      font-size: 16px;
      line-height: 1.4;
    }
    .search-input::placeholder {
      color: #5e606a;
    }
    .kbd-tag {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-family: monospace;
      color: #a1a1aa;
    }
    .content-area {
      max-height: 420px;
      overflow-y: auto;
      padding: 8px;
    }
    .content-area::-webkit-scrollbar {
      width: 6px;
    }
    .content-area::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 3px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #5e606a;
      padding: 8px 12px 4px 12px;
    }
    .results-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .result-item {
      display: flex;
      align-items: center;
      padding: 9px 12px;
      border-radius: 8px;
      cursor: pointer;
      gap: 12px;
      transition: background 0.1s ease;
      user-select: none;
    }
    .result-item.selected, .result-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .item-icon {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #8e9099;
    }
    .item-icon img {
      width: 18px;
      height: 18px;
      border-radius: 3px;
    }
    .item-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .item-title {
      font-size: 14px;
      font-weight: 500;
      color: #f4f4f6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-desc {
      font-size: 12px;
      color: #71717a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-badge {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.25);
      flex-shrink: 0;
    }
    .item-actions {
      display: none;
      align-items: center;
      gap: 4px;
      margin-left: 6px;
    }
    .result-item:hover .item-actions,
    .result-item.selected .item-actions {
      display: flex;
    }
    .action-icon-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 11px;
      color: #a1a1aa;
      cursor: pointer;
      line-height: 1;
      transition: all 0.1s ease;
    }
    .action-icon-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11px;
      color: #71717a;
      background: rgba(0, 0, 0, 0.25);
    }
    .shortcuts {
      display: flex;
      gap: 12px;
    }
    .action-menu {
      padding: 8px 14px;
      background: rgba(18, 18, 22, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: none;
    }
    .action-menu.active {
      display: block;
    }
    .action-menu-header {
      font-size: 11px;
      color: #a1a1aa;
      margin-bottom: 6px;
      font-weight: 500;
    }
    .action-menu-items {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .action-menu-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
      font-size: 11px;
      color: #e4e4e7;
      cursor: pointer;
      transition: all 0.1s ease;
    }
    .action-menu-chip:hover,
    .action-menu-chip.selected {
      background: rgba(99, 102, 241, 0.3);
      border-color: rgba(99, 102, 241, 0.6);
      color: #ffffff;
    }
    .notice-bar {
      font-size: 12px;
      padding: 8px 12px;
      margin: 8px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #c7d2fe;
      border-radius: 6px;
      display: none;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  shadow.appendChild(styleEl);

  // Scrim and modal container
  const scrim = document.createElement('div');
  scrim.className = 'scrim';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const searchRow = document.createElement('div');
  searchRow.className = 'search-row';

  const searchIcon = document.createElement('div');
  searchIcon.className = 'search-icon';
  searchIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

  const input = document.createElement('input');
  input.id = 'portalOverlayInput';
  input.type = 'text';
  input.className = 'search-input';
  input.placeholder = 'Search tabs, history, bookmarks, or type a URL...';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const kbdHint = document.createElement('span');
  kbdHint.className = 'kbd-tag';
  kbdHint.textContent = 'Alt+Q';

  searchRow.appendChild(searchIcon);
  searchRow.appendChild(input);
  searchRow.appendChild(kbdHint);

  const noticeBar = document.createElement('div');
  noticeBar.id = 'noticeBar';
  noticeBar.className = 'notice-bar';

  const contentArea = document.createElement('div');
  contentArea.className = 'content-area';

  const resultsList = document.createElement('ul');
  resultsList.className = 'results-list';
  contentArea.appendChild(resultsList);

  const actionMenu = document.createElement('div');
  actionMenu.className = 'action-menu';

  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="shortcuts">
      <span><span class="kbd-tag">↑↓</span> Navigate</span>
      <span><span class="kbd-tag">↵</span> Select</span>
      <span><span class="kbd-tag">Tab</span> Actions</span>
      <span><span class="kbd-tag">Alt+C</span> Copy Link</span>
      <span><span class="kbd-tag">Alt+M</span> Copy MD</span>
      <span><span class="kbd-tag">Alt+W</span> Close Tab</span>
      <span><span class="kbd-tag">Esc</span> Dismiss</span>
    </div>
    <div>Portal Launcher</div>
  `;

  modal.appendChild(searchRow);
  modal.appendChild(noticeBar);
  modal.appendChild(contentArea);
  modal.appendChild(actionMenu);
  modal.appendChild(footer);
  scrim.appendChild(modal);
  shadow.appendChild(scrim);

  document.body.appendChild(host);

  // State
  let currentResults: SearchResult[] = [];
  let selectedIndex = 0;
  let isActionMenuOpen = false;
  let initialState: InitialLauncherState | null = null;
  let debounceTimer: any = null;
  let searchSeq = 0;

  function updateActionMenu() {
    if (!isActionMenuOpen) {
      actionMenu.classList.remove('active');
      return;
    }
    const current = currentResults[selectedIndex];
    if (!current) {
      isActionMenuOpen = false;
      actionMenu.classList.remove('active');
      return;
    }
    actionMenu.classList.add('active');
    actionMenu.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'action-menu-header';
    header.textContent = `Actions for "${current.title.substring(0, 45)}"`;
    actionMenu.appendChild(header);

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'action-menu-items';

    const chips: { key: string; label: string; action: () => void }[] = [];
    if (current.url) {
      chips.push({ key: 'C', label: 'Copy Link', action: () => executeCopyUrl(current) });
      chips.push({ key: 'M', label: 'Copy Markdown', action: () => executeCopyMarkdown(current) });
    }
    if (current.type === 'tab' && current.tabId) {
      chips.push({ key: 'D', label: 'Duplicate Tab', action: () => executeDuplicateTab(current) });
      chips.push({ key: 'X', label: 'Close Tab', action: () => executeCloseTab(current) });
      chips.push({ key: 'P', label: current.pinned ? 'Unpin Tab' : 'Pin Tab', action: () => executeTogglePin(current) });
      chips.push({ key: 'U', label: current.muted ? 'Unmute Tab' : 'Mute Tab', action: () => executeToggleMute(current) });
    }

    chips.forEach((c) => {
      const chip = document.createElement('button');
      chip.className = 'action-menu-chip';
      chip.innerHTML = `<span class="kbd-tag">${c.key}</span> ${c.label}`;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        isActionMenuOpen = false;
        updateActionMenu();
        c.action();
      });
      itemsDiv.appendChild(chip);
    });
    actionMenu.appendChild(itemsDiv);
  }

  function openOverlay() {
    previousActiveElement = document.activeElement as HTMLElement | null;
    host.style.display = 'block';
    window.addEventListener('keydown', handleGlobalKeydown, true);
    input.value = '';
    currentResults = [];
    selectedIndex = 0;
    isActionMenuOpen = false;
    updateActionMenu();
    fetchInitialState();
    ensureFocus();
    requestAnimationFrame(ensureFocus);
    setTimeout(ensureFocus, 25);
    setTimeout(ensureFocus, 80);
  }

  function closeOverlay() {
    clearTimeout(debounceTimer);
    window.removeEventListener('keydown', handleGlobalKeydown, true);
    host.style.display = 'none';
    isActionMenuOpen = false;
    updateActionMenu();
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try {
        if (document.body.contains(previousActiveElement)) {
          previousActiveElement.focus();
        }
      } catch {}
    }
    previousActiveElement = null;
  }

  function toggleOverlay() {
    if (host.style.display === 'none') {
      openOverlay();
    } else {
      closeOverlay();
    }
  }

  (host as any).__portalClose = closeOverlay;
  (host as any).__portalToggle = toggleOverlay;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'PORTAL_TOGGLE_OVERLAY') {
      toggleOverlay();
      sendResponse({ handled: true, isOpen: host.style.display !== 'none' });
      return false;
    }
  });

  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) {
      closeOverlay();
    }
  });

  function showNotice(msg: string, isError = false) {
    noticeBar.textContent = msg;
    noticeBar.style.display = 'block';
    if (isError) {
      noticeBar.style.background = 'rgba(239, 68, 68, 0.15)';
      noticeBar.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      noticeBar.style.color = '#fca5a5';
    } else {
      noticeBar.style.background = 'rgba(99, 102, 241, 0.15)';
      noticeBar.style.borderColor = 'rgba(99, 102, 241, 0.3)';
      noticeBar.style.color = '#c7d2fe';
    }
    setTimeout(() => {
      noticeBar.style.display = 'none';
    }, 2800);
  }

  async function safeCopyToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const res = document.execCommand('copy');
      ta.remove();
      return res;
    } catch {
      return false;
    }
  }

  async function executeCopyUrl(target: SearchResult) {
    if (!target.url) return;
    const ok = await safeCopyToClipboard(target.url);
    if (ok) {
      showNotice(`Copied link: ${target.url}`);
    } else {
      showNotice('Failed to copy link to clipboard', true);
    }
  }

  async function executeCopyMarkdown(target: SearchResult) {
    if (!target.url) return;
    const md = `[${target.title || target.url}](${target.url})`;
    const ok = await safeCopyToClipboard(md);
    if (ok) {
      showNotice(`Copied markdown: ${md}`);
    } else {
      showNotice('Failed to copy markdown to clipboard', true);
    }
  }

  function executeCloseTab(target: SearchResult) {
    if (!target.tabId) return;
    chrome.runtime.sendMessage({ type: 'PORTAL_CLOSE_TAB', tabId: target.tabId }, (r) => {
      if (chrome.runtime.lastError || !r || !r.success) {
        showNotice(`Failed to close tab: ${r?.error || chrome.runtime.lastError?.message || 'Unknown error'}`, true);
        return;
      }
      currentResults = currentResults.filter((x) => x.tabId !== target.tabId);
      if (selectedIndex >= currentResults.length) selectedIndex = Math.max(0, currentResults.length - 1);
      renderResults();
      showNotice(`Closed tab: ${target.title}`);
    });
  }

  function executeDuplicateTab(target: SearchResult) {
    if (!target.tabId) return;
    chrome.runtime.sendMessage({ type: 'PORTAL_DUPLICATE_TAB', tabId: target.tabId }, (r) => {
      if (chrome.runtime.lastError || !r || !r.success) {
        showNotice(`Failed to duplicate tab: ${r?.error || chrome.runtime.lastError?.message || 'Unknown error'}`, true);
        return;
      }
      showNotice(`Duplicated tab: ${target.title}`);
    });
  }

  function executeTogglePin(target: SearchResult) {
    if (!target.tabId) return;
    chrome.runtime.sendMessage({ type: 'PORTAL_TOGGLE_PIN_TAB', tabId: target.tabId, pinned: !target.pinned }, (r) => {
      if (chrome.runtime.lastError || !r || !r.success) {
        showNotice(`Failed to pin tab: ${r?.error || chrome.runtime.lastError?.message || 'Unknown error'}`, true);
        return;
      }
      target.pinned = r.pinned;
      renderResults();
      showNotice(r.pinned ? 'Pinned tab' : 'Unpinned tab');
    });
  }

  function executeToggleMute(target: SearchResult) {
    if (!target.tabId) return;
    chrome.runtime.sendMessage({ type: 'PORTAL_TOGGLE_MUTE_TAB', tabId: target.tabId, muted: !target.muted }, (r) => {
      if (chrome.runtime.lastError || !r || !r.success) {
        showNotice(`Failed to mute tab: ${r?.error || chrome.runtime.lastError?.message || 'Unknown error'}`, true);
        return;
      }
      target.muted = r.muted;
      renderResults();
      showNotice(r.muted ? 'Muted tab' : 'Unmuted tab');
    });
  }

  // Render items
  function renderResults() {
    resultsList.innerHTML = '';

    if (currentResults.length === 0) {
      const empty = document.createElement('li');
      empty.style.padding = '24px';
      empty.style.textAlign = 'center';
      empty.style.color = '#71717a';
      empty.style.fontSize = '13px';
      empty.textContent = 'No matching tabs, bookmarks, or commands';
      resultsList.appendChild(empty);
      return;
    }

    currentResults.forEach((res, idx) => {
      const li = document.createElement('li');
      li.className = `result-item ${idx === selectedIndex ? 'selected' : ''}`;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'item-icon';
      if (res.favicon) {
        const img = document.createElement('img');
        img.src = res.favicon;
        img.onerror = () => {
          iconDiv.innerHTML = getResultIcon(res.type, res.badge);
        };
        iconDiv.appendChild(img);
      } else {
        iconDiv.innerHTML = getResultIcon(res.type, res.badge);
      }

      const info = document.createElement('div');
      info.className = 'item-info';

      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = res.title;

      const desc = document.createElement('div');
      desc.className = 'item-desc';
      desc.textContent = res.description || res.url || '';

      info.appendChild(title);
      info.appendChild(desc);

      li.appendChild(iconDiv);
      li.appendChild(info);

      if (res.badge) {
        const badge = document.createElement('span');
        badge.className = 'item-badge';
        badge.textContent = res.badge;
        li.appendChild(badge);
      }

      // Quick result actions (Copy Link, Copy Markdown, Tab Controls)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'item-actions';

      if (res.url) {
        // Copy URL button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-icon-btn';
        copyBtn.title = 'Copy Link (Alt+C)';
        copyBtn.textContent = '🔗';
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeCopyUrl(res);
        });
        actionsDiv.appendChild(copyBtn);

        // Copy Markdown link button
        const copyMdBtn = document.createElement('button');
        copyMdBtn.className = 'action-icon-btn';
        copyMdBtn.title = 'Copy Markdown (Alt+M)';
        copyMdBtn.textContent = '📋';
        copyMdBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeCopyMarkdown(res);
        });
        actionsDiv.appendChild(copyMdBtn);
      }

      // Secondary fast action buttons for open tabs
      if (res.type === 'tab' && res.tabId) {
        // Duplicate tab button
        const dupBtn = document.createElement('button');
        dupBtn.className = 'action-icon-btn';
        dupBtn.title = 'Duplicate Tab (Tab -> D)';
        dupBtn.textContent = '📑';
        dupBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeDuplicateTab(res);
        });
        actionsDiv.appendChild(dupBtn);

        // Pin / unpin button
        const pinBtn = document.createElement('button');
        pinBtn.className = 'action-icon-btn';
        pinBtn.title = res.pinned ? 'Unpin tab (Alt+P)' : 'Pin tab (Alt+P)';
        pinBtn.textContent = res.pinned ? '📌' : '📍';
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeTogglePin(res);
        });
        actionsDiv.appendChild(pinBtn);

        // Mute / unmute button
        const muteBtn = document.createElement('button');
        muteBtn.className = 'action-icon-btn';
        muteBtn.title = res.muted ? 'Unmute tab (Alt+U)' : 'Mute tab (Alt+U)';
        muteBtn.textContent = res.muted ? '🔇' : '🔊';
        muteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeToggleMute(res);
        });
        actionsDiv.appendChild(muteBtn);

        // Close tab button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'action-icon-btn';
        closeBtn.title = 'Close Tab (Alt+W)';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          executeCloseTab(res);
        });
        actionsDiv.appendChild(closeBtn);
      }

      if (actionsDiv.children.length > 0) {
        li.appendChild(actionsDiv);
      }

      li.addEventListener('click', (e) => executeResult(res, e));
      li.addEventListener('mouseenter', () => {
        selectedIndex = idx;
        updateSelection();
      });

      resultsList.appendChild(li);
    });

    scrollSelectedIntoView();
  }

  function getResultIcon(type: string, badge?: string): string {
    if (badge === 'CLIPBOARD') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
    }
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

  function updateSelection() {
    const items = resultsList.querySelectorAll('.result-item');
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
    if (isActionMenuOpen) {
      updateActionMenu();
    }
  }

  function scrollSelectedIntoView() {
    const selected = resultsList.querySelector('.result-item.selected') as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  // Execute selected item via runtime messaging to service worker!
  async function executeResult(item: SearchResult, e?: MouseEvent | KeyboardEvent) {
    // If selecting a provider guide entry (e.g. "@gh <query>"), fill prefix into input so user can type terms
    if (item.badge && item.badge.startsWith('@') && item.title.includes('<query>')) {
      const prefix = item.badge.toLowerCase() + ' ';
      input.value = prefix;
      input.focus();
      performSearch(prefix);
      return;
    }

    // User-initiated clipboard navigation
    if (item.commandId === 'open-clipboard-url') {
      if (navigator.clipboard?.readText) {
        navigator.clipboard
          .readText()
          .then((text) => {
            const trimmed = cleanPastedInput(text);
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('chrome://')) {
              chrome.runtime.sendMessage(
                {
                  type: 'PORTAL_EXECUTE_ACTION',
                  item: { ...item, url: trimmed, type: 'web' },
                  context: 'overlay',
                },
                () => {
                  showNotice(`Opening ${trimmed}`);
                  setTimeout(closeOverlay, 400);
                },
              );
            } else {
              showNotice('Clipboard does not contain a valid URL');
            }
          })
          .catch(() => {
            showNotice('Clipboard read permission was not granted');
          });
      } else {
        showNotice('Clipboard API not available');
      }
      return;
    }

    const modifiers = {
      shift: e?.shiftKey,
      alt: e?.altKey,
      ctrl: e?.ctrlKey || (e as any)?.metaKey,
    };

    // Send execution request to service worker and await verified response
    chrome.runtime.sendMessage(
      {
        type: 'PORTAL_EXECUTE_ACTION',
        item,
        context: 'overlay',
        modifiers,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          showNotice(`Error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (!response || !response.success) {
          showNotice(response?.message || 'Action could not be executed');
          return;
        }

        // On verified success:
        if (item.type === 'command') {
          if (response.message) {
            showNotice(response.message);
            setTimeout(closeOverlay, 850);
          } else {
            closeOverlay();
          }
        } else {
          // Tab switch or new tab creation
          closeOverlay();
        }
      },
    );
  }

  // Live search via runtime messaging with sequence guard against out-of-order race conditions
  function performSearch(val: string) {
    const trimmed = cleanPastedInput(val);

    // If query is empty, show MRU open tabs from initial state!
    if (!trimmed) {
      ++searchSeq;
      if (initialState?.openTabs && initialState.openTabs.length > 0) {
        currentResults = initialState.openTabs;
        selectedIndex = 0;
        renderResults();
        return;
      }
      currentResults = [];
      selectedIndex = -1;
      renderResults();
      return;
    }

    const currentSeq = ++searchSeq;
    chrome.runtime.sendMessage(
      {
        type: 'PORTAL_SEARCH',
        query: trimmed,
        context: 'overlay',
      },
      (response) => {
        if (currentSeq !== searchSeq) return; // Discard stale responses
        if (chrome.runtime.lastError) {
          console.warn('[Portal Overlay] Search message error:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.results) {
          currentResults = response.results;
          selectedIndex = 0;
          renderResults();
        }
      },
    );
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(input.value);
    }, 25);
  });

  // Keyboard navigation & fast secondary shortcuts
  function handleGlobalKeydown(e: KeyboardEvent) {
    // If action menu is open, handle single-key action chords or Escape/Tab
    if (isActionMenuOpen) {
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        isActionMenuOpen = false;
        updateActionMenu();
        return;
      }
      const keyUpper = e.key.toUpperCase();
      const current = currentResults[selectedIndex];
      if (current) {
        if (keyUpper === 'C' && current.url) {
          e.preventDefault();
          isActionMenuOpen = false;
          updateActionMenu();
          executeCopyUrl(current);
          return;
        }
        if (keyUpper === 'M' && current.url) {
          e.preventDefault();
          isActionMenuOpen = false;
          updateActionMenu();
          executeCopyMarkdown(current);
          return;
        }
        if (keyUpper === 'D' && current.type === 'tab' && current.tabId) {
          e.preventDefault();
          isActionMenuOpen = false;
          updateActionMenu();
          executeDuplicateTab(current);
          return;
        }
        if (keyUpper === 'X' && current.type === 'tab' && current.tabId) {
          e.preventDefault();
          isActionMenuOpen = false;
          updateActionMenu();
          executeCloseTab(current);
          return;
        }
        if (keyUpper === 'P' && current.type === 'tab' && current.tabId) {
          e.preventDefault();
          isActionMenuOpen = false;
          updateActionMenu();
          executeTogglePin(current);
          return;
        }
        if (keyUpper === 'U' && current.type === 'tab' && current.tabId) {
          e.preventDefault();
          isActionMenuOpen = false;
          updateActionMenu();
          executeToggleMute(current);
          return;
        }
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeOverlay();
      return;
    }

    // Toggle Action Menu via Tab or Ctrl+K
    if (e.key === 'Tab' || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) {
      e.preventDefault();
      if (currentResults.length > 0 && selectedIndex >= 0) {
        isActionMenuOpen = !isActionMenuOpen;
        updateActionMenu();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        updateSelection();
        scrollSelectedIntoView();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
        updateSelection();
        scrollSelectedIntoView();
      }
      return;
    }

    // Secondary shortcut: Alt+W closes selected tab
    if (e.altKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.type === 'tab' && current.tabId) {
        executeCloseTab(current);
      }
      return;
    }

    // Secondary shortcut: Alt+P pins selected tab
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.type === 'tab' && current.tabId) {
        executeTogglePin(current);
      }
      return;
    }

    // Secondary shortcut: Alt+U mutes selected tab
    if (e.altKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.type === 'tab' && current.tabId) {
        executeToggleMute(current);
      }
      return;
    }

    // Secondary shortcut: Alt+C copies URL
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.url) {
        executeCopyUrl(current);
      }
      return;
    }

    // Secondary shortcut: Alt+M copies Markdown link [title](url)
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.url) {
        executeCopyMarkdown(current);
      }
      return;
    }

    // Enter execution: Primary interaction
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      const val = cleanPastedInput(input.value);

      // Priority 1: Unambiguous direct URL navigation when user hasn't explicitly navigated down to a suggestion
      const directMatch = parseDirectUrl(val);
      if (directMatch.isUrl && selectedIndex <= 0) {
        chrome.runtime.sendMessage(
          {
            type: 'PORTAL_EXECUTE_ACTION',
            item: {
              id: `direct-url-${Date.now()}`,
              type: 'web',
              title: directMatch.displayTitle,
              url: directMatch.normalizedUrl,
              score: 9999,
            },
            context: 'overlay',
            modifiers: { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey },
          },
          () => closeOverlay(),
        );
        return;
      }

      // Case A: A suggestion is already rendered and selected
      if (currentResults.length > 0 && selectedIndex >= 0 && currentResults[selectedIndex]) {
        executeResult(currentResults[selectedIndex], e);
        return;
      }

      // Case B: Suggestions haven't arrived yet, or results are empty
      // Execute synchronous intent immediately from current input text!
      if (!val) {
        // If completely empty, switch to previous tab if known
        if (initialState?.openTabs && initialState.openTabs[0]) {
          executeResult(initialState.openTabs[0], e);
        }
        return;
      }

      const intent = resolveSynchronousIntent(val, initialState?.preferences.searchEngine);
      if (intent.targetUrl) {
        chrome.runtime.sendMessage(
          {
            type: 'PORTAL_EXECUTE_ACTION',
            item: {
              id: `sync-intent-${Date.now()}`,
              type: 'web',
              title: intent.displayTitle,
              url: intent.targetUrl,
              score: 5000,
            },
            context: 'overlay',
            modifiers: { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey },
          },
          () => closeOverlay(),
        );
      }
      return;
    }
  }

  // Fetch MRU tabs and preferences from service worker
  function fetchInitialState() {
    chrome.runtime.sendMessage({ type: 'PORTAL_GET_INITIAL_STATE', context: 'overlay' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        if (input.value.trim()) {
          performSearch(input.value);
        }
        return;
      }

      initialState = res;
      if (res.shortcutLabel) {
        kbdHint.textContent = res.shortcutLabel;
      }

      // If user already typed before initial state arrived, search their query
      if (input.value.trim()) {
        performSearch(input.value);
        return;
      }

      // Default empty state: display MRU open tabs with previously active tab at selectedIndex = 0!
      if (res.openTabs && res.openTabs.length > 0) {
        currentResults = res.openTabs;
        selectedIndex = 0;
        renderResults();
      }
    });
  }

  // Verified robust focus handoff onto search input
  function ensureFocus() {
    input.focus({ preventScroll: true });
    input.select();
  }

  // Open overlay on cold injection
  openOverlay();
})();
