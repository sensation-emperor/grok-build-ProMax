# Grok Build SDK

Official SDKs for building custom agents on the same core as Grok Build.

## Available SDKs

### TypeScript/JavaScript

```bash
npm install @xai/grok-sdk
```

**Features:**
- `GrokClient` - Main client for connecting to local or cloud Grok instances
- `Session` - Session management with message history, cost tracking, and lifecycle control
- `Tool` - Custom tool creation with Zod schema validation
- `Hook` - Event hooks for intercepting and modifying agent behavior
- `createMcpServer` - MCP server creation for exposing tools/resources
- `query` - Simple one-shot query function

**Example:**

```typescript
import { createClient, createTool } from '@xai/grok-sdk';
import { z } from 'zod';

// Create a client
const client = createClient({
  binaryPath: 'grok',
  model: 'sonnet',
  permissionMode: 'default'
});

// Connect and start a session
const session = await client.connect();

// Send a message
const response = await session.send('Explain how async/await works');
console.log(response.content);

// Create a custom tool
const weatherTool = createTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    city: z.string().describe('City name'),
    country: z.string().optional()
  }),
  handler: async (input) => {
    // Fetch weather data
    return `Sunny, 72°F in ${input.city}`;
  }
});

// Use hooks to intercept events
const preEditHook = createHook({
  event: 'PreToolUse',
  matcher: { toolName: 'write_file' },
  handler: async (data) => {
    if (data.input?.path?.includes('.env')) {
      return { block: true, notification: 'Cannot modify .env files' };
    }
    return { continue: true };
  }
});
```

### Python

```bash
pip install xai-grok
```

**Features:**
- `GrokClient` - Async client for Grok connections
- `Session` - Session management with full lifecycle support
- `Tool` - Custom tools with Pydantic validation
- `Hook` - Event interception system
- `create_mcp_server` - MCP server factory
- `query` - Simple query function

**Example:**

```python
from xai_grok import create_client, create_tool
from pydantic import BaseModel, Field

class WeatherInput(BaseModel):
    city: str = Field(description="City name")
    country: str | None = None

# Create a client
client = create_client(
    binary_path="grok",
    model="sonnet"
)

# Connect and start a session
session = await client.connect()

# Send a message
response = await session.send("Explain async/await")
print(response.content)

# Create a custom tool
weather_tool = create_tool(
    name="get_weather",
    description="Get current weather for a location",
    input_schema=WeatherInput,
    handler=lambda input, ctx: f"Sunny, 72°F in {input.city}"
)
```

## API Reference

### GrokClient

Main entry point for interacting with Grok.

**Options:**
- `binaryPath` - Path to grok binary (default: 'grok')
- `apiKey` - API key for cloud sessions
- `baseUrl` - Base URL for cloud API
- `model` - Default model alias
- `permissionMode` - Default permission mode
- `effort` - Default effort level
- `verbose` - Enable verbose logging

**Methods:**
- `connect(sessionId?)` - Connect to local grok or resume session
- `query(prompt, options)` - Send a streaming query
- `listSessions()` - List all sessions
- `forkSession(id, options)` - Fork an existing session
- `getUsage()` - Get usage statistics
- `disconnect()` - Close connection

### Session

Represents a single agent session.

**Methods:**
- `send(prompt, options)` - Send a message
- `getHistory()` - Get conversation history
- `clearHistory()` - Clear history (keep session alive)
- `rename(name)` - Rename session
- `fork(options)` - Fork into new session
- `pause()` - Pause execution
- `resume()` - Resume paused session
- `stop()` - End session
- `getCostTracking()` - Get cost breakdown
- `updateSettings(options)` - Update session config

### Tool

Custom tools extend agent capabilities.

**Options:**
- `name` - Tool name
- `description` - What the tool does
- `inputSchema` - Zod/Pydantic schema for validation
- `handler` - Async function that executes the tool
- `annotations` - Metadata (readOnly, destructive, etc.)

### Hook

Intercept and modify agent events.

**Events:** SessionStart, SessionEnd, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, SubagentStart, TaskCompleted, and 20+ more.

**Result types:**
- `{ continue: true }` - Proceed normally
- `{ block: true, notification: '...' }` - Block action
- `{ modifiedData: {...} }` - Modify event data
- `{ additionalContext: '...' }` - Inject context
- `{ defer: { until: '...', reason: '...' } }` - Defer for later

## Roadmap

### Phase 1 (In Progress)
- ✅ TypeScript SDK core
- ✅ Python SDK core
- ⏳ VS Code Extension
- ⏳ Browser automation tools
- ⏳ Context timeline UI

### Phase 2 (Next)
- Desktop app (Tauri)
- GitHub Actions integration
- Usage dashboard
- Self-hosted gateway
- Accessibility improvements

### Phase 3 (Future)
- Web interface
- Mobile app
- Collaborative editing
- Plugin marketplace hosting
- Enterprise admin console

## Development

### TypeScript SDK

```bash
cd sdk/typescript
npm install
npm run build
npm test
```

### Python SDK

```bash
cd sdk/python
pip install -e ".[dev]"
pytest
```

## License

MIT
