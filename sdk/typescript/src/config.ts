/**
 * Configuration types for Grok Build SDK
 */

export type PermissionMode = 
  | 'default'      // Ask per action
  | 'acceptEdits'  // Auto-approve file edits only
  | 'plan'         // No side effects until plan approved
  | 'auto'         // Safety classifier decides
  | 'dontAsk'      // Only pre-approved tools run
  | 'bypassPermissions'; // Skip all checks (power user/CI mode)

export type EffortLevel =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';

export type OutputStyle =
  | 'concise'       // Brief, direct responses
  | 'explanatory'   // Detailed explanations
  | 'learning'      // Educational with concepts
  | 'executive'     // Summary-focused
  | 'custom';       // User-defined

export type ModelAlias =
  | 'default'       // Organization default
  | 'fast'          // Latency-optimized
  | 'opus'          // Most capable
  | 'opusplan'      // Optimized for planning
  | 'sonnet'        // Balanced
  | 'haiku'         // Fast, cheap
  | string;         // Custom model ID

export interface GrokConfig {
  model: ModelAlias;
  permissionMode: PermissionMode;
  effort: EffortLevel;
  outputStyle: OutputStyle;
  maxTurns?: number;
  tokenBudget?: number;
  costCap?: number;
  contextWindow?: number;
  autoCompact?: boolean;
  compactThreshold?: number;
}

export interface ManagedSettings {
  allowedModels: ModelAlias[];
  maxEffort: EffortLevel;
  requiredPermissionMode?: PermissionMode;
  blockedTools: string[];
  allowedDirectories: string[];
  blockedDirectories: string[];
  networkAllowlist: string[];
  mcpServersAllowed: string[];
  dataRetentionDays: number;
  zeroDataRetention: boolean;
}
