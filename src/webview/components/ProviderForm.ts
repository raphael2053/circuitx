/**
 * ProviderForm component - Add/Edit provider form with validation
 * Implements: T051, T054 - Provider form with required fields validation
 * 
 * Features:
 * - FR-024: Required fields: Name, Base URL, Model
 * - FR-025: Optional API Key field
 * - Form validation for required fields and URL format
 * - Edit mode pre-fills current values
 */

import { LLMProvider } from '../../models/LLMProvider';

export interface ProviderFormProps {
	/** Provider to edit (undefined for new provider) */
	provider?: LLMProvider;
	/** Whether form is in loading state */
	isLoading?: boolean;
	/** Validation error message */
	error?: string;
}

/**
 * Render the provider form HTML
 */
export function ProviderForm(props: ProviderFormProps): string {
	const { provider, isLoading = false, error } = props;
	const isEditMode = !!provider;
	const title = isEditMode ? 'Edit Provider' : 'Add Provider';

	return `
		<div class="provider-form" id="provider-form">
			<h3 class="form-title">${title}</h3>
			
			${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
			
			<form id="provider-form-element" data-edit-mode="${isEditMode}">
				${provider ? `<input type="hidden" name="id" value="${provider.id}" />` : ''}
				
				<div class="form-group">
					<label class="form-label" for="provider-name">
						Name <span class="required">*</span>
					</label>
					<input 
						type="text" 
						id="provider-name" 
						name="name" 
						class="form-input" 
						placeholder="e.g., Local Ollama, OpenAI"
						value="${provider ? escapeHtml(provider.name) : ''}"
						required
						${isLoading ? 'disabled' : ''}
					/>
					<span class="form-hint">A friendly name to identify this provider</span>
				</div>
				
				<div class="form-group">
					<label class="form-label" for="provider-baseUrl">
						Base URL <span class="required">*</span>
					</label>
					<input 
						type="url" 
						id="provider-baseUrl" 
						name="baseUrl" 
						class="form-input" 
						placeholder="e.g., http://localhost:11434/v1"
						value="${provider ? escapeHtml(provider.baseUrl) : ''}"
						required
						${isLoading ? 'disabled' : ''}
					/>
					<span class="form-hint">OpenAI-compatible API endpoint URL</span>
				</div>
				
				<div class="form-group">
					<label class="form-label" for="provider-model">
						Model <span class="required">*</span>
					</label>
					<input 
						type="text" 
						id="provider-model" 
						name="model" 
						class="form-input" 
						placeholder="e.g., llama2, gpt-4, codellama"
						value="${provider ? escapeHtml(provider.model) : ''}"
						required
						${isLoading ? 'disabled' : ''}
					/>
					<span class="form-hint">Model identifier used for API calls</span>
				</div>
				
				<div class="form-group">
					<label class="form-label" for="provider-apiKey">
						API Key <span class="optional">(optional)</span>
					</label>
					<input 
						type="password" 
						id="provider-apiKey" 
						name="apiKey" 
						class="form-input" 
						placeholder="Enter API key if required"
						${isLoading ? 'disabled' : ''}
					/>
					<span class="form-hint">Stored securely in your system keychain</span>
				</div>
				
				${!isEditMode ? `
				<div class="form-group form-checkbox">
					<label class="checkbox-label">
						<input 
							type="checkbox" 
							id="provider-isDefault" 
							name="isDefault"
							${isLoading ? 'disabled' : ''}
						/>
						<span>Set as default provider</span>
					</label>
				</div>
				` : ''}
				
				<div class="form-actions">
					<button 
						type="button" 
						class="btn btn-secondary" 
						id="provider-cancel-btn"
						data-action="navigate"
						data-page="providers"
						${isLoading ? 'disabled' : ''}
					>
						Cancel
					</button>
					<button 
						type="submit" 
						class="btn btn-primary" 
						id="provider-save-btn"
						${isLoading ? 'disabled' : ''}
					>
						${isLoading ? 'Saving...' : (isEditMode ? 'Update' : 'Add Provider')}
					</button>
				</div>
			</form>
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
