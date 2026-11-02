import { SearchResult, InitialLauncherState } from '../core/types';
import { Icons, getFaviconUrl } from '../core/icons/svg-icons';

(function initPortalFloatingLauncher() {
  const ROOT_ID = 'portal-floating-launcher-root';
  const existingRoot = document.getElementById(ROOT_ID);

  // If already open, toggle off cleanly
  if (existingRoot) {
    existingRoot.remove();
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif;
    }
    :host {
      all: initial;
    }
    .scrim {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 14vh;
      animation: fadeIn 0.15s ease-out;
    }
    .modal {
      width: 640px;
      max-width: 92vw;
      background: #141517;
      color: #f4f4f6;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
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
      background: rgba(255, 255, 255, 0.02);
    }
    .search-icon {
      color: #8e9099;
      display: flex;
      align-items: center;
    }
    input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fafafa;
      font-size: 16px;
      font-weight: 400;
    }
    input::placeholder {
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
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 8px;
      padding: 6px 10px 12px 10px;
    }
    .quick-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .quick-card:hover, .quick-card.selected {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-1px);
    }
    .quick-card .q-title {
      font-size: 12px;
      font-weight: 500;
      color: #f4f4f6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

  // Modal Structure
  const scrim = document.createElement('div');
  scrim.className = 'scrim';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const searchRow = document.createElement('div');
  searchRow.className = 'search-row';

  const searchIcon = document.createElement('div');
  searchIcon.className = 'search-icon';
  searchIcon.innerHTML = Icons.search;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search tabs, bookmarks, history, commands, or web...';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const kbdHint = document.createElement('span');
  kbdHint.className = 'kbd-tag';
  kbdHint.textContent = 'Alt+Q';

  searchRow.appendChild(searchIcon);
  searchRow.appendChild(input);
  searchRow.appendChild(kbdHint);

  const noticeBar = document.createElement('div');
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
      <span><span class="kbd-tag">↵</span> Open / Switch</span>
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

  // Cleanup helper
  function closeOverlay() {
    window.removeEventListener('keydown', handleGlobalKeydown, true);
    host.remove();
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try {
        previousActiveElement.focus();
      } catch {}
    }
  }

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
    // If selecting a bang guide entry (e.g. "!gh <query>"), fill bang into input so user can type search terms
    if (item.badge === 'BANG' && item.title.startsWith('!')) {
      const bangPrefix = item.title.split(' ')[0] + ' ';
      input.value = bangPrefix;
      input.focus();
      performSearch(bangPrefix);
      return;
    }

    const modifiers = {
      shift: e?.shiftKey,
      alt: e?.altKey,
      ctrl: e?.ctrlKey || (e as any)?.metaKey,
    };

    // Send execution request to service worker first
    chrome.runtime.sendMessage(
      {
        type: 'PORTAL_EXECUTE_ACTION',
        item,
        context: 'overlay',
        modifiers,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Portal Overlay] Action error:', chrome.runtime.lastError.message);
        } else if (response && !response.success && response.message) {
          console.warn('[Portal Overlay] Action failure:', response.message);
        }
      },
    );

    // Close overlay on next tick so DOM click events settle cleanly
    setTimeout(closeOverlay, 25);
  }

  let searchSeq = 0;
  // Live search via runtime messaging with sequence guard against out-of-order race conditions
  function performSearch(val: string) {
    const currentSeq = ++searchSeq;
    chrome.runtime.sendMessage(
      {
        type: 'PORTAL_SEARCH',
        query: val,
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

          // If query is empty, offer copied clipboard link at the top if present
          if (!val && navigator.clipboard?.readText) {
            navigator.clipboard
              .readText()
              .then((clipText) => {
                const trimmed = clipText.trim();
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                  if (!currentResults.some((r) => r.url === trimmed)) {
                    const clipItem: SearchResult = {
                      id: 'clipboard-link',
                      type: 'web',
                      title: 'Open link from clipboard',
                      url: trimmed,
                      description: trimmed,
                      badge: 'CLIPBOARD',
                      score: 5000,
                    };
                    currentResults = [clipItem, ...currentResults];
                    renderResults();
                  }
                }
              })
              .catch(() => {});
          }

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
    }, 35);
  });

  // Keyboard navigation
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

    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults[selectedIndex]) {
        executeResult(currentResults[selectedIndex], e);
      }
      return;
    }
  }

  window.addEventListener('keydown', handleGlobalKeydown, true);

  // Initial load: fetch initial state from service worker
  chrome.runtime.sendMessage({ type: 'PORTAL_GET_INITIAL_STATE', context: 'overlay' }, (res) => {
    if (chrome.runtime.lastError || !res) {
      // Fallback: search immediately using current input
      performSearch(input.value || '');
      return;
    }

    initialState = res;
    if (res.shortcutLabel) {
      kbdHint.textContent = res.shortcutLabel;
    }

    // Trigger initial search if user hasn't typed yet, otherwise search their typed query
    performSearch(input.value || '');
  });

  // Focus input automatically
  setTimeout(() => input.focus(), 25);
})();
