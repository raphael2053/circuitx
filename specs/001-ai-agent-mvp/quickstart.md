# Developer Quickstart: AI Code Agent MVP

**Feature**: 001-ai-agent-mvp  
**Date**: 2026-01-08

## Prerequisites

- Node.js 18+ (LTS recommended)
- VS Code 1.107.0+
- Git

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd circuitx
npm install
```

### 2. Open in VS Code

```bash
code .
```

### 3. Start Development

Press `F5` to launch the Extension Development Host with the extension loaded.

Or run the watch task:
```bash
npm run watch
```

---

## Project Structure

```
src/
├── extension.ts              # Extension entry point
├── webview/
│   ├── WebviewProvider.ts    # WebviewViewProvider implementation
│   ├── pages/
│   │   ├── WelcomePage.ts    # Welcome page renderer
│   │   ├── ChatPage.ts       # Chat page renderer
│   │   ├── HistoryPage.ts    # Session history page
│   │   └── ProvidersPage.ts  # Provider management page
│   ├── components/
│   │   ├── Toolbar.ts        # Navigation toolbar (➕🕒⚙️)
│   │   ├── MessageList.ts    # Chat message rendering
│   │   ├── InputBox.ts       # Message input component
│   │   ├── Button.ts         # Reusable button component
│   │   ├── SessionList.ts    # History session list
│   │   ├── SessionListItem.ts # Individual session item
│   │   ├── ProviderTable.ts  # Provider list table
│   │   └── ProviderForm.ts   # Provider add/edit form
│   └── styles/
│       └── main.css          # Webview styles (VS Code variables)
├── services/
│   ├── SessionService.ts     # Session CRUD with file system
│   ├── ProviderService.ts    # Provider config + API key storage
│   └── LLMService.ts         # LLM API communication with streaming
├── models/
│   ├── Session.ts            # Session interface & validation
│   ├── LLMProvider.ts        # LLMProvider interface
│   └── WebviewMessages.ts    # Message protocol types
├── utils/
│   ├── uuid.ts               # UUID generation
│   └── errors.ts             # Custom error types with actions
└── test/
    ├── extension.test.ts     # Extension activation tests
    ├── unit/
    │   ├── SessionService.test.ts
    │   ├── ProviderService.test.ts
    │   └── LLMService.test.ts
    ├── integration/
    │   ├── welcome.test.ts
    │   ├── session-creation.test.ts
    │   ├── chat-streaming.test.ts
    │   └── ...
    └── contract/
        └── webview-messaging.test.ts
```

---

## Key Files

### extension.ts
Entry point. Registers the webview provider:

```typescript
import * as vscode from 'vscode';
import { CircuitXWebviewProvider } from './webview/WebviewProvider';

export function activate(context: vscode.ExtensionContext) {
  // Measure activation time (<1s target)
  const activationStart = performance.now();
  
  const provider = new CircuitXWebviewProvider(context, context.extensionUri);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CircuitXWebviewProvider.viewType,  // 'circuitx.chatView'
      provider
    )
  );
  
  console.log(`CircuitX activation: ${(performance.now() - activationStart).toFixed(2)}ms`);
}
```

### package.json Contributions
The extension contributes a webview view in the right sidebar:

```json
{
  "contributes": {
    "viewsContainers": {
      "panel": [{
        "id": "circuitx-panel",
        "title": "CircuitX",
        "icon": "$(comment-discussion)"
      }]
    },
    "views": {
      "circuitx-panel": [{
        "type": "webview",
        "id": "circuitx.chatView",
        "name": "AI Chat"
      }]
    }
  }
}
```

---

## Development Workflow

### TDD Cycle (Required)

1. **Write test first** for the feature/fix
2. **Run test** - verify it fails
3. **Implement** the minimum code to pass
4. **Refactor** while keeping tests green
5. **Commit** with test + implementation

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (run on file changes)
npm run watch-tests
```

### Debugging

1. Set breakpoints in VS Code
2. Press `F5` to launch Extension Development Host
3. Open the CircuitX panel in the sidebar
4. Debug as normal

For webview debugging:
1. In Extension Development Host, run: `Developer: Open Webview Developer Tools`

---

## Common Tasks

### Add a New Page

1. Create `src/webview/pages/NewPage.ts`:
```typescript
export function renderNewPage(container: HTMLElement): void {
  container.innerHTML = `
    <div class="page new-page">
      <h1>New Page</h1>
    </div>
  `;
}
```

2. Add to router in `WebviewProvider.ts`
3. Add navigation button/link to reach the page
4. Write tests first!

### Add a New Message Type

1. Define types in `src/models/WebviewMessages.ts`
2. Add handler in `WebviewProvider.ts` (extension side)
3. Add sender/receiver in webview code
4. Write tests for both sides

### Add a New Service

1. Define interface in `src/services/interfaces/`
2. Create implementation in `src/services/`
3. Write unit tests with mocks
4. Wire up in extension activation

---

## Storage Locations

| Data | Location | API |
|------|----------|-----|
| Sessions | `globalStorageUri/.circuitx/sessions/*.json` | `vscode.workspace.fs` |
| Provider Config | VS Code Settings | `vscode.workspace.getConfiguration()` |
| API Keys | OS Keychain | `context.secrets` |

### Accessing Storage

```typescript
// Session files
const sessionsDir = vscode.Uri.joinPath(
  context.globalStorageUri, 
  '.circuitx', 
  'sessions'
);

// Provider config
const config = vscode.workspace.getConfiguration('circuitx');
const providers = config.get<LLMProvider[]>('providers', []);

// API keys
const apiKey = await context.secrets.get(`circuitx.provider.${id}.apiKey`);
await context.secrets.store(`circuitx.provider.${id}.apiKey`, key);
```

---

## Styling Guidelines

Use VS Code CSS variables for consistent theming:

```css
/* Use VS Code colors */
.message {
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-panel-border);
}

/* Use VS Code button styles */
.button {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.button:hover {
  background: var(--vscode-button-hoverBackground);
}
```

See [VS Code CSS Variables](https://code.visualstudio.com/api/references/theme-color) for full list.

---

## Architecture Principles

1. **No frameworks** - Pure TypeScript with native DOM APIs
2. **Test first** - Every feature starts with a test
3. **Single page at a time** - No complex routing, simple page replacement
4. **VS Code native** - Use VS Code APIs and styling conventions
5. **Offline-first** - All data stored locally, LLM calls are optional

---

## Troubleshooting

### Extension doesn't appear in sidebar
- Check `package.json` contributions are correct
- Verify activation events include `onView:circuitx.chatView`
- Check Output panel for errors

### Webview is blank
- Check browser console (Developer: Open Webview Developer Tools)
- Verify CSP allows your scripts
- Check for JavaScript errors

### API calls fail
- Verify provider URL is correct
- Check API key is stored (test provider button)
- Check network panel for request/response

### Tests fail unexpectedly
- Clear any cached test state
- Check for async timing issues
- Verify mocks are properly set up

---

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Project Spec](./spec.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/)
