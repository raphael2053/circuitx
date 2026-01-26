/**
 * SessionListItem component - Individual session item in history list
 * Implements: T068, T073 - Session item with title, timestamp, and actions
 * 
 * Features:
 * - FR-017: Shows title, last updated timestamp, Edit, Delete
 * - FR-018: Click title navigates to Chat
 * - FR-019: Edit allows inline/modal rename
 */

import { SessionMetadata } from '../../models/Session';

export interface SessionListItemProps {
	/** Session metadata */
	session: SessionMetadata;
	/** Whether this item is in edit mode */
	isEditing?: boolean;
	/** Whether delete is in progress */
	isDeleting?: boolean;
}

/**
 * Render a single session list item
 */
export function SessionListItem(props: SessionListItemProps): string {
	const { session, isEditing = false, isDeleting = false } = props;
	const formattedDate = formatRelativeTime(session.updatedAt);

	if (isEditing) {
		return renderEditMode(session);
	}

	return `
		<div class="session-item" data-session-id="${session.id}">
			<div class="session-item-content">
				<button class="session-title-btn" data-action="open" data-session-id="${session.id}">
					<span class="session-title">${escapeHtml(session.title)}</span>
				</button>
				<span class="session-timestamp" title="${session.updatedAt}">${formattedDate}</span>
			</div>
			<div class="session-item-actions">
				<button 
					class="btn btn-icon btn-edit" 
					title="Rename session"
					data-action="edit"
					data-session-id="${session.id}"
					${isDeleting ? 'disabled' : ''}
				>
					✏️
				</button>
				<button 
					class="btn btn-icon btn-delete" 
					title="Delete session"
					data-action="delete"
					data-session-id="${session.id}"
					data-session-title="${escapeHtml(session.title)}"
					${isDeleting ? 'disabled' : ''}
				>
					${isDeleting ? '⏳' : '🗑️'}
				</button>
			</div>
		</div>
	`;
}

/**
 * Render edit mode for session title
 */
function renderEditMode(session: SessionMetadata): string {
	return `
		<div class="session-item session-item-editing" data-session-id="${session.id}">
			<div class="session-edit-form">
				<input 
					type="text" 
					class="session-edit-input" 
					id="edit-session-${session.id}"
					value="${escapeHtml(session.title)}"
					data-session-id="${session.id}"
					autofocus
				/>
			</div>
			<div class="session-item-actions">
				<button 
					class="btn btn-icon btn-save" 
					title="Save"
					data-action="save"
					data-session-id="${session.id}"
				>
					✓
				</button>
				<button 
					class="btn btn-icon btn-cancel" 
					title="Cancel"
					data-action="cancelEdit"
					data-session-id="${session.id}"
				>
					✕
				</button>
			</div>
		</div>
	`;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(isoString: string): string {
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) {
		return 'just now';
	} else if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else if (diffDays < 7) {
		return `${diffDays}d ago`;
	} else {
		// Format as date for older items
		return date.toLocaleDateString();
	}
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
