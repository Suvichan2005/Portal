import {
  OpenClawSystemStatus,
  OpenClawJobSummary,
  TaskSubmissionResponse,
  TaskExecutionStatus,
} from '../types';
import { storage } from '../storage';
import { CURRENT_SCHEMA_VERSION, migrateOpenClawStatus } from '../migration';

export class OpenClawBridge {
  private readonly defaultGatewayPort = 57849;
  private readonly gatewayBaseUrl = `http://127.0.0.1:${this.defaultGatewayPort}`;

  /**
   * Retrieves the current OpenClaw status projection from local cache.
   * DOES NOT perform any live network probe. Zero overhead on page render.
   */
  async getCachedStatus(): Promise<OpenClawSystemStatus> {
    const raw = await storage.getOpenClawStatus();
    if (!raw) {
      return this.buildDisconnectedStatus('Gateway not yet checked');
    }
    return raw.schemaVersion === CURRENT_SCHEMA_VERSION ? raw : migrateOpenClawStatus(raw);
  }

  /**
   * General getStatus method: returns cached status by default or probes when requested.
   */
  async getStatus(forceProbe = false): Promise<OpenClawSystemStatus> {
    return forceProbe ? this.probeGateway() : this.getCachedStatus();
  }

  /**
   * Performs an explicit live probe of the local OpenClaw Gateway on loopback.
   * Only called on explicit user refresh or when dispatching tasks; NEVER on normal NTP load.
   */
  async probeGateway(timeoutMs = 800): Promise<OpenClawSystemStatus> {
    const now = Date.now();
    let gatewayOnline = false;
    let gatewayDetail = 'Gateway stopped or unreachable';
    let sessionState: 'running' | 'stopped' | 'unknown' = 'unknown';

    try {
      if (typeof fetch !== 'undefined') {
        const resp = await fetch(`${this.gatewayBaseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (resp.ok) {
          gatewayOnline = true;
          gatewayDetail = 'Gateway online on 127.0.0.1:57849';
          try {
            const data = await resp.json();
            if (data?.session === 'running' || data?.ok) {
              sessionState = 'running';
            }
          } catch {
            sessionState = 'running';
          }
        } else {
          gatewayDetail = `Gateway returned HTTP ${resp.status}`;
        }
      }
    } catch {
      gatewayOnline = false;
      gatewayDetail = 'Gateway offline (service stopped)';
    }

    const previous = await this.getCachedStatus();

    const status: OpenClawSystemStatus = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      gatewayState: gatewayOnline ? 'running' : 'stopped',
      gatewayPort: this.defaultGatewayPort,
      agentId: 'A9-T7',
      sessionState: gatewayOnline ? sessionState : 'stopped',
      activeHost: 'ideapad',
      coordinatorNode: {
        id: 'node-ideapad',
        name: 'IdeaPad (Coordinator)',
        host: '127.0.0.1',
        status: gatewayOnline ? 'online' : 'offline',
        role: 'coordinator',
        note: gatewayDetail,
      },
      workstationNode: {
        id: 'node-thinkbook',
        name: 'ThinkBook (Workstation)',
        host: '',
        status: 'unpaired',
        role: 'worker',
        note: 'Unpaired (Requires Tailscale SSH setup)',
      },
      // Retain genuine existing jobs from previous history; NEVER invent fake jobs!
      recentJobs: previous.recentJobs || [],
      lastObservedAt: now,
      lastCachedAt: now,
      status: gatewayOnline ? 'connected' : 'disconnected',
    };

    await storage.saveOpenClawStatus(status);
    return status;
  }

  /**
   * Submits a bounded task request.
   * Strictly verifies actual runner connectivity.
   * If the Gateway is unreachable, fails honestly and rejects the task immediately.
   * NEVER fabricates successful task dispatch or fake job completion.
   */
  async submitTask(task: string, host: 'ideapad' | 'thinkbook' = 'ideapad'): Promise<TaskSubmissionResponse> {
    const trimmed = task.trim();
    const correlationId = `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    if (!trimmed) {
      return {
        success: false,
        status: 'rejected',
        message: 'Task description cannot be empty',
        correlationId,
      };
    }

    if (host === 'thinkbook') {
      return {
        success: false,
        status: 'rejected',
        message: 'ThinkBook workstation is currently unpaired. Pair device via Tailscale SSH before routing tasks.',
        correlationId,
      };
    }

    // 1. Probe local gateway readiness first
    const probe = await this.probeGateway(1000);
    if (probe.gatewayState !== 'running') {
      const errorMsg = 'OpenClaw Gateway is not running on 127.0.0.1:57849. Start with "clawctl gateway-service start".';

      const rejectedJob: OpenClawJobSummary = {
        id: correlationId,
        correlationId,
        task: trimmed,
        host: 'ideapad',
        status: 'rejected',
        submittedAt: Date.now(),
        errorMessage: errorMsg,
      };

      const currentStatus = await this.getCachedStatus();
      await storage.saveOpenClawStatus({
        ...currentStatus,
        recentJobs: [rejectedJob, ...currentStatus.recentJobs.slice(0, 9)],
      });

      return {
        success: false,
        status: 'rejected',
        message: errorMsg,
        correlationId,
        job: rejectedJob,
      };
    }

    // 2. Real dispatch attempt against live Gateway endpoint
    try {
      const resp = await fetch(`${this.gatewayBaseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: trimmed,
          clientCorrelationId: correlationId,
          targetHost: host,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        const message = `Gateway rejected task (HTTP ${resp.status}): ${errorText || 'Endpoint unavailable'}`;

        const failedJob: OpenClawJobSummary = {
          id: correlationId,
          correlationId,
          task: trimmed,
          host,
          status: 'failed',
          submittedAt: Date.now(),
          errorMessage: message,
        };

        const currentStatus = await this.getCachedStatus();
        await storage.saveOpenClawStatus({
          ...currentStatus,
          recentJobs: [failedJob, ...currentStatus.recentJobs.slice(0, 9)],
        });

        return {
          success: false,
          status: 'failed',
          message,
          correlationId,
          job: failedJob,
        };
      }

      const result = await resp.json();
      const runnerJobId = result.jobId || result.id || correlationId;

      const acceptedJob: OpenClawJobSummary = {
        id: runnerJobId,
        correlationId,
        task: trimmed,
        host,
        status: (result.status as TaskExecutionStatus) || 'runner_queued',
        submittedAt: Date.now(),
        startedAt: result.startedAt,
        resultSummary: result.summary,
      };

      const currentStatus = await this.getCachedStatus();
      await storage.saveOpenClawStatus({
        ...currentStatus,
        recentJobs: [acceptedJob, ...currentStatus.recentJobs.slice(0, 9)],
      });

      return {
        success: true,
        status: 'runner_queued',
        message: `Task accepted by OpenClaw runner [${runnerJobId}]`,
        correlationId,
        runnerJobId,
        job: acceptedJob,
      };
    } catch (err: any) {
      const message = `Dispatch network error: ${err.message || 'Connection failed'}`;
      const failedJob: OpenClawJobSummary = {
        id: correlationId,
        correlationId,
        task: trimmed,
        host,
        status: 'failed',
        submittedAt: Date.now(),
        errorMessage: message,
      };

      const currentStatus = await this.getCachedStatus();
      await storage.saveOpenClawStatus({
        ...currentStatus,
        recentJobs: [failedJob, ...currentStatus.recentJobs.slice(0, 9)],
      });

      return {
        success: false,
        status: 'failed',
        message,
        correlationId,
        job: failedJob,
      };
    }
  }

  private buildDisconnectedStatus(note: string): OpenClawSystemStatus {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      gatewayState: 'stopped',
      gatewayPort: this.defaultGatewayPort,
      agentId: 'A9-T7',
      sessionState: 'stopped',
      activeHost: 'ideapad',
      coordinatorNode: {
        id: 'node-ideapad',
        name: 'IdeaPad (Coordinator)',
        host: '127.0.0.1',
        status: 'offline',
        role: 'coordinator',
        note,
      },
      workstationNode: {
        id: 'node-thinkbook',
        name: 'ThinkBook (Workstation)',
        host: '',
        status: 'unpaired',
        role: 'worker',
        note: 'Unpaired (Requires Tailscale SSH setup)',
      },
      recentJobs: [],
      lastObservedAt: 0,
      lastCachedAt: Date.now(),
      status: 'disconnected',
    };
  }
}

export const openClawBridge = new OpenClawBridge();
