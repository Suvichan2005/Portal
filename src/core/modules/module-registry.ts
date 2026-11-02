import { ConnectionStatus } from '../types';

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
  primaryDeepLink: string;
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
  private static defaultModules: ModuleDescriptor[] = [
    {
      id: 'flowmate',
      name: 'Flowmate',
      tagline: 'Personal Context & Strategic Priorities',
      category: 'context',
      icon: '🧠',
      status: 'unconfigured',
      statusText: 'Unconfigured • Ready to connect',
      primaryDeepLink: 'https://flowmate.local',
      actions: [
        { id: 'view-briefing', label: 'Morning Briefing', commandId: 'open-briefing-modal' },
        { id: 'import-context', label: 'Import Context', commandId: 'import-briefing-data' },
      ],
      previews: [],
    },
    {
      id: 'placement',
      name: 'Placement OS',
      tagline: 'Career Intelligence & Deadlines',
      category: 'career',
      icon: '🎯',
      status: 'unconfigured',
      statusText: 'Unconfigured • Ready to connect',
      primaryDeepLink: 'https://placement.local',
      actions: [
        { id: 'view-career', label: 'Opportunity Pipeline', commandId: 'open-placement-view' },
        { id: 'career-deadlines', label: 'Deadlines', commandId: 'view-career-deadlines' },
      ],
      previews: [],
    },
    {
      id: 'agentic_collab',
      name: 'AgenticCollab',
      tagline: 'Cross-Agent Conversation Archive',
      category: 'collaboration',
      icon: '💬',
      status: 'unconfigured',
      statusText: 'Unconfigured • Ready to connect',
      primaryDeepLink: 'http://localhost:8765',
      actions: [
        { id: 'view-archive', label: 'Conversation Archive', commandId: 'open-agent-archive' },
        { id: 'recent-handoffs', label: 'Agent Handoffs', commandId: 'view-agent-handoffs' },
      ],
      previews: [],
    },
    {
      id: 'openclaw',
      name: 'OpenClaw',
      tagline: 'Device Orchestration & Execution',
      category: 'automation',
      icon: '⚡',
      status: 'unconfigured',
      statusText: 'Gateway Stopped (127.0.0.1:57849)',
      primaryDeepLink: 'http://127.0.0.1:57849/',
      actions: [
        { id: 'open-gateway', label: 'Gateway UI', url: 'http://127.0.0.1:57849/' },
        { id: 'check-nodes', label: 'Device Status', commandId: 'check-openclaw-nodes' },
      ],
      previews: [],
    },
  ];

  /**
   * Retrieves all registered modules with active data projections.
   */
  async getModules(): Promise<ModuleDescriptor[]> {
    return ModuleRegistry.defaultModules.map((m) => ({ ...m }));
  }

  /**
   * Returns metadata for a specific module by ID.
   */
  async getModule(id: ModuleId): Promise<ModuleDescriptor | undefined> {
    return ModuleRegistry.defaultModules.find((m) => m.id === id);
  }
}

export const moduleRegistry = new ModuleRegistry();
