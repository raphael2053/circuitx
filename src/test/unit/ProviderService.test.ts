/**
 * Unit tests for ProviderService
 * TDD: These tests are written first and will fail until implementation is complete
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProviderService } from '../../services/ProviderService';
import { ProviderNotFoundError, ValidationError } from '../../utils/errors';

suite('ProviderService Unit Tests', () => {
	let providerService: ProviderService;
	let context: vscode.ExtensionContext;
	let mockSecrets: Map<string, string>;
	let mockConfig: any;

	setup(() => {
		// Mock secrets storage
		mockSecrets = new Map();

		// Mock configuration
		mockConfig = {
			providers: [],
		};

		// Create mock context
		context = {
			secrets: {
				store: async (key: string, value: string) => {
					mockSecrets.set(key, value);
				},
				get: async (key: string) => {
					return mockSecrets.get(key);
				},
				delete: async (key: string) => {
					mockSecrets.delete(key);
				},
			},
		} as unknown as vscode.ExtensionContext;

		// Mock workspace.getConfiguration
		const originalGetConfiguration = vscode.workspace.getConfiguration;
		vscode.workspace.getConfiguration = (section?: string) => {
			return {
				get: (key: string, defaultValue?: any) => {
					return mockConfig[key] ?? defaultValue;
				},
				update: async (key: string, value: any) => {
					mockConfig[key] = value;
				},
			} as any;
		};

		providerService = new ProviderService(context);
	});

	suite('CRUD Operations', () => {
		test('should add a provider with generated UUID', async () => {
			const provider = await providerService.addProvider(
				'Local Ollama',
				'http://localhost:11434/v1',
				'llama2'
			);

			assert.ok(provider.id, 'Provider should have an ID');
			assert.strictEqual(provider.id.length, 36, 'ID should be a UUID');
			assert.strictEqual(provider.name, 'Local Ollama', 'Name should match');
			assert.strictEqual(provider.baseUrl, 'http://localhost:11434/v1', 'Base URL should match');
			assert.strictEqual(provider.model, 'llama2', 'Model should match');
		});

		test('should make first provider default automatically', async () => {
			const provider = await providerService.addProvider(
				'First Provider',
				'http://localhost:11434/v1',
				'llama2'
			);

			assert.strictEqual(provider.isDefault, true, 'First provider should be default');
		});

		test('should list all providers', async () => {
			await providerService.addProvider('Provider 1', 'http://localhost:11434/v1', 'model1');
			await providerService.addProvider('Provider 2', 'http://localhost:11435/v1', 'model2');

			const providers = await providerService.listProviders();

			assert.strictEqual(providers.length, 2, 'Should have 2 providers');
		});

		test('should get a provider by ID', async () => {
			const created = await providerService.addProvider(
				'Test Provider',
				'http://localhost:11434/v1',
				'llama2'
			);

			const retrieved = await providerService.getProvider(created.id);

			assert.strictEqual(retrieved.id, created.id, 'IDs should match');
			assert.strictEqual(retrieved.name, 'Test Provider', 'Name should match');
		});

		test('should throw ProviderNotFoundError for non-existent provider', async () => {
			await assert.rejects(
				async () => await providerService.getProvider('non-existent-id'),
				(error: Error) => error instanceof ProviderNotFoundError,
				'Should throw ProviderNotFoundError'
			);
		});

		test('should update provider fields', async () => {
			const provider = await providerService.addProvider(
				'Original Name',
				'http://localhost:11434/v1',
				'llama2'
			);

			const updated = await providerService.updateProvider(provider.id, {
				name: 'New Name',
				model: 'llama3',
			});

			assert.strictEqual(updated.name, 'New Name', 'Name should be updated');
			assert.strictEqual(updated.model, 'llama3', 'Model should be updated');
			assert.strictEqual(updated.baseUrl, 'http://localhost:11434/v1', 'Base URL should remain unchanged');
		});

		test('should delete a provider', async () => {
			const provider = await providerService.addProvider(
				'To Delete',
				'http://localhost:11434/v1',
				'llama2'
			);

			await providerService.deleteProvider(provider.id);

			await assert.rejects(
				async () => await providerService.getProvider(provider.id),
				(error: Error) => error instanceof ProviderNotFoundError,
				'Provider should no longer exist'
			);
		});

		test('should throw ProviderNotFoundError when deleting non-existent provider', async () => {
			await assert.rejects(
				async () => await providerService.deleteProvider('non-existent-id'),
				(error: Error) => error instanceof ProviderNotFoundError,
				'Should throw ProviderNotFoundError'
			);
		});

		test('should unset other defaults when setting new default', async () => {
			const first = await providerService.addProvider(
				'First',
				'http://localhost:11434/v1',
				'llama2',
				undefined,
				true
			);
			const second = await providerService.addProvider(
				'Second',
				'http://localhost:11435/v1',
				'llama2',
				undefined,
				true
			);

			const providers = await providerService.listProviders();
			const firstAfter = providers.find(p => p.id === first.id);

			assert.strictEqual(second.isDefault, true, 'Second provider should be default');
			assert.strictEqual(firstAfter?.isDefault, false, 'First provider should no longer be default');
		});
	});

	suite('API Key Storage', () => {
		test('should store API key in SecretStorage', async () => {
			const provider = await providerService.addProvider(
				'Test Provider',
				'http://localhost:11434/v1',
				'llama2',
				'sk-test-key-123'
			);

			const storedKey = await providerService.getProviderApiKey(provider.id);
			assert.strictEqual(storedKey, 'sk-test-key-123', 'API key should be stored');
		});

		test('should retrieve API key from SecretStorage', async () => {
			const provider = await providerService.addProvider(
				'Test Provider',
				'http://localhost:11434/v1',
				'llama2',
				'my-secret-key'
			);

			const key = await providerService.getProviderApiKey(provider.id);
			assert.strictEqual(key, 'my-secret-key', 'Should retrieve stored API key');
		});

		test('should update API key', async () => {
			const provider = await providerService.addProvider(
				'Test Provider',
				'http://localhost:11434/v1',
				'llama2',
				'old-key'
			);

			await providerService.updateProvider(provider.id, {}, 'new-key');

			const key = await providerService.getProviderApiKey(provider.id);
			assert.strictEqual(key, 'new-key', 'API key should be updated');
		});

		test('should delete API key when provider is deleted', async () => {
			const provider = await providerService.addProvider(
				'Test Provider',
				'http://localhost:11434/v1',
				'llama2',
				'secret-key'
			);

			await providerService.deleteProvider(provider.id);

			const key = await providerService.getProviderApiKey(provider.id);
			assert.strictEqual(key, undefined, 'API key should be deleted');
		});
	});

	suite('Default Provider Management', () => {
		test('should get default provider', async () => {
			const first = await providerService.addProvider(
				'First',
				'http://localhost:11434/v1',
				'llama2'
			);

			const defaultProvider = await providerService.getDefaultProvider();
			assert.strictEqual(defaultProvider?.id, first.id, 'First provider should be default');
		});

		test('should set a new default provider', async () => {
			await providerService.addProvider('First', 'http://localhost:11434/v1', 'llama2');
			const second = await providerService.addProvider('Second', 'http://localhost:11435/v1', 'llama2');

			await providerService.setDefaultProvider(second.id);

			const defaultProvider = await providerService.getDefaultProvider();
			assert.strictEqual(defaultProvider?.id, second.id, 'Second provider should be default');
		});

		test('should only have one default provider', async () => {
			await providerService.addProvider('First', 'http://localhost:11434/v1', 'llama2');
			const second = await providerService.addProvider('Second', 'http://localhost:11435/v1', 'llama2');

			await providerService.setDefaultProvider(second.id);

			const providers = await providerService.listProviders();
			const defaultProviders = providers.filter(p => p.isDefault);

			assert.strictEqual(defaultProviders.length, 1, 'Should only have one default provider');
			assert.strictEqual(defaultProviders[0].id, second.id, 'Second provider should be the default');
		});

		test('should prevent deleting the default provider when others exist', async () => {
			const defaultProvider = await providerService.addProvider('Default', 'http://localhost:11434/v1', 'llama2');
			await providerService.addProvider('Second', 'http://localhost:11435/v1', 'llama2');

			await assert.rejects(
				async () => await providerService.deleteProvider(defaultProvider.id),
				(error: Error) => error instanceof ValidationError,
				'Should throw ValidationError'
			);
		});
	});

	suite('Validation', () => {
		test('should validate base URL format', async () => {
			await assert.rejects(
				async () => await providerService.addProvider('Test', 'invalid-url', 'llama2'),
				(error: Error) => error instanceof ValidationError,
				'Should reject invalid URL'
			);
		});

		test('should require provider name', async () => {
			await assert.rejects(
				async () => await providerService.addProvider('', 'http://localhost:11434/v1', 'llama2'),
				(error: Error) => error instanceof ValidationError,
				'Should reject empty name'
			);
		});

		test('should require model name', async () => {
			await assert.rejects(
				async () => await providerService.addProvider('Test', 'http://localhost:11434/v1', ''),
				(error: Error) => error instanceof ValidationError,
				'Should reject empty model'
			);
		});
	});
});
