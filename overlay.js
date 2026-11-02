(function(){"use strict";const d={search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',tab:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',bookmark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',history:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',command:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',sparkles:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',globe:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',pinFilled:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><line x1="12" y1="17" x2="12" y2="22" stroke-width="2"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>'};(function(){const N="portal-floating-launcher-root",I=document.getElementById(N);if(I){I.remove();return}const v=document.activeElement,i=document.createElement("div");i.id=N,i.style.position="fixed",i.style.top="0",i.style.left="0",i.style.width="100vw",i.style.height="100vh",i.style.zIndex="2147483647",i.style.pointerEvents="auto";const S=i.attachShadow({mode:"open"}),z=document.createElement("style");z.textContent=`
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
  `,S.appendChild(z);const g=document.createElement("div");g.className="scrim";const m=document.createElement("div");m.className="modal";const x=document.createElement("div");x.className="search-row";const k=document.createElement("div");k.className="search-icon",k.innerHTML=d.search;const r=document.createElement("input");r.type="text",r.placeholder="Search tabs, bookmarks, history, commands, or web...",r.autocomplete="off",r.spellcheck=!1;const b=document.createElement("span");b.className="kbd-tag",b.textContent="Alt+Q",x.appendChild(k),x.appendChild(r),x.appendChild(b);const h=document.createElement("div");h.id="noticeBar",h.className="notice-bar";const w=document.createElement("div");w.className="content-area";const p=document.createElement("ul");p.className="results-list",w.appendChild(p);const E=document.createElement("div");E.className="footer",E.innerHTML=`
    <div class="shortcuts">
      <span><span class="kbd-tag">↑↓</span> Navigate</span>
      <span><span class="kbd-tag">↵</span> Open / Switch</span>
      <span><span class="kbd-tag">Esc</span> Close</span>
    </div>
    <div>Portal Launcher</div>
  `,m.appendChild(x),m.appendChild(h),m.appendChild(w),m.appendChild(E),g.appendChild(m),S.appendChild(g),document.body.appendChild(i);let a=[],l=0,B=null;function f(){if(window.removeEventListener("keydown",q,!0),i.remove(),v&&typeof v.focus=="function")try{v.focus()}catch{}}g.addEventListener("click",e=>{e.target===g&&f()});function u(e){h.textContent=e,h.style.display="block",setTimeout(()=>{h.style.display="none"},2500)}function P(){if(p.innerHTML="",a.length===0){const e=document.createElement("li");e.style.padding="24px",e.style.textAlign="center",e.style.color="#71717a",e.style.fontSize="13px",e.textContent="No matching tabs, bookmarks, or commands",p.appendChild(e);return}a.forEach((e,o)=>{const n=document.createElement("li");n.className=`result-item ${o===l?"selected":""}`;const t=document.createElement("div");if(t.className="item-icon",e.favicon){const c=document.createElement("img");c.src=e.favicon,c.onerror=()=>{t.innerHTML=R(e.type,e.badge)},t.appendChild(c)}else t.innerHTML=R(e.type,e.badge);const s=document.createElement("div");s.className="item-info";const T=document.createElement("div");T.className="item-title",T.textContent=e.title;const A=document.createElement("div");if(A.className="item-desc",A.textContent=e.description||e.url||"",s.appendChild(T),s.appendChild(A),n.appendChild(t),n.appendChild(s),e.badge){const c=document.createElement("span");c.className="item-badge",c.textContent=e.badge,n.appendChild(c)}n.addEventListener("click",c=>M(e,c)),n.addEventListener("mouseenter",()=>{l=o,C()}),p.appendChild(n)}),L()}function R(e,o){if(o==="CLIPBOARD")return'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';switch(e){case"tab":return d.tab;case"bookmark":return d.bookmark;case"history":return d.history;case"command":return d.command;case"shortcut":return d.pinFilled;case"ai_cluster":return d.sparkles;default:return d.globe}}function C(){p.querySelectorAll(".result-item").forEach((o,n)=>{n===l?o.classList.add("selected"):o.classList.remove("selected")})}function L(){const e=p.querySelector(".result-item.selected");e&&e.scrollIntoView({block:"nearest"})}async function M(e,o){if(e.badge==="BANG"&&e.title.startsWith("!")){const t=e.title.split(" ")[0]+" ";r.value=t,r.focus(),y(t);return}if(e.commandId==="open-clipboard-url"){navigator.clipboard?.readText?navigator.clipboard.readText().then(t=>{const s=t.trim();s.startsWith("http://")||s.startsWith("https://")||s.startsWith("chrome://")?chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{...e,url:s,type:"web"},context:"overlay"},()=>{u(`Opening ${s}`),setTimeout(f,400)}):u("Clipboard does not contain a valid URL")}).catch(()=>{u("Clipboard read permission was not granted")}):u("Clipboard API not available");return}const n={shift:o?.shiftKey,alt:o?.altKey,ctrl:o?.ctrlKey||o?.metaKey};chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:e,context:"overlay",modifiers:n},t=>{if(chrome.runtime.lastError){u(`Error: ${chrome.runtime.lastError.message}`);return}if(!t||!t.success){u(t?.message||"Action could not be executed");return}e.type==="command"&&t.message?(u(t.message),setTimeout(f,850)):f()})}let O=0;function y(e){const o=++O;chrome.runtime.sendMessage({type:"PORTAL_SEARCH",query:e,context:"overlay"},n=>{if(o===O){if(chrome.runtime.lastError){console.warn("[Portal Overlay] Search message error:",chrome.runtime.lastError.message);return}n&&n.results&&(a=n.results,l=0,P())}})}r.addEventListener("input",()=>{clearTimeout(B),B=setTimeout(()=>{y(r.value)},35)});function q(e){if(e.key==="Escape"){e.preventDefault(),e.stopPropagation(),f();return}if(e.key==="ArrowDown"){e.preventDefault(),a.length>0&&(l=(l+1)%a.length,C(),L());return}if(e.key==="ArrowUp"){e.preventDefault(),a.length>0&&(l=(l-1+a.length)%a.length,C(),L());return}if(e.key==="Enter"){e.preventDefault(),a[l]&&M(a[l],e);return}}window.addEventListener("keydown",q,!0),chrome.runtime.sendMessage({type:"PORTAL_GET_INITIAL_STATE",context:"overlay"},e=>{if(chrome.runtime.lastError||!e){y(r.value||"");return}e.shortcutLabel&&(b.textContent=e.shortcutLabel),y(r.value||"")}),setTimeout(()=>r.focus(),25)})()})();
