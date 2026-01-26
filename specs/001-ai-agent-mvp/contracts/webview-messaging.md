# Webview Messaging Contract: Extension ↔ Webview Communication

**Feature**: 001-ai-agent-mvp  
**Date**: 2026-01-08

## Overview

Communication between VS Code extension (host) and webview uses the postMessage API. All messages are JSON objects with a `type` field for routing.

---

## Message Direction

```
┌─────────────────┐     postMessage      ┌─────────────────┐
│                 │ ───────────────────► │                 │
│    Extension    │                      │     Webview     │
│     (Host)      │ ◄─────────────────── │     (Panel)     │
│                 │     postMessage      │                 │
└─────────────────┘                      └─────────────────┘
```

---

## Base Message Types

```typescript
/** Message from Webview to Extension */
interface WebviewMessage {
  type: string;
  payload?: unknown;
  requestId?: string; // For request/response correlation
}

/** Message from Extension to Webview */
interface ExtensionMessage {
  type: string;
  payload?: unknown;
  requestId?: string; // Echo back for correlation
  error?: string; // Present if operation failed
}
```

---

## Webview → Extension Messages

### Navigation

#### `navigate`
Request to change current page.

```typescript
interface NavigateMessage {
  type: 'navigate';
  payload: {
    page: 'welcome' | 'chat' | 'history' | 'providers';
    sessionId?: string; // Required when page is 'chat'
  };
}
```

**Extension Response**: `stateUpdate` with new page state

---

### Chat Operations

#### `sendMessage`
Send user message to LLM.

```typescript
interface SendMessageMessage {
  type: 'sendMessage';
  payload: {
    sessionId?: string; // Undefined for new session (from Welcome)
    content: string;
  };
  requestId: string;
}
```

**Extension Response**: 
- Stream of `chatChunk` messages
- Final `chatComplete` message
- Or `chatError` on failure

#### `cancelMessage`
Cancel ongoing LLM request.

```typescript
interface CancelMessageMessage {
  type: 'cancelMessage';
  payload: {
    sessionId: string;
  };
}
```

**Extension Response**: `chatCancelled`

---

### Session Operations

#### `loadSession`
Load a session from history.

```typescript
interface LoadSessionMessage {
  type: 'loadSession';
  payload: {
    sessionId: string;
  };
  requestId: string;
}
```

**Extension Response**: `sessionLoaded` or error

#### `deleteSession`
Delete a session permanently.

```typescript
interface DeleteSessionMessage {
  type: 'deleteSession';
  payload: {
    sessionId: string;
  };
  requestId: string;
}
```

**Extension Response**: `sessionDeleted` or error

#### `renameSession`
Rename a session.

```typescript
interface RenameSessionMessage {
  type: 'renameSession';
  payload: {
    sessionId: string;
    title: string;
  };
  requestId: string;
}
```

**Extension Response**: `sessionRenamed` or error

#### `loadSessionList`
Load paginated session history.

```typescript
interface LoadSessionListMessage {
  type: 'loadSessionList';
  payload: {
    page: number; // 0-indexed
    pageSize: number; // Default 20
  };
  requestId: string;
}
```

**Extension Response**: `sessionListLoaded`

---

### Provider Operations

#### `loadProviders`
Get all configured providers.

```typescript
interface LoadProvidersMessage {
  type: 'loadProviders';
  requestId: string;
}
```

**Extension Response**: `providersLoaded`

#### `addProvider`
Add a new LLM provider.

```typescript
interface AddProviderMessage {
  type: 'addProvider';
  payload: {
    name: string;
    baseUrl: string;
    model: string;
    apiKey?: string;
    isDefault?: boolean;
  };
  requestId: string;
}
```

**Extension Response**: `providerAdded` or error

#### `updateProvider`
Update an existing provider.

```typescript
interface UpdateProviderMessage {
  type: 'updateProvider';
  payload: {
    id: string;
    name?: string;
    baseUrl?: string;
    model?: string;
    apiKey?: string;
    isDefault?: boolean;
  };
  requestId: string;
}
```

**Extension Response**: `providerUpdated` or error

#### `deleteProvider`
Delete a provider.

```typescript
interface DeleteProviderMessage {
  type: 'deleteProvider';
  payload: {
    id: string;
  };
  requestId: string;
}
```

**Extension Response**: `providerDeleted` or error

#### `testProvider`
Test provider connection.

```typescript
interface TestProviderMessage {
  type: 'testProvider';
  payload: {
    id: string;
  };
  requestId: string;
}
```

**Extension Response**: `providerTestResult`

---

## Extension → Webview Messages

### State Management

#### `stateUpdate`
Push state update to webview.

```typescript
interface StateUpdateMessage {
  type: 'stateUpdate';
  payload: {
    currentPage: 'welcome' | 'chat' | 'history' | 'providers';
    activeSession?: Session;
    sessionList?: SessionMetadata[];
    providers?: LLMProvider[];
    defaultProviderId?: string;
    isLoading: boolean;
    error?: string;
  };
}
```

#### `initialize`
Initial state on webview creation.

```typescript
interface InitializeMessage {
  type: 'initialize';
  payload: {
    hasProviders: boolean;
    defaultProviderId?: string;
  };
}
```

---

### Chat Streaming

#### `chatChunk`
Streaming content chunk.

```typescript
interface ChatChunkMessage {
  type: 'chatChunk';
  payload: {
    sessionId: string;
    messageId: string;
    content: string; // Incremental content
  };
  requestId: string;
}
```

#### `chatComplete`
Stream completed successfully.

```typescript
interface ChatCompleteMessage {
  type: 'chatComplete';
  payload: {
    sessionId: string;
    messageId: string;
    fullContent: string; // Complete message
  };
  requestId: string;
}
```

#### `chatError`
Stream failed.

```typescript
interface ChatErrorMessage {
  type: 'chatError';
  payload: {
    sessionId?: string;
    error: string;
  };
  requestId: string;
}
```

#### `chatCancelled`
Stream was cancelled by user.

```typescript
interface ChatCancelledMessage {
  type: 'chatCancelled';
  payload: {
    sessionId: string;
  };
}
```

---

### Operation Responses

#### `sessionLoaded`
Session data loaded.

```typescript
interface SessionLoadedMessage {
  type: 'sessionLoaded';
  payload: Session;
  requestId: string;
}
```

#### `sessionDeleted`
Session was deleted.

```typescript
interface SessionDeletedMessage {
  type: 'sessionDeleted';
  payload: {
    sessionId: string;
  };
  requestId: string;
}
```

#### `sessionRenamed`
Session was renamed.

```typescript
interface SessionRenamedMessage {
  type: 'sessionRenamed';
  payload: {
    sessionId: string;
    title: string;
  };
  requestId: string;
}
```

#### `sessionListLoaded`
Paginated session list.

```typescript
interface SessionListLoadedMessage {
  type: 'sessionListLoaded';
  payload: {
    sessions: SessionMetadata[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  requestId: string;
}
```

#### `providersLoaded`
All providers loaded.

```typescript
interface ProvidersLoadedMessage {
  type: 'providersLoaded';
  payload: {
    providers: LLMProvider[];
    defaultId?: string;
  };
  requestId: string;
}
```

#### `providerAdded`
Provider was created.

```typescript
interface ProviderAddedMessage {
  type: 'providerAdded';
  payload: LLMProvider;
  requestId: string;
}
```

#### `providerUpdated`
Provider was updated.

```typescript
interface ProviderUpdatedMessage {
  type: 'providerUpdated';
  payload: LLMProvider;
  requestId: string;
}
```

#### `providerDeleted`
Provider was deleted.

```typescript
interface ProviderDeletedMessage {
  type: 'providerDeleted';
  payload: {
    id: string;
  };
  requestId: string;
}
```

#### `providerTestResult`
Provider connection test result.

```typescript
interface ProviderTestResultMessage {
  type: 'providerTestResult';
  payload: {
    id: string;
    success: boolean;
    message?: string;
    latency?: number; // ms
  };
  requestId: string;
}
```

---

## Error Handling

All responses can include an error field:

```typescript
interface ErrorResponse {
  type: string;
  error: string;
  requestId?: string;
}
```

### Error Codes

| Error | Meaning |
|-------|---------|
| `PROVIDER_NOT_FOUND` | Requested provider doesn't exist |
| `SESSION_NOT_FOUND` | Requested session doesn't exist |
| `API_KEY_MISSING` | No API key configured for provider |
| `CONNECTION_FAILED` | Could not connect to LLM API |
| `INVALID_RESPONSE` | LLM returned invalid data |
| `TIMEOUT` | Request timed out |
| `CANCELLED` | Request was cancelled by user |
| `VALIDATION_ERROR` | Invalid input data |

---

## Implementation

### Extension Side (Host)

```typescript
// In WebviewViewProvider
private _onDidReceiveMessage(message: WebviewMessage) {
  switch (message.type) {
    case 'navigate':
      this.handleNavigate(message.payload);
      break;
    case 'sendMessage':
      this.handleSendMessage(message.payload, message.requestId);
      break;
    // ... other handlers
  }
}

private postMessage(message: ExtensionMessage) {
  this._view?.webview.postMessage(message);
}
```

### Webview Side (Panel)

```typescript
// Acquire VS Code API once
const vscode = acquireVsCodeApi();

// Send message to extension
function sendMessage(message: WebviewMessage) {
  vscode.postMessage(message);
}

// Listen for messages from extension
window.addEventListener('message', (event: MessageEvent<ExtensionMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'stateUpdate':
      handleStateUpdate(message.payload);
      break;
    case 'chatChunk':
      handleChatChunk(message.payload);
      break;
    // ... other handlers
  }
});
```

---

## Request/Response Correlation

Use `requestId` for matching responses to requests:

```typescript
// Webview: Generate unique request ID
const requestId = crypto.randomUUID();
vscode.postMessage({ type: 'loadSession', payload: { sessionId: '...' }, requestId });

// Track pending request
pendingRequests.set(requestId, { resolve, reject, timeout });

// On response
window.addEventListener('message', (event) => {
  const { requestId } = event.data;
  if (requestId && pendingRequests.has(requestId)) {
    const pending = pendingRequests.get(requestId);
    clearTimeout(pending.timeout);
    pendingRequests.delete(requestId);
    
    if (event.data.error) {
      pending.reject(new Error(event.data.error));
    } else {
      pending.resolve(event.data.payload);
    }
  }
});
```
