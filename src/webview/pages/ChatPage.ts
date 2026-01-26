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
import { MessageList } from '../components/MessageList';
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
		<div class="page chat-page" data-session-id="${session.id}">
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
