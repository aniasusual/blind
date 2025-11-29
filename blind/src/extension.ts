import * as vscode from 'vscode';
import { FlowVisualizerPanel } from './FlowVisualizerPanelNew';
import { TraceServer } from './TraceServer';

let traceServer: TraceServer;

export function activate(context: vscode.ExtensionContext) {
	console.log('Blind execution flow visualizer is now active!');

	traceServer = new TraceServer();

	const showVisualizerCommand = vscode.commands.registerCommand(
		'blind.showFlowVisualizer',
		() => {
			FlowVisualizerPanel.createOrShow(context.extensionUri);
		}
	);

	const toggleServerCommand = vscode.commands.registerCommand(
		'blind.toggleTraceServer',
		() => {
			traceServer.toggle();
		}
	);

	const startServerCommand = vscode.commands.registerCommand(
		'blind.startTraceServer',
		() => {
			traceServer.start();
		}
	);

	const stopServerCommand = vscode.commands.registerCommand(
		'blind.stopTraceServer',
		() => {
			traceServer.stop();
		}
	);

	const showStatsCommand = vscode.commands.registerCommand(
		'blind.showStatistics',
		() => {
			const stats = traceServer.getStatistics();
			const message = `
Total Events: ${stats.totalEvents}
Event Types: ${JSON.stringify(stats.eventTypes, null, 2)}
Top Functions: ${stats.topFunctions.map((f: any) => `${f[0]}: ${f[1]}`).join(', ')}
			`.trim();

			vscode.window.showInformationMessage('Blind Statistics', { modal: true, detail: message });
		}
	);

	const clearBufferCommand = vscode.commands.registerCommand(
		'blind.clearEventBuffer',
		() => {
			traceServer.clearEventBuffer();
			vscode.window.showInformationMessage('Event buffer cleared');
		}
	);

	context.subscriptions.push(
		showVisualizerCommand,
		toggleServerCommand,
		startServerCommand,
		stopServerCommand,
		showStatsCommand,
		clearBufferCommand,
		traceServer
	);
}

export function deactivate() {
	if (traceServer) {
		traceServer.dispose();
	}
}
