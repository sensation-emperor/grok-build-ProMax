import { EventEmitter } from 'events';

export interface McpServerOptions {
  name: string;
  version: string;
  description?: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read: () => Promise<string | Buffer>;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  render: (args: Record<string, string>) => Promise<{
    role: string;
    content: { type: string; text?: string; image?: string }[];
  }>;
}

/**
 * Create an MCP server for exposing tools/resources to Grok
 */
export function createMcpServer(options: McpServerOptions) {
  const emitter = new EventEmitter();
  const tools: Map<string, McpTool> = new Map();
  const resources: Map<string, McpResource> = new Map();
  const prompts: Map<string, McpPrompt> = new Map();

  return {
    /**
     * Register a tool with the MCP server
     */
    registerTool(tool: McpTool) {
      tools.set(tool.name, tool);
      emitter.emit('tool:registered', tool);
      return this;
    },

    /**
     * Register a resource with the MCP server
     */
    registerResource(resource: McpResource) {
      resources.set(resource.uri, resource);
      emitter.emit('resource:registered', resource);
      return this;
    },

    /**
     * Register a prompt with the MCP server
     */
    registerPrompt(prompt: McpPrompt) {
      prompts.set(prompt.name, prompt);
      emitter.emit('prompt:registered', prompt);
      return this;
    },

    /**
     * Get all registered tools
     */
    listTools(): McpTool[] {
      return Array.from(tools.values());
    },

    /**
     * Get all registered resources
     */
    listResources(): McpResource[] {
      return Array.from(resources.values());
    },

    /**
     * Get all registered prompts
     */
    listPrompts(): McpPrompt[] {
      return Array.from(prompts.values());
    },

    /**
     * Call a registered tool
     */
    async callTool(name: string, input: Record<string, unknown>) {
      const tool = tools.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
      
      emitter.emit('tool:called', { name, input });
      const result = await tool.handler(input);
      emitter.emit('tool:result', { name, input, result });
      
      return result;
    },

    /**
     * Read a registered resource
     */
    async readResource(uri: string) {
      const resource = resources.get(uri);
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }
      
      emitter.emit('resource:read', uri);
      return await resource.read();
    },

    /**
     * Render a registered prompt
     */
    async renderPrompt(name: string, args: Record<string, string>) {
      const prompt = prompts.get(name);
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`);
      }
      
      emitter.emit('prompt:rendered', { name, args });
      return await prompt.render(args);
    },

    /**
     * Get the server info
     */
    getInfo() {
      return {
        name: options.name,
        version: options.version,
        description: options.description,
        tools: tools.size,
        resources: resources.size,
        prompts: prompts.size
      };
    },

    /**
     * Event handling
     */
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    once: emitter.once.bind(emitter)
  };
}

/**
 * Example: Create a simple file system MCP server
 * 
 * @example
 * ```typescript
 * const fsServer = createMcpServer({
 *   name: 'filesystem',
 *   version: '1.0.0',
 *   description: 'File system operations'
 * });
 * 
 * fsServer.registerTool({
 *   name: 'list_directory',
 *   description: 'List contents of a directory',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       path: { type: 'string' }
 *     },
 *     required: ['path']
 *   },
 *   handler: async (input) => {
 *     const entries = await fs.readdir(input.path as string);
 *     return { entries };
 *   }
 * });
 * ```
 */
