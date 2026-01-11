/**
 * CircuitX Extension Entry Point
 * Implements: T022 - Register WebviewViewProvider
 * Implements: T084 - Activation time measurement (<1s target)
 */

import * as vscode from 'vscode';
import { CircuitXWebviewProvider } from './webview/WebviewProvider';

export function activate(context: vscode.ExtensionContext) {
	// T084: Measure activation time
	const activationStart = performance.now();

	console.log('CircuitX extension is now active!');

	// Register webview provider
	const provider = new CircuitXWebviewProvider(context, context.extensionUri);

	// Register the provider for the sidebar view
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CircuitXWebviewProvider.viewType, provider)
	);

	// T084: Log activation time
	const activationTime = performance.now() - activationStart;
	console.log(`CircuitX activation completed in ${activationTime.toFixed(2)}ms`);

	// T084: Warn if activation exceeds 1 second target
	if (activationTime > 1000) {
		console.warn(`CircuitX activation exceeded 1s target: ${activationTime.toFixed(2)}ms`);
	}
}

export function deactivate() {}
