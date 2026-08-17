"""
Grok Build Python SDK

Build custom agents on the same core as Grok Build.
Supports streaming queries, custom tools, hooks, and session management.
"""

from .client import GrokClient, GrokClientOptions
from .session import Session, SessionOptions, SessionState
from .tool import Tool, ToolDefinition, create_tool
from .hook import Hook, HookDefinition, create_hook
from .mcp_server import create_mcp_server
from .query import query, QueryOptions, QueryResult
from .types import (
    Message,
    UserMessage,
    AssistantMessage,
    ToolUseMessage,
    ToolResultMessage,
    StreamingChunk,
)
from .config import PermissionMode, EffortLevel, OutputStyle, ModelAlias

__version__ = "0.1.0"
__all__ = [
    "GrokClient",
    "GrokClientOptions",
    "Session",
    "SessionOptions",
    "SessionState",
    "Tool",
    "ToolDefinition",
    "create_tool",
    "Hook",
    "HookDefinition",
    "create_hook",
    "create_mcp_server",
    "query",
    "QueryOptions",
    "QueryResult",
    "Message",
    "UserMessage",
    "AssistantMessage",
    "ToolUseMessage",
    "ToolResultMessage",
    "StreamingChunk",
    "PermissionMode",
    "EffortLevel",
    "OutputStyle",
    "ModelAlias",
]
