import * as vscode from 'vscode';

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
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
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
			message => {
				switch (message.type) {
					case 'ready':
						console.log('Webview is ready');
						break;
					case 'nodeClicked':
						this._handleNodeClick(message.data);
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
		const nonce = this._getNonce();

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Execution Flow Visualizer</title>
	<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
			overflow: hidden;
			background-color: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
			font-family: var(--vscode-font-family);
			font-size: 13px;
		}

		#container {
			width: 100vw;
			height: 100vh;
			position: relative;
			display: flex;
			flex-direction: column;
		}

		#toolbar {
			background: var(--vscode-editorGroupHeader-tabsBackground);
			border-bottom: 1px solid var(--vscode-panel-border);
			padding: 8px 12px;
			display: flex;
			align-items: center;
			gap: 10px;
			flex-shrink: 0;
		}

		#toolbar button {
			padding: 6px 12px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 3px;
			cursor: pointer;
			font-size: 12px;
		}

		#toolbar button:hover {
			background: var(--vscode-button-hoverBackground);
		}

		#toolbar .separator {
			width: 1px;
			height: 20px;
			background: var(--vscode-panel-border);
			margin: 0 5px;
		}

		#toolbar label {
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
		}

		#toolbar input[type="checkbox"] {
			margin-left: 5px;
		}

		#main-content {
			flex: 1;
			display: flex;
			overflow: hidden;
		}

		#graph-container {
			flex: 1;
			position: relative;
			overflow: auto;
		}

		#graph {
			min-width: 100%;
			min-height: 100%;
			position: relative;
			padding: 20px;
		}

		#sidebar {
			width: 300px;
			background: var(--vscode-sideBar-background);
			border-left: 1px solid var(--vscode-panel-border);
			overflow-y: auto;
			padding: 15px;
			display: none;
		}

		#sidebar.visible {
			display: block;
		}

		#sidebar h3 {
			margin: 0 0 10px 0;
			font-size: 13px;
			font-weight: 600;
		}

		#sidebar .detail-row {
			margin: 8px 0;
			font-size: 12px;
		}

		#sidebar .detail-label {
			color: var(--vscode-descriptionForeground);
			margin-bottom: 3px;
		}

		#sidebar .detail-value {
			color: var(--vscode-editor-foreground);
			word-break: break-all;
		}

		.flow-node {
			position: absolute;
			min-width: 180px;
			max-width: 300px;
			padding: 8px 12px;
			border-radius: 6px;
			cursor: pointer;
			transition: all 0.2s ease;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
			border: 2px solid transparent;
		}

		.flow-node:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
		}

		.flow-node.selected {
			border-color: var(--vscode-focusBorder);
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
		}

		.flow-node.function_call,
		.flow-node.method_call {
			background: #2d5a8e;
			border-left: 4px solid #4a9eff;
		}

		.flow-node.function_return,
		.flow-node.method_return {
			background: #2d5a4e;
			border-left: 4px solid #4aff9e;
		}

		.flow-node.line_execution {
			background: #4a4a4a;
			border-left: 4px solid #888888;
		}

		.flow-node.loop_start,
		.flow-node.loop_iteration {
			background: #6e3d5a;
			border-left: 4px solid #c74aff;
		}

		.flow-node.conditional_if,
		.flow-node.conditional_elif,
		.flow-node.conditional_else {
			background: #5a4e2d;
			border-left: 4px solid #ffb84a;
		}

		.flow-node.exception_raised {
			background: #7a2d2d;
			border-left: 4px solid #ff4a4a;
		}

		.flow-node.variable_assignment {
			background: #2d5a5a;
			border-left: 4px solid #4affff;
		}

		.node-header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 4px;
		}

		.node-icon {
			font-size: 16px;
		}

		.node-title {
			font-weight: 600;
			font-size: 13px;
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.node-meta {
			font-size: 10px;
			color: rgba(255, 255, 255, 0.6);
			margin-top: 2px;
		}

		.node-content {
			font-size: 11px;
			color: rgba(255, 255, 255, 0.8);
			margin-top: 6px;
			font-family: 'Monaco', 'Menlo', monospace;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.node-timing {
			font-size: 10px;
			color: rgba(255, 255, 255, 0.5);
			margin-top: 4px;
		}

		.flow-edge {
			position: absolute;
			pointer-events: none;
		}

		.flow-edge line {
			stroke: var(--vscode-editorIndentGuide-background);
			stroke-width: 2;
		}

		.flow-edge.active line {
			stroke: var(--vscode-focusBorder);
			stroke-width: 3;
		}

		.placeholder {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			flex-direction: column;
			color: var(--vscode-descriptionForeground);
		}

		.placeholder-icon {
			font-size: 48px;
			margin-bottom: 20px;
		}

		#status-bar {
			background: var(--vscode-statusBar-background);
			color: var(--vscode-statusBar-foreground);
			padding: 4px 12px;
			font-size: 11px;
			border-top: 1px solid var(--vscode-panel-border);
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.legend {
			position: absolute;
			top: 10px;
			left: 10px;
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			padding: 10px;
			border-radius: 4px;
			font-size: 11px;
			max-width: 200px;
		}

		.legend-item {
			display: flex;
			align-items: center;
			gap: 8px;
			margin: 4px 0;
		}

		.legend-color {
			width: 20px;
			height: 12px;
			border-radius: 2px;
		}
	</style>
</head>
<body>
	<div id="container">
		<div id="toolbar">
			<button id="clearBtn">🗑️ Clear</button>
			<button id="pauseBtn">⏸️ Pause</button>
			<button id="exportBtn">💾 Export</button>
			<div class="separator"></div>
			<label>
				<input type="checkbox" id="autoScrollCheck" checked>
				Auto-scroll
			</label>
			<label>
				<input type="checkbox" id="showLinesCheck">
				Show all lines
			</label>
			<label>
				<input type="checkbox" id="compactCheck">
				Compact view
			</label>
		</div>

		<div id="main-content">
			<div id="graph-container">
				<div id="graph">
					<div class="placeholder">
						<div class="placeholder-icon">🔍</div>
						<h2>Execution Flow Visualizer</h2>
						<p>Start the trace server and run your Python code</p>
						<p style="font-size: 11px; color: var(--vscode-descriptionForeground);">
							Use: python -m blind.tracer your_script.py
						</p>
					</div>
				</div>
			</div>

			<div id="sidebar">
				<h3>Event Details</h3>
				<div id="event-details"></div>
			</div>
		</div>

		<div id="status-bar">
			<span id="status-text">Ready</span>
			<span id="stats-text">0 events</span>
		</div>
	</div>

	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();

		const state = {
			events: [],
			nodes: new Map(),
			edges: [],
			isPaused: false,
			selectedNode: null,
			autoScroll: true,
			showAllLines: false,
			compactView: false,
			currentY: 50,
			scopeOffsets: new Map()
		};

		const ENTITY_ICONS = {
			function_call: '📞',
			function_return: '↩️',
			method_call: '🔵',
			method_return: '↩️',
			line_execution: '➡️',
			loop_start: '🔁',
			loop_iteration: '🔄',
			conditional_if: '❓',
			conditional_elif: '❔',
			conditional_else: '⚡',
			exception_raised: '❌',
			variable_assignment: '📝',
			import_module: '📦'
		};

		function initialize() {
			document.getElementById('clearBtn').addEventListener('click', clearGraph);
			document.getElementById('pauseBtn').addEventListener('click', togglePause);
			document.getElementById('exportBtn').addEventListener('click', exportGraph);

			document.getElementById('autoScrollCheck').addEventListener('change', (e) => {
				state.autoScroll = e.target.checked;
			});

			document.getElementById('showLinesCheck').addEventListener('change', (e) => {
				state.showAllLines = e.target.checked;
				rerenderGraph();
			});

			document.getElementById('compactCheck').addEventListener('change', (e) => {
				state.compactView = e.target.checked;
				rerenderGraph();
			});

			vscode.postMessage({ type: 'ready' });
		}

		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.type) {
				case 'traceData':
					if (!state.isPaused) {
						handleTraceEvent(message.data);
					}
					break;
			}
		});

		function handleTraceEvent(event) {
			// Skip simple line executions unless enabled
			if (event.event_type === 'line_execution' && !state.showAllLines) {
				const astType = event.entity_data?.ast_info?.type;
				if (astType === 'simple_statement') {
					return;
				}
			}

			state.events.push(event);
			addNodeToGraph(event);
			updateStats();

			if (state.autoScroll) {
				scrollToBottom();
			}
		}

		function addNodeToGraph(event) {
			const graphDiv = document.getElementById('graph');
			const placeholder = graphDiv.querySelector('.placeholder');
			if (placeholder) {
				placeholder.remove();
			}

			// Calculate position
			const x = 50 + (event.call_stack_depth * 250);
			const y = state.currentY;

			// Create node element
			const node = document.createElement('div');
			node.className = \`flow-node \${event.event_type}\`;
			node.id = \`node-\${event.event_id}\`;
			node.style.left = x + 'px';
			node.style.top = y + 'px';

			// Build node content
			const icon = ENTITY_ICONS[event.event_type] || '⚪';
			const displayName = event.class_name
				? \`\${event.class_name}.\${event.function_name}\`
				: event.function_name;

			let timing = '';
			if (event.execution_time) {
				timing = \`<div class="node-timing">⏱️ \${(event.execution_time * 1000).toFixed(2)}ms</div>\`;
			}

			node.innerHTML = \`
				<div class="node-header">
					<span class="node-icon">\${icon}</span>
					<span class="node-title">\${displayName}</span>
				</div>
				<div class="node-meta">\${event.event_type.replace(/_/g, ' ')}</div>
				<div class="node-content">\${escapeHtml(event.line_content)}</div>
				\${timing}
			\`;

			node.addEventListener('click', () => selectNode(event));

			graphDiv.appendChild(node);
			state.nodes.set(event.event_id, { element: node, event, x, y });

			// Update Y position for next node
			state.currentY += state.compactView ? 80 : 120;

			// Draw edge from parent
			if (event.parent_event_id && state.nodes.has(event.parent_event_id)) {
				drawEdge(event.parent_event_id, event.event_id);
			}
		}

		function drawEdge(fromId, toId) {
			const fromNode = state.nodes.get(fromId);
			const toNode = state.nodes.get(toId);

			if (!fromNode || !toNode) return;

			// Simple line connection
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.classList.add('flow-edge');
			svg.style.left = '0';
			svg.style.top = '0';
			svg.style.width = '100%';
			svg.style.height = '100%';
			svg.style.position = 'absolute';
			svg.style.pointerEvents = 'none';

			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('x1', fromNode.x + 90);
			line.setAttribute('y1', fromNode.y + 30);
			line.setAttribute('x2', toNode.x + 90);
			line.setAttribute('y2', toNode.y);

			svg.appendChild(line);
			document.getElementById('graph').appendChild(svg);
			state.edges.push({ svg, fromId, toId });
		}

		function selectNode(event) {
			// Deselect previous
			if (state.selectedNode) {
				const prevNode = state.nodes.get(state.selectedNode.event_id);
				if (prevNode) {
					prevNode.element.classList.remove('selected');
				}
			}

			// Select new
			state.selectedNode = event;
			const node = state.nodes.get(event.event_id);
			if (node) {
				node.element.classList.add('selected');
			}

			// Show in sidebar
			showEventDetails(event);

			// Jump to source
			vscode.postMessage({
				type: 'nodeClicked',
				data: {
					filePath: event.file_path,
					line: event.line_number
				}
			});
		}

		function showEventDetails(event) {
			const sidebar = document.getElementById('sidebar');
			const details = document.getElementById('event-details');

			let html = \`
				<div class="detail-row">
					<div class="detail-label">Event ID</div>
					<div class="detail-value">\${event.event_id}</div>
				</div>
				<div class="detail-row">
					<div class="detail-label">Type</div>
					<div class="detail-value">\${event.event_type}</div>
				</div>
				<div class="detail-row">
					<div class="detail-label">Function</div>
					<div class="detail-value">\${event.function_name}</div>
				</div>
			\`;

			if (event.class_name) {
				html += \`
					<div class="detail-row">
						<div class="detail-label">Class</div>
						<div class="detail-value">\${event.class_name}</div>
					</div>
				\`;
			}

			html += \`
				<div class="detail-row">
					<div class="detail-label">File</div>
					<div class="detail-value">\${event.file_path.split('/').pop()}</div>
				</div>
				<div class="detail-row">
					<div class="detail-label">Line</div>
					<div class="detail-value">\${event.line_number}</div>
				</div>
				<div class="detail-row">
					<div class="detail-label">Code</div>
					<div class="detail-value" style="font-family: monospace; font-size: 11px;">\${escapeHtml(event.line_content)}</div>
				</div>
			\`;

			if (event.execution_time) {
				html += \`
					<div class="detail-row">
						<div class="detail-label">Execution Time</div>
						<div class="detail-value">\${(event.execution_time * 1000).toFixed(3)} ms</div>
					</div>
				\`;
			}

			if (event.entity_data) {
				html += '<h3 style="margin-top: 15px;">Entity Data</h3>';
				html += \`<pre style="font-size: 10px; overflow: auto;">\${JSON.stringify(event.entity_data, null, 2)}</pre>\`;
			}

			details.innerHTML = html;
			sidebar.classList.add('visible');
		}

		function clearGraph() {
			const graphDiv = document.getElementById('graph');
			graphDiv.innerHTML = \`
				<div class="placeholder">
					<div class="placeholder-icon">🔍</div>
					<h2>Execution Flow Visualizer</h2>
					<p>Start the trace server and run your Python code</p>
				</div>
			\`;

			state.events = [];
			state.nodes.clear();
			state.edges = [];
			state.currentY = 50;
			state.selectedNode = null;
			state.scopeOffsets.clear();

			document.getElementById('sidebar').classList.remove('visible');
			updateStats();
		}

		function rerenderGraph() {
			const events = [...state.events];
			clearGraph();
			events.forEach(event => handleTraceEvent(event));
		}

		function togglePause() {
			state.isPaused = !state.isPaused;
			const btn = document.getElementById('pauseBtn');
			btn.textContent = state.isPaused ? '▶️ Resume' : '⏸️ Pause';
			updateStatus(state.isPaused ? 'Paused' : 'Recording');
		}

		function exportGraph() {
			const dataStr = JSON.stringify(state.events, null, 2);
			vscode.postMessage({
				type: 'export',
				data: dataStr
			});
			updateStatus('Exported');
		}

		function scrollToBottom() {
			const container = document.getElementById('graph-container');
			container.scrollTop = container.scrollHeight;
		}

		function updateStats() {
			const statsText = document.getElementById('stats-text');
			statsText.textContent = \`\${state.events.length} events\`;
		}

		function updateStatus(message) {
			document.getElementById('status-text').textContent = message;
		}

		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

		initialize();
	</script>
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
