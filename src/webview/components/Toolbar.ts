/**
 * Toolbar Component
 * Implements: T023 - Toolbar with ➕🕒⚙️ buttons
 */

export interface ToolbarProps {
	onNewChat?: () => void;
	onShowHistory?: () => void;
	onShowSettings?: () => void;
}

export function Toolbar(props: ToolbarProps): string {
	return `
		<div class="toolbar">
			<button 
				class="toolbar-button" 
				id="new-chat-btn"
				title="New Chat"
				aria-label="New Chat"
				data-action="navigate"
				data-page="welcome"
			>
				<span class="icon">➕</span>
			</button>
			<button 
				class="toolbar-button" 
				id="history-btn"
				title="Chat History"
				aria-label="Chat History"
				data-action="navigate"
				data-page="history"
			>
				<span class="icon">🕒</span>
			</button>
			<button 
				class="toolbar-button" 
				id="settings-btn"
				title="Settings"
				aria-label="Settings"
				data-action="navigate"
				data-page="providers"
			>
				<span class="icon">⚙️</span>
			</button>
		</div>
	`;
}
