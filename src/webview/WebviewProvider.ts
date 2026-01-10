/**
 * WebviewProvider - Manages the CircuitX webview panel
 * Implements: T019-T022, T030, T031, T033 - WebviewViewProvider with page routing and state management
 */

import * as vscode from 'vscode';
import { WebviewMessage, ExtensionMessage, PageType } from '../models/WebviewMessages';
import { Session } from '../models/Session';
import { SessionService } from '../services/SessionService';
import { ProviderService } from '../services/ProviderService';
import { LLMService } from '../services/LLMService';
import { generateUUID } from '../utils/uuid';
import { NoProviderConfiguredError } from '../utils/errors';
import { WelcomePage } from './pages/WelcomePage';
import { ChatPage } from './pages/ChatPage';

/**
 * Internal state for the webview
 */
interface WebviewState {
	currentPage: PageType;
	activeSession?: Session;
	isLoading: boolean;
	streamingContent?: string;
	error?: string;
}

export class CircuitXWebviewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'circuitx.chatView';

	private _view?: vscode.WebviewView;
	private sessionService: SessionService;
	private providerService: ProviderService;
	private llmService: LLMService;
	private currentRequestController?: AbortController;
	
	// Page state management (T030)
	private state: WebviewState = {
		currentPage: 'welcome',
		isLoading: false,
	};

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly extensionUri: vscode.Uri
	) {
		this.sessionService = new SessionService(context);
		this.providerService = new ProviderService(context);
		this.llmService = new LLMService();
	}

	/**
	 * Resolve the webview view
	 * Resolution Flow:
	 * 1. User clicks CircuitX panel icon
	 * ↓
	 * 2. VS Code looks up the view type ("circuitx.chatView")
	 * ↓
	 * 3. VS Code finds your registered provider
	 * ↓
	 * 4. VS Code calls resolveWebviewView() on your provider
	 * ↓
	 * 5. Your code sets up the webview
	 */
	public async resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		// Configure webview
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri],
		};

		// Set initial HTML
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
			await this._handleMessage(message);
		});

		// Send initial state
		const hasProviders = (await this.providerService.listProviders()).length > 0;
		const defaultProvider = await this.providerService.getDefaultProvider();

		this._postMessage({
			type: 'initialize',
			payload: {
				hasProviders,
				defaultProviderId: defaultProvider?.id,
			},
		});
	}

	/**
	 * Handle messages from webview
	 */
	private async _handleMessage(message: WebviewMessage): Promise<void> {
		try {
			switch (message.type) {
				case 'navigate':
					await this._handleNavigate(message);
					break;

				case 'sendMessage':
					await this._handleSendMessage(message);
					break;

				case 'cancelMessage':
					this._handleCancelMessage(message);
					break;

				case 'loadSession':
					await this._handleLoadSession(message);
					break;

				case 'deleteSession':
					await this._handleDeleteSession(message);
					break;

				case 'renameSession':
					await this._handleRenameSession(message);
					break;

				case 'loadSessionList':
					await this._handleLoadSessionList(message);
					break;

				case 'loadProviders':
					await this._handleLoadProviders(message);
					break;

				case 'addProvider':
					await this._handleAddProvider(message);
					break;

				case 'updateProvider':
					await this._handleUpdateProvider(message);
					break;

				case 'deleteProvider':
					await this._handleDeleteProvider(message);
					break;

				case 'testProvider':
					await this._handleTestProvider(message);
					break;
			}
		} catch (error) {
			// Send error to webview
			this._view?.webview.postMessage({
				type: message.type,
				error: (error as Error).name,
				requestId: message.requestId,
			} as any); // Using any here since error responses have flexible structure
		}
	}

	/**
	 * Navigate to a different page (T033)
	 */
	private async _handleNavigate(message: Extract<WebviewMessage, { type: 'navigate' }>): Promise<void> {
		const { page, sessionId } = message.payload;

		// Update state based on target page
		if (page === 'chat' && sessionId) {
			const session = await this.sessionService.load(sessionId);
			this._updateState({
				currentPage: 'chat',
				activeSession: session,
				isLoading: false,
				error: undefined,
			});
		} else if (page === 'welcome') {
			this._updateState({
				currentPage: 'welcome',
				activeSession: undefined,
				isLoading: false,
				error: undefined,
			});
		} else {
			this._updateState({
				currentPage: page,
				isLoading: false,
				error: undefined,
			});
		}
	}

	/**
	 * Send a message to the LLM (T031: handles Welcome page case)
	 */
	private async _handleSendMessage(message: Extract<WebviewMessage, { type: 'sendMessage' }>): Promise<void> {
		const { sessionId, content } = message.payload;

		// FR-007: Show loading state within 100ms
		this._updateState({ isLoading: true, error: undefined });

		// Get default provider (T045: FR-045 error handling)
		const provider = await this.providerService.getDefaultProvider();
		if (!provider) {
			// FR-045: Helpful error when no default provider is configured
			const errorMessage = 'No LLM provider configured. Please set up a provider in Settings (⚙️).';
			this._updateState({ isLoading: false, error: errorMessage });
			
			// Post error to webview
			this._postMessage({
				type: 'chatError',
				payload: {
					sessionId: sessionId || '',
					error: errorMessage,
				},
				requestId: message.requestId,
			});
			return; // Don't throw, just return after showing error
		}

		// Get API key
		const apiKey = (await this.providerService.getProviderApiKey(provider.id)) || '';

		// Load or create session
		let session;
		if (sessionId) {
			session = await this.sessionService.load(sessionId);
		} else {
			// T031: Create new session from Welcome page (FR-004, FR-005)
			const userMessage = {
				id: generateUUID(),
				role: 'user' as const,
				content,
				timestamp: new Date().toISOString(),
			};

			session = await this.sessionService.create(provider.id, userMessage);

			// T033: Navigate from Welcome to Chat page
			this._updateState({
				currentPage: 'chat',
				activeSession: session,
				isLoading: true,
				streamingContent: '',
			});

			// Notify webview with the new session loaded
			this._postMessage({
				type: 'sessionLoaded',
				payload: session,
				requestId: message.requestId,
			});
		}

		// Add user message to existing session if needed
		if (sessionId) {
			const userMessage = {
				id: generateUUID(),
				role: 'user' as const,
				content,
				timestamp: new Date().toISOString(),
			};

			session = await this.sessionService.update(sessionId, {
				messages: [...session.messages, userMessage],
			});
		}

		// Create assistant message placeholder
		const assistantMessageId = generateUUID();
		let assistantContent = '';

		// Send to LLM
		this.currentRequestController = this.llmService.sendMessage(
			provider,
			apiKey,
			session.messages,
			(chunk) => {
				// Handle streaming chunk - update state for re-render
				assistantContent += chunk;
				this._updateState({ streamingContent: assistantContent });
				this._postMessage({
					type: 'chatChunk',
					payload: {
						sessionId: session!.id,
						messageId: assistantMessageId,
						content: chunk,
					},
					requestId: message.requestId,
				});
			},
			(error) => {
				// Handle error - update state and notify webview
				this._updateState({ isLoading: false, error: error.message, streamingContent: undefined });
				this._postMessage({
					type: 'chatError',
					payload: {
						sessionId: session!.id,
						error: error.message,
					},
					requestId: message.requestId,
				});
				this.currentRequestController = undefined;
			},
			async () => {
				// Handle completion
				const assistantMessage = {
					id: assistantMessageId,
					role: 'assistant' as const,
					content: assistantContent,
					timestamp: new Date().toISOString(),
				};

				// Save to session
				const updatedSession = await this.sessionService.update(session!.id, {
					messages: [...session!.messages, assistantMessage],
				});

				// Update state with completed session
				this._updateState({
					isLoading: false,
					streamingContent: undefined,
					activeSession: updatedSession,
				});

				this._postMessage({
					type: 'chatComplete',
					payload: {
						sessionId: session!.id,
						messageId: assistantMessageId,
						fullContent: assistantContent,
					},
					requestId: message.requestId,
				});

				this.currentRequestController = undefined;
			}
		);
	}

	/**
	 * Cancel the current request
	 */
	private _handleCancelMessage(message: Extract<WebviewMessage, { type: 'cancelMessage' }>): void {
		if (this.currentRequestController) {
			this.currentRequestController.abort();

			this._postMessage({
				type: 'chatCancelled',
				payload: {
					sessionId: message.payload.sessionId,
				},
				requestId: message.requestId,
			});

			this.currentRequestController = undefined;
		}
	}

	/**
	 * Load a session
	 */
	private async _handleLoadSession(message: Extract<WebviewMessage, { type: 'loadSession' }>): Promise<void> {
		const session = await this.sessionService.load(message.payload.sessionId);

		this._postMessage({
			type: 'sessionLoaded',
			payload: {
				id: session.id,
				title: session.title,
				createdAt: session.createdAt,
				updatedAt: session.updatedAt,
				messages: session.messages,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Delete a session
	 */
	private async _handleDeleteSession(message: Extract<WebviewMessage, { type: 'deleteSession' }>): Promise<void> {
		await this.sessionService.delete(message.payload.sessionId);

		this._postMessage({
			type: 'sessionDeleted',
			payload: {
				sessionId: message.payload.sessionId,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Rename a session
	 */
	private async _handleRenameSession(message: Extract<WebviewMessage, { type: 'renameSession' }>): Promise<void> {
		const session = await this.sessionService.update(message.payload.sessionId, {
			title: message.payload.title,
		});

		this._postMessage({
			type: 'sessionRenamed',
			payload: {
				sessionId: session.id,
				title: session.title,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Load session list
	 */
	private async _handleLoadSessionList(message: Extract<WebviewMessage, { type: 'loadSessionList' }>): Promise<void> {
		const page = message.payload?.page ?? 0;
		const pageSize = message.payload?.pageSize ?? 20;

		const sessions = await this.sessionService.list(page, pageSize);

		// TODO: Get total count for hasMore calculation
		// For now, assume hasMore if we got a full page
		const hasMore = sessions.length === pageSize;

		this._postMessage({
			type: 'sessionListLoaded',
			payload: {
				sessions,
				total: sessions.length, // TODO: Implement total count
				page,
				pageSize,
				hasMore,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Load providers
	 */
	private async _handleLoadProviders(message: Extract<WebviewMessage, { type: 'loadProviders' }>): Promise<void> {
		const providers = await this.providerService.listProviders();

		this._postMessage({
			type: 'providersLoaded',
			payload: {
				providers,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Add a provider
	 */
	private async _handleAddProvider(message: Extract<WebviewMessage, { type: 'addProvider' }>): Promise<void> {
		const { name, baseUrl, model, apiKey, isDefault } = message.payload;

		const provider = await this.providerService.addProvider(name, baseUrl, model, apiKey, isDefault);

		this._postMessage({
			type: 'providerAdded',
			payload: provider,
			requestId: message.requestId,
		});
	}

	/**
	 * Update a provider
	 */
	private async _handleUpdateProvider(message: Extract<WebviewMessage, { type: 'updateProvider' }>): Promise<void> {
		const { id, ...updates } = message.payload;

		const provider = await this.providerService.updateProvider(id, updates, updates.apiKey);

		this._postMessage({
			type: 'providerUpdated',
			payload: provider,
			requestId: message.requestId,
		});
	}

	/**
	 * Delete a provider
	 */
	private async _handleDeleteProvider(message: Extract<WebviewMessage, { type: 'deleteProvider' }>): Promise<void> {
		await this.providerService.deleteProvider(message.payload.id);

		this._postMessage({
			type: 'providerDeleted',
			payload: {
				id: message.payload.id,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Test a provider connection
	 */
	private async _handleTestProvider(message: Extract<WebviewMessage, { type: 'testProvider' }>): Promise<void> {
		const { id } = message.payload;
		const provider = await this.providerService.getProvider(id);
		const apiKey = (await this.providerService.getProviderApiKey(id)) || '';

		const startTime = Date.now();

		try {
			// Send a simple test message
			const testMessages = [
				{
					id: generateUUID(),
					role: 'user' as const,
					content: 'Hi',
					timestamp: new Date().toISOString(),
				},
			];

			await new Promise<void>((resolve, reject) => {
				this.llmService.sendMessage(
					provider,
					apiKey,
					testMessages,
					() => {},
					reject,
					resolve
				);
			});

			const latency = Date.now() - startTime;

			this._postMessage({
				type: 'providerTestResult',
				payload: {
					id,
					success: true,
					message: 'Connection successful',
					latency,
				},
				requestId: message.requestId,
			});
		} catch (error) {
			this._postMessage({
				type: 'providerTestResult',
				payload: {
					id,
					success: false,
					message: (error as Error).message,
				},
				requestId: message.requestId,
			});
		}
	}

	/**
	 * Post a message to the webview
	 */
	private _postMessage(message: ExtensionMessage): void {
		this._view?.webview.postMessage(message);
	}

	/**
	 * Update state and re-render webview
	 */
	private _updateState(updates: Partial<WebviewState>): void {
		this.state = { ...this.state, ...updates };
		this._render();
	}

	/**
	 * Re-render the webview with current state
	 */
	private _render(): void {
		if (this._view) {
			this._view.webview.html = this._getHtmlForWebview(this._view.webview);
		}
	}

	/**
	 * Generate HTML for webview based on current page state (T030, T033)
	 */
	private _getHtmlForWebview(webview: vscode.Webview): string {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'styles', 'main.css'));
		const nonce = this._getNonce();

		// Render the appropriate page based on state
		let pageContent: string;
		switch (this.state.currentPage) {
			case 'chat':
				if (this.state.activeSession) {
					pageContent = ChatPage({
						session: this.state.activeSession,
						isLoading: this.state.isLoading,
						streamingContent: this.state.streamingContent,
						error: this.state.error,
					});
				} else {
					// Fallback to welcome if no session
					pageContent = WelcomePage({
						isLoading: this.state.isLoading,
						error: this.state.error,
					});
				}
				break;
			case 'welcome':
			default:
				pageContent = WelcomePage({
					isLoading: this.state.isLoading,
					error: this.state.error,
				});
				break;
		}

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<link href="${styleUri}" rel="stylesheet">
	<title>CircuitX</title>
</head>
<body>
	<div id="app">${pageContent}</div>
	<script nonce="${nonce}">
		// Global vscode API for all pages
		const vscode = acquireVsCodeApi();
		
		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			console.log('Received message:', message.type);
		});
	</script>
</body>
</html>`;
	}

	/**
	 * Generate a nonce for CSP
	 */
	private _getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}
