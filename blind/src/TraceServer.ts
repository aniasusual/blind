import * as net from 'net';
import * as vscode from 'vscode';
import { FlowVisualizerPanel } from './FlowVisualizerPanel';

export interface TraceEvent {
    event_type: string;
    timestamp: number;
    event_id: number;
    file_path: string;
    line_number: number;
    function_name: string;
    class_name: string | null;
    module_name: string;
    line_content: string;
    call_stack_depth: number;
    parent_event_id: number | null;
    scope_id: string;
    entity_data: any;
    execution_time?: number;
    memory_delta?: number;
    calls_to?: number[];
    called_from?: number;
}

export class TraceServer {
    private server: net.Server | null = null;
    private clients: Set<net.Socket> = new Set();
    private port: number = 9876;
    private isRunning: boolean = false;
    private statusBarItem: vscode.StatusBarItem;
    private eventBuffer: TraceEvent[] = [];
    private totalEvents: number = 0;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.text = "$(debug-disconnect) Blind: Stopped";
        this.statusBarItem.command = 'blind.toggleTraceServer';
        this.statusBarItem.show();
    }

    async start(): Promise<boolean> {
        if (this.isRunning) {
            vscode.window.showInformationMessage('Trace server is already running');
            return true;
        }

        return new Promise((resolve) => {
            this.server = net.createServer((socket) => this.handleConnection(socket));

            this.server.on('error', (err: any) => {
                if (err.code === 'EADDRINUSE') {
                    vscode.window.showErrorMessage(
                        `Port ${this.port} is already in use. Please stop any other process using this port.`
                    );
                } else {
                    vscode.window.showErrorMessage(`Trace server error: ${err.message}`);
                }
                resolve(false);
            });

            this.server.listen(this.port, 'localhost', () => {
                this.isRunning = true;
                this.updateStatusBar();
                vscode.window.showInformationMessage(
                    `Blind trace server started on port ${this.port}`
                );
                console.log(`Trace server listening on localhost:${this.port}`);
                resolve(true);
            });
        });
    }

    stop(): void {
        if (!this.isRunning) {
            return;
        }

        // Close all client connections
        this.clients.forEach(client => {
            client.destroy();
        });
        this.clients.clear();

        // Close server
        if (this.server) {
            this.server.close(() => {
                console.log('Trace server stopped');
            });
            this.server = null;
        }

        this.isRunning = false;
        this.updateStatusBar();

        vscode.window.showInformationMessage(
            `Trace server stopped. Captured ${this.totalEvents} events.`
        );
    }

    toggle(): void {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    private handleConnection(socket: net.Socket): void {
        const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`Python tracer connected: ${clientAddr}`);

        this.clients.add(socket);
        this.updateStatusBar();

        vscode.window.showInformationMessage(
            'Python tracer connected! Run your Python code to see execution flow.'
        );

        let buffer = '';

        socket.on('data', (data) => {
            buffer += data.toString();

            // Process complete messages (newline-delimited JSON)
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const message = buffer.substring(0, newlineIndex);
                buffer = buffer.substring(newlineIndex + 1);

                if (message.trim()) {
                    this.handleTraceEvent(message);
                }
            }
        });

        socket.on('close', () => {
            console.log(`Python tracer disconnected: ${clientAddr}`);
            this.clients.delete(socket);
            this.updateStatusBar();

            vscode.window.showInformationMessage(
                `Python tracer disconnected. Captured ${this.totalEvents} events total.`
            );
        });

        socket.on('error', (err) => {
            console.error(`Socket error: ${err.message}`);
            this.clients.delete(socket);
            this.updateStatusBar();
        });
    }

    private handleTraceEvent(message: string): void {
        try {
            const event: TraceEvent = JSON.parse(message);
            this.totalEvents++;
            this.eventBuffer.push(event);

            // Send to visualizer if open
            if (FlowVisualizerPanel.currentPanel) {
                FlowVisualizerPanel.currentPanel.sendTraceData(event);
            }

            // Update status bar
            if (this.totalEvents % 10 === 0) {
                this.updateStatusBar();
            }

            // Log interesting events
            if (event.event_type === 'exception_raised') {
                const excData = event.entity_data;
                vscode.window.showWarningMessage(
                    `Exception: ${excData.exception_type}: ${excData.exception_message}`
                );
            }

        } catch (err) {
            console.error('Error parsing trace event:', err);
        }
    }

    private updateStatusBar(): void {
        if (this.isRunning) {
            const connectedClients = this.clients.size;
            this.statusBarItem.text = `$(debug-alt) Blind: Running (${connectedClients} client${connectedClients !== 1 ? 's' : ''}, ${this.totalEvents} events)`;
            this.statusBarItem.tooltip = `Click to stop trace server\nPort: ${this.port}\nEvents captured: ${this.totalEvents}`;
        } else {
            this.statusBarItem.text = "$(debug-disconnect) Blind: Stopped";
            this.statusBarItem.tooltip = 'Click to start trace server';
        }
    }

    getEventBuffer(): TraceEvent[] {
        return this.eventBuffer;
    }

    clearEventBuffer(): void {
        this.eventBuffer = [];
        this.totalEvents = 0;
        this.updateStatusBar();
    }

    getStatistics(): any {
        const eventTypes = new Map<string, number>();
        const fileMap = new Map<string, number>();
        const functionMap = new Map<string, number>();

        this.eventBuffer.forEach(event => {
            // Count by event type
            eventTypes.set(
                event.event_type,
                (eventTypes.get(event.event_type) || 0) + 1
            );

            // Count by file
            fileMap.set(
                event.file_path,
                (fileMap.get(event.file_path) || 0) + 1
            );

            // Count by function
            const funcKey = `${event.function_name}${event.class_name ? ` (${event.class_name})` : ''}`;
            functionMap.set(
                funcKey,
                (functionMap.get(funcKey) || 0) + 1
            );
        });

        return {
            totalEvents: this.totalEvents,
            bufferedEvents: this.eventBuffer.length,
            eventTypes: Object.fromEntries(eventTypes),
            topFiles: Array.from(fileMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10),
            topFunctions: Array.from(functionMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
        };
    }

    dispose(): void {
        this.stop();
        this.statusBarItem.dispose();
    }
}
