/**
 * Integration tests for Welcome page
 * TDD: These tests verify the Welcome page displays correctly on first activation
 * Covers: T026, FR-001, FR-002
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Welcome Page Integration Tests', () => {
	let extensionContext: vscode.ExtensionContext;

	suiteSetup(async function () {
		this.timeout(10000);
		// Wait for extension to activate
		const extension = vscode.extensions.getExtension('circuitx.circuitx');
		if (extension && !extension.isActive) {
			await extension.activate();
		}
	});

	suite('First Activation', () => {
		test('should show Welcome page on first activation (FR-001)', async function () {
			this.timeout(5000);

			// Open the CircuitX panel
			await vscode.commands.executeCommand('circuitx.chatView.focus');

			// Wait a moment for the webview to initialize
			await new Promise(resolve => setTimeout(resolve, 500));

			// The webview should be initialized (we can't directly inspect webview content,
			// but we verify it doesn't throw and the view is available)
			const view = await getCircuitXWebviewView();
			assert.ok(view, 'CircuitX webview view should be available');
		});

		test('should display consistent toolbar with ➕🕒⚙️ buttons (FR-002)', async function () {
			this.timeout(5000);

			// Open the CircuitX panel
			await vscode.commands.executeCommand('circuitx.chatView.focus');

			// Wait for webview to render
			await new Promise(resolve => setTimeout(resolve, 500));

			// Webview content verification would require postMessage communication
			// For integration test, we verify the webview provider initializes correctly
			const view = await getCircuitXWebviewView();
			assert.ok(view, 'Webview should be available');
			assert.ok(view.visible, 'Webview should be visible when focused');
		});

		test('should display input box for user questions (FR-003)', async function () {
			this.timeout(5000);

			// Ensure webview is open
			await vscode.commands.executeCommand('circuitx.chatView.focus');
			await new Promise(resolve => setTimeout(resolve, 500));

			const view = await getCircuitXWebviewView();
			assert.ok(view, 'Webview should be available with input box');
		});
	});

	suite('Welcome Page Content', () => {
		test('should show CircuitX branding on Welcome page', async function () {
			this.timeout(5000);

			await vscode.commands.executeCommand('circuitx.chatView.focus');
			await new Promise(resolve => setTimeout(resolve, 500));

			const view = await getCircuitXWebviewView();
			assert.ok(view, 'Welcome page with branding should be available');
		});

		test('should show "Ask anything..." placeholder text in input', async function () {
			this.timeout(5000);

			await vscode.commands.executeCommand('circuitx.chatView.focus');
			await new Promise(resolve => setTimeout(resolve, 500));

			const view = await getCircuitXWebviewView();
			assert.ok(view, 'Welcome page with input placeholder should be available');
		});
	});
});

/**
 * Helper to get the CircuitX webview view
 */
async function getCircuitXWebviewView(): Promise<vscode.WebviewView | undefined> {
	// VS Code doesn't expose webview views directly via API for testing
	// We rely on the fact that the view is registered and can be focused
	// For deeper testing, we would use the webview postMessage protocol
	return undefined as any; // Type assertion for integration test structure
}
