(function(){"use strict";function y(d,t){const n=d.toLowerCase().trim(),e=t.toLowerCase().trim();if(!n||!e)return{score:0,matched:!1,isExact:!1,isPrefix:!1};if(n===e)return{score:1e3,matched:!0,isExact:!0,isPrefix:!0};if(e.startsWith(n))return{score:600+n.length/e.length*100,matched:!0,isExact:!1,isPrefix:!0};const r=e.split(/[\s\-_\.:/]+/);for(let f=0;f<r.length;f++)if(r[f].startsWith(n))return{score:450-f*15,matched:!0,isExact:!1,isPrefix:!0};const c=e.indexOf(n);if(c!==-1)return{score:300-Math.min(c*5,100),matched:!0,isExact:!1,isPrefix:!1};let w=0,b=0;for(let f=0;f<e.length&&w<n.length;f++)e[f]===n[w]&&(w++,b++);return b===n.length&&n.length>=2?{score:120+n.length/e.length*50,matched:!0,isExact:!1,isPrefix:!1}:{score:0,matched:!1,isExact:!1,isPrefix:!1}}function _(d){if(!d)return 0;const t=(Date.now()-d)/(1e3*60*60*24);return t<0?50:Math.round(80*Math.pow(.5,t/5))}function B(d){return!d||d<=0?0:Math.min(80,Math.round(Math.log2(d+1)*18))}const N={theme:"system",searchEngine:"google",maxSuggestions:8,showRecentTabs:!0,showIntelligentShortcuts:!0,reducedMotion:!1},a={PREFERENCES:"portal_preferences",PINNED:"portal_pinned_shortcuts",DISMISSED:"portal_dismissed_items",ALIASES:"portal_custom_aliases",INTELLIGENCE:"portal_cached_intelligence"};class q{isExtensionEnvironment(){return typeof chrome<"u"&&!!chrome.storage&&!!chrome.storage.local}async getPreferences(){if(this.isExtensionEnvironment())return new Promise(t=>{chrome.storage.local.get([a.PREFERENCES],n=>{t({...N,...n[a.PREFERENCES]||{}})})});try{const t=localStorage.getItem(a.PREFERENCES);return t?{...N,...JSON.parse(t)}:N}catch{return N}}async savePreferences(t){const e={...await this.getPreferences(),...t};return this.isExtensionEnvironment()?new Promise(r=>{chrome.storage.local.set({[a.PREFERENCES]:e},()=>r(e))}):(localStorage.setItem(a.PREFERENCES,JSON.stringify(e)),e)}async getPinnedShortcuts(){if(this.isExtensionEnvironment())return new Promise(t=>{chrome.storage.local.get([a.PINNED],n=>{t(n[a.PINNED]||[])})});try{const t=localStorage.getItem(a.PINNED);return t?JSON.parse(t):[]}catch{return[]}}async pinShortcut(t){const n=await this.getPinnedShortcuts(),e=n.findIndex(w=>w.url===t.url||w.id===t.id),r={...t,addedAt:Date.now()};let c;return e>=0?(c=[...n],c[e]=r):c=[r,...n],c=c.slice(0,24),this.isExtensionEnvironment()?await new Promise(w=>{chrome.storage.local.set({[a.PINNED]:c},()=>w())}):localStorage.setItem(a.PINNED,JSON.stringify(c)),c}async unpinShortcut(t){const e=(await this.getPinnedShortcuts()).filter(r=>r.id!==t&&r.url!==t);return this.isExtensionEnvironment()?await new Promise(r=>{chrome.storage.local.set({[a.PINNED]:e},()=>r())}):localStorage.setItem(a.PINNED,JSON.stringify(e)),e}async getDismissedItems(){if(this.isExtensionEnvironment())return new Promise(t=>{chrome.storage.local.get([a.DISMISSED],n=>{t(n[a.DISMISSED]||[])})});try{const t=localStorage.getItem(a.DISMISSED);return t?JSON.parse(t):[]}catch{return[]}}async dismissItem(t){const n=await this.getDismissedItems(),e=t.toLowerCase().trim();if(n.some(c=>c.urlOrDomain===e))return n;const r=[{urlOrDomain:e,dismissedAt:Date.now()},...n].slice(0,100);return this.isExtensionEnvironment()?await new Promise(c=>{chrome.storage.local.set({[a.DISMISSED]:r},()=>c())}):localStorage.setItem(a.DISMISSED,JSON.stringify(r)),r}async isDismissed(t){const n=await this.getDismissedItems(),e=t.toLowerCase().trim();try{const r=new URL(t).hostname.toLowerCase();return n.some(c=>c.urlOrDomain===e||c.urlOrDomain===r)}catch{return n.some(r=>r.urlOrDomain===e)}}async getAliases(){if(this.isExtensionEnvironment())return new Promise(t=>{chrome.storage.local.get([a.ALIASES],n=>{t(n[a.ALIASES]||[])})});try{const t=localStorage.getItem(a.ALIASES);return t?JSON.parse(t):[]}catch{return[]}}async saveAlias(t){const e=(await this.getAliases()).filter(c=>c.keyword.toLowerCase()!==t.keyword.toLowerCase()),r=[t,...e].slice(0,50);return this.isExtensionEnvironment()?await new Promise(c=>{chrome.storage.local.set({[a.ALIASES]:r},()=>c())}):localStorage.setItem(a.ALIASES,JSON.stringify(r)),r}async getIntelligence(){if(this.isExtensionEnvironment())return new Promise(t=>{chrome.storage.local.get([a.INTELLIGENCE],n=>{t(n[a.INTELLIGENCE]||null)})});try{const t=localStorage.getItem(a.INTELLIGENCE);return t?JSON.parse(t):null}catch{return null}}async saveIntelligence(t){if(this.isExtensionEnvironment())return new Promise(n=>{chrome.storage.local.set({[a.INTELLIGENCE]:t},()=>n())});localStorage.setItem(a.INTELLIGENCE,JSON.stringify(t))}async clearDerivedData(){if(this.isExtensionEnvironment())return new Promise(t=>{chrome.storage.local.remove([a.INTELLIGENCE,a.DISMISSED],()=>t())});localStorage.removeItem(a.INTELLIGENCE),localStorage.removeItem(a.DISMISSED)}}const v=new q,T=[{id:"close-duplicates",title:"Close Duplicate Tabs",description:"Find and close duplicate tabs across all open windows",category:"tabs",keywords:["close","duplicate","dedupe","clean","tabs","memory"],execute:async()=>{if(typeof chrome>"u"||!chrome.tabs)return;const d=await chrome.tabs.query({}),t=new Set,n=[];for(const e of d)!e.url||!e.id||(t.has(e.url)?n.push(e.id):t.add(e.url));n.length>0&&await chrome.tabs.remove(n)}},{id:"restore-closed-tab",title:"Restore Closed Tab",description:"Reopen the most recently closed tab or window",category:"tabs",keywords:["restore","reopen","undo","closed","tab"],execute:async()=>{if(typeof chrome>"u"||!chrome.sessions)return;const d=await chrome.sessions.getRecentlyClosed({maxResults:1});if(d.length>0){const t=d[0];t.tab?.sessionId?await chrome.sessions.restore(t.tab.sessionId):t.window?.sessionId&&await chrome.sessions.restore(t.window.sessionId)}}},{id:"new-incognito-window",title:"New Incognito Window",description:"Open a private browsing window",category:"navigation",keywords:["incognito","private","secret","window","new"],execute:async()=>{typeof chrome>"u"||!chrome.windows||await chrome.windows.create({incognito:!0})}},{id:"open-chrome-bookmarks",title:"Open Bookmarks Manager",description:"Manage all saved bookmarks and folders",category:"navigation",keywords:["bookmarks","star","saved","manager","folder"],execute:async()=>{typeof chrome<"u"&&chrome.tabs?await chrome.tabs.create({url:"chrome://bookmarks"}):window.open("chrome://bookmarks","_blank")}},{id:"open-chrome-history",title:"Open History",description:"View full browsing history",category:"history",keywords:["history","recent","visited","log"],execute:async()=>{typeof chrome<"u"&&chrome.tabs?await chrome.tabs.create({url:"chrome://history"}):window.open("chrome://history","_blank")}},{id:"open-chrome-downloads",title:"Open Downloads",description:"View downloaded files and status",category:"navigation",keywords:["downloads","files","saved"],execute:async()=>{typeof chrome<"u"&&chrome.tabs?await chrome.tabs.create({url:"chrome://downloads"}):window.open("chrome://downloads","_blank")}},{id:"open-chrome-extensions",title:"Manage Extensions",description:"Open Chrome extension settings and permissions",category:"settings",keywords:["extensions","plugins","addons","manage"],execute:async()=>{typeof chrome<"u"&&chrome.tabs?await chrome.tabs.create({url:"chrome://extensions"}):window.open("chrome://extensions","_blank")}},{id:"open-chrome-settings",title:"Chrome Settings",description:"Open browser preferences and configuration",category:"settings",keywords:["settings","preferences","config","options"],execute:async()=>{typeof chrome<"u"&&chrome.tabs?await chrome.tabs.create({url:"chrome://settings"}):window.open("chrome://settings","_blank")}},{id:"toggle-theme",title:"Toggle Theme",description:"Switch between light, dark, and system theme",category:"settings",keywords:["theme","dark","light","mode","color","toggle"],execute:async()=>{const d=await v.getPreferences(),t=d.theme==="dark"?"light":d.theme==="light"?"system":"dark";await v.savePreferences({theme:t}),document.documentElement.setAttribute("data-theme",t)}},{id:"clear-ai-cache",title:"Clear Recommendation & AI Cache",description:"Remove cached browsing recommendations and start fresh",category:"settings",keywords:["clear","cache","ai","recommendations","reset","privacy"],execute:async()=>{await v.clearDerivedData(),window.location.reload()}}],k={search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',tab:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',bookmark:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',command:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',globe:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'};function S(d){if(!d)return"";try{const t=new URL(d);return t.protocol.startsWith("chrome")?"":typeof chrome<"u"&&chrome.runtime?.getURL?`chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(d)}&size=32`:`https://www.google.com/s2/favicons?domain=${encodeURIComponent(t.hostname)}&sz=32`}catch{return""}}class G{isExt(){return typeof chrome<"u"&&!!chrome.tabs}normalizeUrl(t){try{const n=new URL(t);let e=n.pathname;return e.length>1&&e.endsWith("/")&&(e=e.slice(0,-1)),`${n.protocol}//${n.host}${e}${n.search}`.toLowerCase()}catch{return t.toLowerCase().trim()}}isDirectUrl(t){const n=t.trim();return n.includes(" ")||n.length<3?!1:n.startsWith("http://")||n.startsWith("https://")||n.startsWith("localhost:")?!0:/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(n)}async search(t,n){const e=t.trim(),r=new Map,c=await v.getAliases();for(const s of c)if(s.keyword.toLowerCase()===e.toLowerCase()){const o=this.normalizeUrl(s.destinationUrl);r.set(o,{id:`alias-${s.keyword}`,type:"shortcut",title:s.title||s.keyword,url:s.destinationUrl,description:`Custom alias: ${s.keyword} → ${s.destinationUrl}`,favicon:S(s.destinationUrl),score:2500,badge:"ALIAS",pinned:!0})}if(this.isDirectUrl(e)){const s=e.startsWith("http://")||e.startsWith("https://")?e:`https://${e}`,o=this.normalizeUrl(s);r.has(o)||r.set(o,{id:`direct-url-${o}`,type:"web",title:`Go to ${e}`,url:s,description:s,favicon:S(s),score:1800,badge:"VISIT"})}for(const s of T){const o=y(e,s.title),m=y(e,s.description);let u=0;for(const l of s.keywords){const h=y(e,l);h.matched&&(u=Math.max(u,h.score))}const g=Math.max(o.score,m.score*.7,u);(g>100||!e)&&r.set(`cmd-${s.id}`,{id:`cmd-${s.id}`,type:"command",title:s.title,description:s.description,score:g>0?g+100:50,commandId:s.id,badge:"COMMAND"})}if(this.isExt()&&chrome.tabs)try{const s=await chrome.tabs.query({});for(const o of s){if(!o.url||o.url.startsWith("chrome://newtab"))continue;const m=this.normalizeUrl(o.url),u=y(e,o.title||""),g=y(e,o.url),l=Math.max(u.score,g.score*.8);if(l>0||!e){const h=l+250,p=r.get(m);!p||p.score<h?r.set(m,{id:`tab-${o.id}`,type:"tab",title:o.title||o.url,url:o.url,description:`Open tab • ${new URL(o.url).hostname}`,favicon:o.favIconUrl||S(o.url),score:h,tabId:o.id,windowId:o.windowId,badge:"SWITCH TAB"}):p&&(p.badge="OPEN TAB",p.tabId=o.id,p.windowId=o.windowId)}}}catch(s){console.warn("Error querying tabs:",s)}if(this.isExt()&&chrome.bookmarks)try{const s=await new Promise(o=>{e?chrome.bookmarks.search(e,o):chrome.bookmarks.getRecent(15,o)});for(const o of s){if(!o.url)continue;const m=this.normalizeUrl(o.url),u=y(e,o.title),g=y(e,o.url),l=Math.max(u.score,g.score*.8);if(l>0||!e){const h=l+120,p=r.get(m);p?p.badge=p.badge?`${p.badge} • STARRED`:"BOOKMARK":r.set(m,{id:`bm-${o.id}`,type:"bookmark",title:o.title||o.url,url:o.url,description:`Bookmark • ${new URL(o.url).hostname}`,favicon:S(o.url),score:h,badge:"BOOKMARK"})}}}catch(s){console.warn("Error querying bookmarks:",s)}if(this.isExt()&&chrome.history)try{const s=await new Promise(o=>{chrome.history.search({text:e,maxResults:25,startTime:Date.now()-2592e6},o)});for(const o of s){if(!o.url)continue;const m=this.normalizeUrl(o.url);if(await v.isDismissed(m))continue;const u=y(e,o.title||""),g=y(e,o.url),l=Math.max(u.score,g.score*.7),h=_(o.lastVisitTime),p=B(o.visitCount),M=l+h+p;r.get(m)||r.set(m,{id:`hist-${o.id||m}`,type:"history",title:o.title||o.url,url:o.url,description:new URL(o.url).hostname,favicon:S(o.url),score:M,lastVisitTime:o.lastVisitTime,visitCount:o.visitCount})}}catch(s){console.warn("Error querying history:",s)}const w=await v.getPinnedShortcuts();for(const s of w){const o=this.normalizeUrl(s.url),m=y(e,s.customTitle||s.title),u=y(e,s.url),g=Math.max(m.score,u.score);if(g>0||!e){const l=r.get(o);l?(l.pinned=!0,l.score+=200):r.set(o,{id:`pin-${s.id}`,type:"shortcut",title:s.customTitle||s.title,url:s.url,description:new URL(s.url).hostname,favicon:S(s.url),score:g+300,pinned:!0,badge:"PINNED"})}}if(e.length>0){const s=n.searchEngine||"google",o=s==="duckduckgo"?`https://duckduckgo.com/?q=${encodeURIComponent(e)}`:s==="bing"?`https://www.bing.com/search?q=${encodeURIComponent(e)}`:`https://www.google.com/search?q=${encodeURIComponent(e)}`;r.set("web-search-fallback",{id:"web-search-fallback",type:"web",title:`Search ${s==="duckduckgo"?"DuckDuckGo":s==="bing"?"Bing":"Google"} for "${e}"`,url:o,description:"Web Search intent • Enter to search",score:50,badge:"SEARCH"})}const b=Array.from(r.values()).sort((s,o)=>o.score-s.score),f=n.maxSuggestions||8;return b.slice(0,f)}}const W=new G;(function(){const t="portal-floating-launcher-root",n=document.getElementById(t);if(n){n.remove();return}const e=document.activeElement,r=document.createElement("div");r.id=t,r.style.position="fixed",r.style.top="0",r.style.left="0",r.style.width="100vw",r.style.height="100vh",r.style.zIndex="2147483647",r.style.pointerEvents="auto";const c=r.attachShadow({mode:"open"}),w=document.createElement("style");w.textContent=`
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
  `,c.appendChild(w);const b=document.createElement("div");b.className="scrim";const f=document.createElement("div");f.className="modal";const s=document.createElement("div");s.className="search-row";const o=document.createElement("div");o.className="search-icon",o.innerHTML=k.search;const m=document.createElement("input");m.type="text",m.placeholder="Search tabs, bookmarks, history, or commands...",m.autocomplete="off",m.spellcheck=!1,s.appendChild(o),s.appendChild(m);const u=document.createElement("ul");u.className="results-list";const g=document.createElement("div");g.className="footer",g.innerHTML=`
    <div class="shortcuts">
      <span><span class="kbd">↑↓</span> Navigate</span>
      <span><span class="kbd">↵</span> Select</span>
      <span><span class="kbd">Esc</span> Close</span>
    </div>
    <div>Portal Launcher</div>
  `,f.appendChild(s),f.appendChild(u),f.appendChild(g),b.appendChild(f),c.appendChild(b),document.body.appendChild(r);let l=[],h=0;function p(){window.removeEventListener("keydown",z,!0),r.remove(),e&&typeof e.focus=="function"&&e.focus()}b.addEventListener("click",i=>{i.target===b&&p()});function M(){if(u.innerHTML="",l.length===0){const i=document.createElement("li");i.style.padding="18px",i.style.textAlign="center",i.style.color="#71717a",i.style.fontSize="13px",i.textContent="No matching destinations or commands",u.appendChild(i);return}l.forEach((i,E)=>{const x=document.createElement("li");x.className=`result-item ${E===h?"selected":""}`;const C=document.createElement("div");if(C.className="item-icon",i.favicon){const I=document.createElement("img");I.src=i.favicon,I.onerror=()=>{C.innerHTML=i.type==="tab"?k.tab:i.type==="bookmark"?k.bookmark:k.globe},C.appendChild(I)}else C.innerHTML=i.type==="tab"?k.tab:i.type==="bookmark"?k.bookmark:i.type==="command"?k.command:k.globe;const L=document.createElement("div");L.className="item-info";const R=document.createElement("div");R.className="item-title",R.textContent=i.title;const A=document.createElement("div");if(A.className="item-desc",A.textContent=i.description||i.url||"",L.appendChild(R),L.appendChild(A),x.appendChild(C),x.appendChild(L),i.badge){const I=document.createElement("span");I.className="item-badge",I.textContent=i.badge,x.appendChild(I)}x.addEventListener("click",()=>O(i)),x.addEventListener("mouseenter",()=>{h=E,D()}),u.appendChild(x)}),P()}function D(){u.querySelectorAll(".result-item").forEach((E,x)=>{x===h?E.classList.add("selected"):E.classList.remove("selected")})}function P(){const i=u.querySelector(".result-item.selected");i&&i.scrollIntoView({block:"nearest"})}async function O(i){if(p(),i.type==="command"&&i.commandId){const E=T.find(x=>x.id===i.commandId);E&&await E.execute();return}if(i.type==="tab"&&i.tabId){chrome.runtime.sendMessage({action:"switch-tab",tabId:i.tabId,windowId:i.windowId});return}i.url&&(window.location.href=i.url)}let U=null;async function $(i){const E=await v.getPreferences();l=await W.search(i,E),h=0,M()}m.addEventListener("input",()=>{clearTimeout(U),U=setTimeout(()=>{$(m.value)},40)});function z(i){if(i.key==="Escape"){i.preventDefault(),i.stopPropagation(),p();return}if(i.key==="ArrowDown"){i.preventDefault(),l.length>0&&(h=(h+1)%l.length,D(),P());return}if(i.key==="ArrowUp"){i.preventDefault(),l.length>0&&(h=(h-1+l.length)%l.length,D(),P());return}if(i.key==="Enter"){i.preventDefault(),l[h]&&O(l[h]);return}}window.addEventListener("keydown",z,!0),$(""),setTimeout(()=>m.focus(),20)})()})();
