# Implementation Plan: AI Code Agent MVP

**Branch**: `001-ai-agent-mvp` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-agent-mvp/spec.md`

## Summary

Build a VS Code extension providing an AI chat interface with four pages (Welcome, Active Chat, Session History, LLM Providers) using pure TypeScript webviews without frameworks. Data persisted to `.circuitx/` directory in global storage, API keys stored via VS Code SecretStorage. Single-page-at-a-time navigation with consistent toolbar (➕🕒⚙️).

## Technical Context

**Language/Version**: TypeScript 5.9+ with ES2022 target, strict mode enabled  
**Primary Dependencies**: VS Code Extension API (^1.107.0), native DOM APIs for webview UI  
**Storage**: File system (`.circuitx/sessions/`) for sessions, VS Code settings for provider config, SecretStorage for API keys  
**Testing**: @vscode/test-cli, @vscode/test-electron, Mocha  
**Target Platform**: VS Code Desktop (macOS, Windows, Linux)  
**Project Type**: Single VS Code extension (no framework)  
**Performance Goals**: <1s activation, <100ms UI response, 1000+ sessions without lag  
**Constraints**: <200MB memory idle, 30s API timeout, async all I/O  
**Scale/Scope**: Single user, local sessions, multiple LLM providers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Code Quality Standards**
- [x] Feature will use TypeScript strict mode with no `any` types (or justified exceptions documented)
- [x] ESLint configuration covers all new code paths
- [x] Single Responsibility Principle verified for new components/services

**II. Testing Standards (NON-NEGOTIABLE)**
- [x] TDD approach confirmed (tests written before implementation)
- [x] Integration tests planned for all user-facing scenarios (4 user stories)
- [x] Contract tests planned for VS Code API interactions (webview, settings, secrets, fs)
- [x] Target: >80% coverage for core logic

**III. User Experience Consistency**
- [x] UI follows VS Code extension UX guidelines (webview theming via CSS variables)
- [x] Navigation patterns align with constitution (toolbar consistency ➕🕒⚙️)
- [x] Zero-config first launch maintained (graceful error when no provider)
- [x] Loading states and error messages planned (FR-012, FR-042-046)

**IV. Performance Requirements**
- [x] Feature activation impact assessed (<1s activation time via lazy loading)
- [x] Async operations for all I/O (non-blocking UI)
- [x] Memory footprint estimated and within limits (<200MB idle)
- [x] API timeout handling planned (30s max with single retry)

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-agent-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── llm-api.md       # OpenAI-compatible API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── extension.ts                 # Extension entry point, activation
├── webview/
│   ├── WebviewProvider.ts       # WebviewViewProvider implementation
│   ├── pages/
│   │   ├── WelcomePage.ts       # Welcome page renderer
│   │   ├── ChatPage.ts          # Active chat page renderer
│   │   ├── HistoryPage.ts       # Session history page renderer
│   │   └── ProvidersPage.ts     # LLM providers page renderer
│   ├── components/
│   │   ├── Toolbar.ts           # Consistent navigation toolbar
│   │   ├── MessageList.ts       # Chat message stream component
│   │   ├── InputBox.ts          # Text input component
│   │   ├── SessionList.ts       # Session list for history page
│   │   └── ProviderTable.ts     # Provider CRUD table
│   └── styles/
│       └── main.css             # VS Code themed styles
├── models/
│   ├── Session.ts               # Session entity
│   ├── Message.ts               # Message entity
│   └── LLMProvider.ts           # Provider entity
├── services/
│   ├── SessionService.ts        # Session CRUD, file I/O
│   ├── ProviderService.ts       # Provider CRUD, settings + secrets
│   ├── LLMService.ts            # OpenAI-compatible API client
│   └── StateManager.ts          # Navigation state, webview state persistence
└── utils/
    ├── uuid.ts                  # UUID v4 generation
    └── errors.ts                # Error handling utilities

src/test/
├── suite/
│   ├── extension.test.ts        # Extension activation tests
│   ├── session.test.ts          # Session service unit tests
│   ├── provider.test.ts         # Provider service unit tests
│   └── llm.test.ts              # LLM service unit tests
└── integration/
    ├── webview.test.ts          # Webview integration tests
    └── e2e.test.ts              # End-to-end user story tests

.circuitx/                       # Data directory (in globalStorageUri)
└── sessions/
    └── {uuid}.json              # Individual session files
```

**Structure Decision**: Single VS Code extension project using native TypeScript DOM APIs for webview rendering. No React/Vue/framework overhead - pure TypeScript classes for pages and components. This aligns with user requirement for "original TS as much as possible" and keeps bundle size minimal.

## Complexity Tracking

No constitution violations requiring justification.
