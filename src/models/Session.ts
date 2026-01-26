/**
 * Session and Message entity interfaces
 * Based on data-model.md specifications
 */

/**
 * Message metadata for future extensibility
 */
export interface MessageMetadata {
	/** Token count (future use) */
	tokenCount?: number;
	/** Model that generated this response (future use) */
	model?: string;
}

/**
 * Single message in a conversation
 */
export interface Message {
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

/**
 * Session representing a conversation thread
 */
export interface Session {
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

/**
 * Lightweight session metadata for list display
 */
export interface SessionMetadata {
	/** Session ID */
	id: string;
	/** Session title */
	title: string;
	/** Last updated timestamp */
	updatedAt: string;
}

/**
 * Validation rules for Session
 */
export function validateSession(session: Partial<Session>): string[] {
	const errors: string[] = [];

	if (!session.id || !isValidUUID(session.id)) {
		errors.push('Session ID must be a valid UUID v4');
	}

	if (!session.title || session.title.length === 0) {
		errors.push('Session title is required');
	} else if (session.title.length > 100) {
		errors.push('Session title must be 100 characters or less');
	}

	if (!session.createdAt || !isValidISO8601(session.createdAt)) {
		errors.push('Created timestamp must be valid ISO 8601');
	}

	if (!session.updatedAt || !isValidISO8601(session.updatedAt)) {
		errors.push('Updated timestamp must be valid ISO 8601');
	}

	if (session.createdAt && session.updatedAt &&
		new Date(session.updatedAt) < new Date(session.createdAt)) {
		errors.push('Updated timestamp must be >= created timestamp');
	}

	if (!Array.isArray(session.messages)) {
		errors.push('Messages must be an array');
	}

	return errors;
}

/**
 * Validation rules for Message
 */
export function validateMessage(message: Partial<Message>): string[] {
	const errors: string[] = [];

	if (!message.id || !isValidUUID(message.id)) {
		errors.push('Message ID must be a valid UUID v4');
	}

	if (message.role !== 'user' && message.role !== 'assistant') {
		errors.push('Message role must be "user" or "assistant"');
	}

	if (!message.content || message.content.length === 0) {
		errors.push('Message content is required');
	}

	if (!message.timestamp || !isValidISO8601(message.timestamp)) {
		errors.push('Message timestamp must be valid ISO 8601');
	}

	return errors;
}

/**
 * Generate session title from first message content
 * @param content - First message content
 * @returns Title (first 30 chars with ellipsis if needed)
 */
export function generateSessionTitle(content: string): string {
	const trimmed = content.trim();
	if (trimmed.length <= 30) {
		return trimmed;
	}
	return trimmed.substring(0, 27) + '...';
}

// Helper functions
function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

function isValidISO8601(dateString: string): boolean {
	const date = new Date(dateString);
	return !isNaN(date.getTime()) && date.toISOString() === dateString;
}
