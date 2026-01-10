/**
 * WelcomePage - First page shown when CircuitX is opened
 * Implements: T029 - WelcomePage.render() with input box and branding
 * 
 * This page displays:
 * - CircuitX branding/logo
 * - Helpful placeholder text
 * - Input box for asking questions
 * - Consistent toolbar (➕🕒⚙️)
 */

import { Toolbar } from '../components/Toolbar';

export interface WelcomePageProps {
	isLoading?: boolean;
	error?: string;
}

/**
 * Render the Welcome page HTML
 */
export function WelcomePage(props: WelcomePageProps = {}): string {
	const { isLoading = false, error } = props;

	return `
		<div class="page welcome-page">
			${Toolbar({})}
			
			<div class="welcome-content">
				<div class="welcome-branding">
					<div class="welcome-logo">
						<span class="logo-icon">⚡</span>
					</div>
					<h1 class="welcome-title">CircuitX</h1>
					<p class="welcome-subtitle">Your AI coding assistant</p>
				</div>
				
				<div class="welcome-features">
					<div class="feature-item">
						<span class="feature-icon">💬</span>
						<span class="feature-text">Ask questions about your code</span>
					</div>
					<div class="feature-item">
						<span class="feature-icon">🔍</span>
						<span class="feature-text">Get explanations and suggestions</span>
					</div>
					<div class="feature-item">
						<span class="feature-icon">📝</span>
						<span class="feature-text">Generate code snippets</span>
					</div>
				</div>

				${error ? `
					<div class="welcome-error">
						<span class="error-icon">⚠️</span>
						<span class="error-message">${escapeHtml(error)}</span>
					</div>
				` : ''}
				
				<div class="welcome-input-container">
					<textarea 
						id="welcome-input"
						class="welcome-input"
						placeholder="Ask anything about your code..."
						rows="3"
						${isLoading ? 'disabled' : ''}
					></textarea>
					<div class="welcome-input-actions">
						${isLoading 
							? '<div class="loading-indicator"><span class="spinner"></span> Thinking...</div>'
							: '<button id="welcome-send-btn" class="btn btn-primary">Send</button>'
						}
					</div>
				</div>

				<div class="welcome-tips">
					<p class="tip">💡 Tip: Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line</p>
				</div>
			</div>
		</div>
		
		<script>
			(function() {
				const vscode = acquireVsCodeApi();
				const input = document.getElementById('welcome-input');
				const sendBtn = document.getElementById('welcome-send-btn');
				
				// Handle send button click
				sendBtn?.addEventListener('click', () => {
					sendMessage();
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
							payload: { content },
							requestId: crypto.randomUUID()
						});
						// Don't clear input - let the extension handle state
					}
				}
				
				// Focus input on page load
				input?.focus();
			})();
		</script>
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
