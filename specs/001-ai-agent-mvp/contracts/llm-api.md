# LLM API Contract: OpenAI-Compatible Interface

**Feature**: 001-ai-agent-mvp  
**Date**: 2026-01-08  
**API Version**: v1 (OpenAI-compatible)

## Overview

All LLM providers must implement OpenAI's chat completions API format. This enables compatibility with:
- OpenAI (GPT-3.5, GPT-4)
- Ollama (local models)
- LM Studio
- Any OpenAI-compatible server

---

## Endpoint

```
POST {baseUrl}/chat/completions
```

Where `{baseUrl}` is the provider's configured base URL (e.g., `https://api.openai.com/v1`).

---

## Request

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer {api_key}` | Yes (empty string allowed for local models) |

### Body

```typescript
interface ChatCompletionRequest {
  /** Model identifier (from provider config) */
  model: string;
  
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  
  /** Enable streaming response */
  stream: true; // Always true for MVP
  
  /** (Optional) Sampling temperature 0-2 */
  temperature?: number;
  
  /** (Optional) Maximum tokens in response */
  max_tokens?: number;
}

interface ChatMessage {
  /** Role of the message author */
  role: 'system' | 'user' | 'assistant';
  
  /** Message content */
  content: string;
}
```

### Example Request

```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful coding assistant."
    },
    {
      "role": "user",
      "content": "How do I implement a binary search in TypeScript?"
    }
  ],
  "stream": true,
  "temperature": 0.7
}
```

---

## Response (Streaming)

### Content-Type

```
text/event-stream
```

### Server-Sent Events Format

Each chunk is a Server-Sent Event (SSE) line:

```
data: {json_payload}

data: {json_payload}

data: [DONE]
```

Note: Each `data:` line is followed by two newlines (`\n\n`).

### Chunk Payload

```typescript
interface ChatCompletionChunk {
  /** Unique chunk identifier */
  id: string;
  
  /** Always "chat.completion.chunk" */
  object: 'chat.completion.chunk';
  
  /** Unix timestamp */
  created: number;
  
  /** Model used */
  model: string;
  
  /** Array of choices (typically 1) */
  choices: ChunkChoice[];
}

interface ChunkChoice {
  /** Choice index (typically 0) */
  index: number;
  
  /** Partial message content */
  delta: {
    /** Only present in first chunk */
    role?: 'assistant';
    
    /** Content fragment (may be empty) */
    content?: string;
  };
  
  /** Finish reason (null until final chunk) */
  finish_reason: 'stop' | 'length' | null;
}
```

### Example SSE Stream

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Here's"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":" how"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":" to..."},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

---

## Error Responses

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Process stream |
| 400 | Bad Request | Show validation error |
| 401 | Unauthorized | Show "Invalid API key" |
| 404 | Not Found | Show "Model not found" |
| 429 | Rate Limited | Retry after delay |
| 500 | Server Error | Single retry, then show error |
| 502/503/504 | Gateway Error | Single retry, then show error |

### Error Response Body

```typescript
interface APIError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}
```

### Example Error

```json
{
  "error": {
    "message": "Incorrect API key provided",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

---

## Client Implementation

### TypeScript Service Interface

```typescript
interface LLMService {
  /**
   * Send a message and receive streaming response
   * @param providerId - Provider to use (or default)
   * @param messages - Conversation history
   * @param onChunk - Callback for each content chunk
   * @param onError - Callback for errors
   * @param onComplete - Callback when stream ends
   * @returns AbortController to cancel the request
   */
  sendMessage(
    providerId: string | undefined,
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): AbortController;
}
```

### Stream Processing

```typescript
async function processStream(response: Response, onChunk: (content: string) => void) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const chunk: ChatCompletionChunk = JSON.parse(data);
          const content = chunk.choices[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // Ignore malformed chunks
        }
      }
    }
  }
}
```

### Retry Logic

Per FR-021 (single retry with 2 second delay):

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
  delay = 2000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.ok || response.status < 500) {
      return response;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    throw error;
  }
}
```

---

## System Prompt

Default system prompt sent with every request:

```
You are a helpful coding assistant. Provide clear, concise, and accurate responses to programming questions. When providing code examples, use proper formatting and include explanations.
```

This is prepended as the first message in the `messages` array unless the conversation already has a system message.

---

## Rate Limiting

No client-side rate limiting in MVP. Server rate limit errors (429) are displayed to the user with the message from the API response.

---

## Timeout

Request timeout: 60 seconds

If no data received within 60 seconds, abort the request and show timeout error.
