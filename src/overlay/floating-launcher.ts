import { SearchResult, InitialLauncherState } from '../core/types';
import { Icons, getFaviconUrl } from '../core/icons/svg-icons';
import { resolveSynchronousIntent } from '../core/search/grammar';
import { cleanPastedInput, parseDirectUrl } from '../core/search/url-utils';

(function initPortalFloatingLauncher() {
  const ROOT_ID = 'portal-floating-launcher-root';
  const existingRoot = document.getElementById(ROOT_ID);

  // If already open, toggle off cleanly by executing its registered cleanup
  if (existingRoot) {
    if (typeof (existingRoot as any).__portalClose === 'function') {
      (existingRoot as any).__portalClose();
    } else {
      existingRoot.remove();
    }
    return;
  }

  // Preserve previous active element to restore focus on close
  const previousActiveElement = document.activeElement as HTMLElement | null;

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

  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="shortcuts">
      <span><span class="kbd-tag">↑↓</span> Navigate</span>
      <span><span class="kbd-tag">↵</span> Switch / Open</span>
      <span><span class="kbd-tag">Alt+W</span> Close Tab</span>
      <span><span class="kbd-tag">Esc</span> Close</span>
    </div>
    <div>Portal Launcher</div>
  `;

  modal.appendChild(searchRow);
  modal.appendChild(noticeBar);
  modal.appendChild(contentArea);
  modal.appendChild(footer);
  scrim.appendChild(modal);
  shadow.appendChild(scrim);

  document.body.appendChild(host);

  // State
  let currentResults: SearchResult[] = [];
  let selectedIndex = 0;
  let initialState: InitialLauncherState | null = null;
  let debounceTimer: any = null;
  let searchSeq = 0;

  // Cleanup helper: thoroughly releases every listener and DOM resource
  function closeOverlay() {
    clearTimeout(debounceTimer);
    window.removeEventListener('keydown', handleGlobalKeydown, true);
    host.remove();
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try {
        previousActiveElement.focus();
      } catch {}
    }
  }

  // Register cleanup on host node so subsequent toggle-offs invoke it cleanly
  (host as any).__portalClose = closeOverlay;

  // Scrim click closes
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) {
      closeOverlay();
    }
  });

  function showNotice(msg: string) {
    noticeBar.textContent = msg;
    noticeBar.style.display = 'block';
    setTimeout(() => {
      noticeBar.style.display = 'none';
    }, 2500);
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

      // Secondary fast action buttons for open tabs
      if (res.type === 'tab' && res.tabId) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        // Pin / unpin button
        const pinBtn = document.createElement('button');
        pinBtn.className = 'action-icon-btn';
        pinBtn.title = res.pinned ? 'Unpin tab (Alt+P)' : 'Pin tab (Alt+P)';
        pinBtn.textContent = res.pinned ? '📌' : '📍';
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ type: 'PORTAL_TOGGLE_PIN_TAB', tabId: res.tabId! }, (r) => {
            if (r?.success) {
              res.pinned = r.pinned;
              pinBtn.textContent = r.pinned ? '📌' : '📍';
              showNotice(r.pinned ? 'Tab pinned' : 'Tab unpinned');
            }
          });
        });
        actionsDiv.appendChild(pinBtn);

        // Mute / unmute button
        const muteBtn = document.createElement('button');
        muteBtn.className = 'action-icon-btn';
        muteBtn.title = res.muted ? 'Unmute tab (Alt+M)' : 'Mute tab (Alt+M)';
        muteBtn.textContent = res.muted ? '🔇' : '🔊';
        muteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ type: 'PORTAL_TOGGLE_MUTE_TAB', tabId: res.tabId! }, (r) => {
            if (r?.success) {
              res.muted = r.muted;
              muteBtn.textContent = r.muted ? '🔇' : '🔊';
              showNotice(r.muted ? 'Tab muted' : 'Tab unmuted');
            }
          });
        });
        actionsDiv.appendChild(muteBtn);

        // Close tab button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'action-icon-btn';
        closeBtn.title = 'Close Tab (Alt+W)';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.runtime.sendMessage({ type: 'PORTAL_CLOSE_TAB', tabId: res.tabId! }, () => {
            currentResults = currentResults.filter((r) => r.tabId !== res.tabId);
            if (selectedIndex >= currentResults.length) selectedIndex = Math.max(0, currentResults.length - 1);
            renderResults();
            showNotice('Tab closed');
          });
        });
        actionsDiv.appendChild(closeBtn);

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
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeOverlay();
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
        chrome.runtime.sendMessage({ type: 'PORTAL_CLOSE_TAB', tabId: current.tabId }, () => {
          currentResults = currentResults.filter((r) => r.tabId !== current.tabId);
          if (selectedIndex >= currentResults.length) selectedIndex = Math.max(0, currentResults.length - 1);
          renderResults();
          showNotice(`Closed tab: ${current.title}`);
        });
      }
      return;
    }

    // Secondary shortcut: Alt+P pins selected tab
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.type === 'tab' && current.tabId) {
        chrome.runtime.sendMessage({ type: 'PORTAL_TOGGLE_PIN_TAB', tabId: current.tabId, pinned: !current.pinned }, (r) => {
          if (r?.success) {
            current.pinned = r.pinned;
            renderResults();
            showNotice(r.pinned ? 'Pinned tab' : 'Unpinned tab');
          }
        });
      }
      return;
    }

    // Secondary shortcut: Alt+M mutes selected tab
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.type === 'tab' && current.tabId) {
        chrome.runtime.sendMessage({ type: 'PORTAL_TOGGLE_MUTE_TAB', tabId: current.tabId, muted: !current.muted }, (r) => {
          if (r?.success) {
            current.muted = r.muted;
            renderResults();
            showNotice(r.muted ? 'Muted tab' : 'Unmuted tab');
          }
        });
      }
      return;
    }

    // Secondary shortcut: Alt+C copies URL of selected result
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      const current = currentResults[selectedIndex];
      if (current && current.url) {
        navigator.clipboard.writeText(current.url).then(() => {
          showNotice(`Copied link: ${current.url}`);
        }).catch(() => {
          showNotice('Could not copy link');
        });
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

  window.addEventListener('keydown', handleGlobalKeydown, true);

  // Initial load: fetch MRU tabs and preferences from service worker
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

  // Verified robust focus handoff onto search input
  function ensureFocus() {
    input.focus({ preventScroll: true });
    input.select();
  }

  requestAnimationFrame(ensureFocus);
  setTimeout(ensureFocus, 25);
  setTimeout(ensureFocus, 80);
})();
