(function(){"use strict";const I={tab:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',bookmark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',history:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',command:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',sparkles:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',globe:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',pinFilled:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><line x1="12" y1="17" x2="12" y2="22" stroke-width="2"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>'},Q=new Set(["com","org","net","edu","gov","mil","int","io","dev","app","ai","co","uk","ca","de","fr","jp","cn","in","au","me","info","biz","tv","cc","sh","gg","tech","site","online","xyz","cloud","club","space","local","internal","lan"]);function O(C){let o=C.trim().replace(/^["'`]+|["'`]+$/g,"").trim();return o.includes(`
`)&&(o=o.split(`
`).map(i=>i.trim()).find(i=>i.length>0)||o),o}function F(C){const o=O(C);if(!o||o.includes(" ")&&!o.startsWith("http://")&&!o.startsWith("https://"))return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""};if(/^(https?|file|chrome|chrome-extension):\/\//i.test(o))try{const h=new URL(o);return{isUrl:!0,normalizedUrl:h.href,displayTitle:`Navigate to ${h.hostname||o}`,hostname:h.hostname||"link"}}catch{return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}const i=/^localhost(?::(\d+))?(\/.*)?$/i.exec(o);if(i){const h=i[1]?`:${i[1]}`:"",g=i[2]||"";return{isUrl:!0,normalizedUrl:`http://localhost${h}${g}`,displayTitle:`Open ${o}`,hostname:"localhost"}}const r=/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?(\/.*)?$/.exec(o);if(r&&r[1].split(".").map(Number).every(u=>u>=0&&u<=255)){const u=r[2]?`:${r[2]}`:"",y=r[3]||"";return{isUrl:!0,normalizedUrl:`http://${r[1]}${u}${y}`,displayTitle:`Navigate to ${r[1]}${u}`,hostname:r[1]}}const d=/^([a-zA-Z0-9-]+\.)+([a-zA-Z]{2,63})(?::(\d+))?(\/.*)?$/.exec(o);if(d){const h=d[2].toLowerCase(),g=!!d[3]||!!d[4]&&d[4].length>1;if(Q.has(h)||g||h.length>=2){const u=`https://${o}`;try{const y=new URL(u);return{isUrl:!0,normalizedUrl:y.href,displayTitle:`Navigate to ${y.hostname}`,hostname:y.hostname}}catch{return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}}}return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}const V=[{prefix:"gh",name:"GitHub",domain:"github.com",urlTemplate:"https://github.com/search?q={q}",description:"Search GitHub repositories, code, and issues"},{prefix:"yt",name:"YouTube",domain:"youtube.com",urlTemplate:"https://www.youtube.com/results?search_query={q}",description:"Search YouTube videos and music"},{prefix:"w",name:"Wikipedia",domain:"wikipedia.org",urlTemplate:"https://en.wikipedia.org/wiki/Special:Search?search={q}",description:"Search Wikipedia encyclopedia articles"},{prefix:"so",name:"Stack Overflow",domain:"stackoverflow.com",urlTemplate:"https://stackoverflow.com/search?q={q}",description:"Search developer questions and solutions"},{prefix:"r",name:"Reddit",domain:"reddit.com",urlTemplate:"https://www.reddit.com/search/?q={q}",description:"Search Reddit discussions and subreddits"},{prefix:"npm",name:"npm",domain:"npmjs.com",urlTemplate:"https://www.npmjs.com/search?q={q}",description:"Search JavaScript and Node.js packages"},{prefix:"m",name:"Google Maps",domain:"google.com",urlTemplate:"https://www.google.com/maps/search/{q}",description:"Search places, addresses, and directions"},{prefix:"g",name:"Google",domain:"google.com",urlTemplate:"https://www.google.com/search?q={q}",description:"Search the web using Google"},{prefix:"ddg",name:"DuckDuckGo",domain:"duckduckgo.com",urlTemplate:"https://duckduckgo.com/?q={q}",description:"Search privacy-first with DuckDuckGo"},{prefix:"x",name:"X (Twitter)",domain:"x.com",urlTemplate:"https://x.com/search?q={q}",description:"Search posts and profiles on X"}],X={chatgpt:{domain:"chatgpt.com",name:"ChatGPT"},openai:{domain:"openai.com",name:"OpenAI"},github:{domain:"github.com",name:"GitHub"},youtube:{domain:"youtube.com",name:"YouTube"},google:{domain:"google.com",name:"Google"},docs:{domain:"docs.google.com",name:"Google Docs"},drive:{domain:"drive.google.com",name:"Google Drive"},reddit:{domain:"reddit.com",name:"Reddit"},twitter:{domain:"x.com",name:"X / Twitter"},figma:{domain:"figma.com",name:"Figma"},notion:{domain:"notion.so",name:"Notion"},slack:{domain:"slack.com",name:"Slack"}};function ee(C){const o=C.trim();if(!o)return{scope:"all",query:"",isCommand:!1};if(o.startsWith("/")){const i=o.slice(1).trim(),r=i.split(/\s+/);return{scope:"commands",query:i,isCommand:!0,commandToken:r[0]?.toLowerCase()||""}}if(o.startsWith("@")){const i=o.slice(1).trim(),r=i.search(/\s/),n=(r===-1?i:i.slice(0,r)).toLowerCase(),d=r===-1?"":i.slice(r).trim();if(n==="tabs"||n==="tab")return{scope:"tabs",query:d,isCommand:!1};if(n==="history"||n==="hist")return{scope:"history",query:d,isCommand:!1};if(n==="bookmarks"||n==="bookmark"||n==="bm")return{scope:"bookmarks",query:d,isCommand:!1};if(n==="audio"||n==="sound"||n==="music")return{scope:"audio",query:d,isCommand:!1};const h=V.find(g=>g.prefix.toLowerCase()===n);return h?{scope:"all",query:d,providerBang:h,isCommand:!1}:X[n]?{scope:"site",query:d,siteDomain:X[n].domain,isCommand:!1}:n.includes(".")?{scope:"site",query:d,siteDomain:n,isCommand:!1}:{scope:"tabs",query:i,isCommand:!1}}if(o.startsWith("!")){const i=o.slice(1).trim(),r=i.search(/\s/),n=(r===-1?i:i.slice(0,r)).toLowerCase(),d=r===-1?"":i.slice(r).trim(),h=V.find(g=>g.prefix.toLowerCase()===n);if(h)return{scope:"all",query:d,providerBang:h,isCommand:!1}}return o.startsWith("#")||o.startsWith("*")?{scope:"bookmarks",query:o.slice(1).trim(),isCommand:!1}:{scope:"all",query:o,isCommand:!1}}function te(C,o="google"){const i=O(C);if(!i)return{type:"web_search_fallback",targetUrl:"",displayTitle:"",description:"",badge:"SEARCH"};const r=F(i);if(r.isUrl)return{type:"navigate_url",targetUrl:r.normalizedUrl,displayTitle:r.displayTitle,description:r.normalizedUrl,badge:"NAVIGATE"};const n=ee(i);if(n.providerBang){const u=n.query;return{type:"provider_search",targetUrl:u?n.providerBang.urlTemplate.replace("{q}",encodeURIComponent(u)):`https://${n.providerBang.domain}`,displayTitle:u?`Search ${n.providerBang.name} for "${u}"`:`Open ${n.providerBang.name}`,description:`${n.providerBang.description} • Opens in new tab`,badge:`@${n.providerBang.prefix.toUpperCase()}`}}if(n.isCommand)return{type:"command",targetUrl:"",displayTitle:`Run command /${n.query}`,description:"Browser command execution",badge:"COMMAND"};if(n.scope!=="all")return{type:"scoped_search",targetUrl:"",displayTitle:`Filter by @${n.scope}: ${n.query}`,description:`Filtering ${n.scope}`,badge:`@${n.scope.toUpperCase()}`,scope:n.scope};const d=i;return{type:"web_search_fallback",targetUrl:o==="duckduckgo"?`https://duckduckgo.com/?q=${encodeURIComponent(d)}`:o==="bing"?`https://www.bing.com/search?q=${encodeURIComponent(d)}`:`https://www.google.com/search?q=${encodeURIComponent(d)}`,displayTitle:`Search ${o==="duckduckgo"?"DuckDuckGo":o==="bing"?"Bing":"Google"} for "${d}"`,description:"Web search • Opens in new tab",badge:"SEARCH"}}(function(){const o="portal-floating-launcher-root",i=document.getElementById(o);if(i){typeof i.__portalToggle=="function"?i.__portalToggle():typeof i.__portalClose=="function"?i.__portalClose():i.remove();return}const r=document.activeElement,n=document.createElement("div");n.id=o,n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.width="100vw",n.style.height="100vh",n.style.zIndex="2147483647",n.style.pointerEvents="auto";const d=n.attachShadow({mode:"open"}),h=document.createElement("style");h.textContent=`
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
  `,d.appendChild(h);const g=document.createElement("div");g.className="scrim";const u=document.createElement("div");u.className="modal";const y=document.createElement("div");y.className="search-row";const $=document.createElement("div");$.className="search-icon",$.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';const f=document.createElement("input");f.type="text",f.className="search-input",f.placeholder="Search tabs, history, bookmarks, or type a URL...",f.autocomplete="off",f.spellcheck=!1;const N=document.createElement("span");N.className="kbd-tag",N.textContent="Alt+Q",y.appendChild($),y.appendChild(f),y.appendChild(N);const q=document.createElement("div");q.id="noticeBar",q.className="notice-bar";const R=document.createElement("div");R.className="content-area";const U=document.createElement("ul");U.className="results-list",R.appendChild(U);const B=document.createElement("div");B.className="footer",B.innerHTML=`
    <div class="shortcuts">
      <span><span class="kbd-tag">↑↓</span> Navigate</span>
      <span><span class="kbd-tag">↵</span> Switch / Open</span>
      <span><span class="kbd-tag">Alt+C</span> Copy Link</span>
      <span><span class="kbd-tag">Alt+M</span> Copy MD</span>
      <span><span class="kbd-tag">Alt+W</span> Close Tab</span>
      <span><span class="kbd-tag">Esc</span> Close</span>
    </div>
    <div>Portal Launcher</div>
  `,u.appendChild(y),u.appendChild(q),u.appendChild(R),u.appendChild(B),g.appendChild(u),d.appendChild(g),document.body.appendChild(n);let s=[],l=0,E=null,S=null,D=0;function ne(){n.style.display="block",window.addEventListener("keydown",W,!0),f.value="",J(),P()}function k(){if(clearTimeout(S),window.removeEventListener("keydown",W,!0),n.style.display="none",r&&typeof r.focus=="function")try{r.focus()}catch{}}function Y(){n.style.display==="none"?ne():k()}n.__portalClose=k,n.__portalToggle=Y,chrome.runtime.onMessage.addListener((e,t,a)=>{if(e.type==="PORTAL_TOGGLE_OVERLAY")return Y(),a({handled:!0,isOpen:n.style.display!=="none"}),!0}),g.addEventListener("click",e=>{e.target===g&&k()});function p(e){q.textContent=e,q.style.display="block",setTimeout(()=>{q.style.display="none"},2500)}function L(){if(U.innerHTML="",s.length===0){const e=document.createElement("li");e.style.padding="24px",e.style.textAlign="center",e.style.color="#71717a",e.style.fontSize="13px",e.textContent="No matching tabs, bookmarks, or commands",U.appendChild(e);return}s.forEach((e,t)=>{const a=document.createElement("li");a.className=`result-item ${t===l?"selected":""}`;const c=document.createElement("div");if(c.className="item-icon",e.favicon){const m=document.createElement("img");m.src=e.favicon,m.onerror=()=>{c.innerHTML=Z(e.type,e.badge)},c.appendChild(m)}else c.innerHTML=Z(e.type,e.badge);const v=document.createElement("div");v.className="item-info";const H=document.createElement("div");H.className="item-title",H.textContent=e.title;const j=document.createElement("div");if(j.className="item-desc",j.textContent=e.description||e.url||"",v.appendChild(H),v.appendChild(j),a.appendChild(c),a.appendChild(v),e.badge){const m=document.createElement("span");m.className="item-badge",m.textContent=e.badge,a.appendChild(m)}const T=document.createElement("div");if(T.className="item-actions",e.url){const m=document.createElement("button");m.className="action-icon-btn",m.title="Copy Link (Alt+C)",m.textContent="🔗",m.addEventListener("click",w=>{w.stopPropagation(),navigator.clipboard.writeText(e.url).then(()=>{p(`Copied link: ${e.url}`)}).catch(()=>{p("Could not copy link")})}),T.appendChild(m);const x=document.createElement("button");x.className="action-icon-btn",x.title="Copy Markdown (Alt+M)",x.textContent="📋",x.addEventListener("click",w=>{w.stopPropagation();const A=`[${e.title||e.url}](${e.url})`;navigator.clipboard.writeText(A).then(()=>{p(`Copied markdown: ${A}`)}).catch(()=>{p("Could not copy markdown")})}),T.appendChild(x)}if(e.type==="tab"&&e.tabId){const m=document.createElement("button");m.className="action-icon-btn",m.title="Duplicate Tab (Alt+D)",m.textContent="📑",m.addEventListener("click",_=>{_.stopPropagation(),chrome.runtime.sendMessage({type:"PORTAL_DUPLICATE_TAB",tabId:e.tabId},b=>{b?.success&&p(`Duplicated tab: ${e.title}`)})}),T.appendChild(m);const x=document.createElement("button");x.className="action-icon-btn",x.title=e.pinned?"Unpin tab (Alt+P)":"Pin tab (Alt+P)",x.textContent=e.pinned?"📌":"📍",x.addEventListener("click",_=>{_.stopPropagation(),chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_PIN_TAB",tabId:e.tabId},b=>{b?.success&&(e.pinned=b.pinned,x.textContent=b.pinned?"📌":"📍",p(b.pinned?"Tab pinned":"Tab unpinned"))})}),T.appendChild(x);const w=document.createElement("button");w.className="action-icon-btn",w.title=e.muted?"Unmute tab (Alt+U)":"Mute tab (Alt+U)",w.textContent=e.muted?"🔇":"🔊",w.addEventListener("click",_=>{_.stopPropagation(),chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_MUTE_TAB",tabId:e.tabId},b=>{b?.success&&(e.muted=b.muted,w.textContent=b.muted?"🔇":"🔊",p(b.muted?"Tab muted":"Tab unmuted"))})}),T.appendChild(w);const A=document.createElement("button");A.className="action-icon-btn",A.title="Close Tab (Alt+W)",A.textContent="✕",A.addEventListener("click",_=>{_.stopPropagation(),chrome.runtime.sendMessage({type:"PORTAL_CLOSE_TAB",tabId:e.tabId},()=>{s=s.filter(b=>b.tabId!==e.tabId),l>=s.length&&(l=Math.max(0,s.length-1)),L(),p("Tab closed")})}),T.appendChild(A)}T.children.length>0&&a.appendChild(T),a.addEventListener("click",m=>K(e,m)),a.addEventListener("mouseenter",()=>{l=t,z()}),U.appendChild(a)}),G()}function Z(e,t){if(t==="CLIPBOARD")return'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';switch(e){case"tab":return I.tab;case"bookmark":return I.bookmark;case"history":return I.history;case"command":return I.command;case"shortcut":return I.pinFilled;case"ai_cluster":return I.sparkles;default:return I.globe}}function z(){U.querySelectorAll(".result-item").forEach((t,a)=>{a===l?t.classList.add("selected"):t.classList.remove("selected")})}function G(){const e=U.querySelector(".result-item.selected");e&&e.scrollIntoView({block:"nearest"})}async function K(e,t){if(e.badge&&e.badge.startsWith("@")&&e.title.includes("<query>")){const c=e.badge.toLowerCase()+" ";f.value=c,f.focus(),M(c);return}if(e.commandId==="open-clipboard-url"){navigator.clipboard?.readText?navigator.clipboard.readText().then(c=>{const v=O(c);v.startsWith("http://")||v.startsWith("https://")||v.startsWith("chrome://")?chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{...e,url:v,type:"web"},context:"overlay"},()=>{p(`Opening ${v}`),setTimeout(k,400)}):p("Clipboard does not contain a valid URL")}).catch(()=>{p("Clipboard read permission was not granted")}):p("Clipboard API not available");return}const a={shift:t?.shiftKey,alt:t?.altKey,ctrl:t?.ctrlKey||t?.metaKey};chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:e,context:"overlay",modifiers:a},c=>{if(chrome.runtime.lastError){p(`Error: ${chrome.runtime.lastError.message}`);return}if(!c||!c.success){p(c?.message||"Action could not be executed");return}e.type==="command"&&c.message?(p(c.message),setTimeout(k,850)):k()})}function M(e){const t=O(e);if(!t){if(++D,E?.openTabs&&E.openTabs.length>0){s=E.openTabs,l=0,L();return}s=[],l=-1,L();return}const a=++D;chrome.runtime.sendMessage({type:"PORTAL_SEARCH",query:t,context:"overlay"},c=>{if(a===D){if(chrome.runtime.lastError){console.warn("[Portal Overlay] Search message error:",chrome.runtime.lastError.message);return}c&&c.results&&(s=c.results,l=0,L())}})}f.addEventListener("input",()=>{clearTimeout(S),S=setTimeout(()=>{M(f.value)},25)});function W(e){if(e.key==="Escape"){e.preventDefault(),e.stopPropagation(),k();return}if(e.key==="ArrowDown"){e.preventDefault(),s.length>0&&(l=(l+1)%s.length,z(),G());return}if(e.key==="ArrowUp"){e.preventDefault(),s.length>0&&(l=(l-1+s.length)%s.length,z(),G());return}if(e.altKey&&(e.key==="w"||e.key==="W")){e.preventDefault();const t=s[l];t&&t.type==="tab"&&t.tabId&&chrome.runtime.sendMessage({type:"PORTAL_CLOSE_TAB",tabId:t.tabId},()=>{s=s.filter(a=>a.tabId!==t.tabId),l>=s.length&&(l=Math.max(0,s.length-1)),L(),p(`Closed tab: ${t.title}`)});return}if(e.altKey&&(e.key==="p"||e.key==="P")){e.preventDefault();const t=s[l];t&&t.type==="tab"&&t.tabId&&chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_PIN_TAB",tabId:t.tabId,pinned:!t.pinned},a=>{a?.success&&(t.pinned=a.pinned,L(),p(a.pinned?"Pinned tab":"Unpinned tab"))});return}if(e.altKey&&(e.key==="d"||e.key==="D")){e.preventDefault();const t=s[l];t&&t.type==="tab"&&t.tabId&&chrome.runtime.sendMessage({type:"PORTAL_DUPLICATE_TAB",tabId:t.tabId},a=>{a?.success&&p(`Duplicated tab: ${t.title}`)});return}if(e.altKey&&(e.key==="u"||e.key==="U")){e.preventDefault();const t=s[l];t&&t.type==="tab"&&t.tabId&&chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_MUTE_TAB",tabId:t.tabId,muted:!t.muted},a=>{a?.success&&(t.muted=a.muted,L(),p(a.muted?"Muted tab":"Unmuted tab"))});return}if(e.altKey&&(e.key==="m"||e.key==="M")){e.preventDefault();const t=s[l];if(t&&t.url){const a=`[${t.title||t.url}](${t.url})`;navigator.clipboard.writeText(a).then(()=>{p(`Copied markdown: ${a}`)}).catch(()=>{p("Could not copy markdown")})}return}if(e.key==="Enter"){e.preventDefault(),clearTimeout(S);const t=O(f.value),a=F(t);if(a.isUrl&&l<=0){chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{id:`direct-url-${Date.now()}`,type:"web",title:a.displayTitle,url:a.normalizedUrl,score:9999},context:"overlay",modifiers:{ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,alt:e.altKey}},()=>k());return}if(s.length>0&&l>=0&&s[l]){K(s[l],e);return}if(!t){E?.openTabs&&E.openTabs[0]&&K(E.openTabs[0],e);return}const c=te(t,E?.preferences.searchEngine);c.targetUrl&&chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{id:`sync-intent-${Date.now()}`,type:"web",title:c.displayTitle,url:c.targetUrl,score:5e3},context:"overlay",modifiers:{ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,alt:e.altKey}},()=>k());return}}window.addEventListener("keydown",W,!0);function J(){chrome.runtime.sendMessage({type:"PORTAL_GET_INITIAL_STATE",context:"overlay"},e=>{if(chrome.runtime.lastError||!e){f.value.trim()&&M(f.value);return}if(E=e,e.shortcutLabel&&(N.textContent=e.shortcutLabel),f.value.trim()){M(f.value);return}e.openTabs&&e.openTabs.length>0&&(s=e.openTabs,l=0,L())})}J();function P(){f.focus({preventScroll:!0}),f.select()}requestAnimationFrame(P),setTimeout(P,25),setTimeout(P,80)})()})();
