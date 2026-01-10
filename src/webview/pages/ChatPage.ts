/**
 * ChatPage - Active conversation page
 * Shows current session messages and allows sending new messages
 * 
 * This page displays:
 * - Session title in header
 * - Message list (user and assistant messages)
 * - Input box for new messages
 * - Consistent toolbar (➕🕒⚙️)
 */

import { Toolbar } from '../components/Toolbar';
import { Session, Message } from '../../models/Session';

export interface ChatPageProps {
	session: Session;
	isLoading?: boolean;
	streamingContent?: string;
	error?: string;
}

/**
 * Render the Chat page HTML
 */
export function ChatPage(props: ChatPageProps): string {
	const { session, isLoading = false, streamingContent, error } = props;

	return `
		<div class="page chat-page">
			${Toolbar({})}
			
			<div class="chat-header">
				<h2 class="chat-title" title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</h2>
			</div>
			
			<div class="chat-messages" id="chat-messages">
				${renderMessages(session.messages, streamingContent)}
				${isLoading && !streamingContent ? renderLoadingIndicator() : ''}
				${error ? renderError(error) : ''}
			</div>
			
			<div class="chat-input-container">
				<textarea 
					id="chat-input"
					class="chat-input"
					placeholder="Continue the conversation..."
					rows="3"
					${isLoading ? 'disabled' : ''}
				></textarea>
				<div class="chat-input-actions">
					${isLoading 
						? '<button id="chat-cancel-btn" class="btn btn-secondary">Cancel</button>'
						: '<button id="chat-send-btn" class="btn btn-primary">Send</button>'
					}
				</div>
			</div>
		</div>
		
		<script>
			(function() {
				const vscode = acquireVsCodeApi();
				const input = document.getElementById('chat-input');
				const sendBtn = document.getElementById('chat-send-btn');
				const cancelBtn = document.getElementById('chat-cancel-btn');
				const messagesContainer = document.getElementById('chat-messages');
				
				// Scroll to bottom on load
				messagesContainer?.scrollTo(0, messagesContainer.scrollHeight);
				
				// Handle send button click
				sendBtn?.addEventListener('click', () => {
					sendMessage();
				});
				
				// Handle cancel button click
				cancelBtn?.addEventListener('click', () => {
					vscode.postMessage({
						type: 'cancelMessage',
						payload: { sessionId: '${session.id}' },
						requestId: crypto.randomUUID()
					});
				});
				
				// Handle Enter key (Shift+Enter for new line)
				input?.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						sendMessage();
					}
				});
				
				function sendMessage() {
					const content = input?.value?.trim();
					if (content) {
						vscode.postMessage({
							type: 'sendMessage',
							payload: { 
								sessionId: '${session.id}',
								content 
							},
							requestId: crypto.randomUUID()
						});
						input.value = '';
					}
				}
				
				// Focus input on page load
				input?.focus();
			})();
		</script>
	`;
}

/**
 * Render all messages in the conversation
 */
function renderMessages(messages: Message[], streamingContent?: string): string {
	let html = messages.map(renderMessage).join('');

	// Add streaming content as partial assistant message
	if (streamingContent) {
		html += `
			<div class="message message-assistant streaming">
				<div class="message-avatar">🤖</div>
				<div class="message-content">
					<div class="message-text">${escapeHtml(streamingContent)}<span class="cursor">▊</span></div>
				</div>
			</div>
		`;
	}

	return html;
}

/**
 * Render a single message
 */
function renderMessage(message: Message): string {
	const isUser = message.role === 'user';
	const avatarEmoji = isUser ? '👤' : '🤖';
	const roleClass = isUser ? 'message-user' : 'message-assistant';

	return `
		<div class="message ${roleClass}">
			<div class="message-avatar">${avatarEmoji}</div>
			<div class="message-content">
				<div class="message-text">${formatMessageContent(message.content)}</div>
				<div class="message-timestamp">${formatTimestamp(message.timestamp)}</div>
			</div>
		</div>
	`;
}

/**
 * Render loading indicator
 */
function renderLoadingIndicator(): string {
	return `
		<div class="message message-assistant loading">
			<div class="message-avatar">🤖</div>
			<div class="message-content">
				<div class="loading-dots">
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
		</div>
	`;
}

/**
 * Render error message
 */
function renderError(error: string): string {
	return `
		<div class="chat-error">
			<span class="error-icon">⚠️</span>
			<span class="error-message">${escapeHtml(error)}</span>
			<button class="btn btn-link retry-btn" id="retry-btn">Retry</button>
		</div>
	`;
}

/**
 * Format message content (basic markdown-like formatting)
 */
function formatMessageContent(content: string): string {
	// Escape HTML first
	let formatted = escapeHtml(content);

	// Convert code blocks (```...```)
	formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

	// Convert inline code (`...`)
	formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

	// Convert newlines to <br> (outside of code blocks)
	formatted = formatted.replace(/\n/g, '<br>');

	return formatted;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
	const date = new Date(isoString);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();

	if (isToday) {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
		date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return text.replace(/[&<>"']/g, (char) => map[char]);
}
