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

### Data Transport

The TUI uses MCP HTTP transport for all data operations.

Environment variables:

- `TASKS_MCP_URL`: MCP endpoint URL, default `http://127.0.0.1:3100/mcp`
- `TASKS_AUTO_START_MCP`: set to `0` or `false` to disable local MCP auto-start

Examples:

```bash
# Start orchestrator MCP server over HTTP
bunx @allpepper/task-orchestrator --http

# Run TUI against MCP HTTP
TASKS_MCP_URL=http://127.0.0.1:3100/mcp bun run tui
```

When `TASKS_MCP_URL` points to `localhost` or `127.0.0.1`, the TUI will try to auto-start the MCP server if it is not already running.

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

The TUI includes an MCP client transport for orchestration over HTTP.

## Key Features

- Interactive dashboard with project navigation
- Status badges with theme support
- Data hooks for efficient data fetching
- MCP HTTP adapter for remote data access through MCP tools
- Support for dark and light themes
