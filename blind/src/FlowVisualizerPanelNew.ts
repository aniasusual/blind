import * as vscode from 'vscode';
import * as fs from 'fs';

export class FlowVisualizerPanel {
	public static currentPanel: FlowVisualizerPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (FlowVisualizerPanel.currentPanel) {
			FlowVisualizerPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'blindFlowVisualizer',
			'Execution Flow Visualizer',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
				]
			}
		);

		FlowVisualizerPanel.currentPanel = new FlowVisualizerPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.type) {
					case 'ready':
						console.log('Webview is ready');
						break;
					case 'nodeClicked':
						this._handleNodeClick(message.data);
						break;
					case 'codeChanged':
						await this._handleCodeChange(message.data);
						break;
					case 'export':
						this._handleExport(message.data);
						break;
					case 'error':
						vscode.window.showErrorMessage(message.message);
						break;
				}
			},
			null,
			this._disposables
		);
	}

	public sendTraceData(data: any) {
		this._panel.webview.postMessage({
			type: 'traceData',
			data: data
		});
	}

	public sendMessage(message: any) {
		this._panel.webview.postMessage(message);
	}

	private _handleNodeClick(nodeData: any) {
		if (nodeData.filePath && nodeData.line) {
			vscode.workspace.openTextDocument(nodeData.filePath).then(doc => {
				vscode.window.showTextDocument(doc).then(editor => {
					const line = nodeData.line - 1;
					const position = new vscode.Position(line, 0);
					editor.selection = new vscode.Selection(position, position);
					editor.revealRange(
						new vscode.Range(position, position),
						vscode.TextEditorRevealType.InCenter
					);
				});
			});
		}
	}

	private async _handleCodeChange(data: any) {
		const { filePath, lineNumber, newCode } = data;

		try {
			const document = await vscode.workspace.openTextDocument(filePath);
			const edit = new vscode.WorkspaceEdit();

			// Replace just the line
			const line = document.lineAt(lineNumber - 1);
			edit.replace(
				document.uri,
				line.range,
				newCode
			);

			const success = await vscode.workspace.applyEdit(edit);

			if (success) {
				await document.save();
				vscode.window.showInformationMessage('Code updated successfully');

				// Notify webview that file was updated
				this._panel.webview.postMessage({
					type: 'fileUpdated',
					data: {
						filePath,
						lineNumber,
						newCode
					}
				});
			} else {
				vscode.window.showErrorMessage('Failed to update code');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error updating code: ${error}`);
		}
	}

	private _handleExport(data: any) {
		vscode.window.showSaveDialog({
			filters: { 'JSON': ['json'] },
			defaultUri: vscode.Uri.file('trace-export.json')
		}).then(uri => {
			if (uri) {
				fs.writeFileSync(uri.fsPath, data);
				vscode.window.showInformationMessage('Trace data exported successfully');
			}
		});
	}

	public dispose() {
		FlowVisualizerPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get the path to the built React app
		const webviewPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview');
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewPath, 'assets', 'main.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewPath, 'assets', 'main.css'));

		const nonce = this._getNonce();

		// Updated CSP to allow Monaco Editor, React Flow, and ES modules
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="
		default-src 'none';
		style-src ${webview.cspSource} 'unsafe-inline';
		script-src 'nonce-${nonce}';
		font-src ${webview.cspSource};
		img-src ${webview.cspSource} data: https:;
		connect-src ${webview.cspSource} https: ws:;
		worker-src ${webview.cspSource} blob:;
	">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Blind Execution Flow Visualizer</title>
	<link href="${styleUri}" rel="stylesheet">
</head>
<body>
	<div id="root"></div>
	<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}

	private _getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}
