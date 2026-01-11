/**
 * SessionService - Manages chat sessions with file system persistence
 * Implements: T011 - Session CRUD with vscode.workspace.fs
 */

import * as vscode from 'vscode';
import { Session, Message, generateSessionTitle } from '../models/Session';
import { generateUUID } from '../utils/uuid';
import { SessionNotFoundError, isFileSystemError } from '../utils/errors';

export class SessionService {
	constructor(private context: vscode.ExtensionContext) {}

	/**
	 * Get the sessions directory path
	 */
	private getSessionsDir(): vscode.Uri {
		const storageUri = this.context.globalStorageUri;
		return vscode.Uri.joinPath(storageUri, '.circuitx', 'sessions');
	}

	/**
	 * Get the file path for a specific session
	 */
	private getSessionPath(sessionId: string): vscode.Uri {
		return vscode.Uri.joinPath(this.getSessionsDir(), `${sessionId}.json`);
	}

	/**
	 * Ensure the sessions directory exists
	 */
	private async ensureSessionsDir(): Promise<void> {
		const sessionsDir = this.getSessionsDir();
		try {
			await vscode.workspace.fs.stat(sessionsDir);
		} catch {
			await vscode.workspace.fs.createDirectory(sessionsDir);
		}
	}

	/**
	 * Create a new session with an initial message
	 * @param providerId - Optional provider ID for the session (uses default if not set)
	 * @param firstMessage - The initial user message to start the conversation
	 * @returns The created session with generated ID and title
	 */
	async create(providerId: string | undefined, firstMessage: Message): Promise<Session> {
		await this.ensureSessionsDir();

		const now = new Date().toISOString();
		const session: Session = {
			id: generateUUID(),
			title: generateSessionTitle(firstMessage.content),
			createdAt: now,
			updatedAt: now,
			messages: [firstMessage],
			providerId,
		};

		// Persist to file
		const sessionPath = this.getSessionPath(session.id);
		const content = Buffer.from(JSON.stringify(session, null, 2), 'utf8');
		await vscode.workspace.fs.writeFile(sessionPath, content);

		return session;
	}

	/**
	 * Load a session by ID
	 * @param sessionId - The unique session identifier
	 * @returns The loaded session
	 * @throws {SessionNotFoundError} If session doesn't exist
	 */
	async load(sessionId: string): Promise<Session> {
		const sessionPath = this.getSessionPath(sessionId);

		try {
			const content = await vscode.workspace.fs.readFile(sessionPath);
			const session = JSON.parse(Buffer.from(content).toString('utf8')) as Session;
			return session;
		} catch (error) {
			if (isFileSystemError(error, 'FileNotFound')) {
				throw new SessionNotFoundError(sessionId);
			}
			throw error;
		}
	}

	/**
	 * Update a session (modify title or append messages)
	 */
	async update(sessionId: string, updates: Partial<Session>): Promise<Session> {
		const session = await this.load(sessionId);

		// Apply updates
		const updatedSession: Session = {
			...session,
			...updates,
			id: session.id, // Never change ID
			createdAt: session.createdAt, // Never change createdAt
			updatedAt: new Date().toISOString(), // Always update timestamp
		};

		// Persist to file
		const sessionPath = this.getSessionPath(sessionId);
		const content = Buffer.from(JSON.stringify(updatedSession, null, 2), 'utf8');
		await vscode.workspace.fs.writeFile(sessionPath, content);

		return updatedSession;
	}

	/**
	 * Delete a session
	 */
	async delete(sessionId: string): Promise<void> {
		const sessionPath = this.getSessionPath(sessionId);

		try {
			await vscode.workspace.fs.delete(sessionPath);
		} catch (error) {
			if (isFileSystemError(error, 'FileNotFound')) {
				throw new SessionNotFoundError(sessionId);
			}
			throw error;
		}
	}

	/**
	 * List sessions with pagination
	 * Returns metadata only (id, title, updatedAt) sorted by updatedAt descending
	 */
	async list(page: number = 0, pageSize: number = 20): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
		await this.ensureSessionsDir();
		const sessionsDir = this.getSessionsDir();

		try {
			const files = await vscode.workspace.fs.readDirectory(sessionsDir);

			// Read all session metadata
			const sessions = await Promise.all(
				files
					.filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.json'))
					.map(async ([name]) => {
						const sessionId = name.replace('.json', '');
						try {
							const session = await this.load(sessionId);
							return {
								id: session.id,
								title: session.title,
								updatedAt: session.updatedAt,
							};
						} catch {
							return null;
						}
					})
			);

			// Filter out any null entries (corrupted files)
			const validSessions = sessions.filter((s): s is { id: string; title: string; updatedAt: string } => s !== null);

			// Sort by updatedAt descending
			validSessions.sort((a, b) => {
				return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
			});

			// Apply pagination
			const start = page * pageSize;
			const end = start + pageSize;
			return validSessions.slice(start, end);
		} catch (error) {
			if (isFileSystemError(error, 'FileNotFound')) {
				return [];
			}
			throw error;
		}
	}
}
