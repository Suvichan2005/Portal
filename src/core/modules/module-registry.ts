import { ConnectionStatus } from '../types';
import { openClawBridge } from '../bridge/openclaw-bridge';
import { briefingService } from '../intelligence/briefing-service';

export type ModuleId = 'flowmate' | 'placement' | 'agentic_collab' | 'openclaw';

export type WorkspaceLayout = 'focused' | 'daily' | 'studio';

export interface ModuleAction {
  id: string;
  label: string;
  icon?: string;
  commandId?: string;
  url?: string;
}

export interface ModuleItemPreview {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  status?: string;
  url?: string;
  timestamp?: number;
}

export interface ModuleDescriptor {
  id: ModuleId;
  name: string;
  tagline: string;
  category: 'context' | 'career' | 'collaboration' | 'automation';
  icon: string;
  status: ConnectionStatus;
  statusText: string;
  primaryDeepLink?: string;
  actions: ModuleAction[];
  previews: ModuleItemPreview[];
  lastObservedAt?: number;
  isFolded?: boolean;
}

export interface WorkspaceConfig {
  activeLayout: WorkspaceLayout;
  enabledModules: ModuleId[];
}

export class ModuleRegistry {
  /**
   * Retrieves all registered modules with active data projections and truthful status.
   * Probes operational services (such as local OpenClaw gateway) without inventing fake data.
   */
  async getModules(): Promise<ModuleDescriptor[]> {
    const modules: ModuleDescriptor[] = [];

    // 1. Flowmate (Personal Context & Strategic Priorities)
    const briefing = await briefingService.getBriefing();
    const isFlowmateConfigured = briefing.generatedAt > 0 && briefing.topPriorities.length > 0;
    modules.push({
      id: 'flowmate',
      name: 'Flowmate',
      tagline: 'Personal Context & Strategic Priorities',
      category: 'context',
      icon: '🧠',
      status: isFlowmateConfigured ? 'connected' : 'unconfigured',
      statusText: isFlowmateConfigured
        ? `Connected • ${briefing.topPriorities.length} active priorities`
        : 'No local Flowmate endpoint configured. Import context or link bridge.',
      primaryDeepLink: undefined, // Honest: no unverified .local URL
      actions: [
        { id: 'view-briefing', label: 'Morning Briefing', commandId: 'open-briefing-modal' },
        { id: 'import-context', label: 'Import Context', commandId: 'import-briefing-data' },
      ],
      previews: briefing.topPriorities.slice(0, 3).map((p, idx) => ({
        id: `priority-${idx}`,
        title: p.title,
        subtitle: p.summary,
        tag: p.actionRequired ? 'Action Required' : undefined,
      })),
      lastObservedAt: briefing.generatedAt,
    });

    // 2. Placement OS (Career Intelligence & Opportunities)
    modules.push({
      id: 'placement',
      name: 'Placement OS',
      tagline: 'Career Intelligence & Deadlines',
      category: 'career',
      icon: '🎯',
      status: 'unconfigured',
      statusText: 'Placement OS tracker not connected. Deep links ready.',
      primaryDeepLink: undefined, // Honest: no unverified .local URL
      actions: [
        { id: 'view-career', label: 'Opportunity Pipeline', commandId: 'open-placement-view' },
        { id: 'career-deadlines', label: 'Deadlines', commandId: 'view-career-deadlines' },
      ],
      previews: [],
    });

    // 3. AgenticCollab (Cross-Agent Conversation Archive)
    modules.push({
      id: 'agentic_collab',
      name: 'AgenticCollab',
      tagline: 'Cross-Agent Conversation Archive',
      category: 'collaboration',
      icon: '💬',
      status: 'unconfigured',
      statusText: 'Codex-ChatGPT collaboration workspace available at Documents/codex-chatgpt-collab.',
      primaryDeepLink: undefined,
      actions: [
        { id: 'view-archive', label: 'Conversation Archive', commandId: 'open-agent-archive' },
        { id: 'recent-handoffs', label: 'Agent Handoffs', commandId: 'view-agent-handoffs' },
      ],
      previews: [],
    });

    // 4. OpenClaw (Device Orchestration & Execution) - Real Operational Service
    const openClawStatus = await openClawBridge.getStatus();
    const isOpenClawLive = openClawStatus.gatewayState === 'running';
    modules.push({
      id: 'openclaw',
      name: 'OpenClaw',
      tagline: 'Device Orchestration & Execution',
      category: 'automation',
      icon: '⚡',
      status: isOpenClawLive ? 'connected' : 'unconfigured',
      statusText: isOpenClawLive
        ? `Gateway Online (127.0.0.1:${openClawStatus.gatewayPort}) • Coordinator Ready`
        : `Gateway Stopped (127.0.0.1:${openClawStatus.gatewayPort})`,
      primaryDeepLink: `http://127.0.0.1:${openClawStatus.gatewayPort}/`,
      actions: [
        { id: 'open-gateway', label: 'Gateway UI', url: `http://127.0.0.1:${openClawStatus.gatewayPort}/` },
        { id: 'check-nodes', label: 'Device Status', commandId: 'check-openclaw-nodes' },
      ],
      previews: openClawStatus.recentJobs.slice(0, 3).map((j) => ({
        id: j.id,
        title: j.task,
        subtitle: `Node: ${j.host} • ${j.status}`,
        status: j.status,
        timestamp: j.submittedAt,
      })),
      lastObservedAt: openClawStatus.lastObservedAt,
    });

    return modules;
  }

  /**
   * Returns metadata for a specific module by ID.
   */
  async getModule(id: ModuleId): Promise<ModuleDescriptor | undefined> {
    const modules = await this.getModules();
    return modules.find((m) => m.id === id);
  }

  /**
   * Executes a contextual action on a module.
   */
  async executeAction(
    moduleId: ModuleId,
    actionId: string,
  ): Promise<{ success: boolean; message: string; url?: string; commandId?: string }> {
    const mod = await this.getModule(moduleId);
    if (!mod) {
      return { success: false, message: `Module ${moduleId} not found.` };
    }

    const action = mod.actions.find((a) => a.id === actionId);
    if (!action) {
      return { success: false, message: `Action ${actionId} not supported by ${mod.name}.` };
    }

    if (action.url) {
      return { success: true, message: `Opening ${action.label}`, url: action.url };
    }

    if (action.commandId) {
      return { success: true, message: `Executing ${action.label}`, commandId: action.commandId };
    }

    return { success: true, message: `Action ${action.label} ready.` };
  }
}

export const moduleRegistry = new ModuleRegistry();
