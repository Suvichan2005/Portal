(function(){"use strict";const C={tab:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',bookmark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',history:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',command:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',sparkles:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',globe:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',pinFilled:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><line x1="12" y1="17" x2="12" y2="22" stroke-width="2"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>'},Y=new Set(["com","org","net","edu","gov","mil","int","io","dev","app","ai","co","uk","ca","de","fr","jp","cn","in","au","me","info","biz","tv","cc","sh","gg","tech","site","online","xyz","cloud","club","space","local","internal","lan"]);function A(w){let o=w.trim().replace(/^["'`]+|["'`]+$/g,"").trim();return o.includes(`
`)&&(o=o.split(`
`).map(i=>i.trim()).find(i=>i.length>0)||o),o}function H(w){const o=A(w);if(!o||o.includes(" ")&&!o.startsWith("http://")&&!o.startsWith("https://"))return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""};if(/^(https?|file|chrome|chrome-extension):\/\//i.test(o))try{const m=new URL(o);return{isUrl:!0,normalizedUrl:m.href,displayTitle:`Navigate to ${m.hostname||o}`,hostname:m.hostname||"link"}}catch{return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}const i=/^localhost(?::(\d+))?(\/.*)?$/i.exec(o);if(i){const m=i[1]?`:${i[1]}`:"",h=i[2]||"";return{isUrl:!0,normalizedUrl:`http://localhost${m}${h}`,displayTitle:`Open ${o}`,hostname:"localhost"}}const a=/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?(\/.*)?$/.exec(o);if(a&&a[1].split(".").map(Number).every(p=>p>=0&&p<=255)){const p=a[2]?`:${a[2]}`:"",b=a[3]||"";return{isUrl:!0,normalizedUrl:`http://${a[1]}${p}${b}`,displayTitle:`Navigate to ${a[1]}${p}`,hostname:a[1]}}const c=/^([a-zA-Z0-9-]+\.)+([a-zA-Z]{2,63})(?::(\d+))?(\/.*)?$/.exec(o);if(c){const m=c[2].toLowerCase(),h=!!c[3]||!!c[4]&&c[4].length>1;if(Y.has(m)||h||m.length>=2){const p=`https://${o}`;try{const b=new URL(p);return{isUrl:!0,normalizedUrl:b.href,displayTitle:`Navigate to ${b.hostname}`,hostname:b.hostname}}catch{return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}}}return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}const j=[{prefix:"gh",name:"GitHub",domain:"github.com",urlTemplate:"https://github.com/search?q={q}",description:"Search GitHub repositories, code, and issues"},{prefix:"yt",name:"YouTube",domain:"youtube.com",urlTemplate:"https://www.youtube.com/results?search_query={q}",description:"Search YouTube videos and music"},{prefix:"w",name:"Wikipedia",domain:"wikipedia.org",urlTemplate:"https://en.wikipedia.org/wiki/Special:Search?search={q}",description:"Search Wikipedia encyclopedia articles"},{prefix:"so",name:"Stack Overflow",domain:"stackoverflow.com",urlTemplate:"https://stackoverflow.com/search?q={q}",description:"Search developer questions and solutions"},{prefix:"r",name:"Reddit",domain:"reddit.com",urlTemplate:"https://www.reddit.com/search/?q={q}",description:"Search Reddit discussions and subreddits"},{prefix:"npm",name:"npm",domain:"npmjs.com",urlTemplate:"https://www.npmjs.com/search?q={q}",description:"Search JavaScript and Node.js packages"},{prefix:"m",name:"Google Maps",domain:"google.com",urlTemplate:"https://www.google.com/maps/search/{q}",description:"Search places, addresses, and directions"},{prefix:"g",name:"Google",domain:"google.com",urlTemplate:"https://www.google.com/search?q={q}",description:"Search the web using Google"},{prefix:"ddg",name:"DuckDuckGo",domain:"duckduckgo.com",urlTemplate:"https://duckduckgo.com/?q={q}",description:"Search privacy-first with DuckDuckGo"},{prefix:"x",name:"X (Twitter)",domain:"x.com",urlTemplate:"https://x.com/search?q={q}",description:"Search posts and profiles on X"}],F={chatgpt:{domain:"chatgpt.com",name:"ChatGPT"},openai:{domain:"openai.com",name:"OpenAI"},github:{domain:"github.com",name:"GitHub"},youtube:{domain:"youtube.com",name:"YouTube"},google:{domain:"google.com",name:"Google"},docs:{domain:"docs.google.com",name:"Google Docs"},drive:{domain:"drive.google.com",name:"Google Drive"},reddit:{domain:"reddit.com",name:"Reddit"},twitter:{domain:"x.com",name:"X / Twitter"},figma:{domain:"figma.com",name:"Figma"},notion:{domain:"notion.so",name:"Notion"},slack:{domain:"slack.com",name:"Slack"}};function Z(w){const o=w.trim();if(!o)return{scope:"all",query:"",isCommand:!1};if(o.startsWith("/")){const i=o.slice(1).trim(),a=i.split(/\s+/);return{scope:"commands",query:i,isCommand:!0,commandToken:a[0]?.toLowerCase()||""}}if(o.startsWith("@")){const i=o.slice(1).trim(),a=i.search(/\s/),t=(a===-1?i:i.slice(0,a)).toLowerCase(),c=a===-1?"":i.slice(a).trim();if(t==="tabs"||t==="tab")return{scope:"tabs",query:c,isCommand:!1};if(t==="history"||t==="hist")return{scope:"history",query:c,isCommand:!1};if(t==="bookmarks"||t==="bookmark"||t==="bm")return{scope:"bookmarks",query:c,isCommand:!1};if(t==="audio"||t==="sound"||t==="music")return{scope:"audio",query:c,isCommand:!1};const m=j.find(h=>h.prefix.toLowerCase()===t);return m?{scope:"all",query:c,providerBang:m,isCommand:!1}:F[t]?{scope:"site",query:c,siteDomain:F[t].domain,isCommand:!1}:t.includes(".")?{scope:"site",query:c,siteDomain:t,isCommand:!1}:{scope:"tabs",query:i,isCommand:!1}}if(o.startsWith("!")){const i=o.slice(1).trim(),a=i.search(/\s/),t=(a===-1?i:i.slice(0,a)).toLowerCase(),c=a===-1?"":i.slice(a).trim(),m=j.find(h=>h.prefix.toLowerCase()===t);if(m)return{scope:"all",query:c,providerBang:m,isCommand:!1}}return o.startsWith("#")||o.startsWith("*")?{scope:"bookmarks",query:o.slice(1).trim(),isCommand:!1}:{scope:"all",query:o,isCommand:!1}}function J(w,o="google"){const i=A(w);if(!i)return{type:"web_search_fallback",targetUrl:"",displayTitle:"",description:"",badge:"SEARCH"};const a=H(i);if(a.isUrl)return{type:"navigate_url",targetUrl:a.normalizedUrl,displayTitle:a.displayTitle,description:a.normalizedUrl,badge:"NAVIGATE"};const t=Z(i);if(t.providerBang){const p=t.query;return{type:"provider_search",targetUrl:p?t.providerBang.urlTemplate.replace("{q}",encodeURIComponent(p)):`https://${t.providerBang.domain}`,displayTitle:p?`Search ${t.providerBang.name} for "${p}"`:`Open ${t.providerBang.name}`,description:`${t.providerBang.description} • Opens in new tab`,badge:`@${t.providerBang.prefix.toUpperCase()}`}}if(t.isCommand)return{type:"command",targetUrl:"",displayTitle:`Run command /${t.query}`,description:"Browser command execution",badge:"COMMAND"};if(t.scope!=="all")return{type:"scoped_search",targetUrl:"",displayTitle:`Filter by @${t.scope}: ${t.query}`,description:`Filtering ${t.scope}`,badge:`@${t.scope.toUpperCase()}`,scope:t.scope};const c=i;return{type:"web_search_fallback",targetUrl:o==="duckduckgo"?`https://duckduckgo.com/?q=${encodeURIComponent(c)}`:o==="bing"?`https://www.bing.com/search?q=${encodeURIComponent(c)}`:`https://www.google.com/search?q=${encodeURIComponent(c)}`,displayTitle:`Search ${o==="duckduckgo"?"DuckDuckGo":o==="bing"?"Bing":"Google"} for "${c}"`,description:"Web search • Opens in new tab",badge:"SEARCH"}}(function(){const o="portal-floating-launcher-root",i=document.getElementById(o);if(i){typeof i.__portalClose=="function"?i.__portalClose():i.remove();return}const a=document.activeElement,t=document.createElement("div");t.id=o,t.style.position="fixed",t.style.top="0",t.style.left="0",t.style.width="100vw",t.style.height="100vh",t.style.zIndex="2147483647",t.style.pointerEvents="auto";const c=t.attachShadow({mode:"open"}),m=document.createElement("style");m.textContent=`
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
  `,c.appendChild(m);const h=document.createElement("div");h.className="scrim";const p=document.createElement("div");p.className="modal";const b=document.createElement("div");b.className="search-row";const N=document.createElement("div");N.className="search-icon",N.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';const u=document.createElement("input");u.type="text",u.className="search-input",u.placeholder="Search tabs, history, bookmarks, or type a URL...",u.autocomplete="off",u.spellcheck=!1;const S=document.createElement("span");S.className="kbd-tag",S.textContent="Alt+Q",b.appendChild(N),b.appendChild(u),b.appendChild(S);const U=document.createElement("div");U.id="noticeBar",U.className="notice-bar";const M=document.createElement("div");M.className="content-area";const E=document.createElement("ul");E.className="results-list",M.appendChild(E);const R=document.createElement("div");R.className="footer",R.innerHTML=`
    <div class="shortcuts">
      <span><span class="kbd-tag">↑↓</span> Navigate</span>
      <span><span class="kbd-tag">↵</span> Switch / Open</span>
      <span><span class="kbd-tag">Alt+W</span> Close Tab</span>
      <span><span class="kbd-tag">Esc</span> Close</span>
    </div>
    <div>Portal Launcher</div>
  `,p.appendChild(b),p.appendChild(U),p.appendChild(M),p.appendChild(R),h.appendChild(p),c.appendChild(h),document.body.appendChild(t);let s=[],d=0,k=null,O=null,P=0;function v(){if(clearTimeout(O),window.removeEventListener("keydown",X,!0),t.remove(),a&&typeof a.focus=="function")try{a.focus()}catch{}}t.__portalClose=v,h.addEventListener("click",e=>{e.target===h&&v()});function f(e){U.textContent=e,U.style.display="block",setTimeout(()=>{U.style.display="none"},2500)}function T(){if(E.innerHTML="",s.length===0){const e=document.createElement("li");e.style.padding="24px",e.style.textAlign="center",e.style.color="#71717a",e.style.fontSize="13px",e.textContent="No matching tabs, bookmarks, or commands",E.appendChild(e);return}s.forEach((e,n)=>{const r=document.createElement("li");r.className=`result-item ${n===d?"selected":""}`;const l=document.createElement("div");if(l.className="item-icon",e.favicon){const g=document.createElement("img");g.src=e.favicon,g.onerror=()=>{l.innerHTML=V(e.type,e.badge)},l.appendChild(g)}else l.innerHTML=V(e.type,e.badge);const x=document.createElement("div");x.className="item-info";const K=document.createElement("div");K.className="item-title",K.textContent=e.title;const W=document.createElement("div");if(W.className="item-desc",W.textContent=e.description||e.url||"",x.appendChild(K),x.appendChild(W),r.appendChild(l),r.appendChild(x),e.badge){const g=document.createElement("span");g.className="item-badge",g.textContent=e.badge,r.appendChild(g)}if(e.type==="tab"&&e.tabId){const g=document.createElement("div");g.className="item-actions";const I=document.createElement("button");I.className="action-icon-btn",I.title=e.pinned?"Unpin tab (Alt+P)":"Pin tab (Alt+P)",I.textContent=e.pinned?"📌":"📍",I.addEventListener("click",_=>{_.stopPropagation(),chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_PIN_TAB",tabId:e.tabId},y=>{y?.success&&(e.pinned=y.pinned,I.textContent=y.pinned?"📌":"📍",f(y.pinned?"Tab pinned":"Tab unpinned"))})}),g.appendChild(I);const L=document.createElement("button");L.className="action-icon-btn",L.title=e.muted?"Unmute tab (Alt+M)":"Mute tab (Alt+M)",L.textContent=e.muted?"🔇":"🔊",L.addEventListener("click",_=>{_.stopPropagation(),chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_MUTE_TAB",tabId:e.tabId},y=>{y?.success&&(e.muted=y.muted,L.textContent=y.muted?"🔇":"🔊",f(y.muted?"Tab muted":"Tab unmuted"))})}),g.appendChild(L);const q=document.createElement("button");q.className="action-icon-btn",q.title="Close Tab (Alt+W)",q.textContent="✕",q.addEventListener("click",_=>{_.stopPropagation(),chrome.runtime.sendMessage({type:"PORTAL_CLOSE_TAB",tabId:e.tabId},()=>{s=s.filter(y=>y.tabId!==e.tabId),d>=s.length&&(d=Math.max(0,s.length-1)),T(),f("Tab closed")})}),g.appendChild(q),r.appendChild(g)}r.addEventListener("click",g=>z(e,g)),r.addEventListener("mouseenter",()=>{d=n,B()}),E.appendChild(r)}),D()}function V(e,n){if(n==="CLIPBOARD")return'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';switch(e){case"tab":return C.tab;case"bookmark":return C.bookmark;case"history":return C.history;case"command":return C.command;case"shortcut":return C.pinFilled;case"ai_cluster":return C.sparkles;default:return C.globe}}function B(){E.querySelectorAll(".result-item").forEach((n,r)=>{r===d?n.classList.add("selected"):n.classList.remove("selected")})}function D(){const e=E.querySelector(".result-item.selected");e&&e.scrollIntoView({block:"nearest"})}async function z(e,n){if(e.badge&&e.badge.startsWith("@")&&e.title.includes("<query>")){const l=e.badge.toLowerCase()+" ";u.value=l,u.focus(),$(l);return}if(e.commandId==="open-clipboard-url"){navigator.clipboard?.readText?navigator.clipboard.readText().then(l=>{const x=A(l);x.startsWith("http://")||x.startsWith("https://")||x.startsWith("chrome://")?chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{...e,url:x,type:"web"},context:"overlay"},()=>{f(`Opening ${x}`),setTimeout(v,400)}):f("Clipboard does not contain a valid URL")}).catch(()=>{f("Clipboard read permission was not granted")}):f("Clipboard API not available");return}const r={shift:n?.shiftKey,alt:n?.altKey,ctrl:n?.ctrlKey||n?.metaKey};chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:e,context:"overlay",modifiers:r},l=>{if(chrome.runtime.lastError){f(`Error: ${chrome.runtime.lastError.message}`);return}if(!l||!l.success){f(l?.message||"Action could not be executed");return}e.type==="command"&&l.message?(f(l.message),setTimeout(v,850)):v()})}function $(e){const n=A(e);if(!n){if(++P,k?.openTabs&&k.openTabs.length>0){s=k.openTabs,d=0,T();return}s=[],d=-1,T();return}const r=++P;chrome.runtime.sendMessage({type:"PORTAL_SEARCH",query:n,context:"overlay"},l=>{if(r===P){if(chrome.runtime.lastError){console.warn("[Portal Overlay] Search message error:",chrome.runtime.lastError.message);return}l&&l.results&&(s=l.results,d=0,T())}})}u.addEventListener("input",()=>{clearTimeout(O),O=setTimeout(()=>{$(u.value)},25)});function X(e){if(e.key==="Escape"){e.preventDefault(),e.stopPropagation(),v();return}if(e.key==="ArrowDown"){e.preventDefault(),s.length>0&&(d=(d+1)%s.length,B(),D());return}if(e.key==="ArrowUp"){e.preventDefault(),s.length>0&&(d=(d-1+s.length)%s.length,B(),D());return}if(e.altKey&&(e.key==="w"||e.key==="W")){e.preventDefault();const n=s[d];n&&n.type==="tab"&&n.tabId&&chrome.runtime.sendMessage({type:"PORTAL_CLOSE_TAB",tabId:n.tabId},()=>{s=s.filter(r=>r.tabId!==n.tabId),d>=s.length&&(d=Math.max(0,s.length-1)),T(),f(`Closed tab: ${n.title}`)});return}if(e.altKey&&(e.key==="p"||e.key==="P")){e.preventDefault();const n=s[d];n&&n.type==="tab"&&n.tabId&&chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_PIN_TAB",tabId:n.tabId,pinned:!n.pinned},r=>{r?.success&&(n.pinned=r.pinned,T(),f(r.pinned?"Pinned tab":"Unpinned tab"))});return}if(e.altKey&&(e.key==="m"||e.key==="M")){e.preventDefault();const n=s[d];n&&n.type==="tab"&&n.tabId&&chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_MUTE_TAB",tabId:n.tabId,muted:!n.muted},r=>{r?.success&&(n.muted=r.muted,T(),f(r.muted?"Muted tab":"Unmuted tab"))});return}if(e.altKey&&(e.key==="c"||e.key==="C")){e.preventDefault();const n=s[d];n&&n.url&&navigator.clipboard.writeText(n.url).then(()=>{f(`Copied link: ${n.url}`)}).catch(()=>{f("Could not copy link")});return}if(e.key==="Enter"){e.preventDefault(),clearTimeout(O);const n=A(u.value),r=H(n);if(r.isUrl&&d<=0){chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{id:`direct-url-${Date.now()}`,type:"web",title:r.displayTitle,url:r.normalizedUrl,score:9999},context:"overlay",modifiers:{ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,alt:e.altKey}},()=>v());return}if(s.length>0&&d>=0&&s[d]){z(s[d],e);return}if(!n){k?.openTabs&&k.openTabs[0]&&z(k.openTabs[0],e);return}const l=J(n,k?.preferences.searchEngine);l.targetUrl&&chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{id:`sync-intent-${Date.now()}`,type:"web",title:l.displayTitle,url:l.targetUrl,score:5e3},context:"overlay",modifiers:{ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,alt:e.altKey}},()=>v());return}}window.addEventListener("keydown",X,!0),chrome.runtime.sendMessage({type:"PORTAL_GET_INITIAL_STATE",context:"overlay"},e=>{if(chrome.runtime.lastError||!e){u.value.trim()&&$(u.value);return}if(k=e,e.shortcutLabel&&(S.textContent=e.shortcutLabel),u.value.trim()){$(u.value);return}e.openTabs&&e.openTabs.length>0&&(s=e.openTabs,d=0,T())});function G(){u.focus({preventScroll:!0}),u.select()}requestAnimationFrame(G),setTimeout(G,25),setTimeout(G,80)})()})();
