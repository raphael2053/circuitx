/**
 * Error handling utilities with custom error types
 * Provides actionable error messages with suggested actions
 */

/**
 * Base error class for CircuitX errors
 */
export class CircuitXError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly suggestedAction?: string
	) {
		super(message);
		this.name = 'CircuitXError';
	}
}

/**
 * Provider not found error
 */
export class ProviderNotFoundError extends CircuitXError {
	constructor(providerId: string) {
		super(
			`Provider not found: ${providerId}`,
			'PROVIDER_NOT_FOUND',
			'Please check your provider settings (⚙️) and ensure the provider exists.'
		);
		this.name = 'ProviderNotFoundError';
	}
}

/**
 * Session not found error
 */
export class SessionNotFoundError extends CircuitXError {
	constructor(sessionId: string) {
		super(
			`Session not found: ${sessionId}`,
			'SESSION_NOT_FOUND',
			'The session may have been deleted. Please select another session from history (🕒).'
		);
		this.name = 'SessionNotFoundError';
	}
}

/**
 * API key missing error
 */
export class APIKeyMissingError extends CircuitXError {
	constructor(providerName: string) {
		super(
			`No API key configured for provider: ${providerName}`,
			'API_KEY_MISSING',
			'Please set up an API key in Settings (⚙️) for this provider.'
		);
		this.name = 'APIKeyMissingError';
	}
}

/**
 * Connection failed error
 */
export class ConnectionFailedError extends CircuitXError {
	constructor(providerName: string, cause?: Error) {
		super(
			`Could not connect to provider: ${providerName}`,
			'CONNECTION_FAILED',
			'Check your internet connection and provider settings (⚙️).'
		);
		this.name = 'ConnectionFailedError';
		if (cause) {
			this.cause = cause;
		}
	}
}

/**
 * Invalid response error
 */
export class InvalidResponseError extends CircuitXError {
	constructor(details?: string) {
		super(
			`LLM returned invalid data${details ? `: ${details}` : ''}`,
			'INVALID_RESPONSE',
			'The provider may be incompatible. Try a different provider or check configuration.'
		);
		this.name = 'InvalidResponseError';
	}
}

/**
 * Timeout error
 */
export class TimeoutError extends CircuitXError {
	constructor(message?: string) {
		super(
			message || 'Request timed out',
			'TIMEOUT',
			'The request took too long. Try again or use a different provider.'
		);
		this.name = 'TimeoutError';
	}
}

/**
 * Request cancelled error
 */
export class RequestCancelledError extends CircuitXError {
	constructor(message?: string) {
		super(
			message || 'Request was cancelled by user',
			'CANCELLED',
			undefined
		);
		this.name = 'RequestCancelledError';
	}
}

/**
 * Validation error
 */
export class ValidationError extends CircuitXError {
	constructor(message: string) {
		super(
			message,
			'VALIDATION_ERROR',
			'Please correct the highlighted fields and try again.'
		);
		this.name = 'ValidationError';
	}
}

/**
 * No provider configured error
 */
export class NoProviderConfiguredError extends CircuitXError {
	constructor() {
		super(
			'No LLM provider configured',
			'NO_PROVIDER_CONFIGURED',
			'Please set up a provider in Settings (⚙️) before sending messages.'
		);
		this.name = 'NoProviderConfiguredError';
	}
}

/**
 * Format error for user display
 * @param error - Error object
 * @returns Formatted error message with suggested action
 */
export function formatErrorForDisplay(error: unknown): string {
	if (error instanceof CircuitXError) {
		return error.suggestedAction
			? `${error.message}\n\n${error.suggestedAction}`
			: error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}
