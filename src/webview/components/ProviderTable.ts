/**
 * ProviderTable component - Display list of configured providers
 * Implements: T052 - Provider table with actions
 * 
 * Features:
 * - Display provider name, base URL, model
 * - FR-029: Star indicator for default provider
 * - Edit/Delete/Set Default actions per row
 * - FR-026: Test connection button
 */

import { LLMProvider } from '../../models/LLMProvider';

export interface ProviderTableProps {
	/** List of providers to display */
	providers: LLMProvider[];
	/** ID of the default provider */
	defaultProviderId?: string;
	/** Provider ID currently being tested */
	testingProviderId?: string;
}

/**
 * Render the provider table HTML
 */
export function ProviderTable(props: ProviderTableProps): string {
	const { providers, defaultProviderId, testingProviderId } = props;

	if (providers.length === 0) {
		return `
			<div class="provider-table-empty">
				<p>No providers configured yet.</p>
				<p>Click "Add Provider" to configure your first LLM provider.</p>
			</div>
		`;
	}

	return `
		<div class="provider-table-container">
			<table class="provider-table">
				<thead>
					<tr>
						<th class="col-name">Name</th>
						<th class="col-url">Base URL</th>
						<th class="col-model">Model</th>
						<th class="col-actions">Actions</th>
					</tr>
				</thead>
				<tbody>
					${providers.map(provider => renderProviderRow(provider, defaultProviderId, testingProviderId)).join('')}
				</tbody>
			</table>
		</div>
	`;
}

/**
 * Render a single provider row
 */
function renderProviderRow(
	provider: LLMProvider, 
	defaultProviderId?: string,
	testingProviderId?: string
): string {
	const isDefault = provider.id === defaultProviderId;
	const isTesting = provider.id === testingProviderId;

	return `
		<tr class="provider-row ${isDefault ? 'is-default' : ''}" data-provider-id="${provider.id}">
			<td class="col-name">
				${isDefault ? '<span class="default-indicator" title="Default provider">⭐</span>' : ''}
				<span class="provider-name">${escapeHtml(provider.name)}</span>
			</td>
			<td class="col-url">
				<span class="provider-url" title="${escapeHtml(provider.baseUrl)}">${escapeHtml(truncateUrl(provider.baseUrl))}</span>
			</td>
			<td class="col-model">
				<span class="provider-model">${escapeHtml(provider.model)}</span>
			</td>
			<td class="col-actions">
				<div class="action-buttons">
					<button 
						class="btn btn-icon btn-test" 
						title="Test connection"
						data-action="test"
						data-provider-id="${provider.id}"
						${isTesting ? 'disabled' : ''}
					>
						${isTesting ? '⏳' : '🔌'}
					</button>
					<button 
						class="btn btn-icon btn-edit" 
						title="Edit provider"
						data-action="edit"
						data-provider-id="${provider.id}"
					>
						✏️
					</button>
					${!isDefault ? `
					<button 
						class="btn btn-icon btn-default" 
						title="Set as default"
						data-action="setDefault"
						data-provider-id="${provider.id}"
					>
						⭐
					</button>
					` : ''}
					<button 
						class="btn btn-icon btn-delete ${isDefault ? 'btn-disabled' : ''}" 
						title="${isDefault ? 'Cannot delete default provider' : 'Delete provider'}"
						data-action="delete"
						data-provider-id="${provider.id}"
						data-provider-name="${escapeHtml(provider.name)}"
						${isDefault ? 'disabled' : ''}
					>
						🗑️
					</button>
				</div>
			</td>
		</tr>
	`;
}

/**
 * Generate script for table actions
 */
export function ProviderTableScript(): string {
	return `
		<script>
			(function() {
				const vscode = acquireVsCodeApi();
				const table = document.querySelector('.provider-table');
				
				// Event delegation for action buttons
				table?.addEventListener('click', (e) => {
					const target = e.target;
					if (!(target instanceof HTMLButtonElement)) return;
					
					const action = target.dataset.action;
					const providerId = target.dataset.providerId;
					const providerName = target.dataset.providerName;
					
					if (!action || !providerId) return;
					
					switch (action) {
						case 'test':
							vscode.postMessage({
								type: 'testProvider',
								payload: { providerId },
								requestId: crypto.randomUUID()
							});
							break;
							
						case 'edit':
							vscode.postMessage({
								type: 'navigate',
								payload: { page: 'editProvider', providerId }
							});
							break;
							
						case 'setDefault':
							vscode.postMessage({
								type: 'setDefaultProvider',
								payload: { providerId },
								requestId: crypto.randomUUID()
							});
							break;
							
						case 'delete':
							// FR-028: Show confirmation dialog before delete
							if (confirm('Are you sure you want to delete the provider "' + (providerName || providerId) + '"?')) {
								vscode.postMessage({
									type: 'deleteProvider',
									payload: { providerId },
									requestId: crypto.randomUUID()
								});
							}
							break;
					}
				});
			})();
		</script>
	`;
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength: number = 40): string {
	if (url.length <= maxLength) {
		return url;
	}
	return url.substring(0, maxLength - 3) + '...';
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
