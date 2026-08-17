/**
 * Type definitions for Grok Build SDK
 */

export interface BaseMessage {
  role: string;
  timestamp: number;
}

export interface UserMessage extends BaseMessage {
  role: 'user';
  content: string;
  attachments?: Array<{
    type: 'file' | 'image' | 'symbol';
    path?: string;
    content?: string;
    mimeType?: string;
  }>;
}

export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  content: string;
  thought?: string;
  toolUses?: ToolUse[];
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultMessage extends BaseMessage {
  role: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export type Message = UserMessage | AssistantMessage | ToolUseMessage | ToolResultMessage;

export interface ToolUseMessage extends BaseMessage {
  role: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamingChunk {
  type: 'content' | 'thought' | 'tool_use_start' | 'tool_use_end' | 'error';
  content?: string;
  toolUseId?: string;
  toolName?: string;
  error?: string;
  done?: boolean;
}

export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  model: string;
  permissionMode: string;
  effort: string;
  messageCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  worktree?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnly?: boolean;
    destructive?: boolean;
    idempotent?: boolean;
    openWorld?: boolean;
  };
}

export interface HookEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
}

export interface CostTracking {
  perStep: Array<{
    step: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    timestamp: number;
  }>;
  cumulative: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
}
