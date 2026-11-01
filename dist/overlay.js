(function(){"use strict";const c={search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',tab:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',bookmark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',history:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',command:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',sparkles:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',globe:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',pinFilled:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><line x1="12" y1="17" x2="12" y2="22" stroke-width="2"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>'};(function(){const N="portal-floating-launcher-root",T=document.getElementById(N);if(T){T.remove();return}const x=document.activeElement,o=document.createElement("div");o.id=N,o.style.position="fixed",o.style.top="0",o.style.left="0",o.style.width="100vw",o.style.height="100vh",o.style.zIndex="2147483647",o.style.pointerEvents="auto";const A=o.attachShadow({mode:"open"}),I=document.createElement("style");I.textContent=`
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
  `,A.appendChild(I);const u=document.createElement("div");u.className="scrim";const p=document.createElement("div");p.className="modal";const m=document.createElement("div");m.className="search-row";const g=document.createElement("div");g.className="search-icon",g.innerHTML=c.search;const r=document.createElement("input");r.type="text",r.placeholder="Search tabs, bookmarks, history, commands, or web...",r.autocomplete="off",r.spellcheck=!1;const h=document.createElement("span");h.className="kbd-tag",h.textContent="Alt+Q",m.appendChild(g),m.appendChild(r),m.appendChild(h);const S=document.createElement("div");S.className="notice-bar";const b=document.createElement("div");b.className="content-area";const d=document.createElement("ul");d.className="results-list",b.appendChild(d);const y=document.createElement("div");y.className="footer",y.innerHTML=`
    <div class="shortcuts">
      <span><span class="kbd-tag">↑↓</span> Navigate</span>
      <span><span class="kbd-tag">↵</span> Open / Switch</span>
      <span><span class="kbd-tag">Esc</span> Close</span>
    </div>
    <div>Portal Launcher</div>
  `,p.appendChild(m),p.appendChild(S),p.appendChild(b),p.appendChild(y),u.appendChild(p),A.appendChild(u),document.body.appendChild(o);let i=[],a=0,z=null;function v(){if(window.removeEventListener("keydown",B,!0),o.remove(),x&&typeof x.focus=="function")try{x.focus()}catch{}}u.addEventListener("click",e=>{e.target===u&&v()});function O(){if(d.innerHTML="",i.length===0){const e=document.createElement("li");e.style.padding="24px",e.style.textAlign="center",e.style.color="#71717a",e.style.fontSize="13px",e.textContent="No matching tabs, bookmarks, or commands",d.appendChild(e);return}i.forEach((e,n)=>{const t=document.createElement("li");t.className=`result-item ${n===a?"selected":""}`;const l=document.createElement("div");if(l.className="item-icon",e.favicon){const s=document.createElement("img");s.src=e.favicon,s.onerror=()=>{l.innerHTML=M(e.type)},l.appendChild(s)}else l.innerHTML=M(e.type);const f=document.createElement("div");f.className="item-info";const C=document.createElement("div");C.className="item-title",C.textContent=e.title;const L=document.createElement("div");if(L.className="item-desc",L.textContent=e.description||e.url||"",f.appendChild(C),f.appendChild(L),t.appendChild(l),t.appendChild(f),e.badge){const s=document.createElement("span");s.className="item-badge",s.textContent=e.badge,t.appendChild(s)}t.addEventListener("click",s=>R(e,s)),t.addEventListener("mouseenter",()=>{a=n,k()}),d.appendChild(t)}),w()}function M(e){switch(e){case"tab":return c.tab;case"bookmark":return c.bookmark;case"history":return c.history;case"command":return c.command;case"shortcut":return c.pinFilled;case"ai_cluster":return c.sparkles;default:return c.globe}}function k(){d.querySelectorAll(".result-item").forEach((n,t)=>{t===a?n.classList.add("selected"):n.classList.remove("selected")})}function w(){const e=d.querySelector(".result-item.selected");e&&e.scrollIntoView({block:"nearest"})}async function R(e,n){const t={shift:n?.shiftKey,alt:n?.altKey,ctrl:n?.ctrlKey||n?.metaKey};chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:e,context:"overlay",modifiers:t},l=>{chrome.runtime.lastError?console.warn("[Portal Overlay] Action error:",chrome.runtime.lastError.message):l&&!l.success&&l.message&&console.warn("[Portal Overlay] Action failure:",l.message)}),setTimeout(v,25)}let q=0;function E(e){const n=++q;chrome.runtime.sendMessage({type:"PORTAL_SEARCH",query:e,context:"overlay"},t=>{if(n===q){if(chrome.runtime.lastError){console.warn("[Portal Overlay] Search message error:",chrome.runtime.lastError.message);return}t&&t.results&&(i=t.results,a=0,O())}})}r.addEventListener("input",()=>{clearTimeout(z),z=setTimeout(()=>{E(r.value)},35)});function B(e){if(e.key==="Escape"){e.preventDefault(),e.stopPropagation(),v();return}if(e.key==="ArrowDown"){e.preventDefault(),i.length>0&&(a=(a+1)%i.length,k(),w());return}if(e.key==="ArrowUp"){e.preventDefault(),i.length>0&&(a=(a-1+i.length)%i.length,k(),w());return}if(e.key==="Enter"){e.preventDefault(),i[a]&&R(i[a],e);return}}window.addEventListener("keydown",B,!0),chrome.runtime.sendMessage({type:"PORTAL_GET_INITIAL_STATE",context:"overlay"},e=>{if(chrome.runtime.lastError||!e){E(r.value||"");return}e.shortcutLabel&&(h.textContent=e.shortcutLabel),E(r.value||"")}),setTimeout(()=>r.focus(),25)})()})();
