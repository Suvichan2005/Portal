# Third-Party Notices & Attribution

This document contains licensing and attribution notices for open-source projects evaluated, referenced, or adapted during the development of Portal.

---

## 1. Arc for Chrome (`albus-flashquotes/arc`)

- **Repository:** https://github.com/albus-flashquotes/arc
- **Pinned Commit:** `f371a08477bac34666585bdbaff8139a3643cc93`
- **License:** MIT License
- **Copyright:** Copyright (c) 2023 albus-flashquotes
- **Attribution & Relationship:**
  - *Adapted Pattern:* Message-first delivery architecture in service worker (`PORTAL_TOGGLE_OVERLAY` via `chrome.tabs.sendMessage` to existing injected tabs, falling back to script injection when content script is absent).
  - *Adapted Pattern:* In-memory bookmark caching with event-driven invalidation via `chrome.bookmarks.onCreated`, `onRemoved`, `onChanged`, `onMoved`.
  - *Independent Implementation:* Portal's Shadow DOM floating palette, styling, multi-source search engine, and action dispatching are independent implementations designed for Chrome Manifest V3.

### License Text:
```text
MIT License

Copyright (c) 2023 albus-flashquotes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. Chikamichi (`kawamataryo/chikamichi`)

- **Repository:** https://github.com/kawamataryo/chikamichi
- **Pinned Commit:** `dced3ad78f485638f64d3af6658a1ca46813b7ee`
- **License:** MIT License
- **Copyright:** Copyright (c) 2022 Ryo Kawamata
- **Attribution & Relationship:**
  - *Adapted Pattern:* Result-specific action items concept (copying standard Markdown links `[title](url)`, copying raw URLs, tab operations like duplicate and close).
  - *Independent Implementation:* In Portal, actions are executed via a custom Action Menu (`Tab` or `Ctrl+K`) and dedicated non-colliding shortcuts, routed through the background service worker authority in pure TypeScript without React or Plasmo runtime overhead.

### License Text:
```text
MIT License

Copyright (c) 2022 Ryo Kawamata

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 3. Chrome Palette (`dbuezas/chrome-palette`)

- **Repository:** https://github.com/dbuezas/chrome-palette
- **Pinned Commit:** `392bd4e7b81c41073ba75bf67c7ee1eb676fb360`
- **License:** MIT License
- **Copyright:** Copyright (c) 2021 Daniel Buezas
- **Attribution & Relationship:**
  - *Adapted Pattern:* Usage-based command recency tracking (`last-used.ts`).
  - *Independent Implementation:* Portal implements 20-entry LRU recency storage in `chrome.storage.local` with in-memory caching and applies a recency scoring boost (+120 points) in its deterministic ranking engine.

### License Text:
```text
MIT License

Copyright (c) 2021 Daniel Buezas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 4. Pounce (`TuYv/pounce`)

- **Repository:** https://github.com/TuYv/pounce
- **Pinned Commit:** `658f014d725c3dee736a19c12a04ed163fada7fd`
- **License:** MIT License
- **Copyright:** Copyright (c) 2023 TuYv
- **Attribution & Relationship:**
  - *Adapted Pattern:* Ergonomic keyboard shortcut hint footer design.
  - *Independent Implementation:* Integrated into Portal's custom Shadow DOM palette and New Tab dropdown footer with CSS custom property tokens.

### License Text:
```text
MIT License

Copyright (c) 2023 TuYv

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 5. Evaluated Projects with Rejected Techniques

- **Tabset NewTab (`tabset/newtab`)**: Evaluated for launchpad layout ideas. Its WebGL/Three.js shader backgrounds and heavy runtime dependencies were rejected to preserve Portal's Core Mandate 1 (ultra-lightweight, native Chrome-speed resource contract).
- **Lumno Extension (`kubai087/lumno-extension`)**: GPL-3.0 copyleft code rejected to maintain clean MIT licensing for Portal.
- **Anori (`OlegWock/anori`)**: AGPL-3.0 strong copyleft code rejected to maintain clean MIT licensing for Portal.
