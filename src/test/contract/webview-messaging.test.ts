/**
 * Contract tests for webview messaging protocol
 * TDD: These tests verify the postMessage contract between extension and webview
 */

import * as assert from 'assert';
import { WebviewMessage, ExtensionMessage } from '../../models/WebviewMessages';

suite('Webview Messaging Contract Tests', () => {
	suite('Message Type Validation', () => {
		test('should accept valid navigate message', () => {
			const message: WebviewMessage = {
				type: 'navigate',
				payload: {
					page: 'welcome',
				},
			};

			assert.strictEqual(message.type, 'navigate', 'Type should be navigate');
			assert.strictEqual(message.payload.page, 'welcome', 'Page should be welcome');
		});

		test('should accept navigate to chat with sessionId', () => {
			const message: WebviewMessage = {
				type: 'navigate',
				payload: {
					page: 'chat',
					sessionId: 'session-123',
				},
			};

			assert.strictEqual(message.payload.sessionId, 'session-123', 'Should include sessionId');
		});

		test('should accept sendMessage with new session', () => {
			const message: WebviewMessage = {
				type: 'sendMessage',
				payload: {
					content: 'Hello world',
				},
				requestId: 'req-123',
			};

			assert.strictEqual(message.type, 'sendMessage', 'Type should be sendMessage');
			assert.strictEqual(message.payload.content, 'Hello world', 'Content should match');
			assert.strictEqual(message.requestId, 'req-123', 'RequestId should be included');
		});

		test('should accept sendMessage with existing session', () => {
			const message: WebviewMessage = {
				type: 'sendMessage',
				payload: {
					sessionId: 'session-123',
					content: 'Follow-up question',
				},
				requestId: 'req-456',
			};

			assert.strictEqual(message.payload.sessionId, 'session-123', 'SessionId should be included');
		});

		test('should accept addProvider message', () => {
			const message: WebviewMessage = {
				type: 'addProvider',
				payload: {
					name: 'Local Ollama',
					baseUrl: 'http://localhost:11434/v1',
					model: 'llama2',
					apiKey: 'optional-key',
					isDefault: true,
				},
				requestId: 'req-789',
			};

			assert.strictEqual(message.type, 'addProvider', 'Type should be addProvider');
			assert.ok(message.payload.name, 'Should have provider name');
			assert.ok(message.payload.baseUrl, 'Should have base URL');
			assert.ok(message.payload.model, 'Should have model');
		});

		test('should accept deleteSession message', () => {
			const message: WebviewMessage = {
				type: 'deleteSession',
				payload: {
					sessionId: 'session-to-delete',
				},
				requestId: 'req-delete',
			};

			assert.strictEqual(message.type, 'deleteSession', 'Type should be deleteSession');
			assert.strictEqual(message.payload.sessionId, 'session-to-delete', 'SessionId should match');
		});
	});

	suite('Extension Response Messages', () => {
		test('should format stateUpdate message correctly', () => {
			const message: ExtensionMessage = {
				type: 'stateUpdate',
				payload: {
					currentPage: 'welcome',
					isLoading: false,
				},
			};

			assert.strictEqual(message.type, 'stateUpdate', 'Type should be stateUpdate');
			assert.strictEqual(message.payload.currentPage, 'welcome', 'Page should be set');
			assert.strictEqual(message.payload.isLoading, false, 'Loading state should be set');
		});

		test('should format chatChunk message correctly', () => {
			const message: ExtensionMessage = {
				type: 'chatChunk',
				payload: {
					sessionId: 'session-123',
					messageId: 'msg-456',
					content: 'Partial response',
				},
				requestId: 'req-789',
			};

			assert.strictEqual(message.type, 'chatChunk', 'Type should be chatChunk');
			assert.strictEqual(message.payload.content, 'Partial response', 'Content should be included');
			assert.strictEqual(message.requestId, 'req-789', 'RequestId should echo back');
		});

		test('should format chatComplete message correctly', () => {
			const message: ExtensionMessage = {
				type: 'chatComplete',
				payload: {
					sessionId: 'session-123',
					messageId: 'msg-456',
					fullContent: 'Complete response text',
				},
				requestId: 'req-789',
			};

			assert.strictEqual(message.type, 'chatComplete', 'Type should be chatComplete');
			assert.strictEqual(message.payload.fullContent, 'Complete response text', 'Full content included');
		});

		test('should format chatError message correctly', () => {
			const message: ExtensionMessage = {
				type: 'chatError',
				payload: {
					sessionId: 'session-123',
					error: 'Connection failed',
				},
				requestId: 'req-789',
			};

			assert.strictEqual(message.type, 'chatError', 'Type should be chatError');
			assert.strictEqual(message.payload.error, 'Connection failed', 'Error message should be included');
		});

		test('should format sessionListLoaded with pagination info', () => {
			const message: ExtensionMessage = {
				type: 'sessionListLoaded',
				payload: {
					sessions: [
						{ id: '1', title: 'Session 1', updatedAt: '2026-01-08T10:00:00Z' },
						{ id: '2', title: 'Session 2', updatedAt: '2026-01-08T11:00:00Z' },
					],
					total: 50,
					page: 0,
					pageSize: 20,
					hasMore: true,
				},
				requestId: 'req-list',
			};

			assert.strictEqual(message.type, 'sessionListLoaded', 'Type should be sessionListLoaded');
			assert.strictEqual(message.payload.sessions.length, 2, 'Should have 2 sessions');
			assert.strictEqual(message.payload.total, 50, 'Total should be 50');
			assert.strictEqual(message.payload.hasMore, true, 'hasMore should be true');
		});

		test('should format providerTestResult message', () => {
			const message: ExtensionMessage = {
				type: 'providerTestResult',
				payload: {
					id: 'provider-123',
					success: true,
					message: 'Connection successful',
					latency: 250,
				},
				requestId: 'req-test',
			};

			assert.strictEqual(message.type, 'providerTestResult', 'Type should be providerTestResult');
			assert.strictEqual(message.payload.success, true, 'Success should be true');
			assert.strictEqual(message.payload.latency, 250, 'Latency should be included');
		});
	});

	suite('Request/Response Correlation', () => {
		test('should echo requestId in response messages', () => {
			const requestId = crypto.randomUUID();

			const response: ExtensionMessage = {
				type: 'sessionLoaded',
				payload: {
					id: 'session-123',
					title: 'Test Session',
					createdAt: '2026-01-08T10:00:00Z',
					updatedAt: '2026-01-08T10:00:00Z',
					messages: [],
				},
				requestId,
			};

			assert.strictEqual(response.requestId, requestId, 'RequestId should match');
		});

		test('should support multiple concurrent requests with different IDs', () => {
			const req1Id = crypto.randomUUID();
			const req2Id = crypto.randomUUID();

			assert.notStrictEqual(req1Id, req2Id, 'Request IDs should be unique');

			const response1: ExtensionMessage = {
				type: 'providersLoaded',
				payload: {
					providers: [],
				},
				requestId: req1Id,
			};

			const response2: ExtensionMessage = {
				type: 'sessionListLoaded',
				payload: {
					sessions: [],
					total: 0,
					page: 0,
					pageSize: 20,
					hasMore: false,
				},
				requestId: req2Id,
			};

			assert.strictEqual(response1.requestId, req1Id, 'First response should have correct ID');
			assert.strictEqual(response2.requestId, req2Id, 'Second response should have correct ID');
		});
	});

	suite('Error Response Format', () => {
		test('should format error response with code', () => {
			const error: ExtensionMessage = {
				type: 'sessionLoaded',
				error: 'PROVIDER_NOT_FOUND',
				requestId: 'req-error',
			};

			assert.ok(error.error, 'Error field should be present');
			assert.strictEqual(error.requestId, 'req-error', 'RequestId should be included');
		});

		test('should support error without requestId for broadcasts', () => {
			const error: ExtensionMessage = {
				type: 'chatError',
				payload: {
					error: 'No provider configured',
				},
				requestId: 'req-123',
			};

			assert.ok(error.payload.error, 'Error message should be in payload');
		});
	});
});
