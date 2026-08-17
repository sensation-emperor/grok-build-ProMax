import { z } from 'zod';

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

export type ToolHandler<TInput = Record<string, unknown>> = (
  input: TInput,
  context: { sessionId: string; userId?: string }
) => Promise<string | { content: string; isError?: boolean }>;

interface ToolOptions<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  handler: ToolHandler<TInput>;
  annotations?: {
    readOnly?: boolean;
    destructive?: boolean;
    idempotent?: boolean;
    openWorld?: boolean;
  };
}

/**
 * Tool - Represents a custom tool that can be used by Grok agents
 * 
 * Tools extend the agent's capabilities with custom functionality.
 * They can read/write files, execute commands, call APIs, etc.
 */
export class Tool<TInput = Record<string, unknown>> {
  public readonly name: string;
  public readonly description: string;
  public readonly inputSchema: z.ZodType<TInput>;
  public readonly handler: ToolHandler<TInput>;
  public readonly annotations: {
    readOnly?: boolean;
    destructive?: boolean;
    idempotent?: boolean;
    openWorld?: boolean;
  };

  constructor(options: ToolOptions<TInput>) {
    this.name = options.name;
    this.description = options.description;
    this.inputSchema = options.inputSchema;
    this.handler = options.handler;
    this.annotations = options.annotations || {};
  }

  /**
   * Get the JSON Schema representation of the input schema
   */
  toJsonSchema(): Record<string, unknown> {
    // Convert Zod schema to JSON Schema
    return z.toJSONSchema(this.inputSchema);
  }

  /**
   * Validate input against the schema
   */
  validate(input: unknown): TInput {
    return this.inputSchema.parse(input);
  }

  /**
   * Execute the tool with the given input
   */
  async execute(input: unknown, context: { sessionId: string; userId?: string }): Promise<{ content: string; isError?: boolean }> {
    const validatedInput = this.validate(input);
    const result = await this.handler(validatedInput, context);
    
    if (typeof result === 'string') {
      return { content: result };
    }
    
    return result;
  }

  /**
   * Get the tool definition for registration
   */
  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.toJsonSchema(),
      annotations: this.annotations
    };
  }
}

/**
 * Create a new Tool instance
 * 
 * @example
 * ```typescript
 * const readFileTool = createTool({
 *   name: 'read_file',
 *   description: 'Read contents of a file',
 *   inputSchema: z.object({
 *     path: z.string().describe('Path to the file'),
 *     lines: z.number().optional().describe('Number of lines to read')
 *   }),
 *   handler: async (input) => {
 *     const content = await fs.readFile(input.path, 'utf-8');
 *     return content;
 *   },
 *   annotations: { readOnly: true }
 * });
 * ```
 */
export function createTool<TInput = Record<string, unknown>>(
  options: ToolOptions<TInput>
): Tool<TInput> {
  return new Tool(options);
}

/**
 * Pre-built common tools
 */
export const builtinTools = {
  /**
   * Read a file from the filesystem
   */
  readFile: createTool({
    name: 'read_file',
    description: 'Read the contents of a file at the specified path',
    inputSchema: z.object({
      path: z.string().describe('Absolute or relative path to the file'),
      startLine: z.number().optional().describe('Starting line number (1-indexed)'),
      endLine: z.number().optional().describe('Ending line number (inclusive)')
    }),
    handler: async (input) => {
      // Implementation would use the Grok backend's file reading
      return `File reading not implemented in SDK - use native read_file tool`;
    },
    annotations: { readOnly: true }
  }),

  /**
   * Write content to a file
   */
  writeFile: createTool({
    name: 'write_file',
    description: 'Write content to a file, creating it if it doesn\'t exist',
    inputSchema: z.object({
      path: z.string().describe('Path to the file'),
      content: z.string().describe('Content to write'),
      append: z.boolean().optional().describe('Append to existing file instead of overwriting')
    }),
    handler: async (input) => {
      return `File writing not implemented in SDK - use native write_file tool`;
    },
    annotations: { destructive: true }
  }),

  /**
   * Execute a shell command
   */
  runCommand: createTool({
    name: 'run_command',
    description: 'Execute a shell command and return its output',
    inputSchema: z.object({
      command: z.string().describe('The command to execute'),
      cwd: z.string().optional().describe('Working directory for the command'),
      timeout: z.number().optional().describe('Timeout in milliseconds')
    }),
    handler: async (input) => {
      return `Command execution not implemented in SDK - use native run_terminal_cmd tool`;
    },
    annotations: { openWorld: true }
  })
};
