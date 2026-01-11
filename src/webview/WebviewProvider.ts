/**
 * WebviewProvider - Manages the CircuitX webview panel
 * Implements: T019-T022, T030, T031, T033 - WebviewViewProvider with page routing and state management
 */

import * as vscode from 'vscode';
import { WebviewMessage, ExtensionMessage, PageType } from '../models/WebviewMessages';
import { Session, SessionMetadata } from '../models/Session';
import { SessionService } from '../services/SessionService';
import { ProviderService } from '../services/ProviderService';
import { LLMService } from '../services/LLMService';
import { generateUUID } from '../utils/uuid';
import { NoProviderConfiguredError } from '../utils/errors';
import { WelcomePage } from './pages/WelcomePage';
import { ChatPage } from './pages/ChatPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { HistoryPage } from './pages/HistoryPage';
import { LLMProvider } from '../models/LLMProvider';

/**
 * Internal state for the webview
 */
interface WebviewState {
	currentPage: PageType;
	activeSession?: Session;
	isLoading: boolean;
	streamingContent?: string;
	error?: string;
	successMessage?: string;
	// Provider management state
	providers?: LLMProvider[];
	defaultProviderId?: string;
	editingProvider?: LLMProvider;
	showAddForm?: boolean;
	testingProviderId?: string;
	// History page state
	sessionList?: SessionMetadata[];
	sessionPage?: number;
	sessionHasMore?: boolean;
	sessionTotal?: number;
	editingSessionId?: string;
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

		// T079: Restore webview state from previous session
		await this._restoreState(context);

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

		// T079: Persist webview state when visibility changes
		webviewView.onDidChangeVisibility(() => {
			this._saveState();
		});

		// T079: Persist state when webview is disposed
		webviewView.onDidDispose(() => {
			this._saveState();
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

				case 'confirmDeleteSession':
					await this._handleConfirmDeleteSession(message);
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

				case 'confirmDeleteProvider':
					await this._handleConfirmDeleteProvider(message);
					break;

				case 'deleteProvider':
					await this._handleDeleteProvider(message);
					break;

				case 'testProvider':
					await this._handleTestProvider(message);
					break;

				case 'setDefaultProvider':
					await this._handleSetDefaultProvider(message);
					break;

				case 'startEditSession':
					this._handleStartEditSession(message);
					break;

				case 'cancelEditSession':
					this._handleCancelEditSession();
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
		const { page, sessionId, providerId } = message.payload;

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
		} else if (page === 'providers') {
			// Load providers and navigate to providers page
			const providers = await this.providerService.listProviders();
			const defaultProvider = await this.providerService.getDefaultProvider();
			this._updateState({
				currentPage: 'providers',
				providers,
				defaultProviderId: defaultProvider?.id,
				editingProvider: undefined,
				showAddForm: false,
				isLoading: false,
				error: undefined,
				successMessage: undefined,
			});
		} else if (page === 'addProvider') {
			// Show add provider form
			const providers = await this.providerService.listProviders();
			const defaultProvider = await this.providerService.getDefaultProvider();
			this._updateState({
				currentPage: 'providers',
				providers,
				defaultProviderId: defaultProvider?.id,
				editingProvider: undefined,
				showAddForm: true,
				isLoading: false,
				error: undefined,
			});
		} else if (page === 'editProvider' && providerId) {
			// Show edit provider form
			const providers = await this.providerService.listProviders();
			const defaultProvider = await this.providerService.getDefaultProvider();
			const editingProvider = providers.find(p => p.id === providerId);
			this._updateState({
				currentPage: 'providers',
				providers,
				defaultProviderId: defaultProvider?.id,
				editingProvider,
				showAddForm: false,
				isLoading: false,
				error: undefined,
			});
		} else if (page === 'history') {
			// Load session list and navigate to history page (T070, T072)
			this._updateState({ currentPage: 'history', isLoading: true });
			const sessions = await this.sessionService.list(0, 20);
			const hasMore = sessions.length === 20;
			this._updateState({
				currentPage: 'history',
				sessionList: sessions,
				sessionPage: 0,
				sessionHasMore: hasMore,
				editingSessionId: undefined,
				isLoading: false,
				error: undefined,
				successMessage: undefined,
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

		// Get default provider (T045: FR-045 error handling)
		const provider = await this.providerService.getDefaultProvider();
		if (!provider) {
			// FR-045: Helpful error when no default provider is configured
			const errorMessage = 'No LLM provider configured. Please set up a provider in Settings (⚙️).';
			this.state = { ...this.state, isLoading: false, error: errorMessage };
			
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
		let userMessage;
		
		if (sessionId) {
			// EXISTING SESSION: Load and add user message incrementally (no re-render)
			session = await this.sessionService.load(sessionId);
			
			userMessage = {
				id: generateUUID(),
				role: 'user' as const,
				content,
				timestamp: new Date().toISOString(),
			};

			session = await this.sessionService.update(sessionId, {
				messages: [...session.messages, userMessage],
			});
			
			// Update internal state without re-render
			this.state = { ...this.state, isLoading: true, error: undefined, activeSession: session };
			
			// Send incremental update to webview (no full re-render)
			this._postMessage({
				type: 'chatStarted',
				payload: {
					sessionId: session.id,
					userMessage,
				},
				requestId: message.requestId,
			});
		} else {
			// NEW SESSION: Create new session from Welcome page (T031: FR-004, FR-005)
			userMessage = {
				id: generateUUID(),
				role: 'user' as const,
				content,
				timestamp: new Date().toISOString(),
			};

			session = await this.sessionService.create(provider.id, userMessage);

			// T033: Navigate from Welcome to Chat page - this DOES need re-render
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

		// Create assistant message placeholder
		const assistantMessageId = generateUUID();
		let assistantContent = '';

		// Send to LLM
		this.currentRequestController = this.llmService.sendMessage(
			provider,
			apiKey,
			session.messages,
			(chunk) => {
				// Handle streaming chunk - send to webview for incremental update (no re-render)
				assistantContent += chunk;
				// Don't call _updateState here - it causes full re-render and scroll reset
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
				// Handle error - update internal state but don't re-render (webview handles display)
				this.state = { ...this.state, isLoading: false, error: error.message, streamingContent: undefined };
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

				// Update state without re-render (webview handles the completed message)
				this.state = {
					...this.state,
					isLoading: false,
					streamingContent: undefined,
					activeSession: updatedSession,
				};

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
	 * Confirm and delete a session (shows VS Code native dialog)
	 */
	private async _handleConfirmDeleteSession(message: { payload: { sessionId: string; sessionTitle: string }; requestId?: string }): Promise<void> {
		const { sessionId, sessionTitle } = message.payload;
		
		const result = await vscode.window.showWarningMessage(
			`Delete session "${sessionTitle}"?\n\nThis cannot be undone.`,
			{ modal: true },
			'Delete'
		);
		
		if (result === 'Delete') {
			await this._handleDeleteSession({
				type: 'deleteSession',
				payload: { sessionId },
				requestId: message.requestId,
			});
		}
	}

	/**
	 * Delete a session (T076: FR-021)
	 */
	private async _handleDeleteSession(message: Extract<WebviewMessage, { type: 'deleteSession' }>): Promise<void> {
		await this.sessionService.delete(message.payload.sessionId);

		// If on history page, refresh the list
		if (this.state.currentPage === 'history') {
			const sessions = await this.sessionService.list(this.state.sessionPage || 0, 20);
			const hasMore = sessions.length === 20;
			this._updateState({
				sessionList: sessions,
				sessionHasMore: hasMore,
				successMessage: 'Session deleted',
			});
		}

		this._postMessage({
			type: 'sessionDeleted',
			payload: {
				sessionId: message.payload.sessionId,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Rename a session (T074: FR-019)
	 */
	private async _handleRenameSession(message: Extract<WebviewMessage, { type: 'renameSession' }>): Promise<void> {
		const session = await this.sessionService.update(message.payload.sessionId, {
			title: message.payload.title,
		});

		// If on history page, refresh the list and clear edit mode
		if (this.state.currentPage === 'history') {
			const sessions = await this.sessionService.list(this.state.sessionPage || 0, 20);
			const hasMore = sessions.length === 20;
			this._updateState({
				sessionList: sessions,
				sessionHasMore: hasMore,
				editingSessionId: undefined,
				successMessage: 'Session renamed',
			});
		}

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
	 * Start editing a session title (T073)
	 */
	private _handleStartEditSession(message: { payload: { sessionId: string } }): void {
		this._updateState({
			editingSessionId: message.payload.sessionId,
		});
	}

	/**
	 * Cancel editing a session title
	 */
	private _handleCancelEditSession(): void {
		this._updateState({
			editingSessionId: undefined,
		});
	}

	/**
	 * Load session list (T071, T072: pagination)
	 */
	private async _handleLoadSessionList(message: Extract<WebviewMessage, { type: 'loadSessionList' }>): Promise<void> {
		const page = message.payload?.page ?? 0;
		const pageSize = message.payload?.pageSize ?? 20;

		const sessions = await this.sessionService.list(page, pageSize);

		// TODO: Get total count for hasMore calculation
		// For now, assume hasMore if we got a full page
		const hasMore = sessions.length === pageSize;

		// Update state for history page
		this._updateState({
			sessionList: sessions,
			sessionPage: page,
			sessionHasMore: hasMore,
		});

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
	 * Add a provider (T055: FR-024, FR-025, FR-026)
	 */
	private async _handleAddProvider(message: Extract<WebviewMessage, { type: 'addProvider' }>): Promise<void> {
		const { name, baseUrl, model, apiKey, isDefault } = message.payload;

		const provider = await this.providerService.addProvider(name, baseUrl, model, apiKey, isDefault);

		// Refresh providers list and navigate back to list view
		const providers = await this.providerService.listProviders();
		const defaultProvider = await this.providerService.getDefaultProvider();

		this._updateState({
			providers,
			defaultProviderId: defaultProvider?.id,
			showAddForm: false,
			editingProvider: undefined,
			successMessage: `Provider "${provider.name}" added successfully`,
		});

		this._postMessage({
			type: 'providerAdded',
			payload: provider,
			requestId: message.requestId,
		});
	}

	/**
	 * Update a provider (T056: FR-027)
	 */
	private async _handleUpdateProvider(message: Extract<WebviewMessage, { type: 'updateProvider' }>): Promise<void> {
		const { id, ...updates } = message.payload;

		const provider = await this.providerService.updateProvider(id, updates, updates.apiKey);

		// Refresh providers list and navigate back to list view
		const providers = await this.providerService.listProviders();
		const defaultProvider = await this.providerService.getDefaultProvider();

		this._updateState({
			providers,
			defaultProviderId: defaultProvider?.id,
			showAddForm: false,
			editingProvider: undefined,
			successMessage: `Provider "${provider.name}" updated successfully`,
		});

		this._postMessage({
			type: 'providerUpdated',
			payload: provider,
			requestId: message.requestId,
		});
	}

	/**
	 * Confirm and delete a provider (shows VS Code native dialog)
	 */
	private async _handleConfirmDeleteProvider(message: { payload: { providerId: string; providerName: string }; requestId?: string }): Promise<void> {
		const { providerId, providerName } = message.payload;
		
		const result = await vscode.window.showWarningMessage(
			`Delete provider "${providerName}"?\n\nThis cannot be undone.`,
			{ modal: true },
			'Delete'
		);
		
		if (result === 'Delete') {
			await this._handleDeleteProvider({
				type: 'deleteProvider',
				payload: { providerId },
				requestId: message.requestId,
			});
		}
	}

	/**
	 * Delete a provider (T058: FR-028, FR-031)
	 */
	private async _handleDeleteProvider(message: Extract<WebviewMessage, { type: 'deleteProvider' }>): Promise<void> {
		const providerId = message.payload.providerId || message.payload.id;
		if (!providerId) {
			throw new Error('Provider ID is required');
		}
		
		await this.providerService.deleteProvider(providerId);

		// Refresh providers list
		const providers = await this.providerService.listProviders();
		const defaultProvider = await this.providerService.getDefaultProvider();

		this._updateState({
			providers,
			defaultProviderId: defaultProvider?.id,
			successMessage: 'Provider deleted successfully',
		});

		this._postMessage({
			type: 'providerDeleted',
			payload: {
				id: providerId,
			},
			requestId: message.requestId,
		});
	}

	/**
	 * Test a provider connection (T060: FR-026)
	 */
	private async _handleTestProvider(message: Extract<WebviewMessage, { type: 'testProvider' }>): Promise<void> {
		const providerId = message.payload.providerId || message.payload.id;
		if (!providerId) {
			throw new Error('Provider ID is required');
		}
		
		const provider = await this.providerService.getProvider(providerId);
		const apiKey = (await this.providerService.getProviderApiKey(providerId)) || '';

		// Show testing state
		this._updateState({ testingProviderId: providerId });

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

			// Clear testing state
			this._updateState({ testingProviderId: undefined });

			this._postMessage({
				type: 'providerTestResult',
				payload: {
					id: providerId,
					success: true,
					message: 'Connection successful',
					latency,
				},
				requestId: message.requestId,
			});
		} catch (error) {
			// Clear testing state
			this._updateState({ testingProviderId: undefined });

			this._postMessage({
				type: 'providerTestResult',
				payload: {
					id: providerId,
					success: false,
					message: (error as Error).message,
				},
				requestId: message.requestId,
			});
		}
	}

	/**
	 * Set default provider (T059: FR-029)
	 */
	private async _handleSetDefaultProvider(message: Extract<WebviewMessage, { type: 'setDefaultProvider' }>): Promise<void> {
		const providerId = message.payload.providerId;

		await this.providerService.setDefaultProvider(providerId);

		// Refresh state
		const providers = await this.providerService.listProviders();

		this._updateState({
			providers,
			defaultProviderId: providerId,
			successMessage: 'Default provider updated',
		});

		this._postMessage({
			type: 'defaultProviderSet',
			payload: { providerId },
			requestId: message.requestId,
		});
	}

	/**
	 * Post a message to the webview
	 */
	private _postMessage(message: ExtensionMessage): void {
		this._view?.webview.postMessage(message);
	}

	/**
	 * T079: Save webview state for VS Code restart recovery
	 * Persists the current page and active session ID to workspace state
	 */
	private _saveState(): void {
		const persistedState = {
			currentPage: this.state.currentPage,
			activeSessionId: this.state.activeSession?.id,
		};
		this.context.workspaceState.update('circuitx.webviewState', persistedState);
	}

	/**
	 * T079: Restore webview state from previous session
	 * Recovers the page and reloads the active session if available
	 */
	private async _restoreState(context: vscode.WebviewViewResolveContext): Promise<void> {
		const persistedState = this.context.workspaceState.get<{
			currentPage: PageType;
			activeSessionId?: string;
		}>('circuitx.webviewState');

		if (persistedState) {
			this.state.currentPage = persistedState.currentPage;

			// Restore active session if it was on the chat page
			if (persistedState.activeSessionId && persistedState.currentPage === 'chat') {
				try {
					const session = await this.sessionService.load(persistedState.activeSessionId);
					this.state.activeSession = session;
				} catch {
					// Session may have been deleted - fallback to welcome
					this.state.currentPage = 'welcome';
				}
			}

			// Preload data for non-chat pages
			if (persistedState.currentPage === 'providers') {
				const providers = await this.providerService.listProviders();
				const defaultProvider = await this.providerService.getDefaultProvider();
				this.state.providers = providers;
				this.state.defaultProviderId = defaultProvider?.id;
			} else if (persistedState.currentPage === 'history') {
				const sessions = await this.sessionService.list(0, 20);
				this.state.sessionList = sessions;
				this.state.sessionPage = 0;
				this.state.sessionHasMore = sessions.length === 20;
			}
		}
	}

	/**
	 * Update state and re-render webview
	 */
	private _updateState(updates: Partial<WebviewState>): void {
		this.state = { ...this.state, ...updates };
		this._render();
		// T079: Auto-save state on updates
		this._saveState();
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
			case 'providers':
				pageContent = ProvidersPage({
					providers: this.state.providers || [],
					defaultProviderId: this.state.defaultProviderId,
					editingProvider: this.state.editingProvider,
					showAddForm: this.state.showAddForm,
					testingProviderId: this.state.testingProviderId,
					error: this.state.error,
					successMessage: this.state.successMessage,
				});
				break;
			case 'history':
				pageContent = HistoryPage({
					sessions: this.state.sessionList || [],
					page: this.state.sessionPage || 0,
					hasMore: this.state.sessionHasMore || false,
					total: this.state.sessionTotal,
					editingSessionId: this.state.editingSessionId,
					isLoading: this.state.isLoading,
					error: this.state.error,
					successMessage: this.state.successMessage,
				});
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
		
		// Handle messages from extension (incremental updates for streaming)
		window.addEventListener('message', event => {
			const message = event.data;
			console.log('[CircuitX] Received message:', message.type, message);
			
			switch (message.type) {
				case 'chatChunk': {
					// Incrementally update streaming content without full re-render
					let streamingEl = document.getElementById('streaming-message');
					const messageList = document.getElementById('message-list');
					
					if (!streamingEl && messageList) {
						// Create streaming message element if it doesn't exist
						const wrapper = document.createElement('div');
						wrapper.innerHTML = \`
							<div class="message assistant-message" id="streaming-message">
								<div class="message-avatar">🤖</div>
								<div class="message-content">
									<div class="message-text" id="streaming-text"></div>
								</div>
							</div>
						\`;
						messageList.appendChild(wrapper.firstElementChild);
						streamingEl = document.getElementById('streaming-message');
					}
					
					const textEl = document.getElementById('streaming-text');
					if (textEl) {
						textEl.textContent = (textEl.textContent || '') + message.payload.content;
					}
					
					// Auto-scroll to bottom
					if (messageList) {
						messageList.scrollTop = messageList.scrollHeight;
					}
					break;
				}
				
				case 'chatComplete': {
					// Mark streaming as complete
					const streamingEl = document.getElementById('streaming-message');
					if (streamingEl) {
						streamingEl.removeAttribute('id');
						// Add timestamp
						const contentDiv = streamingEl.querySelector('.message-content');
						if (contentDiv) {
							const timestamp = document.createElement('div');
							timestamp.className = 'message-timestamp';
							timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
							contentDiv.appendChild(timestamp);
						}
					}
					
					// Remove streaming indicator from streaming text
					const streamingText = document.getElementById('streaming-text');
					if (streamingText) {
						streamingText.removeAttribute('id');
					}
					
					// Hide loading indicator
					const loadingIndicator = document.querySelector('.loading-indicator');
					if (loadingIndicator) {
						loadingIndicator.style.display = 'none';
					}
					
					// Enable input
					const chatInput = document.getElementById('chat-input');
					const sendBtn = document.getElementById('chat-send-btn');
					const cancelBtn = document.getElementById('chat-cancel-btn');
					if (chatInput) chatInput.disabled = false;
					if (sendBtn) sendBtn.style.display = '';
					if (cancelBtn) cancelBtn.style.display = 'none';
					
					// Auto-scroll to bottom
					const messageList = document.getElementById('message-list');
					if (messageList) {
						messageList.scrollTop = messageList.scrollHeight;
					}
					break;
				}
				
				case 'chatError': {
					// Display error
					const streamingEl = document.getElementById('streaming-message');
					if (streamingEl) {
						streamingEl.remove();
					}
					
					const messageList = document.getElementById('message-list');
					if (messageList) {
						const errorEl = document.createElement('div');
						errorEl.className = 'error-message';
						errorEl.textContent = message.payload.error;
						messageList.appendChild(errorEl);
						messageList.scrollTop = messageList.scrollHeight;
					}
					
					// Hide loading, enable input
					const loadingIndicator = document.querySelector('.loading-indicator');
					if (loadingIndicator) {
						loadingIndicator.style.display = 'none';
					}
					
					const chatInput = document.getElementById('chat-input');
					const sendBtn = document.getElementById('chat-send-btn');
					const cancelBtn = document.getElementById('chat-cancel-btn');
					if (chatInput) chatInput.disabled = false;
					if (sendBtn) sendBtn.style.display = '';
					if (cancelBtn) cancelBtn.style.display = 'none';
					break;
				}
				
				case 'chatCancelled': {
					// Remove streaming message
					const streamingEl = document.getElementById('streaming-message');
					if (streamingEl) {
						streamingEl.remove();
					}
					
					// Hide loading, enable input
					const loadingIndicator = document.querySelector('.loading-indicator');
					if (loadingIndicator) {
						loadingIndicator.style.display = 'none';
					}
					
					const chatInput = document.getElementById('chat-input');
					const sendBtn = document.getElementById('chat-send-btn');
					const cancelBtn = document.getElementById('chat-cancel-btn');
					if (chatInput) chatInput.disabled = false;
					if (sendBtn) sendBtn.style.display = '';
					if (cancelBtn) cancelBtn.style.display = 'none';
					break;
				}
				
				case 'chatStarted': {
					// Incrementally add user message and show loading (no re-render)
					const messageList = document.getElementById('message-list');
					if (messageList && message.payload.userMessage) {
						const { content, timestamp } = message.payload.userMessage;
						const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
						
						// Add user message
						const userMsgWrapper = document.createElement('div');
						userMsgWrapper.innerHTML = \`
							<div class="message user-message">
								<div class="message-avatar">👤</div>
								<div class="message-content">
									<div class="message-text">\${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
									<div class="message-timestamp">\${time}</div>
								</div>
							</div>
						\`;
						messageList.appendChild(userMsgWrapper.firstElementChild);
						
						// Scroll to bottom
						messageList.scrollTop = messageList.scrollHeight;
					}
					
					// Show loading indicator, disable input, show cancel
					const loadingIndicator = document.querySelector('.loading-indicator');
					if (loadingIndicator) {
						loadingIndicator.style.display = '';
					}
					
					const chatInput = document.getElementById('chat-input');
					const sendBtn = document.getElementById('chat-send-btn');
					const cancelBtn = document.getElementById('chat-cancel-btn');
					if (chatInput) {
						chatInput.disabled = true;
						chatInput.value = '';
					}
					if (sendBtn) sendBtn.style.display = 'none';
					if (cancelBtn) cancelBtn.style.display = '';
					break;
				}
			}
		});
		
		// Global click handler for data-action elements (navigation, etc.)
		document.addEventListener('click', (e) => {
			const target = e.target.closest('[data-action]');
			if (!target) return;
			
			const action = target.dataset.action;
			const page = target.dataset.page;
			const sessionId = target.dataset.sessionId;
			const providerId = target.dataset.providerId;
			const providerName = target.dataset.providerName;
			const sessionTitle = target.dataset.sessionTitle;
			
			console.log('[CircuitX] Click action:', action, { page, sessionId, providerId, providerName, sessionTitle });
			
			switch (action) {
				case 'navigate':
					if (page) {
						console.log('[CircuitX] Navigating to:', page);
						vscode.postMessage({ 
							type: 'navigate', 
							payload: { page, sessionId, providerId } 
						});
					}
					break;
					
				case 'open':
					// Open session in chat
					if (sessionId) {
						vscode.postMessage({
							type: 'navigate',
							payload: { page: 'chat', sessionId }
						});
					}
					break;
					
				case 'edit':
					// Start editing session
					if (sessionId) {
						vscode.postMessage({
							type: 'startEditSession',
							payload: { sessionId }
						});
					}
					break;
					
				case 'save':
					// Save session edit
					if (sessionId) {
						const input = document.getElementById('edit-session-' + sessionId);
						if (input && input.value.trim()) {
							vscode.postMessage({
								type: 'renameSession',
								payload: { sessionId, title: input.value.trim() },
								requestId: crypto.randomUUID()
							});
						}
					}
					break;
					
				case 'cancelEdit':
					vscode.postMessage({ type: 'cancelEditSession' });
					break;
					
				case 'delete':
					// Delete session - confirmation handled by extension
					console.log('[CircuitX] Delete session:', sessionId, sessionTitle);
					if (sessionId) {
						vscode.postMessage({
							type: 'confirmDeleteSession',
							payload: { sessionId, sessionTitle: sessionTitle || 'Untitled' },
							requestId: crypto.randomUUID()
						});
					}
					break;
					
				case 'deleteProvider':
					// Delete provider - confirmation handled by extension
					console.log('[CircuitX] Delete provider:', providerId, providerName);
					if (providerId) {
						vscode.postMessage({
							type: 'confirmDeleteProvider',
							payload: { providerId, providerName: providerName || providerId },
							requestId: crypto.randomUUID()
						});
					}
					break;
					
				case 'test':
					// Test provider connection
					if (providerId) {
						vscode.postMessage({
							type: 'testProvider',
							payload: { providerId },
							requestId: crypto.randomUUID()
						});
					}
					break;
					
				case 'setDefault':
					// Set default provider
					if (providerId) {
						vscode.postMessage({
							type: 'setDefaultProvider',
							payload: { providerId },
							requestId: crypto.randomUUID()
						});
					}
					break;
					
				case 'prevPage':
					const prevPageInfo = document.querySelector('.pagination-info');
					if (prevPageInfo) {
						const match = prevPageInfo.textContent.match(/Page (\\d+)/);
						const currentPage = match ? parseInt(match[1], 10) - 1 : 0;
						vscode.postMessage({
							type: 'loadSessionList',
							payload: { page: Math.max(0, currentPage - 1), pageSize: 20 },
							requestId: crypto.randomUUID()
						});
					}
					break;
					
				case 'nextPage':
					const nextPageInfo = document.querySelector('.pagination-info');
					if (nextPageInfo) {
						const match = nextPageInfo.textContent.match(/Page (\\d+)/);
						const currentPage = match ? parseInt(match[1], 10) - 1 : 0;
						vscode.postMessage({
							type: 'loadSessionList',
							payload: { page: currentPage + 1, pageSize: 20 },
							requestId: crypto.randomUUID()
						});
					}
					break;
			}
		});
		
		// Handle keyboard events for edit inputs
		document.addEventListener('keydown', (e) => {
			if (e.target.classList && e.target.classList.contains('session-edit-input')) {
				const sessionId = e.target.dataset.sessionId;
				if (e.key === 'Enter') {
					e.preventDefault();
					const trimmedTitle = e.target.value.trim();
					if (trimmedTitle) {
						vscode.postMessage({
							type: 'renameSession',
							payload: { sessionId, title: trimmedTitle },
							requestId: crypto.randomUUID()
						});
					}
				} else if (e.key === 'Escape') {
					e.preventDefault();
					vscode.postMessage({ type: 'cancelEditSession' });
				}
			}
			
			// Handle Enter key for welcome/chat inputs
			const welcomeInput = document.getElementById('welcome-input');
			const chatInput = document.getElementById('chat-input');
			if ((e.target === welcomeInput || e.target === chatInput) && e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				const input = e.target;
				const content = input.value?.trim();
				if (content) {
					const sessionIdAttr = input.closest('[data-session-id]')?.dataset?.sessionId;
					const payload = sessionIdAttr ? { sessionId: sessionIdAttr, content } : { content };
					vscode.postMessage({
						type: 'sendMessage',
						payload,
						requestId: crypto.randomUUID()
					});
					if (e.target === chatInput) {
						input.value = '';
					}
				}
			}
		});
		
		// Handle form submissions
		document.addEventListener('submit', (e) => {
			const form = e.target;
			console.log('[CircuitX] Form submit:', form.id);
			if (form.id !== 'provider-form-element') return;
			
			e.preventDefault();
			const formData = new FormData(form);
			const isEditMode = form.dataset.editMode === 'true';
			console.log('[CircuitX] Provider form submit, editMode:', isEditMode);
			
			const data = {
				name: formData.get('name')?.toString().trim() || '',
				baseUrl: formData.get('baseUrl')?.toString().trim() || '',
				model: formData.get('model')?.toString().trim() || '',
				apiKey: formData.get('apiKey')?.toString() || '',
				isDefault: formData.get('isDefault') === 'on',
			};
			console.log('[CircuitX] Form data:', data);
			
			// Client-side validation
			if (!data.name || !data.baseUrl || !data.model) {
				alert('Please fill in all required fields');
				return;
			}
			
			// URL validation
			try {
				new URL(data.baseUrl);
			} catch {
				alert('Please enter a valid URL for Base URL');
				return;
			}
			
			if (isEditMode) {
				const id = formData.get('id')?.toString();
				console.log('[CircuitX] Updating provider:', id, data);
				vscode.postMessage({
					type: 'updateProvider',
					payload: { id, ...data },
					requestId: crypto.randomUUID()
				});
			} else {
				console.log('[CircuitX] Adding provider:', data);
				vscode.postMessage({
					type: 'addProvider',
					payload: data,
					requestId: crypto.randomUUID()
				});
			}
		});
		
		// Handle button clicks for welcome/chat pages
		document.addEventListener('click', (e) => {
			// Welcome send button
			if (e.target.id === 'welcome-send-btn') {
				const input = document.getElementById('welcome-input');
				const content = input?.value?.trim();
				if (content) {
					vscode.postMessage({
						type: 'sendMessage',
						payload: { content },
						requestId: crypto.randomUUID()
					});
				}
			}
			
			// Chat send button
			if (e.target.id === 'chat-send-btn') {
				const input = document.getElementById('chat-input');
				const content = input?.value?.trim();
				if (content) {
					// Get session ID from page
					const chatPage = document.querySelector('.chat-page');
					const sessionId = chatPage?.dataset?.sessionId;
					vscode.postMessage({
						type: 'sendMessage',
						payload: { content, sessionId },
						requestId: crypto.randomUUID()
					});
					input.value = '';
				}
			}
			
			// Chat cancel button
			if (e.target.id === 'chat-cancel-btn') {
				const chatPage = document.querySelector('.chat-page');
				const sessionId = chatPage?.dataset?.sessionId;
				vscode.postMessage({
					type: 'cancelMessage',
					payload: { sessionId },
					requestId: crypto.randomUUID()
				});
			}
		});
		
		// Auto-scroll message list
		const messageList = document.getElementById('message-list');
		if (messageList) {
			// Initial scroll
			messageList.scrollTop = messageList.scrollHeight;
			
			// Observe for new messages
			const observer = new MutationObserver(() => {
				const wasAtBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 100;
				if (wasAtBottom) {
					messageList.scrollTop = messageList.scrollHeight;
				}
			});
			observer.observe(messageList, { childList: true, subtree: true, characterData: true });
			
			window.scrollMessagesToBottom = () => {
				messageList.scrollTop = messageList.scrollHeight;
			};
		}
		
		// Focus input on page load
		const welcomeInput = document.getElementById('welcome-input');
		const chatInput = document.getElementById('chat-input');
		(welcomeInput || chatInput)?.focus();
		
		// Auto-dismiss success messages
		const autoDismissElements = document.querySelectorAll('[data-auto-dismiss]');
		autoDismissElements.forEach(el => {
			const delay = parseInt(el.dataset.autoDismiss, 10) || 3000;
			setTimeout(() => {
				el.style.opacity = '0';
				setTimeout(() => el.remove(), 300);
			}, delay);
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
