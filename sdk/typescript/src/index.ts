/**
 * Grok Build TypeScript SDK
 * 
 * Build custom agents on the same core as Grok Build.
 * Supports streaming queries, custom tools, hooks, and session management.
 */

export { GrokClient, type GrokClientOptions } from './client';
export { Session, type SessionOptions, type SessionState } from './session';
export { Tool, type ToolDefinition, type ToolHandler, createTool } from './tool';
export { Hook, type HookDefinition, type HookHandler, createHook } from './hook';
export { createMcpServer, type McpServerOptions } from './mcp-server';
export { query, type QueryOptions, type QueryResult } from './query';
export { 
  type Message,
  type UserMessage,
  type AssistantMessage,
  type ToolUseMessage,
  type ToolResultMessage,
  type StreamingChunk
} from './types';
export {
  type PermissionMode,
  type EffortLevel,
  type OutputStyle,
  type ModelAlias
} from './config';
