import { EventEmitter } from 'events';

export interface HookDefinition {
  event: string;
  matcher?: Record<string, unknown>;
  priority?: number;
}

export type HookHandler<TData = Record<string, unknown>> = (
  data: TData,
  context: { sessionId: string; userId?: string }
) => Promise<HookResult>;

export interface HookResult {
  /** Continue execution (exit code 0) */
  continue?: boolean;
  /** Block execution (exit code 2) */
  block?: boolean;
  /** Modified data to pass to next hook/handler */
  modifiedData?: Record<string, unknown>;
  /** Additional context to inject */
  additionalContext?: string;
  /** Notification message to display */
  notification?: string;
  /** Defer tool call for later */
  defer?: { until: string; reason: string };
}

interface HookOptions<TData = Record<string, unknown>> {
  event: string;
  matcher?: Record<string, unknown>;
  priority?: number;
  handler: HookHandler<TData>;
}

/**
 * Hook - Represents a hook that intercepts Grok agent events
 * 
 * Hooks can modify behavior, add context, block actions, or trigger
 * side effects at specific points in the agent lifecycle.
 */
export class Hook<TData = Record<string, unknown>> extends EventEmitter {
  public readonly event: string;
  public readonly matcher?: Record<string, unknown>;
  public readonly priority: number;
  public readonly handler: HookHandler<TData>;

  constructor(options: HookOptions<TData>) {
    super();
    this.event = options.event;
    this.matcher = options.matcher;
    this.priority = options.priority ?? 0;
    this.handler = options.handler;
  }

  /**
   * Execute the hook with the given data
   */
  async execute(data: TData, context: { sessionId: string; userId?: string }): Promise<HookResult> {
    try {
      const result = await this.handler(data, context);
      this.emit('executed', result);
      return result;
    } catch (error) {
      const errorResult: HookResult = {
        block: true,
        notification: `Hook error: ${error instanceof Error ? error.message : String(error)}`
      };
      this.emit('error', error);
      return errorResult;
    }
  }

  /**
   * Check if this hook matches the given event and data
   */
  matches(event: string, data: Record<string, unknown>): boolean {
    if (this.event !== event) {
      return false;
    }

    if (!this.matcher) {
      return true;
    }

    // Simple shallow matching
    for (const [key, value] of Object.entries(this.matcher)) {
      if (data[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the hook definition for registration
   */
  getDefinition(): HookDefinition {
    return {
      event: this.event,
      matcher: this.matcher,
      priority: this.priority
    };
  }
}

/**
 * Create a new Hook instance
 * 
 * @example
 * ```typescript
 * const preEditHook = createHook({
 *   event: 'PreToolUse',
 *   matcher: { toolName: 'write_file' },
 *   priority: 10,
 *   handler: async (data, context) => {
 *     // Check if file is in allowed list
 *     const filePath = data.input?.path;
 *     if (filePath?.includes('.env')) {
 *       return { block: true, notification: 'Cannot modify .env files' };
 *     }
 *     return { continue: true };
 *   }
 * });
 * ```
 */
export function createHook<TData = Record<string, unknown>>(
  options: HookOptions<TData>
): Hook<TData> {
  return new Hook(options);
}

/**
 * Pre-built common hooks
 */
export const builtinHooks = {
  /**
   * Log all session starts
   */
  logSessionStart: createHook({
    event: 'SessionStart',
    priority: 0,
    handler: async (data, context) => {
      console.log(`[Hook] Session started: ${context.sessionId}`);
      return { continue: true };
    }
  }),

  /**
   * Block dangerous commands
   */
  blockDangerousCommands: createHook({
    event: 'PreToolUse',
    matcher: { toolName: 'run_terminal_cmd' },
    priority: 10,
    handler: async (data, context) => {
      const command = (data as { input?: { command?: string } }).input?.command || '';
      const dangerousPatterns = ['rm -rf /', 'DROP TABLE', 'DELETE FROM', '> /etc/'];
      
      for (const pattern of dangerousPatterns) {
        if (command.includes(pattern)) {
          return { 
            block: true, 
            notification: `Blocked dangerous command: ${pattern}` 
          };
        }
      }
      
      return { continue: true };
    }
  }),

  /**
   * Add project context before first message
   */
  addProjectContext: createHook({
    event: 'UserPromptSubmit',
    priority: 5,
    handler: async (data, context) => {
      // Could load CLAUDE.md, AGENTS.md, etc.
      return { 
        continue: true,
        additionalContext: '[Project context would be injected here]'
      };
    }
  }),

  /**
   * Notify on tool failures
   */
  notifyToolFailure: createHook({
    event: 'PostToolUseFailure',
    priority: 0,
    handler: async (data, context) => {
      console.error(`[Hook] Tool failed in session ${context.sessionId}:`, data);
      return { 
        continue: true,
        notification: 'A tool execution failed. Reviewing alternatives...'
      };
    }
  })
};

/**
 * Available hook events matching Grok Build's hook system
 */
export const HookEvents = {
  SessionStart: 'SessionStart',
  SessionEnd: 'SessionEnd',
  Setup: 'Setup',
  InstructionsLoaded: 'InstructionsLoaded',
  UserPromptSubmit: 'UserPromptSubmit',
  UserPromptExpansion: 'UserPromptExpansion',
  MessageDisplay: 'MessageDisplay',
  PreToolUse: 'PreToolUse',
  PostToolUse: 'PostToolUse',
  PostToolUseFailure: 'PostToolUseFailure',
  PostToolBatch: 'PostToolBatch',
  PermissionRequest: 'PermissionRequest',
  PermissionDenied: 'PermissionDenied',
  Notification: 'Notification',
  SubagentStart: 'SubagentStart',
  SubagentStop: 'SubagentStop',
  TaskCreated: 'TaskCreated',
  TaskCompleted: 'TaskCompleted',
  Stop: 'Stop',
  StopFailure: 'StopFailure',
  TeammateIdle: 'TeammateIdle',
  ConfigChange: 'ConfigChange',
  CwdChanged: 'CwdChanged',
  DirectoryAdded: 'DirectoryAdded',
  FileChanged: 'FileChanged',
  WorktreeCreate: 'WorktreeCreate',
  WorktreeRemove: 'WorktreeRemove',
  PreCompact: 'PreCompact',
  PostCompact: 'PostCompact',
  Elicitation: 'Elicitation',
  ElicitationResult: 'ElicitationResult'
} as const;

export type HookEventType = typeof HookEvents[keyof typeof HookEvents];
