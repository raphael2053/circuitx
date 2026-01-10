/**
 * SessionList component - Vertical list of session items
 * Implements: T069 - Session list with pagination support
 * 
 * Features:
 * - FR-016: Vertical list of sessions
 * - FR-022: Pagination for large datasets
 * - Empty state message
 */

import { SessionMetadata } from '../../models/Session';
import { SessionListItem, SessionListItemScript } from './SessionListItem';

export interface SessionListProps {
	/** List of session metadata */
	sessions: SessionMetadata[];
	/** Current page (0-indexed) */
	page: number;
	/** Whether more pages are available */
	hasMore: boolean;
	/** Total session count (if known) */
	total?: number;
	/** Session ID being edited */
	editingSessionId?: string;
	/** Whether list is loading */
	isLoading?: boolean;
}

/**
 * Render the session list
 */
export function SessionList(props: SessionListProps): string {
	const { sessions, page, hasMore, total, editingSessionId, isLoading = false } = props;

	if (isLoading) {
		return `
			<div class="session-list-loading">
				<div class="loading-spinner"></div>
				<span>Loading sessions...</span>
			</div>
		`;
	}

	if (sessions.length === 0 && page === 0) {
		// Empty state - T078
		return `
			<div class="session-list-empty">
				<div class="empty-icon">📭</div>
				<h3>No sessions yet</h3>
				<p>Click <strong>➕</strong> to start a conversation.</p>
			</div>
		`;
	}

	return `
		<div class="session-list">
			${sessions.map(session => 
				SessionListItem({
					session,
					isEditing: session.id === editingSessionId,
				})
			).join('')}
			
			${renderPagination(page, hasMore, total)}
		</div>
	`;
}

/**
 * Render pagination controls
 */
function renderPagination(page: number, hasMore: boolean, total?: number): string {
	const showPagination = page > 0 || hasMore;

	if (!showPagination) {
		return '';
	}

	return `
		<div class="session-list-pagination">
			<button 
				class="btn btn-secondary btn-prev" 
				data-action="prevPage"
				${page === 0 ? 'disabled' : ''}
			>
				← Previous
			</button>
			<span class="pagination-info">
				Page ${page + 1}${total ? ` of ${Math.ceil(total / 20)}` : ''}
			</span>
			<button 
				class="btn btn-secondary btn-next" 
				data-action="nextPage"
				${!hasMore ? 'disabled' : ''}
			>
				Next →
			</button>
		</div>
	`;
}

/**
 * Generate script for session list interactions
 */
export function SessionListScript(): string {
	return `
		${SessionListItemScript()}
		<script>
			(function() {
				const vscode = acquireVsCodeApi();
				
				// Pagination button handlers
				document.addEventListener('click', (e) => {
					const target = e.target.closest('[data-action]');
					if (!target) return;
					
					const action = target.dataset.action;
					
					switch (action) {
						case 'prevPage':
							vscode.postMessage({
								type: 'loadSessionList',
								payload: { 
									page: Math.max(0, getCurrentPage() - 1),
									pageSize: 20 
								},
								requestId: crypto.randomUUID()
							});
							break;
							
						case 'nextPage':
							vscode.postMessage({
								type: 'loadSessionList',
								payload: { 
									page: getCurrentPage() + 1,
									pageSize: 20 
								},
								requestId: crypto.randomUUID()
							});
							break;
					}
				});
				
				function getCurrentPage() {
					const pageInfo = document.querySelector('.pagination-info');
					if (pageInfo) {
						const match = pageInfo.textContent.match(/Page (\\d+)/);
						return match ? parseInt(match[1], 10) - 1 : 0;
					}
					return 0;
				}
			})();
		</script>
	`;
}
