import { searchEngine } from '../core/search/engine';
import { storage } from '../core/storage';
import { SearchResult } from '../core/types';
import { Icons } from '../core/icons/svg-icons';
import { COMMANDS } from '../core/commands/registry';

(function initPortalOverlay() {
  const ROOT_ID = 'portal-floating-launcher-root';
  const existingRoot = document.getElementById(ROOT_ID);

  // If already open, toggle off cleanly!
  if (existingRoot) {
    existingRoot.remove();
    return;
  }

  // Preserve previous active element to restore focus on close
  const previousActiveElement = document.activeElement as HTMLElement | null;

  // Create host and Shadow Root for complete CSS isolation
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    :host {
      all: initial;
    }
    .scrim {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 15vh;
      animation: fadeIn 0.15s ease-out;
    }
    .modal {
      width: 620px;
      max-width: 90vw;
      background: #18181b;
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideDown 0.15s ease-out;
    }
    .search-row {
      display: flex;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 12px;
    }
    .search-icon {
      color: #a1a1aa;
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
      color: #71717a;
    }
    .results-list {
      max-height: 380px;
      overflow-y: auto;
      padding: 8px;
      list-style: none;
    }
    .results-list::-webkit-scrollbar {
      width: 6px;
    }
    .results-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
    .result-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
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
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #94a3b8;
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
      gap: 2px;
    }
    .item-title {
      font-size: 14px;
      font-weight: 500;
      color: #f4f4f5;
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
      padding: 3px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.25);
      flex-shrink: 0;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 11px;
      color: #71717a;
      background: rgba(0, 0, 0, 0.2);
    }
    .shortcuts {
      display: flex;
      gap: 12px;
    }
    .kbd {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 3px;
      padding: 1px 4px;
      font-size: 10px;
      font-family: monospace;
      color: #d4d4d8;
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
  input.placeholder = 'Search tabs, bookmarks, history, or commands...';
  input.autocomplete = 'off';
  input.spellcheck = false;

  searchRow.appendChild(searchIcon);
  searchRow.appendChild(input);

  const resultsList = document.createElement('ul');
  resultsList.className = 'results-list';

  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="shortcuts">
      <span><span class="kbd">↑↓</span> Navigate</span>
      <span><span class="kbd">↵</span> Select</span>
      <span><span class="kbd">Esc</span> Close</span>
    </div>
    <div>Portal Launcher</div>
  `;

  modal.appendChild(searchRow);
  modal.appendChild(resultsList);
  modal.appendChild(footer);
  scrim.appendChild(modal);
  shadow.appendChild(scrim);

  document.body.appendChild(host);

  // State
  let currentResults: SearchResult[] = [];
  let selectedIndex = 0;

  // Cleanup helper
  function closeOverlay() {
    window.removeEventListener('keydown', handleGlobalKeydown, true);
    host.remove();
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  }

  // Scrim click closes
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) {
      closeOverlay();
    }
  });

  // Render items
  function renderResults() {
    resultsList.innerHTML = '';
    if (currentResults.length === 0) {
      const empty = document.createElement('li');
      empty.style.padding = '18px';
      empty.style.textAlign = 'center';
      empty.style.color = '#71717a';
      empty.style.fontSize = '13px';
      empty.textContent = 'No matching destinations or commands';
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
          iconDiv.innerHTML = res.type === 'tab' ? Icons.tab : res.type === 'bookmark' ? Icons.bookmark : Icons.globe;
        };
        iconDiv.appendChild(img);
      } else {
        iconDiv.innerHTML =
          res.type === 'tab'
            ? Icons.tab
            : res.type === 'bookmark'
              ? Icons.bookmark
              : res.type === 'command'
                ? Icons.command
                : Icons.globe;
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

      li.addEventListener('click', () => executeResult(res));
      li.addEventListener('mouseenter', () => {
        selectedIndex = idx;
        updateSelection();
      });

      resultsList.appendChild(li);
    });

    scrollSelectedIntoView();
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

  // Execute selected item
  async function executeResult(item: SearchResult) {
    closeOverlay();

    if (item.type === 'command' && item.commandId) {
      const cmd = COMMANDS.find((c) => c.id === item.commandId);
      if (cmd) {
        await cmd.execute();
      }
      return;
    }

    if (item.type === 'tab' && item.tabId) {
      // Send message to background to switch tab
      chrome.runtime.sendMessage({
        action: 'switch-tab',
        tabId: item.tabId,
        windowId: item.windowId,
      });
      return;
    }

    if (item.url) {
      window.location.href = item.url;
    }
  }

  // Live search
  let debounceTimer: any = null;
  async function performSearch(val: string) {
    const prefs = await storage.getPreferences();
    currentResults = await searchEngine.search(val, prefs);
    selectedIndex = 0;
    renderResults();
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(input.value);
    }, 40);
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
        executeResult(currentResults[selectedIndex]);
      }
      return;
    }
  }

  window.addEventListener('keydown', handleGlobalKeydown, true);

  // Initial render & focus
  performSearch('');
  setTimeout(() => input.focus(), 20);
})();
