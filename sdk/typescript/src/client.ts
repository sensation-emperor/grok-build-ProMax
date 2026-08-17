import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import fetch from 'node-fetch';
import { z } from 'zod';

import type { 
  Message, 
  UserMessage, 
  AssistantMessage, 
  ToolUseMessage, 
  ToolResultMessage,
  StreamingChunk 
} from './types';
import type { PermissionMode, EffortLevel, OutputStyle, ModelAlias } from './config';
import { Session } from './session';

export interface GrokClientOptions {
  /** Path to grok binary (default: 'grok') */
  binaryPath?: string;
  /** API key for cloud sessions */
  apiKey?: string;
  /** Base URL for cloud API */
  baseUrl?: string;
  /** Default model to use */
  model?: ModelAlias;
  /** Default permission mode */
  permissionMode?: PermissionMode;
  /** Default effort level */
  effort?: EffortLevel;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Connection timeout in ms */
  timeout?: number;
  /** Custom environment variables */
  env?: Record<string, string>;
}

interface ClientState {
  connected: boolean;
  sessionId?: string;
  messageCount: number;
  tokenUsage: { input: number; output: number };
}

/**
 * GrokClient - Main client for interacting with Grok Build
 * 
 * Supports both local CLI and cloud API connections.
 * Can spawn local grok processes or connect to remote sessions.
 */
export class GrokClient extends EventEmitter {
  private options: Required<GrokClientOptions>;
  private state: ClientState;
  private ws?: WebSocket;
  private process?: ReturnType<typeof spawn>;

  constructor(options: GrokClientOptions = {}) {
    super();
    this.options = {
      binaryPath: 'grok',
      apiKey: '',
      baseUrl: 'https://api.grok.x.ai',
      model: 'default',
      permissionMode: 'default',
      effort: 'medium',
      verbose: false,
      timeout: 30000,
      env: {},
      ...options
    };
    
    this.state = {
      connected: false,
      messageCount: 0,
      tokenUsage: { input: 0, output: 0 }
    };
  }

  /**
   * Connect to a local grok instance or start a new session
   */
  async connect(sessionId?: string): Promise<Session> {
    if (sessionId) {
      return this.resumeSession(sessionId);
    }
    
    // Start local grok process
    const args = ['--headless', '--json'];
    
    if (this.options.model !== 'default') {
      args.push('--model', this.options.model);
    }
    
    if (this.options.permissionMode !== 'default') {
      args.push('--permission-mode', this.options.permissionMode);
    }
    
    const env = {
      ...process.env,
      ...this.options.env
    };
    
    if (this.options.apiKey) {
      env['GROK_API_KEY'] = this.options.apiKey;
    }
    
    this.process = spawn(this.options.binaryPath, args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.process.stdout?.on('data', (data) => {
      this.handleStdout(data);
    });
    
    this.process.stderr?.on('data', (data) => {
      if (this.options.verbose) {
        console.error('[Grok stderr]', data.toString());
      }
    });
    
    this.process.on('close', (code) => {
      this.state.connected = false;
      this.emit('disconnected', code);
    });
    
    // Wait for ready signal
    await this.waitForReady();
    
    return new Session(this, this.state.sessionId!);
  }

  /**
   * Resume an existing session by ID
   */
  async resumeSession(sessionId: string): Promise<Session> {
    // Fetch session metadata from cloud or local storage
    const response = await fetch(`${this.options.baseUrl}/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to resume session: ${response.statusText}`);
    }
    
    const metadata = await response.json();
    this.state.sessionId = sessionId;
    this.state.connected = true;
    
    return new Session(this, sessionId, metadata);
  }

  /**
   * Send a query to the agent
   */
  async query(prompt: string, options: {
    stream?: boolean;
    model?: ModelAlias;
    effort?: EffortLevel;
    tools?: string[];
  } = {}): Promise<AsyncGenerator<StreamingChunk, void, unknown>> {
    const message: UserMessage = {
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    };
    
    this.state.messageCount++;
    
    // Send to grok process
    const payload = JSON.stringify({
      type: 'message',
      message,
      options: {
        stream: options.stream ?? true,
        model: options.model ?? this.options.model,
        effort: options.effort ?? this.options.effort
      }
    });
    
    this.process?.stdin?.write(payload + '\n');
    
    // Return streaming generator
    return this.createStreamGenerator();
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<Array<{ id: string; name: string; createdAt: string; status: string }>> {
    const response = await fetch(`${this.options.baseUrl}/sessions`, {
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Fork an existing session
   */
  async forkSession(sessionId: string, options: {
    name?: string;
    worktree?: boolean;
  } = {}): Promise<Session> {
    const response = await fetch(`${this.options.baseUrl}/sessions/${sessionId}/fork`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fork session: ${response.statusText}`);
    }
    
    const metadata = await response.json();
    return new Session(this, metadata.id, metadata);
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<{
    totalTokens: number;
    totalCost: number;
    sessionCount: number;
    period: { start: string; end: string };
  }> {
    const response = await fetch(`${this.options.baseUrl}/usage`, {
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get usage: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Disconnect from the current session
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
    
    this.state.connected = false;
    this.state.sessionId = undefined;
    this.emit('disconnected');
  }

  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.options.timeout);
      
      const onReady = () => {
        clearTimeout(timeout);
        this.state.connected = true;
        resolve();
      };
      
      // Listen for ready signal from stdout
      this.once('ready', onReady);
    });
  }

  private handleStdout(data: Buffer): void {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        
        switch (event.type) {
          case 'ready':
            this.state.sessionId = event.sessionId;
            this.emit('ready', event);
            break;
            
          case 'chunk':
            this.emit('chunk', event.chunk);
            break;
            
          case 'message':
            this.emit('message', event.message);
            break;
            
          case 'tool_use':
            this.emit('tool_use', event.tool);
            break;
            
          case 'error':
            this.emit('error', event.error);
            break;
        }
      } catch (e) {
        if (this.options.verbose) {
          console.error('Failed to parse event:', line, e);
        }
      }
    }
  }

  private async *createStreamGenerator(): AsyncGenerator<StreamingChunk, void, unknown> {
    const chunkQueue: StreamingChunk[] = [];
    let done = false;
    let error: Error | null = null;
    
    const onChunk = (chunk: StreamingChunk) => {
      chunkQueue.push(chunk);
    };
    
    const onError = (err: Error) => {
      error = err;
      done = true;
    };
    
    this.on('chunk', onChunk);
    this.once('error', onError);
    
    try {
      while (!done) {
        if (chunkQueue.length > 0) {
          yield chunkQueue.shift()!;
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      if (error) {
        throw error;
      }
    } finally {
      this.off('chunk', onChunk);
      this.off('error', onError);
    }
  }
}

/**
 * Create a new GrokClient instance
 */
export function createClient(options: GrokClientOptions = {}): GrokClient {
  return new GrokClient(options);
}
