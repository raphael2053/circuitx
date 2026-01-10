/**
 * ProvidersPage - LLM Provider configuration page
 * Implements: T053 - ProvidersPage.render() with provider list
 * 
 * Features:
 * - FR-023: List configured providers with Name, Base URL, Model, Default status
 * - FR-024/FR-025: Add new provider form
 * - FR-027: Edit existing provider
 * - FR-028: Delete provider with confirmation
 * - FR-029: Set default provider
 * - FR-026/FR-030: Test provider connection
 * 
 * This page displays:
 * - Toolbar with navigation
 * - Provider table (or empty state)
 * - Add Provider button
 * - Provider form (when adding/editing)
 */

import { Toolbar } from '../components/Toolbar';
import { ProviderTable, ProviderTableScript } from '../components/ProviderTable';
import { ProviderForm, ProviderFormScript } from '../components/ProviderForm';
import { LLMProvider } from '../../models/LLMProvider';

export interface ProvidersPageProps {
	/** List of configured providers */
	providers: LLMProvider[];
	/** ID of the default provider */
	defaultProviderId?: string;
	/** Provider being edited (undefined for list view) */
	editingProvider?: LLMProvider;
	/** Whether showing add form */
	showAddForm?: boolean;
	/** Provider ID currently being tested */
	testingProviderId?: string;
	/** Error message */
	error?: string;
	/** Success message */
	successMessage?: string;
}

/**
 * Render the Providers page HTML
 */
export function ProvidersPage(props: ProvidersPageProps): string {
	const { 
		providers, 
		defaultProviderId, 
		editingProvider,
		showAddForm = false,
		testingProviderId,
		error,
		successMessage,
	} = props;

	// Determine which view to show
	const showForm = showAddForm || !!editingProvider;

	return `
		<div class="page providers-page">
			${Toolbar({})}
			
			<div class="providers-header">
				<h2 class="providers-title">LLM Providers</h2>
				${!showForm ? `
				<button id="add-provider-btn" class="btn btn-primary">
					<span class="btn-icon">➕</span> Add Provider
				</button>
				` : ''}
			</div>
			
			${successMessage ? `
				<div class="success-message" id="success-message">
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
			
			<div class="providers-content">
				${showForm 
					? ProviderForm({ 
						provider: editingProvider, 
						error: undefined,
					})
					: ProviderTable({ 
						providers, 
						defaultProviderId, 
						testingProviderId,
					})
				}
			</div>
			
			${!showForm ? `
			<div class="providers-help">
				<h3>About Providers</h3>
				<p>
					CircuitX uses OpenAI-compatible APIs to communicate with LLMs.
					You can configure multiple providers and set a default for new sessions.
				</p>
				<ul>
					<li><strong>Local LLMs:</strong> Use Ollama (http://localhost:11434/v1) or LM Studio</li>
					<li><strong>Cloud APIs:</strong> OpenAI, Anthropic (via proxy), or other compatible services</li>
					<li><strong>API Key:</strong> Only required for cloud services that need authentication</li>
				</ul>
			</div>
			` : ''}
		</div>
		
		${showForm 
			? ProviderFormScript(!!editingProvider)
			: `
				${ProviderTableScript()}
				${ProvidersPageScript()}
			`
		}
	`;
}

/**
 * Generate script for providers page actions
 */
function ProvidersPageScript(): string {
	return `
		<script>
			(function() {
				const vscode = acquireVsCodeApi();
				
				// Handle Add Provider button
				const addBtn = document.getElementById('add-provider-btn');
				addBtn?.addEventListener('click', () => {
					vscode.postMessage({
						type: 'navigate',
						payload: { page: 'addProvider' }
					});
				});
				
				// Auto-hide success message after 3 seconds
				const successMsg = document.getElementById('success-message');
				if (successMsg) {
					setTimeout(() => {
						successMsg.style.opacity = '0';
						setTimeout(() => successMsg.remove(), 300);
					}, 3000);
				}
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
