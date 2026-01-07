# Data Model: AI Code Agent MVP

**Feature**: 001-ai-agent-mvp  
**Date**: 2026-01-08

## Entities

### Session

Represents a conversation thread with the AI agent.

**Storage**: JSON file at `globalStorageUri/.circuitx/sessions/{id}.json`

```typescript
interface Session {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** User-visible title, max 100 characters */
  title: string;
  
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
  
  /** Ordered array of messages in this session */
  messages: Message[];
  
  /** Provider ID used for this session (optional, uses default if not set) */
  providerId?: string;
}
```

**Validation Rules**:
- `id`: Must be valid UUID v4 format
- `title`: 1-100 characters, auto-generated from first 30 chars of first message
- `createdAt`: Must be valid ISO 8601 datetime
- `updatedAt`: Must be >= `createdAt`, updated on every message
- `messages`: Can be empty array (session created but no messages yet)
- `providerId`: If set, must reference existing provider ID

**File Format Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "How do I implement a bina...",
  "createdAt": "2026-01-08T10:30:00.000Z",
  "updatedAt": "2026-01-08T10:35:42.000Z",
  "messages": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "role": "user",
      "content": "How do I implement a binary search tree in TypeScript?",
      "timestamp": "2026-01-08T10:30:00.000Z"
    },
    {
      "id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      "role": "assistant",
      "content": "Here's how to implement a binary search tree...",
      "timestamp": "2026-01-08T10:30:15.000Z"
    }
  ],
  "providerId": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

---

### Message

Single message in a conversation.

**Storage**: Embedded within Session JSON (not stored separately)

```typescript
interface Message {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Message author: 'user' or 'assistant' */
  role: 'user' | 'assistant';
  
  /** Message content (plain text, may contain markdown) */
  content: string;
  
  /** ISO 8601 timestamp when message was created/received */
  timestamp: string;
  
  /** Optional metadata for future extensibility */
  metadata?: MessageMetadata;
}

interface MessageMetadata {
  /** Token count (future use) */
  tokenCount?: number;
  
  /** Model that generated this response (future use) */
  model?: string;
}
```

**Validation Rules**:
- `id`: Must be valid UUID v4 format
- `role`: Must be exactly 'user' or 'assistant'
- `content`: Non-empty string
- `timestamp`: Must be valid ISO 8601 datetime
- `metadata`: Optional, ignored if malformed

---

### LLMProvider

Configuration for connecting to an LLM service.

**Storage**: 
- Config (name, baseUrl, model, isDefault): VS Code settings at `circuitx.providers`
- API Key: VS Code SecretStorage with key `circuitx.provider.{id}.apiKey`

```typescript
interface LLMProvider {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** User-defined display name */
  name: string;
  
  /** API base URL (e.g., "http://localhost:11434/v1" for Ollama) */
  baseUrl: string;
  
  /** Model identifier (e.g., "gpt-4", "llama2", "codellama") */
  model: string;
  
  /** Whether this is the default provider for new sessions */
  isDefault: boolean;
}

// API key stored separately in SecretStorage
// Key format: "circuitx.provider.{id}.apiKey"
```

**Validation Rules**:
- `id`: Must be valid UUID v4 format
- `name`: 1-50 characters, unique among providers
- `baseUrl`: Must be valid URL format, http or https
- `model`: 1-100 characters, non-empty
- `isDefault`: Exactly one provider must have `isDefault: true` (enforced by service)

**VS Code Settings Format**:
```json
{
  "circuitx.providers": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Local Ollama",
      "baseUrl": "http://localhost:11434/v1",
      "model": "llama2",
      "isDefault": true
    },
    {
      "id": "8d0e7780-8536-41ef-a55c-f18fc2f91bf8",
      "name": "OpenAI GPT-4",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4",
      "isDefault": false
    }
  ]
}
```

---

### SessionMetadata

Lightweight representation for session list (avoids loading full messages).

**Storage**: Derived from Session files (directory listing + partial JSON read)

```typescript
interface SessionMetadata {
  /** Session ID */
  id: string;
  
  /** Session title */
  title: string;
  
  /** Last updated timestamp */
  updatedAt: string;
}
```

**Usage**: Session History page loads only metadata for performance with 1000+ sessions.

---

### AppState

Current application state passed from extension to webview.

**Storage**: In-memory only, reconstructed on activation

```typescript
interface AppState {
  /** Current page being displayed */
  currentPage: 'welcome' | 'chat' | 'history' | 'providers';
  
  /** Active session (when on chat page) */
  activeSession?: Session;
  
  /** Session list metadata (when on history page) */
  sessionList?: SessionMetadata[];
  
  /** Provider list (when on providers page) */
  providers?: LLMProvider[];
  
  /** Default provider ID */
  defaultProviderId?: string;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error message to display */
  error?: string;
}
```

---

## State Transitions

### Session Lifecycle

```
[Created] → [Active] → [Saved] → [Listed in History]
                ↓
           [Renamed]
                ↓
           [Deleted]
```

1. **Created**: User submits first message on Welcome page
   - Generate UUID v4 for session ID
   - Set title from first 30 chars of message
   - Set createdAt and updatedAt to current timestamp
   - Add first user message to messages array

2. **Active**: User sends messages in Chat page
   - Append user message to messages array
   - Update updatedAt timestamp
   - Append assistant response (streamed) to messages array
   - Update updatedAt timestamp
   - Persist to file after each message pair

3. **Renamed**: User edits title in History page
   - Update title field
   - Update updatedAt timestamp
   - Persist to file

4. **Deleted**: User confirms deletion in History page
   - Remove JSON file from disk
   - Remove from session list in memory

### Provider Lifecycle

```
[Added] → [Active/Default] → [Edited] → [Deleted]
                ↓
         [Set as Default]
```

1. **Added**: User fills provider form
   - Generate UUID v4 for provider ID
   - Save config to VS Code settings
   - If API key provided, save to SecretStorage
   - If first provider, set as default

2. **Set as Default**: User marks provider as default
   - Set isDefault: true on this provider
   - Set isDefault: false on previous default
   - Persist to VS Code settings

3. **Edited**: User updates provider fields
   - Update config in VS Code settings
   - If API key changed, update SecretStorage

4. **Deleted**: User confirms deletion
   - Must not be default (or must select new default first)
   - Remove config from VS Code settings
   - Delete API key from SecretStorage

---

## Data Integrity

### Consistency Guarantees

1. **Session Files**: Atomic write using temp file + rename pattern
2. **Provider Settings**: VS Code handles atomic updates
3. **Secret Storage**: OS-level guarantees

### Recovery Scenarios

| Scenario | Recovery |
|----------|----------|
| Malformed session JSON | Skip file, log error, don't show in list |
| Missing provider in session | Fall back to default provider |
| Missing API key | Show error when trying to send message |
| Orphaned API key (provider deleted) | Clean up on next extension activation |

### Migration Path (Future)

Session file format versioned via optional `version` field:
```json
{
  "version": 1,
  ...
}
```

Missing version treated as version 1 (current format).
