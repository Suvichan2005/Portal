# PORTAL & OPENCLAW Device Topology & Execution Architecture

**Document Version:** 1.3.0  
**Date:** 2 November 2026  
**Primary Coordinator:** Windows IdeaPad (Desktop/Laptop)  
**Primary Workstation:** Windows ThinkBook  

---

## 1. Architectural Division of Responsibilities

```mermaid
flowchart TD
    subgraph Browser ["Chrome Browser Interface"]
        Portal["Portal Extension (v1.3.0)\n• Instant NTP (<42ms TTI)\n• Floating Launcher (Alt+Q)\n• Personal Intelligence Surface"]
    end

    subgraph IdeaPadHost ["IdeaPad (Gateway & Local Execution Host)"]
        GWS["OpenClaw Gateway (Port 57849)\n• Loopback bound: 127.0.0.1:57849\n• Isolated Session: Agent A9-T7\n• Runtime: Node.js 24.22.1"]
        LocalCache["Bounded Projections Cache\n• chrome.storage.local\n• Zero live NTP network overhead"]
        FlowmateContext["Flowmate Context Engine\n• Durable Journal & Commitments\n• Canonical Calendar / Task Sync"]
    end

    subgraph ThinkBookHost ["ThinkBook (Primary Workstation & Remote Target)"]
        WorkstationNode["ThinkBook Worker Node\n• Paired via Tailscale Private Tailnet / SSH\n• High-Compute Development Tasks\n• Controlled GUI / Workstation Actions"]
    end

    Portal -->|Local Loopback Probe / Storage| LocalCache
    LocalCache <-->|Async Reconciled Snapshot| FlowmateContext
    Portal -.->|Typed RPC (action.request)| GWS
    GWS -->|Local Low-Risk Tasks| GWS
    GWS -.->|Authenticated Tunnel (Tailscale/SSH)| WorkstationNode
```

### Layer Separation Invariant:
1. **Portal**: Fast browser launcher, search engine, and command palette. It reads local, bounded snapshots (`chrome.storage.local`). Opening a New Tab never invokes an agent, runs a model, or queries external APIs.
2. **Flowmate**: Durable system of record for personal context (Journal, Projects, Goals, Commitments, Google Calendar incremental sync).
3. **OpenClaw**: Autonomous automation coordinator and execution engine.
4. **IdeaPad**: Preferred Gateway host and lightweight runner. Runs the isolated session `A9-T7` with low-prompt execution in a sandboxed directory (`C:\Users\A9-T7\Shared`).
5. **ThinkBook**: Primary workstation, heavy compute node, and remote target. Addressable only through authenticated private transport with controlled permissions.

---

## 2. IdeaPad Host Configuration & Verification

| Property | Measured / Configured Value | Verification Status |
|---|---|---|
| **OS** | Windows 11 Build 26300.9711 (x64) | Verified via `clawctl status` |
| **OpenClaw Version** | 2026.10.9 (commit 8b18b55) | Verified via `openclaw --version` |
| **Agent Identity** | `A9-T7` | Verified |
| **Isolated Session** | `iso:eyJ2ZXJzaW9uIjoxLCJhZ2VudFVzZXJOYW1lIjoiQTktVDci...` | `clawctl setup` [ok] |
| **Runtime Node.js** | Node.js 24.22.1 (isolated) / 24.21.0 | Verified |
| **Shared Working Directory** | `C:\Users\A9-T7\Shared` | Verified |
| **Gateway Binding** | `127.0.0.1:57849` (Loopback only) | Verified via `openclaw gateway status` |
| **Gateway Dashboard** | `http://127.0.0.1:57849/` | Verified |

---

## 3. ThinkBook Workstation Pairing & Remote Access

### Private Transport Options:
1. **Tailscale Private Tailnet (Preferred):**
   - Bind IdeaPad Gateway to Tailscale: `openclaw gateway --tailscale serve` or keep on loopback and expose via Tailscale Serve:
     ```powershell
     tailscale serve --bg 57849 http://127.0.0.1:57849
     ```
   - On ThinkBook: Connect to `https://ideapad.<tailnet>.ts.net` with mutual Tailscale machine authentication.
2. **Encrypted SSH Tunneling (Fallback):**
   - From ThinkBook:
     ```powershell
     ssh -N -L 57849:127.0.0.1:57849 suvan@ideapad.local
     ```
   - ThinkBook browser connects to `http://127.0.0.1:57849/` cleanly.

### Pairing Command on ThinkBook:
```powershell
openclaw node join --gateway ws://ideapad.<tailnet>.ts.net:57849 --name "ThinkBook Workstation"
```

---

## 4. Execution Classes & Safety Policy

| Class | Permissions | Permitted Hosts | Example Operations |
|---|---|---|---|
| **Class 1: Read-Only** | Automated | IdeaPad, ThinkBook | Inspect device status, read briefing, query jobs list, read logs |
| **Class 2: Low-Risk Project Tasks** | Automated within Sandbox | IdeaPad (`A9-T7`), Sandbox | Run tests, build extension bundles, format code, linting |
| **Class 3: Controlled Workstation Actions** | Preauthorized / User Click | ThinkBook, IdeaPad | Open specific URLs in Chrome, launch dev server, restore tab |
| **Class 4: High-Impact Operations** | Requires Explicit Approval | Requires Confirmation | System config changes, code publishing, persistent installs, file deletion |

---

## 5. Security Boundary & Token Invariants

- **Zero Token Leakage:** The OpenClaw Gateway shared token is never bundled in the extension code, injected into content scripts, or exposed to third-party webpages.
- **Loopback Enforcement:** Gateway defaults to `127.0.0.1` loopback binding, inaccessible from public internet.
- **Typed Operations Only:** Portal communicates solely via versioned messages (`PORTAL_GET_INTELLIGENCE_SNAPSHOT`, `PORTAL_SUBMIT_OPENCLAW_ACTION`, `PORTAL_GET_OPENCLAW_STATUS`). No arbitrary shell string execution is exposed to webpages.
