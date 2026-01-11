# CircuitX

Open-source AI code agent for Visual Studio Code. Chat with any OpenAI-compatible LLM directly in your editor.

![CircuitX Demo](docs/demo.gif)

## Features

- 🤖 **AI Chat Interface** - Conversational AI assistant in VS Code sidebar
- 🔄 **Streaming Responses** - See AI responses as they're generated
- 📚 **Session History** - Browse, rename, and manage past conversations
- ⚙️ **Multiple Providers** - Connect to any OpenAI-compatible API (OpenAI, Ollama, LM Studio, etc.)
- 🔐 **Secure Storage** - API keys stored in OS keychain via VS Code SecretStorage
- 🎨 **VS Code Themed** - Seamlessly matches your VS Code color theme

## Quick Start

1. **Install** the extension from VS Code Marketplace
2. **Click** the CircuitX icon in the sidebar panel
3. **Configure** a provider via Settings (⚙️) button
4. **Start chatting** - Type a question and press Enter!

## Requirements

- VS Code 1.107.0 or higher
- Node.js 18+ (for development)
- An OpenAI-compatible LLM provider (OpenAI API, Ollama, LM Studio, etc.)

## Setting Up a Provider

1. Click the **⚙️** button in the CircuitX toolbar
2. Click **Add Provider**
3. Enter:
   - **Name**: Display name (e.g., "OpenAI GPT-4")
   - **Base URL**: API endpoint (e.g., `https://api.openai.com/v1` or `http://localhost:11434/v1`)
   - **Model**: Model name (e.g., `gpt-4`, `llama2`)
   - **API Key**: Your API key (stored securely)
4. Click **Save** and set as default

### Example Providers

| Provider | Base URL | Model |
|----------|----------|-------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4`, `gpt-3.5-turbo` |
| Ollama | `http://localhost:11434/v1` | `llama2`, `mistral`, `codellama` |
| LM Studio | `http://localhost:1234/v1` | (varies by loaded model) |

## Usage

### Starting a New Chat
- Click **➕** or just start typing on the Welcome page

### Viewing History
- Click **🕒** to see past conversations
- Click a session to continue the conversation
- Rename or delete sessions as needed

### Managing Providers
- Click **⚙️** to add, edit, or remove LLM providers
- Test provider connections before saving
- Set a default provider for new sessions

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send message | `Enter` |
| New line in message | `Shift+Enter` |
| Cancel response | Click Cancel button |

## Development

```bash
# Clone and install
git clone https://github.com/raphael2053/circuitx
cd circuitx
npm install

# Run in development mode
npm run watch

# Press F5 to launch Extension Development Host
```

See [Developer Quickstart](specs/001-ai-agent-mvp/quickstart.md) for detailed development guide.

## Architecture

CircuitX is built with:
- **Pure TypeScript** - No UI frameworks, native DOM APIs
- **VS Code Extension API** - WebviewViewProvider for sidebar integration
- **File-based Storage** - Sessions stored as JSON in global storage
- **SecretStorage** - API keys secured in OS keychain

## Data Storage

| Data | Location | 
|------|----------|
| Sessions | `globalStorage/.circuitx/sessions/*.json` |
| Provider Config | VS Code Settings (`circuitx.providers`) |
| API Keys | OS Keychain (via VS Code SecretStorage) |

## Troubleshooting

### Extension doesn't appear
- Ensure VS Code 1.107.0+ is installed
- Check for errors in Output panel (View → Output → Select "CircuitX")

### API calls fail
- Verify provider URL is correct (include `/v1` for OpenAI-compatible APIs)
- Check API key is valid (use Test Provider button)
- For local providers (Ollama/LM Studio), ensure the server is running

### Responses are slow
- Consider using a faster model
- Check network connection for cloud providers
- For local models, ensure sufficient RAM/GPU resources

## Release Notes

### 1.0.0 (MVP)
- Initial release with full chat functionality
- Provider management (add, edit, delete, test)
- Session history with pagination
- Streaming responses
- Webview state persistence

## License

MIT - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and follow the TDD approach outlined in our development guidelines.

---

**CircuitX** - AI-powered coding assistance in VS Code
