(function(){"use strict";const D={tab:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',bookmark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',history:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',command:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',sparkles:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',globe:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',pinFilled:'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><line x1="12" y1="17" x2="12" y2="22" stroke-width="2"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>'},le=new Set(["com","org","net","edu","gov","mil","int","io","dev","app","ai","co","uk","ca","de","fr","jp","cn","in","au","me","info","biz","tv","cc","sh","gg","tech","site","online","xyz","cloud","club","space","local","internal","lan"]);function M(U){let a=U.trim().replace(/^["'`]+|["'`]+$/g,"").trim();return a.includes(`
`)&&(a=a.split(`
`).map(i=>i.trim()).find(i=>i.length>0)||a),a}function ee(U){const a=M(U);if(!a||a.includes(" ")&&!a.startsWith("http://")&&!a.startsWith("https://"))return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""};if(/^(https?|file|chrome|chrome-extension):\/\//i.test(a))try{const m=new URL(a);return{isUrl:!0,normalizedUrl:m.href,displayTitle:`Navigate to ${m.hostname||a}`,hostname:m.hostname||"link"}}catch{return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}const i=/^localhost(?::(\d+))?(\/.*)?$/i.exec(a);if(i){const m=i[1]?`:${i[1]}`:"",b=i[2]||"";return{isUrl:!0,normalizedUrl:`http://localhost${m}${b}`,displayTitle:`Open ${a}`,hostname:"localhost"}}const r=/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?(\/.*)?$/.exec(a);if(r&&r[1].split(".").map(Number).every(p=>p>=0&&p<=255)){const p=r[2]?`:${r[2]}`:"",x=r[3]||"";return{isUrl:!0,normalizedUrl:`http://${r[1]}${p}${x}`,displayTitle:`Navigate to ${r[1]}${p}`,hostname:r[1]}}const d=/^([a-zA-Z0-9-]+\.)+([a-zA-Z]{2,63})(?::(\d+))?(\/.*)?$/.exec(a);if(d){const m=d[2].toLowerCase(),b=!!d[3]||!!d[4]&&d[4].length>1;if(le.has(m)||b||m.length>=2){const p=`https://${a}`;try{const x=new URL(p);return{isUrl:!0,normalizedUrl:x.href,displayTitle:`Navigate to ${x.hostname}`,hostname:x.hostname}}catch{return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}}}return{isUrl:!1,normalizedUrl:"",displayTitle:"",hostname:""}}const te=[{prefix:"gh",name:"GitHub",domain:"github.com",urlTemplate:"https://github.com/search?q={q}",description:"Search GitHub repositories, code, and issues"},{prefix:"yt",name:"YouTube",domain:"youtube.com",urlTemplate:"https://www.youtube.com/results?search_query={q}",description:"Search YouTube videos and music"},{prefix:"w",name:"Wikipedia",domain:"wikipedia.org",urlTemplate:"https://en.wikipedia.org/wiki/Special:Search?search={q}",description:"Search Wikipedia encyclopedia articles"},{prefix:"so",name:"Stack Overflow",domain:"stackoverflow.com",urlTemplate:"https://stackoverflow.com/search?q={q}",description:"Search developer questions and solutions"},{prefix:"r",name:"Reddit",domain:"reddit.com",urlTemplate:"https://www.reddit.com/search/?q={q}",description:"Search Reddit discussions and subreddits"},{prefix:"npm",name:"npm",domain:"npmjs.com",urlTemplate:"https://www.npmjs.com/search?q={q}",description:"Search JavaScript and Node.js packages"},{prefix:"m",name:"Google Maps",domain:"google.com",urlTemplate:"https://www.google.com/maps/search/{q}",description:"Search places, addresses, and directions"},{prefix:"g",name:"Google",domain:"google.com",urlTemplate:"https://www.google.com/search?q={q}",description:"Search the web using Google"},{prefix:"ddg",name:"DuckDuckGo",domain:"duckduckgo.com",urlTemplate:"https://duckduckgo.com/?q={q}",description:"Search privacy-first with DuckDuckGo"},{prefix:"x",name:"X (Twitter)",domain:"x.com",urlTemplate:"https://x.com/search?q={q}",description:"Search posts and profiles on X"}],ne={chatgpt:{domain:"chatgpt.com",name:"ChatGPT"},openai:{domain:"openai.com",name:"OpenAI"},github:{domain:"github.com",name:"GitHub"},youtube:{domain:"youtube.com",name:"YouTube"},google:{domain:"google.com",name:"Google"},docs:{domain:"docs.google.com",name:"Google Docs"},drive:{domain:"drive.google.com",name:"Google Drive"},reddit:{domain:"reddit.com",name:"Reddit"},twitter:{domain:"x.com",name:"X / Twitter"},figma:{domain:"figma.com",name:"Figma"},notion:{domain:"notion.so",name:"Notion"},slack:{domain:"slack.com",name:"Slack"}};function ce(U){const a=U.trim();if(!a)return{scope:"all",query:"",isCommand:!1};if(a.startsWith("/")){const i=a.slice(1).trim(),r=i.split(/\s+/);return{scope:"commands",query:i,isCommand:!0,commandToken:r[0]?.toLowerCase()||""}}if(a.startsWith("@")){const i=a.slice(1).trim(),r=i.search(/\s/),n=(r===-1?i:i.slice(0,r)).toLowerCase(),d=r===-1?"":i.slice(r).trim();if(n==="tabs"||n==="tab")return{scope:"tabs",query:d,isCommand:!1};if(n==="history"||n==="hist")return{scope:"history",query:d,isCommand:!1};if(n==="bookmarks"||n==="bookmark"||n==="bm")return{scope:"bookmarks",query:d,isCommand:!1};if(n==="audio"||n==="sound"||n==="music")return{scope:"audio",query:d,isCommand:!1};const m=te.find(b=>b.prefix.toLowerCase()===n);return m?{scope:"all",query:d,providerBang:m,isCommand:!1}:ne[n]?{scope:"site",query:d,siteDomain:ne[n].domain,isCommand:!1}:n.includes(".")?{scope:"site",query:d,siteDomain:n,isCommand:!1}:{scope:"tabs",query:i,isCommand:!1}}if(a.startsWith("!")){const i=a.slice(1).trim(),r=i.search(/\s/),n=(r===-1?i:i.slice(0,r)).toLowerCase(),d=r===-1?"":i.slice(r).trim(),m=te.find(b=>b.prefix.toLowerCase()===n);if(m)return{scope:"all",query:d,providerBang:m,isCommand:!1}}return a.startsWith("#")||a.startsWith("*")?{scope:"bookmarks",query:a.slice(1).trim(),isCommand:!1}:{scope:"all",query:a,isCommand:!1}}function de(U,a="google"){const i=M(U);if(!i)return{type:"web_search_fallback",targetUrl:"",displayTitle:"",description:"",badge:"SEARCH"};const r=ee(i);if(r.isUrl)return{type:"navigate_url",targetUrl:r.normalizedUrl,displayTitle:r.displayTitle,description:r.normalizedUrl,badge:"NAVIGATE"};const n=ce(i);if(n.providerBang){const p=n.query;return{type:"provider_search",targetUrl:p?n.providerBang.urlTemplate.replace("{q}",encodeURIComponent(p)):`https://${n.providerBang.domain}`,displayTitle:p?`Search ${n.providerBang.name} for "${p}"`:`Open ${n.providerBang.name}`,description:`${n.providerBang.description} • Opens in new tab`,badge:`@${n.providerBang.prefix.toUpperCase()}`}}if(n.isCommand)return{type:"command",targetUrl:"",displayTitle:`Run command /${n.query}`,description:"Browser command execution",badge:"COMMAND"};if(n.scope!=="all")return{type:"scoped_search",targetUrl:"",displayTitle:`Filter by @${n.scope}: ${n.query}`,description:`Filtering ${n.scope}`,badge:`@${n.scope.toUpperCase()}`,scope:n.scope};const d=i;return{type:"web_search_fallback",targetUrl:a==="duckduckgo"?`https://duckduckgo.com/?q=${encodeURIComponent(d)}`:a==="bing"?`https://www.bing.com/search?q=${encodeURIComponent(d)}`:`https://www.google.com/search?q=${encodeURIComponent(d)}`,displayTitle:`Search ${a==="duckduckgo"?"DuckDuckGo":a==="bing"?"Bing":"Google"} for "${d}"`,description:"Web search • Opens in new tab",badge:"SEARCH"}}(function(){const a="portal-floating-launcher-root",i=document.getElementById(a);if(i){typeof i.__portalToggle=="function"?i.__portalToggle():typeof i.__portalClose=="function"?i.__portalClose():i.remove();return}let r=null;const n=document.createElement("div");n.id=a,n.style.position="fixed",n.style.top="0",n.style.left="0",n.style.width="100vw",n.style.height="100vh",n.style.zIndex="2147483647",n.style.pointerEvents="auto";const d=n.attachShadow({mode:"open"}),m=document.createElement("style");m.textContent=`
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
  `,d.appendChild(m);const b=document.createElement("div");b.className="scrim";const p=document.createElement("div");p.className="modal";const x=document.createElement("div");x.className="search-row";const S=document.createElement("div");S.className="search-icon",S.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';const f=document.createElement("input");f.id="portalOverlayInput",f.type="text",f.className="search-input",f.placeholder="Search tabs, history, bookmarks, or type a URL...",f.autocomplete="off",f.spellcheck=!1;const O=document.createElement("span");O.className="kbd-tag",O.textContent="Alt+Q",x.appendChild(S),x.appendChild(f),x.appendChild(O);const k=document.createElement("div");k.id="noticeBar",k.className="notice-bar";const j=document.createElement("div");j.className="content-area";const $=document.createElement("ul");$.className="results-list",j.appendChild($);const L=document.createElement("div");L.className="action-menu";const V=document.createElement("div");V.className="footer",V.innerHTML=`
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
  `,p.appendChild(x),p.appendChild(k),p.appendChild(j),p.appendChild(L),p.appendChild(V),b.appendChild(p),d.appendChild(b),document.body.appendChild(n);let l=[],c=0,g=!1,I=null,R=null,X=0;function v(){if(!g){L.classList.remove("active");return}const e=l[c];if(!e){g=!1,L.classList.remove("active");return}L.classList.add("active"),L.innerHTML="";const t=document.createElement("div");t.className="action-menu-header",t.textContent=`Actions for "${e.title.substring(0,45)}"`,L.appendChild(t);const o=document.createElement("div");o.className="action-menu-items";const s=[];e.url&&(s.push({key:"C",label:"Copy Link",action:()=>B(e)}),s.push({key:"M",label:"Copy Markdown",action:()=>z(e)})),e.type==="tab"&&e.tabId&&(s.push({key:"D",label:"Duplicate Tab",action:()=>Y(e)}),s.push({key:"X",label:"Close Tab",action:()=>G(e)}),s.push({key:"P",label:e.pinned?"Unpin Tab":"Pin Tab",action:()=>K(e)}),s.push({key:"U",label:e.muted?"Unmute Tab":"Mute Tab",action:()=>W(e)})),s.forEach(y=>{const A=document.createElement("button");A.className="action-menu-chip",A.innerHTML=`<span class="kbd-tag">${y.key}</span> ${y.label}`,A.addEventListener("click",q=>{q.stopPropagation(),g=!1,v(),y.action()}),o.appendChild(A)}),L.appendChild(o)}function oe(){r=document.activeElement,n.style.display="block",window.addEventListener("keydown",se,!0),f.value="",l=[],c=0,g=!1,v(),pe(),F(),requestAnimationFrame(F),setTimeout(F,25),setTimeout(F,80)}function C(){if(clearTimeout(R),window.removeEventListener("keydown",se,!0),n.style.display="none",g=!1,v(),r&&typeof r.focus=="function")try{document.body.contains(r)&&r.focus()}catch{}r=null}function ae(){n.style.display==="none"?oe():C()}n.__portalClose=C,n.__portalToggle=ae,chrome.runtime.onMessage.addListener((e,t,o)=>{if(e.type==="PORTAL_TOGGLE_OVERLAY")return ae(),o({handled:!0,isOpen:n.style.display!=="none"}),!1}),b.addEventListener("click",e=>{e.target===b&&C()});function h(e,t=!1){k.textContent=e,k.style.display="block",t?(k.style.background="rgba(239, 68, 68, 0.15)",k.style.borderColor="rgba(239, 68, 68, 0.4)",k.style.color="#fca5a5"):(k.style.background="rgba(99, 102, 241, 0.15)",k.style.borderColor="rgba(99, 102, 241, 0.3)",k.style.color="#c7d2fe"),setTimeout(()=>{k.style.display="none"},2800)}async function ie(e){if(!e)return!1;try{if(navigator.clipboard&&typeof navigator.clipboard.writeText=="function")return await navigator.clipboard.writeText(e),!0}catch{}try{const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",t.style.left="-9999px",document.body.appendChild(t),t.select();const o=document.execCommand("copy");return t.remove(),o}catch{return!1}}async function B(e){if(!e.url)return;await ie(e.url)?h(`Copied link: ${e.url}`):h("Failed to copy link to clipboard",!0)}async function z(e){if(!e.url)return;const t=`[${e.title||e.url}](${e.url})`;await ie(t)?h(`Copied markdown: ${t}`):h("Failed to copy markdown to clipboard",!0)}function G(e){e.tabId&&chrome.runtime.sendMessage({type:"PORTAL_CLOSE_TAB",tabId:e.tabId},t=>{if(chrome.runtime.lastError||!t||!t.success){h(`Failed to close tab: ${t?.error||chrome.runtime.lastError?.message||"Unknown error"}`,!0);return}l=l.filter(o=>o.tabId!==e.tabId),c>=l.length&&(c=Math.max(0,l.length-1)),N(),h(`Closed tab: ${e.title}`)})}function Y(e){e.tabId&&chrome.runtime.sendMessage({type:"PORTAL_DUPLICATE_TAB",tabId:e.tabId},t=>{if(chrome.runtime.lastError||!t||!t.success){h(`Failed to duplicate tab: ${t?.error||chrome.runtime.lastError?.message||"Unknown error"}`,!0);return}h(`Duplicated tab: ${e.title}`)})}function K(e){e.tabId&&chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_PIN_TAB",tabId:e.tabId,pinned:!e.pinned},t=>{if(chrome.runtime.lastError||!t||!t.success){h(`Failed to pin tab: ${t?.error||chrome.runtime.lastError?.message||"Unknown error"}`,!0);return}e.pinned=t.pinned,N(),h(t.pinned?"Pinned tab":"Unpinned tab")})}function W(e){e.tabId&&chrome.runtime.sendMessage({type:"PORTAL_TOGGLE_MUTE_TAB",tabId:e.tabId,muted:!e.muted},t=>{if(chrome.runtime.lastError||!t||!t.success){h(`Failed to mute tab: ${t?.error||chrome.runtime.lastError?.message||"Unknown error"}`,!0);return}e.muted=t.muted,N(),h(t.muted?"Muted tab":"Unmuted tab")})}function N(){if($.innerHTML="",l.length===0){const e=document.createElement("li");e.style.padding="24px",e.style.textAlign="center",e.style.color="#71717a",e.style.fontSize="13px",e.textContent="No matching tabs, bookmarks, or commands",$.appendChild(e);return}l.forEach((e,t)=>{const o=document.createElement("li");o.className=`result-item ${t===c?"selected":""}`;const s=document.createElement("div");if(s.className="item-icon",e.favicon){const u=document.createElement("img");u.src=e.favicon,u.onerror=()=>{s.innerHTML=re(e.type,e.badge)},s.appendChild(u)}else s.innerHTML=re(e.type,e.badge);const y=document.createElement("div");y.className="item-info";const A=document.createElement("div");A.className="item-title",A.textContent=e.title;const q=document.createElement("div");if(q.className="item-desc",q.textContent=e.description||e.url||"",y.appendChild(A),y.appendChild(q),o.appendChild(s),o.appendChild(y),e.badge){const u=document.createElement("span");u.className="item-badge",u.textContent=e.badge,o.appendChild(u)}const T=document.createElement("div");if(T.className="item-actions",e.url){const u=document.createElement("button");u.className="action-icon-btn",u.title="Copy Link (Alt+C)",u.textContent="🔗",u.addEventListener("click",E=>{E.stopPropagation(),B(e)}),T.appendChild(u);const w=document.createElement("button");w.className="action-icon-btn",w.title="Copy Markdown (Alt+M)",w.textContent="📋",w.addEventListener("click",E=>{E.stopPropagation(),z(e)}),T.appendChild(w)}if(e.type==="tab"&&e.tabId){const u=document.createElement("button");u.className="action-icon-btn",u.title="Duplicate Tab (Tab -> D)",u.textContent="📑",u.addEventListener("click",_=>{_.stopPropagation(),Y(e)}),T.appendChild(u);const w=document.createElement("button");w.className="action-icon-btn",w.title=e.pinned?"Unpin tab (Alt+P)":"Pin tab (Alt+P)",w.textContent=e.pinned?"📌":"📍",w.addEventListener("click",_=>{_.stopPropagation(),K(e)}),T.appendChild(w);const E=document.createElement("button");E.className="action-icon-btn",E.title=e.muted?"Unmute tab (Alt+U)":"Mute tab (Alt+U)",E.textContent=e.muted?"🔇":"🔊",E.addEventListener("click",_=>{_.stopPropagation(),W(e)}),T.appendChild(E);const P=document.createElement("button");P.className="action-icon-btn",P.title="Close Tab (Alt+W)",P.textContent="✕",P.addEventListener("click",_=>{_.stopPropagation(),G(e)}),T.appendChild(P)}T.children.length>0&&o.appendChild(T),o.addEventListener("click",u=>Q(e,u)),o.addEventListener("mouseenter",()=>{c=t,Z()}),$.appendChild(o)}),J()}function re(e,t){if(t==="CLIPBOARD")return'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';switch(e){case"tab":return D.tab;case"bookmark":return D.bookmark;case"history":return D.history;case"command":return D.command;case"shortcut":return D.pinFilled;case"ai_cluster":return D.sparkles;default:return D.globe}}function Z(){$.querySelectorAll(".result-item").forEach((t,o)=>{o===c?t.classList.add("selected"):t.classList.remove("selected")}),g&&v()}function J(){const e=$.querySelector(".result-item.selected");e&&e.scrollIntoView({block:"nearest"})}async function Q(e,t){if(e.badge&&e.badge.startsWith("@")&&e.title.includes("<query>")){const s=e.badge.toLowerCase()+" ";f.value=s,f.focus(),H(s);return}if(e.commandId==="open-clipboard-url"){navigator.clipboard?.readText?navigator.clipboard.readText().then(s=>{const y=M(s);y.startsWith("http://")||y.startsWith("https://")||y.startsWith("chrome://")?chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{...e,url:y,type:"web"},context:"overlay"},()=>{h(`Opening ${y}`),setTimeout(C,400)}):h("Clipboard does not contain a valid URL")}).catch(()=>{h("Clipboard read permission was not granted")}):h("Clipboard API not available");return}const o={shift:t?.shiftKey,alt:t?.altKey,ctrl:t?.ctrlKey||t?.metaKey};chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:e,context:"overlay",modifiers:o},s=>{if(chrome.runtime.lastError){h(`Error: ${chrome.runtime.lastError.message}`);return}if(!s||!s.success){h(s?.message||"Action could not be executed");return}e.type==="command"&&s.message?(h(s.message),setTimeout(C,850)):C()})}function H(e){const t=M(e);if(!t){if(++X,I?.openTabs&&I.openTabs.length>0){l=I.openTabs,c=0,N();return}l=[],c=-1,N();return}const o=++X;chrome.runtime.sendMessage({type:"PORTAL_SEARCH",query:t,context:"overlay"},s=>{if(o===X){if(chrome.runtime.lastError){console.warn("[Portal Overlay] Search message error:",chrome.runtime.lastError.message);return}s&&s.results&&(l=s.results,c=0,N())}})}f.addEventListener("input",()=>{clearTimeout(R),R=setTimeout(()=>{H(f.value)},25)});function se(e){if(g){if(e.key==="Escape"||e.key==="Tab"){e.preventDefault(),e.stopPropagation(),g=!1,v();return}const t=e.key.toUpperCase(),o=l[c];if(o){if(t==="C"&&o.url){e.preventDefault(),g=!1,v(),B(o);return}if(t==="M"&&o.url){e.preventDefault(),g=!1,v(),z(o);return}if(t==="D"&&o.type==="tab"&&o.tabId){e.preventDefault(),g=!1,v(),Y(o);return}if(t==="X"&&o.type==="tab"&&o.tabId){e.preventDefault(),g=!1,v(),G(o);return}if(t==="P"&&o.type==="tab"&&o.tabId){e.preventDefault(),g=!1,v(),K(o);return}if(t==="U"&&o.type==="tab"&&o.tabId){e.preventDefault(),g=!1,v(),W(o);return}}}if(e.key==="Escape"){e.preventDefault(),e.stopPropagation(),C();return}if(e.key==="Tab"||(e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="K")){e.preventDefault(),l.length>0&&c>=0&&(g=!g,v());return}if(e.key==="ArrowDown"){e.preventDefault(),l.length>0&&(c=(c+1)%l.length,Z(),J());return}if(e.key==="ArrowUp"){e.preventDefault(),l.length>0&&(c=(c-1+l.length)%l.length,Z(),J());return}if(e.altKey&&(e.key==="w"||e.key==="W")){e.preventDefault();const t=l[c];t&&t.type==="tab"&&t.tabId&&G(t);return}if(e.altKey&&(e.key==="p"||e.key==="P")){e.preventDefault();const t=l[c];t&&t.type==="tab"&&t.tabId&&K(t);return}if(e.altKey&&(e.key==="u"||e.key==="U")){e.preventDefault();const t=l[c];t&&t.type==="tab"&&t.tabId&&W(t);return}if(e.altKey&&(e.key==="c"||e.key==="C")){e.preventDefault();const t=l[c];t&&t.url&&B(t);return}if(e.altKey&&(e.key==="m"||e.key==="M")){e.preventDefault();const t=l[c];t&&t.url&&z(t);return}if(e.key==="Enter"){e.preventDefault(),clearTimeout(R);const t=M(f.value),o=ee(t);if(o.isUrl&&c<=0){chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{id:`direct-url-${Date.now()}`,type:"web",title:o.displayTitle,url:o.normalizedUrl,score:9999},context:"overlay",modifiers:{ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,alt:e.altKey}},()=>C());return}if(l.length>0&&c>=0&&l[c]){Q(l[c],e);return}if(!t){I?.openTabs&&I.openTabs[0]&&Q(I.openTabs[0],e);return}const s=de(t,I?.preferences.searchEngine);s.targetUrl&&chrome.runtime.sendMessage({type:"PORTAL_EXECUTE_ACTION",item:{id:`sync-intent-${Date.now()}`,type:"web",title:s.displayTitle,url:s.targetUrl,score:5e3},context:"overlay",modifiers:{ctrl:e.ctrlKey||e.metaKey,shift:e.shiftKey,alt:e.altKey}},()=>C());return}}function pe(){chrome.runtime.sendMessage({type:"PORTAL_GET_INITIAL_STATE",context:"overlay"},e=>{if(chrome.runtime.lastError||!e){f.value.trim()&&H(f.value);return}if(I=e,e.shortcutLabel&&(O.textContent=e.shortcutLabel),f.value.trim()){H(f.value);return}e.openTabs&&e.openTabs.length>0&&(l=e.openTabs,c=0,N())})}function F(){f.focus({preventScroll:!0}),f.select()}oe()})()})();
