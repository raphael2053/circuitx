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
			>
				<span class="icon">➕</span>
			</button>
			<button 
				class="toolbar-button" 
				id="history-btn"
				title="Chat History"
				aria-label="Chat History"
			>
				<span class="icon">🕒</span>
			</button>
			<button 
				class="toolbar-button" 
				id="settings-btn"
				title="Settings"
				aria-label="Settings"
			>
				<span class="icon">⚙️</span>
			</button>
		</div>
		<script>
			(function() {
				const vscode = acquireVsCodeApi();
				
				document.getElementById('new-chat-btn')?.addEventListener('click', () => {
					vscode.postMessage({ type: 'navigate', payload: { page: 'chat' } });
				});
				
				document.getElementById('history-btn')?.addEventListener('click', () => {
					vscode.postMessage({ type: 'navigate', payload: { page: 'history' } });
				});
				
				document.getElementById('settings-btn')?.addEventListener('click', () => {
					vscode.postMessage({ type: 'navigate', payload: { page: 'providers' } });
				});
			})();
		</script>
	`;
}
