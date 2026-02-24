# Task Orchestrator TUI

Terminal User Interface for the Task Orchestrator application.

## Overview

This package provides an interactive terminal-based interface for managing projects, features, and tasks. It's built with [Ink](https://github.com/vadimdemedes/ink) and React.

## Architecture

The TUI is separated into two main directories:

- **`src/ui/`** - UI abstraction layer that can work with any renderer (TUI, web, etc.)
  - `adapters/` - Data access layer for communicating with the domain
  - `context/` - React contexts for theme and adapter
  - `hooks/` - React hooks for data fetching
  - `lib/` - Utility functions and types
  - `themes/` - Color themes (dark/light)

- **`src/tui/`** - Terminal-specific implementation using Ink
  - `components/` - Ink components for the terminal UI
  - `screens/` - Screen components (Dashboard, etc.)
  - `app.tsx` - Main TUI application component
  - `index.tsx` - Entry point

## Installation

```bash
bun install
```

## Usage

To start the TUI:

```bash
bun run tui
```

Or directly:

```bash
bun run src/tui/index.tsx
```

### Adapter Modes

The TUI supports two data adapter modes:

- `mcp-http` (default): remote MCP tool calls via `McpHttpAdapter`
- `direct`: in-process repository access via `DirectAdapter`

Environment variables:

- `TASKS_ADAPTER`: `direct` or `mcp-http`
- `TASKS_MCP_URL`: MCP endpoint URL, default `http://127.0.0.1:3100/mcp`

Examples:

```bash
# Start orchestrator MCP server over HTTP
bunx @allpepper/task-orchestrator --http

# Run TUI against MCP HTTP
TASKS_ADAPTER=mcp-http TASKS_MCP_URL=http://127.0.0.1:3100/mcp bun run tui
```

## Development

Type checking:

```bash
bun run typecheck
```

Running tests:

```bash
bun test
```

## Dependencies

The TUI keeps a local direct adapter for fallback and development, and also includes an MCP client transport for remote orchestration over HTTP.

## Key Features

- Interactive dashboard with project navigation
- Status badges with theme support
- Data hooks for efficient data fetching
- Direct adapter for in-process data access
- MCP HTTP adapter for remote data access through MCP tools
- Support for dark and light themes
