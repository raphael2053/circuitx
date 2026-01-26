/**
 * ProviderService - Manages LLM provider configurations and API keys
 * Implements: T014 - Provider CRUD with workspace config and secrets
 */

import * as vscode from 'vscode';
import { LLMProvider, validateProvider } from '../models/LLMProvider';
import { generateUUID } from '../utils/uuid';
import { ProviderNotFoundError, ValidationError } from '../utils/errors';

export class ProviderService {
	constructor(private context: vscode.ExtensionContext) {}

	/**
	 * Get workspace configuration for providers
	 */
	private getConfig(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('circuitx');
	}

	/**
	 * Get all providers from configuration
	 */
	private async getProviders(): Promise<LLMProvider[]> {
		const config = this.getConfig();
		return config.get<LLMProvider[]>('providers', []);
	}

	/**
	 * Save providers to configuration
	 */
	private async saveProviders(providers: LLMProvider[]): Promise<void> {
		const config = this.getConfig();
		await config.update('providers', providers, vscode.ConfigurationTarget.Global);
	}

	/**
	 * Add a new provider
	 */
	async addProvider(
		name: string,
		baseUrl: string,
		model: string,
		apiKey?: string,
		isDefault?: boolean
	): Promise<LLMProvider> {
		const provider: LLMProvider = {
			id: generateUUID(),
			name,
			baseUrl,
			model,
			isDefault: isDefault ?? false,
		};

		// Validate before adding
		validateProvider(provider);

		const providers = await this.getProviders();

		// If this is the first provider, make it default
		if (providers.length === 0) {
			provider.isDefault = true;
		} else if (provider.isDefault) {
			// Unset other defaults
			providers.forEach(p => (p.isDefault = false));
		}

		providers.push(provider);
		await this.saveProviders(providers);

		// Store API key if provided
		if (apiKey) {
			await this.context.secrets.store(`circuitx.provider.${provider.id}.apiKey`, apiKey);
		}

		return provider;
	}

	/**
	 * Get a provider by ID
	 */
	async getProvider(id: string): Promise<LLMProvider> {
		const providers = await this.getProviders();
		const provider = providers.find(p => p.id === id);

		if (!provider) {
			throw new ProviderNotFoundError(id);
		}

		return provider;
	}

	/**
	 * List all providers
	 */
	async listProviders(): Promise<LLMProvider[]> {
		return this.getProviders();
	}

	/**
	 * Update a provider
	 */
	async updateProvider(id: string, updates: Partial<Omit<LLMProvider, 'id'>>, apiKey?: string): Promise<LLMProvider> {
		const providers = await this.getProviders();
		const index = providers.findIndex(p => p.id === id);

		if (index === -1) {
			throw new ProviderNotFoundError(id);
		}

		// Merge updates
		const updatedProvider: LLMProvider = {
			...providers[index],
			...updates,
			id, // Never change ID
		};

		// Validate after update
		validateProvider(updatedProvider);

		// Handle default provider logic
		if (updates.isDefault === true) {
			providers.forEach(p => (p.isDefault = false));
		}

		providers[index] = updatedProvider;
		await this.saveProviders(providers);

		// Update API key if provided
		if (apiKey !== undefined) {
			if (apiKey) {
				await this.context.secrets.store(`circuitx.provider.${id}.apiKey`, apiKey);
			} else {
				await this.context.secrets.delete(`circuitx.provider.${id}.apiKey`);
			}
		}

		return updatedProvider;
	}

	/**
	 * Delete a provider
	 */
	async deleteProvider(id: string): Promise<void> {
		const providers = await this.getProviders();
		const provider = providers.find(p => p.id === id);

		if (!provider) {
			throw new ProviderNotFoundError(id);
		}

		// Prevent deleting the default provider unless it's the only one
		if (provider.isDefault && providers.length > 1) {
			throw new ValidationError('Cannot delete the default provider. Please set another provider as default first.');
		}

		// Remove from list
		const updated = providers.filter(p => p.id !== id);
		await this.saveProviders(updated);

		// Delete API key
		await this.context.secrets.delete(`circuitx.provider.${id}.apiKey`);
	}

	/**
	 * Get the default provider
	 */
	async getDefaultProvider(): Promise<LLMProvider | undefined> {
		const providers = await this.getProviders();
		return providers.find(p => p.isDefault);
	}

	/**
	 * Set a provider as the default
	 */
	async setDefaultProvider(id: string): Promise<void> {
		const providers = await this.getProviders();
		const provider = providers.find(p => p.id === id);

		if (!provider) {
			throw new ProviderNotFoundError(id);
		}

		// Unset all defaults
		providers.forEach(p => (p.isDefault = false));

		// Set new default
		provider.isDefault = true;

		await this.saveProviders(providers);
	}

	/**
	 * Get API key for a provider
	 */
	async getProviderApiKey(id: string): Promise<string | undefined> {
		return this.context.secrets.get(`circuitx.provider.${id}.apiKey`);
	}
}
