/**
 * Unit tests for LLMService
 * TDD: These tests are written first and will fail until implementation is complete
 */

import * as assert from 'assert';
import { LLMService } from '../../services/LLMService';
import { LLMProvider } from '../../models/LLMProvider';
import { Message } from '../../models/Session';

suite('LLMService Unit Tests', () => {
	let llmService: LLMService;
	let originalFetch: typeof global.fetch;

	setup(() => {
		llmService = new LLMService();
		originalFetch = global.fetch;
	});

	teardown(() => {
		global.fetch = originalFetch;
	});

	suite('sendMessage()', () => {
		test('should send request with correct format', async () => {
			let capturedRequest: RequestInit | undefined;
			let capturedUrl: string | undefined;

			// Mock fetch
			global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
				capturedUrl = url.toString();
				capturedRequest = init;

				return new Response(
					'data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\ndata: [DONE]\n\n',
					{
						status: 200,
						headers: { 'Content-Type': 'text/event-stream' },
					}
				);
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'llama2',
				isDefault: true,
			};

			const messages: Message[] = [
				{
					id: '1',
					role: 'user',
					content: 'Hello',
					timestamp: new Date().toISOString(),
				},
			];

			let chunks: string[] = [];
			await llmService.sendMessage(
				provider,
				'',
				messages,
				(content) => chunks.push(content),
				() => {},
				() => {}
			);

			assert.strictEqual(capturedUrl, 'http://localhost:11434/v1/chat/completions', 'URL should be correct');
			assert.ok(capturedRequest, 'Request should be captured');
			assert.strictEqual(capturedRequest!.method, 'POST', 'Method should be POST');
			
			const body = JSON.parse(capturedRequest!.body as string);
			assert.strictEqual(body.model, 'llama2', 'Model should be included');
			assert.strictEqual(body.stream, true, 'Stream should be true');
			assert.ok(Array.isArray(body.messages), 'Messages should be included');
		});

		test('should include API key in Authorization header when provided', async () => {
			let capturedHeaders: any | undefined;

			global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
				capturedHeaders = init?.headers;
				return new Response('data: [DONE]\n\n', {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				});
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			await llmService.sendMessage(
				provider,
				'sk-test-key-123',
				[],
				() => {},
				() => {},
				() => {}
			);

			const headers = new Headers(capturedHeaders);
			assert.strictEqual(headers.get('Authorization'), 'Bearer sk-test-key-123', 'Should include Bearer token');
		});

		test('should use empty string for Authorization when no API key', async () => {
			let capturedHeaders: any | undefined;

			global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
				capturedHeaders = init?.headers;
				return new Response('data: [DONE]\n\n', {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				});
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'llama2',
				isDefault: true,
			};

			await llmService.sendMessage(
				provider,
				'',
				[],
				() => {},
				() => {},
				() => {}
			);

			const headers = new Headers(capturedHeaders);
			assert.strictEqual(headers.get('Authorization'), 'Bearer ', 'Should have Bearer with empty string');
		});
	});

	suite('SSE Stream Parsing', () => {
		test('should parse SSE chunks and call onChunk callback', async () => {
			const sseStream = `data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}

data: {"id":"1","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]

`;

			global.fetch = async () => {
				return new Response(sseStream, {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				});
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			const chunks: string[] = [];
			let completed = false;

			await llmService.sendMessage(
				provider,
				'',
				[],
				(content) => chunks.push(content),
				() => {},
				() => { completed = true; }
			);

			assert.deepStrictEqual(chunks, ['Hello', ' world'], 'Should parse content chunks correctly');
			assert.strictEqual(completed, true, 'Should call onComplete');
		});

		test('should handle malformed JSON chunks gracefully', async () => {
			const sseStream = `data: {"valid":"json","choices":[{"index":0,"delta":{"content":"OK"},"finish_reason":null}]}

data: {invalid json}

data: {"valid":"json","choices":[{"index":0,"delta":{"content":"Still works"},"finish_reason":null}]}

data: [DONE]

`;

			global.fetch = async () => {
				return new Response(sseStream, {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				});
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			const chunks: string[] = [];

			await llmService.sendMessage(
				provider,
				'',
				[],
				(content) => chunks.push(content),
				() => {},
				() => {}
			);

			assert.deepStrictEqual(chunks, ['OK', 'Still works'], 'Should skip malformed chunks');
		});
	});

	suite('Error Handling', () => {
		test('should call onError for network errors', async () => {
			global.fetch = async () => {
				throw new Error('Network error');
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			let errorCalled = false;
			let capturedError: Error | undefined;

			await llmService.sendMessage(
				provider,
				'',
				[],
				() => {},
				(error) => {
					errorCalled = true;
					capturedError = error;
				},
				() => {}
			);

			assert.strictEqual(errorCalled, true, 'Should call onError');
			assert.ok(capturedError, 'Should pass error object');
		});

		test('should call onError for HTTP error responses', async () => {
			global.fetch = async () => {
				return new Response(
					JSON.stringify({
						error: {
							message: 'Invalid API key',
							type: 'invalid_request_error',
							code: 'invalid_api_key',
						},
					}),
					{ status: 401 }
				);
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			let errorCalled = false;

			await llmService.sendMessage(
				provider,
				'invalid-key',
				[],
				() => {},
				() => { errorCalled = true; },
				() => {}
			);

			assert.strictEqual(errorCalled, true, 'Should call onError for 401');
		});

		test('should retry once on 500 error with 2 second delay', async () => {
			let attemptCount = 0;
			const startTime = Date.now();

			global.fetch = async () => {
				attemptCount++;
				if (attemptCount === 1) {
					return new Response('Internal Server Error', { status: 500 });
				}
				return new Response('data: [DONE]\n\n', {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				});
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			await llmService.sendMessage(
				provider,
				'',
				[],
				() => {},
				() => {},
				() => {}
			);

			const elapsed = Date.now() - startTime;

			assert.strictEqual(attemptCount, 2, 'Should retry once');
			assert.ok(elapsed >= 2000, 'Should wait at least 2 seconds before retry');
		});

		test('should call onError after retry fails', async () => {
			let attemptCount = 0;

			global.fetch = async () => {
				attemptCount++;
				return new Response('Server Error', { status: 500 });
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			let errorCalled = false;

			await llmService.sendMessage(
				provider,
				'',
				[],
				() => {},
				() => { errorCalled = true; },
				() => {}
			);

			assert.strictEqual(attemptCount, 2, 'Should attempt twice');
			assert.strictEqual(errorCalled, true, 'Should call onError after retry fails');
		});

		test('should not retry on 4xx errors', async () => {
			let attemptCount = 0;

			global.fetch = async () => {
				attemptCount++;
				return new Response('Bad Request', { status: 400 });
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			let errorCalled = false;

			await llmService.sendMessage(
				provider,
				'',
				[],
				() => {},
				() => { errorCalled = true; },
				() => {}
			);

			assert.strictEqual(attemptCount, 1, 'Should not retry on 4xx');
			assert.strictEqual(errorCalled, true, 'Should call onError');
		});
	});

	suite('Cancellation', () => {
		test('should support request cancellation via AbortController', async () => {
			global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
				// Simulate long-running request
				await new Promise(resolve => setTimeout(resolve, 5000));
				return new Response('data: [DONE]\n\n', {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				});
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			let errorCalled = false;

			const controller = llmService.sendMessage(
				provider,
				'',
				[],
				() => {},
				(error) => {
					errorCalled = true;
					assert.strictEqual(error.name, 'RequestCancelledError', 'Should be RequestCancelledError');
				},
				() => {}
			);

			// Cancel immediately
			controller.abort();

			// Give it a moment to process cancellation
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(errorCalled, true, 'Should call onError with cancellation');
		});
	});

	suite('Timeout', () => {
		test('should timeout after 30 seconds', async () => {
			global.fetch = async () => {
				// Simulate hanging request
				await new Promise(resolve => setTimeout(resolve, 35000));
				return new Response('data: [DONE]\n\n', {
					status: 200,
					headers: { 'Content-Type': 'text/event-stream' },
				});
			};

			const provider: LLMProvider = {
				id: 'test-id',
				name: 'Test',
				baseUrl: 'http://localhost:11434/v1',
				model: 'gpt-4',
				isDefault: true,
			};

			let errorCalled = false;
			const startTime = Date.now();

			await llmService.sendMessage(
				provider,
				'',
				[],
				() => {},
				(error) => {
					errorCalled = true;
					assert.strictEqual(error.name, 'TimeoutError', 'Should be TimeoutError');
				},
				() => {}
			);

			const elapsed = Date.now() - startTime;

			assert.strictEqual(errorCalled, true, 'Should call onError for timeout');
			assert.ok(elapsed >= 30000 && elapsed < 31000, 'Should timeout after ~30 seconds');
		});
	});
});
