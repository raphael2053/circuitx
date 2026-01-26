/**
 * HistoryPage - Session history management page
 * Implements: T070, T075, T077, T078 - History page with list, delete, navigation, empty state
 * 
 * Features:
 * - FR-016: Display all sessions sorted by updatedAt descending
 * - FR-017: Each session shows title, timestamp, Edit, Delete
 * - FR-018: Click title navigates to Chat
 * - FR-020: Delete confirmation dialog
 * - FR-022: Pagination for large datasets
 * - Empty state message when no sessions
 */

import { Toolbar } from '../components/Toolbar';
import { SessionList } from '../components/SessionList';
import { SessionMetadata } from '../../models/Session';

export interface HistoryPageProps {
	/** List of session metadata */
	sessions: SessionMetadata[];
	/** Current page (0-indexed) */
	page: number;
	/** Whether more pages are available */
	hasMore: boolean;
	/** Total session count */
	total?: number;
	/** Session ID being edited */
	editingSessionId?: string;
	/** Whether loading */
	isLoading?: boolean;
	/** Error message */
	error?: string;
	/** Success message */
	successMessage?: string;
}

/**
 * Render the History page HTML
 */
export function HistoryPage(props: HistoryPageProps): string {
	const { 
		sessions, 
		page, 
		hasMore, 
		total,
		editingSessionId,
		isLoading = false,
		error,
		successMessage,
	} = props;

	return `
		<div class="page history-page">
			${Toolbar({})}
			
			<div class="history-header">
				<h2 class="history-title">Session History</h2>
				<span class="history-count">
					${total !== undefined ? `${total} sessions` : ''}
				</span>
			</div>
			
			${successMessage ? `
				<div class="success-message" id="success-message" data-auto-dismiss="3000">
					<span class="success-icon">✓</span>
					${escapeHtml(successMessage)}
				</div>
			` : ''}
			
			${error ? `
				<div class="error-message" id="error-message">
					<span class="error-icon">⚠️</span>
					${escapeHtml(error)}
				</div>
			` : ''}
			
			<div class="history-content">
				${SessionList({
					sessions,
					page,
					hasMore,
					total,
					editingSessionId,
					isLoading,
				})}
			</div>
		</div>
	`;
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
