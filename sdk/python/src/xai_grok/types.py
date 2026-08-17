"""Type definitions for Grok Build Python SDK."""

from dataclasses import dataclass, field
from typing import Any, Literal, Optional
from datetime import datetime


@dataclass
class BaseMessage:
    role: str
    timestamp: float


@dataclass
class UserMessage(BaseMessage):
    role: Literal["user"] = "user"
    content: str = ""
    attachments: Optional[list[dict[str, Any]]] = None


@dataclass
class ToolUse:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class AssistantMessage(BaseMessage):
    role: Literal["assistant"] = "assistant"
    content: str = ""
    thought: Optional[str] = None
    tool_uses: list[ToolUse] = field(default_factory=list)


@dataclass
class ToolUseMessage(BaseMessage):
    role: Literal["tool_use"] = "tool_use"
    id: str = ""
    name: str = ""
    input: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResultMessage(BaseMessage):
    role: Literal["tool_result"] = "tool_result"
    tool_use_id: str = ""
    content: str = ""
    is_error: bool = False


Message = UserMessage | AssistantMessage | ToolUseMessage | ToolResultMessage


@dataclass
class StreamingChunk:
    type: Literal["content", "thought", "tool_use_start", "tool_use_end", "error"]
    content: Optional[str] = None
    tool_use_id: Optional[str] = None
    tool_name: Optional[str] = None
    error: Optional[str] = None
    done: bool = False


@dataclass
class SessionMetadata:
    id: str
    name: str
    created_at: str
    updated_at: str
    status: Literal["active", "paused", "completed", "failed"] = "active"
    model: str = "default"
    permission_mode: str = "default"
    effort: str = "medium"
    message_count: int = 0
    token_usage: dict[str, int] = field(default_factory=lambda: {"input": 0, "output": 0, "total": 0})
    cost: float = 0.0
    worktree: Optional[str] = None


@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: dict[str, Any]
    annotations: Optional[dict[str, bool]] = None


@dataclass
class HookEvent:
    type: str
    timestamp: float
    session_id: str
    data: dict[str, Any]


@dataclass
class CostTracking:
    per_step: list[dict[str, Any]]
    cumulative: dict[str, float]
