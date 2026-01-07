# Research: AI Code Agent MVP

**Feature**: 001-ai-agent-mvp  
**Date**: 2026-01-08

## Research Areas

### 1. VS Code Webview in Right Sidebar

**Decision**: Use `WebviewViewProvider` with `registerWebviewViewProvider` to display in right sidebar panel.

**Rationale**: 
- `WebviewViewProvider` allows webviews to appear in sidebar views (Activity Bar areas)
- The webview is registered with a unique `viewId` that maps to `package.json` contributions
- Right sidebar (secondary side bar) available since VS Code 1.64
- Use `retainContextWhenHidden: true` to preserve state when tab not visible

**Alternatives Considered**:
- `createWebviewPanel`: Creates floating panel, not sidebar - rejected as user wants fixed right sidebar
- Custom Tree View: Limited to tree structure, not suitable for chat UI - rejected

**Implementation Notes**:
```typescript
// package.json contribution
"views": {
  "circuitx-sidebar": [{
    "type": "webview",
    "id": "circuitx.mainView",
    "name": "CircuitX"
  }]
},
"viewsContainers": {
  "panel": [{
    "id": "circuitx-sidebar",
    "title": "CircuitX",
    "icon": "resources/icon.svg"
  }]
}
```

---

### 2. Pure TypeScript Webview Rendering (No Framework)

**Decision**: Use native DOM APIs with TypeScript classes for component-like structure.

**Rationale**:
- User explicitly requested "typescript without any frameworks like react"
- Smaller bundle size, faster load times
- No virtual DOM overhead
- Direct control over DOM updates
- Simpler debugging in webview devtools

**Alternatives Considered**:
- React: Adds 40KB+ to bundle, overkill for 4 pages - rejected per user request
- Preact: Smaller but still framework overhead - rejected per user request
- Lit: Web components approach, learning curve - rejected for simplicity

**Implementation Pattern**:
```typescript
// Page class pattern
abstract class Page {
  protected container: HTMLElement;
  abstract render(): void;
  abstract dispose(): void;
}

// Component pattern (stateless rendering functions)
function renderToolbar(onNavigate: (page: string) => void): string {
  return `<div class="toolbar">...</div>`;
}
```

---

### 3. Data Persistence Strategy

**Decision**: Three-tier storage approach:
1. **Sessions**: JSON files in `globalStorageUri/.circuitx/sessions/{uuid}.json`
2. **Provider Config**: VS Code workspace configuration (`circuitx.providers`)
3. **API Keys**: VS Code SecretStorage (OS keychain)

**Rationale**:
- `globalStorageUri` provides extension-scoped persistent storage independent of workspace
- JSON files allow easy inspection/debugging and future migration
- VS Code settings for provider config enables sync across machines (if user enables Settings Sync)
- SecretStorage uses OS-level secure storage (Keychain, Credential Manager)

**Alternatives Considered**:
- SQLite: Adds native dependency complexity - rejected for MVP simplicity
- globalState (Memento): Limited to 256KB total - rejected for session scalability
- LocalStorage in webview: Cleared when webview recreated - rejected for persistence

**Storage Paths**:
```
~/.vscode/extensions/circuitx/
  └── globalStorage/
      └── .circuitx/
          └── sessions/
              ├── 550e8400-e29b-41d4-a716-446655440000.json
              └── 6ba7b810-9dad-11d1-80b4-00c04fd430c8.json
```

---

### 4. OpenAI-Compatible Streaming API

**Decision**: Implement fetch-based SSE client for `/chat/completions` endpoint with streaming.

**Rationale**:
- OpenAI API is de facto standard, supported by Ollama, vLLM, LocalAI, etc.
- Native fetch available in VS Code's Node.js runtime
- SSE (Server-Sent Events) for streaming responses
- Single retry with 2-second delay per spec clarification

**Alternatives Considered**:
- OpenAI SDK: Adds dependency, may not work with all providers - rejected
- Axios: Unnecessary abstraction over fetch - rejected
- WebSockets: Not standard for LLM APIs - rejected

**API Contract**:
```typescript
interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  stream: true;
}

// SSE response format
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

---

### 5. Webview-Extension Communication

**Decision**: Use VS Code's `postMessage` API for bidirectional communication.

**Rationale**:
- Only supported method for webview ↔ extension communication
- Type-safe with TypeScript interfaces
- Async message passing fits event-driven UI pattern

**Message Protocol**:
```typescript
// Webview → Extension
type WebviewMessage = 
  | { type: 'navigate'; page: 'welcome' | 'chat' | 'history' | 'providers' }
  | { type: 'sendMessage'; sessionId: string; content: string }
  | { type: 'createSession'; firstMessage: string }
  | { type: 'deleteSession'; sessionId: string }
  | { type: 'renameSession'; sessionId: string; title: string }
  | { type: 'saveProvider'; provider: LLMProvider }
  | { type: 'deleteProvider'; providerId: string }
  | { type: 'setDefaultProvider'; providerId: string };

// Extension → Webview
type ExtensionMessage =
  | { type: 'stateUpdate'; state: AppState }
  | { type: 'streamChunk'; sessionId: string; content: string }
  | { type: 'streamComplete'; sessionId: string }
  | { type: 'error'; message: string; action?: string };
```

---

### 6. VS Code Theming Integration

**Decision**: Use VS Code CSS variables for automatic theme support.

**Rationale**:
- VS Code exposes theme colors as CSS custom properties
- Automatic light/dark mode support
- Consistent with VS Code's visual language
- No manual theme detection needed

**Key Variables**:
```css
:root {
  --vscode-editor-background
  --vscode-editor-foreground
  --vscode-button-background
  --vscode-button-foreground
  --vscode-input-background
  --vscode-input-border
  --vscode-list-hoverBackground
  --vscode-focusBorder
}
```

---

### 7. Session List Virtualization (1000+ sessions)

**Decision**: Implement simple pagination initially, virtualization if needed.

**Rationale**:
- Most users won't have 1000+ sessions immediately
- Pagination simpler to implement without framework
- Can add virtual scrolling in future iteration if performance issues arise
- Load only session metadata (id, title, updated_at) for list, not full messages

**Implementation**:
```typescript
// Load paginated session list
async function loadSessionList(page: number, pageSize: number = 50): Promise<SessionMetadata[]> {
  // Read directory, sort by mtime, slice for page
}
```

---

### 8. UUID v4 Generation

**Decision**: Use `crypto.randomUUID()` (available in Node.js 19+, VS Code 1.107+ uses Node 20+).

**Rationale**:
- Native implementation, no dependencies
- Cryptographically secure
- Standard UUID v4 format

**Fallback** (if needed for older VS Code):
```typescript
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

---

## Resolved NEEDS CLARIFICATION Items

All technical unknowns from spec have been resolved through research:

| Item | Resolution |
|------|------------|
| Webview location | `WebviewViewProvider` in right sidebar panel |
| UI framework | Pure TypeScript with DOM APIs |
| Session storage location | `globalStorageUri/.circuitx/sessions/` |
| Settings storage | VS Code workspace configuration |
| Secret storage | VS Code SecretStorage API |
| LLM API format | OpenAI-compatible `/chat/completions` with SSE |
| UUID generation | `crypto.randomUUID()` |
| Theme support | VS Code CSS variables |
| Large session list | Pagination with metadata-only loading |
