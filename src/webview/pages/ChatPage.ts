/**
 * ChatPage - Active conversation page (T039, T040)
 * Shows current session messages and allows sending new messages
 * 
 * Implements:
 * - FR-008: Active Chat page displays full-width message stream with title
 * - FR-009: No session list sidebar (single-page navigation)
 * - FR-010: Messages in chronological order
 * - FR-011: New messages appended via bottom input
 * - FR-012: Loading state within 100ms
 * - FR-013: Progressive LLM response streaming
 * 
 * This page displays:
 * - Session title in header
 * - Message list (user and assistant messages)
 * - Input box for new messages
 * - Consistent toolbar (➕🕒⚙️)
 */

import { Toolbar } from '../components/Toolbar';
import { MessageList, MessageListScript } from '../components/MessageList';
import { Session } from '../../models/Session';

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
				${MessageList({
					messages: session.messages,
					streamingContent,
					isLoading,
					error,
				})}
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
		
		${MessageListScript()}
		
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
 * Escape HTML to prevent XSS (needed for title)
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
