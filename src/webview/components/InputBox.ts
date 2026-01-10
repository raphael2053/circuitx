/**
 * InputBox Component
 * Implements: T024 - InputBox with event handling
 */

export interface InputBoxProps {
	placeholder?: string;
	value?: string;
	onSend?: (value: string) => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export function InputBox(props: InputBoxProps): string {
	const placeholder = props.placeholder || 'Type a message...';
	const value = props.value || '';
	const isLoading = props.isLoading || false;

	return `
		<div class="input-box">
			<textarea 
				id="message-input"
				class="input-textarea"
				placeholder="${placeholder}"
				rows="3"
				${isLoading ? 'disabled' : ''}
			>${value}</textarea>
			<div class="input-actions">
				${
					isLoading
						? `<button class="btn btn-secondary" id="cancel-btn">Cancel</button>`
						: `<button class="btn btn-primary" id="send-btn">Send</button>`
				}
			</div>
		</div>
		<script>
			(function() {
				const vscode = acquireVsCodeApi();
				const input = document.getElementById('message-input');
				const sendBtn = document.getElementById('send-btn');
				const cancelBtn = document.getElementById('cancel-btn');
				
				// Handle send
				sendBtn?.addEventListener('click', () => {
					const content = input?.value?.trim();
					if (content) {
						vscode.postMessage({ 
							type: 'sendMessage', 
							payload: { content },
							requestId: crypto.randomUUID()
						});
						input.value = '';
					}
				});
				
				// Handle cancel
				cancelBtn?.addEventListener('click', () => {
					vscode.postMessage({ 
						type: 'cancelRequest', 
						payload: {},
						requestId: crypto.randomUUID()
					});
				});
				
				// Handle Enter key (Shift+Enter for new line)
				input?.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						sendBtn?.click();
					}
				});
			})();
		</script>
	`;
}
