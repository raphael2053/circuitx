/**
 * MessageList component - Renders messages in chronological order
 * Implements: T038, T044 - Message list with auto-scroll
 * 
 * Features:
 * - FR-010: Display all messages in chronological order
 * - Streaming content display with cursor indicator
 * - Auto-scroll to bottom on new messages
 * - User/assistant message differentiation
 */

import { Message } from '../../models/Session';

export interface MessageListProps {
	messages: Message[];
	streamingContent?: string;
	isLoading?: boolean;
	error?: string;
}

/**
 * Render the message list HTML
 * Messages are displayed chronologically (oldest first, newest at bottom)
 */
export function MessageList(props: MessageListProps): string {
	const { messages, streamingContent, isLoading = false, error } = props;

	return `
		<div class="message-list" id="message-list">
			${messages.map(renderMessage).join('')}
			${streamingContent ? renderStreamingMessage(streamingContent) : ''}
			${isLoading && !streamingContent ? renderLoadingIndicator() : ''}
			${error ? renderError(error) : ''}
		</div>
	`;
}

/**
 * Render a single message with appropriate styling
 */
function renderMessage(message: Message): string {
	const isUser = message.role === 'user';
	const avatarEmoji = isUser ? '👤' : '🤖';
	const roleClass = isUser ? 'message-user' : 'message-assistant';

	return `
		<div class="message ${roleClass}" data-message-id="${message.id}">
			<div class="message-avatar">${avatarEmoji}</div>
			<div class="message-content">
				<div class="message-text">${formatMessageContent(message.content)}</div>
				<div class="message-timestamp">${formatTimestamp(message.timestamp)}</div>
			</div>
		</div>
	`;
}

/**
 * Render streaming message with cursor indicator
 */
function renderStreamingMessage(content: string): string {
	return `
		<div class="message message-assistant streaming">
			<div class="message-avatar">🤖</div>
			<div class="message-content">
				<div class="message-text">${formatMessageContent(content)}<span class="streaming-cursor">▊</span></div>
			</div>
		</div>
	`;
}

/**
 * Render loading indicator (animated dots)
 */
function renderLoadingIndicator(): string {
	return `
		<div class="message message-assistant loading-message">
			<div class="message-avatar">🤖</div>
			<div class="message-content">
				<div class="loading-indicator">
					<span class="loading-dot"></span>
					<span class="loading-dot"></span>
					<span class="loading-dot"></span>
				</div>
			</div>
		</div>
	`;
}

/**
 * Render error message with retry option
 */
function renderError(error: string): string {
	return `
		<div class="message-error">
			<span class="error-icon">⚠️</span>
			<span class="error-text">${escapeHtml(error)}</span>
			<button class="btn btn-link error-retry-btn" onclick="window.retryLastMessage?.()">
				Retry
			</button>
		</div>
	`;
}

/**
 * Format message content with basic markdown support
 * - Code blocks (```...```)
 * - Inline code (`...`)
 * - Newlines to <br>
 */
function formatMessageContent(content: string): string {
	// Escape HTML first to prevent XSS
	let formatted = escapeHtml(content);

	// Convert code blocks (```language\n...\n```)
	formatted = formatted.replace(
		/```(\w*)\n?([\s\S]*?)```/g,
		'<pre class="code-block"><code class="language-$1">$2</code></pre>'
	);

	// Convert inline code (`...`)
	formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

	// Convert newlines to <br> (but not inside pre tags)
	// Simple approach: replace \n with <br> outside of pre tags
	formatted = formatted.replace(/\n/g, '<br>');

	return formatted;
}

/**
 * Format timestamp for display
 * - Today: "10:30 AM"
 * - This year: "Jan 5, 10:30 AM"
 * - Other: "Jan 5, 2025, 10:30 AM"
 */
function formatTimestamp(isoString: string): string {
	const date = new Date(isoString);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	const isThisYear = date.getFullYear() === now.getFullYear();

	const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	if (isToday) {
		return timeStr;
	}

	const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

	if (isThisYear) {
		return `${monthDay}, ${timeStr}`;
	}

	return `${monthDay}, ${date.getFullYear()}, ${timeStr}`;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
	const htmlEntities: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}
