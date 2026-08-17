import type { QueryOptions as BaseQueryOptions } from './types';

export interface QueryOptions extends BaseQueryOptions {
  /** Model to use for this query */
  model?: string;
  /** Effort level */
  effort?: 'low' | 'medium' | 'high' | 'max';
  /** Maximum number of turns */
  maxTurns?: number;
  /** Token budget */
  tokenBudget?: number;
  /** Tools to make available */
  tools?: string[];
  /** System prompt override */
  systemPrompt?: string;
}

export interface QueryResult {
  content: string;
  thought?: string;
  toolUses?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: string;
  }>;
  tokenUsage: {
    input: number;
    output: number;
  };
  duration: number;
}

/**
 * Send a single query to Grok and get the response
 * 
 * This is a convenience function for simple one-shot interactions
 * without managing a full session.
 * 
 * @example
 * ```typescript
 * import { query } from '@xai/grok-sdk';
 * 
 * const result = await query('Explain how async/await works in TypeScript', {
 *   model: 'sonnet',
 *   effort: 'medium'
 * });
 * 
 * console.log(result.content);
 * ```
 */
export async function query(
  prompt: string,
  options: QueryOptions = {}
): Promise<QueryResult> {
  const startTime = Date.now();
  
  // This would connect to the Grok backend
  // For now, return a placeholder implementation
  console.warn('query() requires a connected GrokClient - use client.query() instead');
  
  return {
    content: 'Query functionality requires an active Grok connection. Use GrokClient.query() for full functionality.',
    tokenUsage: { input: 0, output: 0 },
    duration: Date.now() - startTime
  };
}

/**
 * Streaming query variant
 * 
 * @example
 * ```typescript
 * import { queryStream } from '@xai/grok-sdk';
 * 
 * const stream = queryStream('Write a hello world program in Python');
 * 
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.content);
 * }
 * ```
 */
export async function* queryStream(
  prompt: string,
  options: QueryOptions = {}
): AsyncGenerator<{ content: string; done: boolean }, void, unknown> {
  console.warn('queryStream() requires a connected GrokClient - use client.query() instead');
  
  yield {
    content: 'Streaming query requires an active Grok connection. Use GrokClient.query() for full functionality.',
    done: true
  };
}
