/**
 * Webview message protocol interfaces
 * Based on contracts/webview-messaging.md
 * 
 * This file defines the complete communication contract between:
 * - Webview UI (HTML/CSS/JavaScript running in the panel)
 * - Extension backend (TypeScript code with VS Code API access)
 * 
 * Architecture:
 * - Session.ts and LLMProvider.ts define the data structures (what)
 * - This file defines the message protocol (how to send that data)
 * - All messages flow through VS Code's postMessage API
 * 
 * Example: SessionLoadedMessage wraps a Session object in a message envelope
 * with type='sessionLoaded', the Session payload, and a requestId for tracking.
 */

import { Session, SessionMetadata } from './Session';
import { LLMProvider } from './LLMProvider';

/**
 * Base message types
 * - All messages extend this base interface
 * - 'type' identifies the message kind
 * - 'requestId' optional field to match requests with responses
 */
export interface BaseMessage {
	type: string;
	requestId?: string;
}

/**
 * Navigation message types
 * - Controls which page is displayed in the webview
 * - PageType: 'welcome' (start), 'chat' (conversation), 'history' (sessions), 'providers' (settings)
 * - Extended page types: 'addProvider', 'editProvider' (sub-views of providers)
 */
export type PageType = 'welcome' | 'chat' | 'history' | 'providers' | 'addProvider' | 'editProvider';

/**
 * Request to navigate to a different page
 * - sessionId required when navigating to 'chat' page
 * - providerId required when navigating to 'editProvider' page
 */
export interface NavigateMessage extends BaseMessage {
	type: 'navigate';
	payload: {
		page: PageType;
		sessionId?: string; // Required when page is 'chat'
		providerId?: string; // Required when page is 'editProvider'
	};
}

/**
 * Chat operation messages
 * - SendMessage: user sends a message to the AI
 * - CancelMessage: user stops an ongoing AI response
 */

/** Send a message to the AI (starts or continues a conversation) */
export interface SendMessageMessage extends BaseMessage {
	type: 'sendMessage';
	payload: {
		sessionId?: string; // Undefined for new session from Welcome
		content: string;
	};
	requestId: string;
}

/** Cancel an ongoing AI message generation */
export interface CancelMessageMessage extends BaseMessage {
	type: 'cancelMessage';
	payload: {
		sessionId: string;
	};
}

/**
 * Session operation messages
 * - Load: retrieve a saved session
 * - Delete: remove a session permanently
 * - Rename: change session title
 * - LoadList: get paginated list of all sessions
 */

/** Load a specific session by ID */
export interface LoadSessionMessage extends BaseMessage {
	type: 'loadSession';
	payload: {
		sessionId: string;
	};
	requestId: string;
}

/** Confirm delete session (shows VS Code native dialog) */
export interface ConfirmDeleteSessionMessage extends BaseMessage {
	type: 'confirmDeleteSession';
	payload: {
		sessionId: string;
		sessionTitle: string;
	};
	requestId?: string;
}

/** Delete a session permanently */
export interface DeleteSessionMessage extends BaseMessage {
	type: 'deleteSession';
	payload: {
		sessionId: string;
	};
	requestId?: string;
}

/** Rename an existing session */
export interface RenameSessionMessage extends BaseMessage {
	type: 'renameSession';
	payload: {
		sessionId: string;
		title: string;
	};
	requestId: string;
}

/** Load paginated list of sessions (for history view) */
export interface LoadSessionListMessage extends BaseMessage {
	type: 'loadSessionList';
	payload: {
		page: number; // 0-indexed
		pageSize: number;
	};
	requestId: string;
}

/**
 * Provider operation messages
 * - Load: get all configured LLM providers
 * - Add: create a new provider configuration
 * - Update: modify existing provider
 * - Delete: remove a provider
 * - Test: verify provider connection
 */

/** Load all configured LLM providers */
export interface LoadProvidersMessage extends BaseMessage {
	type: 'loadProviders';
	requestId: string;
}

/** Add a new LLM provider configuration */
export interface AddProviderMessage extends BaseMessage {
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

/** Update an existing provider (all fields optional except id) */
export interface UpdateProviderMessage extends BaseMessage {
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

/** Confirm delete provider (shows VS Code native dialog) */
export interface ConfirmDeleteProviderMessage extends BaseMessage {
	type: 'confirmDeleteProvider';
	payload: {
		providerId: string;
		providerName: string;
	};
	requestId?: string;
}

/** Delete a provider configuration */
export interface DeleteProviderMessage extends BaseMessage {
	type: 'deleteProvider';
	payload: {
		id?: string;
		providerId?: string; // Alternative field name from UI
	};
	requestId?: string;
}

/** Test provider connectivity and configuration */
export interface TestProviderMessage extends BaseMessage {
	type: 'testProvider';
	payload: {
		id?: string;
		providerId?: string; // Alternative field name from UI
	};
	requestId: string;
}

/** Set a provider as the default for new sessions */
export interface SetDefaultProviderMessage extends BaseMessage {
	type: 'setDefaultProvider';
	payload: {
		providerId: string;
	};
	requestId: string;
}

/** Start editing a session title (History page) */
export interface StartEditSessionMessage extends BaseMessage {
	type: 'startEditSession';
	payload: {
		sessionId: string;
	};
}

/** Cancel editing a session title (History page) */
export interface CancelEditSessionMessage extends BaseMessage {
	type: 'cancelEditSession';
}

/**
 * Union type for all webview-to-extension messages
 * - Represents all possible messages the UI can send to the extension
 * - Used for type-safe message handling in extension code
 */
export type WebviewMessage =
	| NavigateMessage
	| SendMessageMessage
	| CancelMessageMessage
	| LoadSessionMessage
	| DeleteSessionMessage
	| RenameSessionMessage
	| LoadSessionListMessage
	| LoadProvidersMessage
	| AddProviderMessage
	| UpdateProviderMessage
	| DeleteProviderMessage
	| TestProviderMessage
	| SetDefaultProviderMessage
	| StartEditSessionMessage
	| CancelEditSessionMessage
	| ConfirmDeleteSessionMessage
	| ConfirmDeleteProviderMessage;

/**
 * Extension-to-webview message types
 * Messages sent FROM the extension TO the webview to update UI state
 */

/** 
 * Full state sync message
 * - Sent to update entire webview state
 * - Contains current page, active session, lists, etc.
 */
export interface StateUpdateMessage {
	type: 'stateUpdate';
	payload: {
		currentPage: PageType;
		activeSession?: Session;
		sessionList?: SessionMetadata[];
		providers?: LLMProvider[];
		defaultProviderId?: string;
		isLoading: boolean;
		error?: string;
	};
}

/** 
 * Initial webview setup message
 * - Sent when webview first loads
 * - Indicates if providers are configured
 */
export interface InitializeMessage {
	type: 'initialize';
	payload: {
		hasProviders: boolean;
		defaultProviderId?: string;
	};
}

/** 
 * Streaming chat response - incremental content
 * - Sent multiple times as AI generates response
 * - content contains just the new chunk, not full message
 */
export interface ChatChunkMessage {
	type: 'chatChunk';
	payload: {
		sessionId: string;
		messageId: string;
		content: string; // Incremental content
	};
	requestId: string;
}
/**
 * Chat started message - sent when user sends a message in existing session
 * - Used for incremental DOM update without full re-render
 * - Contains the user message that was added
 */
export interface ChatStartedMessage {
	type: 'chatStarted';
	payload: {
		sessionId: string;
		userMessage: {
			id: string;
			role: 'user';
			content: string;
			timestamp: string;
		};
	};
	requestId: string;
}
/** 
 * Chat response complete
 * - Sent when AI finishes generating
 * - fullContent contains the entire message
 */
export interface ChatCompleteMessage {
	type: 'chatComplete';
	payload: {
		sessionId: string;
		messageId: string;
		fullContent: string;
	};
	requestId: string;
}

/** Chat error occurred */
export interface ChatErrorMessage {
	type: 'chatError';
	payload: {
		sessionId?: string;
		error: string;
	};
	requestId: string;
}

/** User cancelled ongoing chat response */
export interface ChatCancelledMessage {
	type: 'chatCancelled';
	payload: {
		sessionId: string;
	};
}

/** Session loaded successfully - response to LoadSessionMessage */
export interface SessionLoadedMessage {
	type: 'sessionLoaded';
	payload: Session;
	requestId: string;
}

/** Session deleted successfully - response to DeleteSessionMessage */
export interface SessionDeletedMessage {
	type: 'sessionDeleted';
	payload: {
		sessionId: string;
	};
	requestId?: string;
}

/** Session renamed successfully - response to RenameSessionMessage */
export interface SessionRenamedMessage {
	type: 'sessionRenamed';
	payload: {
		sessionId: string;
		title: string;
	};
	requestId: string;
}

/** 
 * Paginated session list - response to LoadSessionListMessage
 * - hasMore indicates if there are more pages to load
 */
export interface SessionListLoadedMessage {
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

/** All providers loaded - response to LoadProvidersMessage */
export interface ProvidersLoadedMessage {
	type: 'providersLoaded';
	payload: {
		providers: LLMProvider[];
		defaultId?: string;
	};
	requestId: string;
}

/** Provider added successfully - response to AddProviderMessage */
export interface ProviderAddedMessage {
	type: 'providerAdded';
	payload: LLMProvider;
	requestId: string;
}

/** Provider updated successfully - response to UpdateProviderMessage */
export interface ProviderUpdatedMessage {
	type: 'providerUpdated';
	payload: LLMProvider;
	requestId: string;
}

/** Provider deleted successfully - response to DeleteProviderMessage */
export interface ProviderDeletedMessage {
	type: 'providerDeleted';
	payload: {
		id: string;
	};
	requestId?: string;
}

/** 
 * Provider test result - response to TestProviderMessage
 * - success: whether connection succeeded
 * - latency: response time in milliseconds (if successful)
 */
export interface ProviderTestResultMessage {
	type: 'providerTestResult';
	payload: {
		id: string;
		success: boolean;
		message?: string;
		latency?: number;
	};
	requestId: string;
}

/** Default provider set successfully - response to SetDefaultProviderMessage */
export interface DefaultProviderSetMessage {
	type: 'defaultProviderSet';
	payload: {
		providerId: string;
	};
	requestId: string;
}

/** 
 * Generic error response
 * - Sent when any operation fails
 * - type matches the original request type
 */
export interface ErrorResponse {
	type: string;
	error: string;
	requestId?: string;
}

/**
 * Union type for all extension-to-webview messages
 * - Represents all possible messages the extension can send to the UI
 * - Used for type-safe message handling in webview code
 */
export type ExtensionMessage =
	| StateUpdateMessage
	| InitializeMessage
	| ChatStartedMessage
	| ChatChunkMessage
	| ChatCompleteMessage
	| ChatErrorMessage
	| ChatCancelledMessage
	| SessionLoadedMessage
	| SessionDeletedMessage
	| SessionRenamedMessage
	| SessionListLoadedMessage
	| ProvidersLoadedMessage
	| ProviderAddedMessage
	| ProviderUpdatedMessage
	| ProviderDeletedMessage
	| ProviderTestResultMessage
	| DefaultProviderSetMessage
	| ErrorResponse;
