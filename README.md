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

This package depends on the core `task-orchestrator-bun` package for domain logic, repositories, and database access.

The relationship is managed through a file: dependency in package.json:

```json
"dependencies": {
  "task-orchestrator-bun": "file:../task-orchestrator-bun"
}
```

## Key Features

- Interactive dashboard with project navigation
- Status badges with theme support
- Data hooks for efficient data fetching
- Direct adapter for in-process data access
- Support for dark and light themes
