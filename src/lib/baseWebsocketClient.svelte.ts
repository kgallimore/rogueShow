import type { WebSocketInitialMessage } from './types';
export abstract class BaseWebsocketClient extends EventTarget {
	connected = $state(false);
	protected socket: WebSocket | null;
	constructor(initData: WebSocketInitialMessage) {
		super();
		this.socket = new WebSocket(`ws://localhost:24678`);
		// Set binary type to handle audio data properly
		this.socket.binaryType = 'arraybuffer';
		this.socket.addEventListener('open', () => {
			this.socket?.send(JSON.stringify(initData));
			this.connected = true;
		});
		this.socket.addEventListener('close', () => {
			this.close();
			this.onClose();
		});
		this.socket.addEventListener('error', (error) => {
			console.error('WebSocket error occurred: ' + JSON.stringify(error));
		});
		this.socket.addEventListener('message', (event) => {
			this.handleMessage(event);
		});
	}

	protected abstract handleMessage(websocketMessage: MessageEvent<unknown>): Promise<void>;

	protected sendMessage(message: string | ArrayBuffer) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(message);
		}
	}

	close() {
		if (this.socket) {
			if (this.socket.readyState === WebSocket.OPEN) {
				this.socket.close();
			}
			this.socket = null;
			this.connected = false;
		}
	}
	abstract onClose(): void;
}
