"""Configuration types for Grok Build Python SDK."""

from typing import Literal, Optional


PermissionMode = Literal[
    "default",           # Ask per action
    "acceptEdits",       # Auto-approve file edits only
    "plan",              # No side effects until plan approved
    "auto",              # Safety classifier decides
    "dontAsk",           # Only pre-approved tools run
    "bypassPermissions", # Skip all checks (power user/CI mode)
]

EffortLevel = Literal[
    "none",
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
]

OutputStyle = Literal[
    "concise",      # Brief, direct responses
    "explanatory",  # Detailed explanations
    "learning",     # Educational with concepts
    "executive",    # Summary-focused
    "custom",       # User-defined
]

ModelAlias = Literal[
    "default",   # Organization default
    "fast",      # Latency-optimized
    "opus",      # Most capable
    "opusplan",  # Optimized for planning
    "sonnet",    # Balanced
    "haiku",     # Fast, cheap
] | str          # Custom model ID


class GrokConfig:
    """Configuration for Grok sessions."""
    
    def __init__(
        self,
        model: ModelAlias = "default",
        permission_mode: PermissionMode = "default",
        effort: EffortLevel = "medium",
        output_style: OutputStyle = "concise",
        max_turns: Optional[int] = None,
        token_budget: Optional[int] = None,
        cost_cap: Optional[float] = None,
        context_window: Optional[int] = None,
        auto_compact: bool = True,
        compact_threshold: float = 0.9,
    ):
        self.model = model
        self.permission_mode = permission_mode
        self.effort = effort
        self.output_style = output_style
        self.max_turns = max_turns
        self.token_budget = token_budget
        self.cost_cap = cost_cap
        self.context_window = context_window
        self.auto_compact = auto_compact
        self.compact_threshold = compact_threshold


class ManagedSettings:
    """Organization-managed settings that override user config."""
    
    def __init__(
        self,
        allowed_models: list[ModelAlias],
        max_effort: EffortLevel = "medium",
        required_permission_mode: Optional[PermissionMode] = None,
        blocked_tools: list[str] | None = None,
        allowed_directories: list[str] | None = None,
        blocked_directories: list[str] | None = None,
        network_allowlist: list[str] | None = None,
        mcp_servers_allowed: list[str] | None = None,
        data_retention_days: int = 30,
        zero_data_retention: bool = False,
    ):
        self.allowed_models = allowed_models
        self.max_effort = max_effort
        self.required_permission_mode = required_permission_mode
        self.blocked_tools = blocked_tools or []
        self.allowed_directories = allowed_directories or []
        self.blocked_directories = blocked_directories or []
        self.network_allowlist = network_allowlist or []
        self.mcp_servers_allowed = mcp_servers_allowed or []
        self.data_retention_days = data_retention_days
        self.zero_data_retention = zero_data_retention
