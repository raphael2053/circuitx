/**
 * CircuitX Extension Entry Point
 * Implements: T022 - Register WebviewViewProvider
 */

import * as vscode from 'vscode';
import { CircuitXWebviewProvider } from './webview/WebviewProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('CircuitX extension is now active!');

	// Register webview provider
	const provider = new CircuitXWebviewProvider(context, context.extensionUri);

	// Register the provider for the sidebar view
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CircuitXWebviewProvider.viewType, provider)
	);
}

export function deactivate() {}
