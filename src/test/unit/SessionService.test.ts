/**
 * Unit tests for SessionService
 * TDD: These tests are written first and will fail until implementation is complete
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SessionService } from '../../services/SessionService';
import { Message } from '../../models/Session';
import { SessionNotFoundError } from '../../utils/errors';
import { generateUUID } from '../../utils/uuid';

suite('SessionService Unit Tests', () => {
	let sessionService: SessionService;
	let context: vscode.ExtensionContext;

	setup(() => {
		// Create mock context with globalStorageUri
		context = {
			globalStorageUri: vscode.Uri.file('/tmp/circuitx-test'),
		} as vscode.ExtensionContext;

		sessionService = new SessionService(context);
	});

	suite('create()', () => {
		test('should create a session with generated UUID', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Test question',
				timestamp: new Date().toISOString(),
			};

			const session = await sessionService.create(undefined, message);

			assert.ok(session.id, 'Session should have an ID');
			assert.strictEqual(session.id.length, 36, 'ID should be a UUID');
			assert.strictEqual(session.messages.length, 1, 'Should have one message');
			assert.strictEqual(session.messages[0].content, 'Test question', 'Message content should match');
		});

		test('should generate title from first 30 chars of message', async () => {
			const shortContent = 'Short question';
			const longContent = 'This is a very long question that exceeds thirty characters';

			const message1: Message = {
				id: generateUUID(),
				role: 'user',
				content: shortContent,
				timestamp: new Date().toISOString(),
			};

			const message2: Message = {
				id: generateUUID(),
				role: 'user',
				content: longContent,
				timestamp: new Date().toISOString(),
			};

			const session1 = await sessionService.create(undefined, message1);
			assert.strictEqual(session1.title, shortContent, 'Short title should be full content');

			const session2 = await sessionService.create(undefined, message2);
			assert.strictEqual(session2.title, longContent.substring(0, 30), 'Long title should be truncated to 30 chars');
		});

		test('should set createdAt and updatedAt timestamps', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Test question',
				timestamp: new Date().toISOString(),
			};

			const session = await sessionService.create(undefined, message);

			assert.ok(session.createdAt, 'Should have createdAt');
			assert.ok(session.updatedAt, 'Should have updatedAt');
			assert.strictEqual(session.createdAt, session.updatedAt, 'Initial timestamps should match');
		});

		test('should store providerId if provided', async () => {
			const providerId = generateUUID();
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Question',
				timestamp: new Date().toISOString(),
			};

			const session = await sessionService.create(providerId, message);

			assert.strictEqual(session.providerId, providerId, 'ProviderId should be stored');
		});
	});

	suite('load()', () => {
		test('should load an existing session', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Original question',
				timestamp: new Date().toISOString(),
			};

			const created = await sessionService.create(undefined, message);
			const loaded = await sessionService.load(created.id);

			assert.strictEqual(loaded.id, created.id, 'IDs should match');
			assert.strictEqual(loaded.title, created.title, 'Titles should match');
			assert.strictEqual(loaded.messages.length, 1, 'Should have one message');
		});

		test('should throw SessionNotFoundError for non-existent session', async () => {
			const fakeId = generateUUID();

			await assert.rejects(
				async () => await sessionService.load(fakeId),
				(error: Error) => error instanceof SessionNotFoundError,
				'Should throw SessionNotFoundError'
			);
		});
	});

	suite('update()', () => {
		test('should update session title', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Original title',
				timestamp: new Date().toISOString(),
			};

			const session = await sessionService.create(undefined, message);
			const updated = await sessionService.update(session.id, {
				title: 'New title',
			});

			assert.strictEqual(updated.title, 'New title', 'Title should be updated');
			assert.notStrictEqual(updated.updatedAt, session.updatedAt, 'updatedAt should change');
		});

		test('should append messages to session', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Question',
				timestamp: new Date().toISOString(),
			};

			const session = await sessionService.create(undefined, message);

			const newMessage: Message = {
				id: generateUUID(),
				role: 'assistant',
				content: 'Answer',
				timestamp: new Date().toISOString(),
			};

			const updated = await sessionService.update(session.id, {
				messages: [...session.messages, newMessage],
			});

			assert.strictEqual(updated.messages.length, 2, 'Should have two messages');
			assert.strictEqual(updated.messages[1].role, 'assistant', 'Second message should be assistant');
		});

		test('should preserve original createdAt', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Question',
				timestamp: new Date().toISOString(),
			};

			const session = await sessionService.create(undefined, message);
			const originalCreatedAt = session.createdAt;

			await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

			const updated = await sessionService.update(session.id, {
				title: 'Updated',
			});

			assert.strictEqual(updated.createdAt, originalCreatedAt, 'createdAt should not change');
		});
	});

	suite('delete()', () => {
		test('should delete a session', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'To be deleted',
				timestamp: new Date().toISOString(),
			};

			const session = await sessionService.create(undefined, message);
			await sessionService.delete(session.id);

			await assert.rejects(
				async () => await sessionService.load(session.id),
				(error: Error) => error instanceof SessionNotFoundError,
				'Session should no longer exist'
			);
		});

		test('should throw SessionNotFoundError for non-existent session', async () => {
			const fakeId = generateUUID();

			await assert.rejects(
				async () => await sessionService.delete(fakeId),
				(error: Error) => error instanceof SessionNotFoundError,
				'Should throw SessionNotFoundError'
			);
		});
	});

	suite('list()', () => {
		test('should return empty array when no sessions exist', async () => {
			const sessions = await sessionService.list();
			assert.strictEqual(sessions.length, 0, 'Should return empty array');
		});

		test('should return session metadata', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'First session',
				timestamp: new Date().toISOString(),
			};

			await sessionService.create(undefined, message);
			await sessionService.create(undefined, message);
			await sessionService.create(undefined, message);

			const sessions = await sessionService.list();

			assert.strictEqual(sessions.length, 3, 'Should return 3 sessions');
			assert.ok(sessions[0].id, 'Should have id');
			assert.ok(sessions[0].title, 'Should have title');
			assert.ok(sessions[0].updatedAt, 'Should have updatedAt');
		});

		test('should sort by updatedAt descending', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Test',
				timestamp: new Date().toISOString(),
			};

			const first = await sessionService.create(undefined, message);
			await new Promise(resolve => setTimeout(resolve, 10));
			const second = await sessionService.create(undefined, message);
			await new Promise(resolve => setTimeout(resolve, 10));
			const third = await sessionService.create(undefined, message);

			const sessions = await sessionService.list();

			assert.strictEqual(sessions[0].id, third.id, 'Most recent should be first');
			assert.strictEqual(sessions[1].id, second.id, 'Second most recent should be second');
			assert.strictEqual(sessions[2].id, first.id, 'Oldest should be last');
		});

		test('should support pagination', async () => {
			const message: Message = {
				id: generateUUID(),
				role: 'user',
				content: 'Session',
				timestamp: new Date().toISOString(),
			};

			// Create 25 sessions
			for (let i = 0; i < 25; i++) {
				await sessionService.create(undefined, message);
			}

			const page0 = await sessionService.list(0, 10);
			const page1 = await sessionService.list(1, 10);
			const page2 = await sessionService.list(2, 10);

			assert.strictEqual(page0.length, 10, 'Page 0 should have 10 items');
			assert.strictEqual(page1.length, 10, 'Page 1 should have 10 items');
			assert.strictEqual(page2.length, 5, 'Page 2 should have 5 items');

			assert.notStrictEqual(page0[0].id, page1[0].id, 'Pages should have different sessions');
		});
	});
});
