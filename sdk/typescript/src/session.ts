import { EventEmitter } from 'events';
import type { GrokClient } from './client';
import type { SessionMetadata, Message, CostTracking } from './types';
import type { PermissionMode, EffortLevel, OutputStyle } from './config';

export interface SessionOptions {
  name?: string;
  model?: string;
  permissionMode?: PermissionMode;
  effort?: EffortLevel;
  outputStyle?: OutputStyle;
  worktree?: boolean;
  maxTurns?: number;
  tokenBudget?: number;
}

export interface SessionState {
  status: 'active' | 'paused' | 'completed' | 'failed';
  currentTurn: number;
  messageHistory: Message[];
  pendingToolUses: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  lastActivity: number;
}

/**
 * Session - Represents a single Grok agent session
 * 
 * Provides methods for sending messages, managing tools,
 * tracking costs, and controlling session lifecycle.
 */
export class Session extends EventEmitter {
  private client: GrokClient;
  public readonly id: string;
  public metadata: SessionMetadata;
  public state: SessionState;

  constructor(client: GrokClient, sessionId: string, metadata?: Partial<SessionMetadata>) {
    super();
    this.client = client;
    this.id = sessionId;
    this.metadata = {
      id: sessionId,
      name: metadata?.name || `Session ${sessionId.slice(0, 8)}`,
      createdAt: metadata?.createdAt || new Date().toISOString(),
      updatedAt: metadata?.updatedAt || new Date().toISOString(),
      status: 'active',
      model: metadata?.model || 'default',
      permissionMode: metadata?.permissionMode || 'default',
      effort: metadata?.effort || 'medium',
      messageCount: metadata?.messageCount || 0,
      tokenUsage: metadata?.tokenUsage || { input: 0, output: 0, total: 0 },
      cost: metadata?.cost || 0,
      worktree: metadata?.worktree
    };
    
    this.state = {
      status: 'active',
      currentTurn: 0,
      messageHistory: [],
      pendingToolUses: [],
      lastActivity: Date.now()
    };
  }

  /**
   * Send a message to the session
   */
  async send(prompt: string, options: {
    stream?: boolean;
    attachments?: Array<{ type: string; path?: string; content?: string }>
  } = {}): Promise<Message> {
    const response = await this.client.query(prompt, {
      stream: options.stream
    });
    
    // Process streaming response or get final message
    let fullContent = '';
    for await (const chunk of response) {
      if (chunk.type === 'content' && chunk.content) {
        fullContent += chunk.content;
        this.emit('chunk', chunk);
      }
    }
    
    const message: Message = {
      role: 'assistant',
      content: fullContent,
      timestamp: Date.now()
    };
    
    this.state.messageHistory.push(message);
    this.state.lastActivity = Date.now();
    this.metadata.updatedAt = new Date().toISOString();
    this.metadata.messageCount++;
    
    this.emit('message', message);
    return message;
  }

  /**
   * Get the conversation history
   */
  getHistory(): Message[] {
    return [...this.state.messageHistory];
  }

  /**
   * Clear the conversation history (keeps session alive)
   */
  clearHistory(): void {
    this.state.messageHistory = [];
    this.emit('history_cleared');
  }

  /**
   * Rename the session
   */
  async rename(name: string): Promise<void> {
    this.metadata.name = name;
    this.metadata.updatedAt = new Date().toISOString();
    // TODO: Persist to backend
    this.emit('renamed', name);
  }

  /**
   * Fork this session into a new one
   */
  async fork(options: { name?: string; worktree?: boolean } = {}): Promise<Session> {
    return this.client.forkSession(this.id, options);
  }

  /**
   * Pause the session (stop agent execution)
   */
  pause(): void {
    if (this.state.status !== 'active') {
      throw new Error('Session is not active');
    }
    this.state.status = 'paused';
    this.emit('paused');
  }

  /**
   * Resume a paused session
   */
  resume(): void {
    if (this.state.status !== 'paused') {
      throw new Error('Session is not paused');
    }
    this.state.status = 'active';
    this.emit('resumed');
  }

  /**
   * Stop the session (end agent execution)
   */
  async stop(): Promise<void> {
    this.state.status = 'completed';
    this.metadata.updatedAt = new Date().toISOString();
    // TODO: Signal backend to stop
    this.emit('stopped');
  }

  /**
   * Get cost tracking information
   */
  getCostTracking(): CostTracking {
    return {
      perStep: this.state.messageHistory.map((msg, idx) => ({
        step: idx,
        model: this.metadata.model,
        inputTokens: 0, // TODO: Track per-message tokens
        outputTokens: 0,
        cost: 0,
        timestamp: msg.timestamp
      })),
      cumulative: {
        totalInputTokens: this.metadata.tokenUsage.input,
        totalOutputTokens: this.metadata.tokenUsage.output,
        totalCost: this.metadata.cost
      }
    };
  }

  /**
   * Update session settings
   */
  updateSettings(options: {
    model?: string;
    permissionMode?: PermissionMode;
    effort?: EffortLevel;
    outputStyle?: OutputStyle;
    maxTurns?: number;
    tokenBudget?: number;
  }): void {
    if (options.model) this.metadata.model = options.model;
    if (options.permissionMode) this.metadata.permissionMode = options.permissionMode;
    if (options.effort) this.metadata.effort = options.effort;
    if (options.outputStyle) this.metadata.outputStyle = options.outputStyle as OutputStyle;
    
    this.metadata.updatedAt = new Date().toISOString();
    this.emit('settings_updated', options);
  }

  /**
   * Get session summary
   */
  getSummary(): {
    id: string;
    name: string;
    status: string;
    messageCount: number;
    tokenUsage: { input: number; output: number; total: number };
    cost: number;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.id,
      name: this.metadata.name,
      status: this.state.status,
      messageCount: this.metadata.messageCount,
      tokenUsage: this.metadata.tokenUsage,
      cost: this.metadata.cost,
      createdAt: this.metadata.createdAt,
      updatedAt: this.metadata.updatedAt
    };
  }
}
