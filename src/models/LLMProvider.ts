/**
 * LLM Provider entity interface
 * Based on data-model.md specifications
 */

/**
 * Configuration for connecting to an LLM service
 */
export interface LLMProvider {
	/** Unique identifier (UUID v4) */
	id: string;
	/** User-defined display name */
	name: string;
	/** API base URL (e.g., "http://localhost:11434/v1" for Ollama) */
	baseUrl: string;
	/** Model identifier (e.g., "gpt-4", "llama2", "codellama") */
	model: string;
	/** Whether this is the default provider for new sessions */
	isDefault: boolean;
}

/**
 * Validation rules for LLMProvider
 */
export function validateProvider(provider: Partial<LLMProvider>): string[] {
	const errors: string[] = [];

	if (!provider.id || !isValidUUID(provider.id)) {
		errors.push('Provider ID must be a valid UUID v4');
	}

	if (!provider.name || provider.name.trim().length === 0) {
		errors.push('Provider name is required');
	} else if (provider.name.length > 50) {
		errors.push('Provider name must be 50 characters or less');
	}

	if (!provider.baseUrl || provider.baseUrl.trim().length === 0) {
		errors.push('Provider base URL is required');
	} else if (!isValidURL(provider.baseUrl)) {
		errors.push('Provider base URL must be a valid HTTP or HTTPS URL');
	}

	if (!provider.model || provider.model.trim().length === 0) {
		errors.push('Provider model is required');
	} else if (provider.model.length > 100) {
		errors.push('Provider model must be 100 characters or less');
	}

	if (typeof provider.isDefault !== 'boolean') {
		errors.push('Provider isDefault must be a boolean');
	}

	return errors;
}

// Helper functions
function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

function isValidURL(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}
