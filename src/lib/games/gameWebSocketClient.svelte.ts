import type { GameClientMessage, GameServerMessage, GameState } from './types';

export class GameWebSocketClient extends EventTarget {
	connected = false;
	private socket: WebSocket | null = null;
	private role: 'host' | 'audience';
	private username: string;
	public state: GameState | null = null;

	constructor(role: 'host' | 'audience', username: string) {
		super();
		this.role = role;
		this.username = username;
		this.socket = new WebSocket('ws://localhost:24678');
		this.socket.addEventListener('open', () => {
			// Send initial join message
			this.socket?.send(
				JSON.stringify({
					game: { role: this.role, username: this.username }
				} as { game: { role: 'host' | 'audience'; username: string } })
			);
			this.connected = true;
			this.dispatchEvent(new CustomEvent('connected'));
		});
		this.socket.addEventListener('close', () => {
			this.connected = false;
			this.onClose();
		});
		this.socket.addEventListener('error', (error) => {
			console.error('Game WebSocket error:', error);
			this.dispatchEvent(new CustomEvent('error', { detail: error }));
		});
		this.socket.addEventListener('message', (event) => {
			this.handleMessage(event);
		});
	}

	private handleMessage(event: MessageEvent) {
		try {
			const message = JSON.parse(event.data) as GameServerMessage;
			switch (message.type) {
				case 'state':
					this.state = message.state;
					this.dispatchEvent(new CustomEvent('state', { detail: message.state }));
					// Also dispatch a custom event for Svelte reactivity
					this.dispatchEvent(new CustomEvent('stateChange'));
					break;
				case 'error':
					this.dispatchEvent(new CustomEvent('error', { detail: message.message }));
					break;
				case 'friction':
					this.dispatchEvent(new CustomEvent('friction', { detail: message.event }));
					break;
				case 'voteUpdate':
					this.dispatchEvent(new CustomEvent('voteUpdate', { detail: message }));
					break;
				case 'productRevealed':
					this.dispatchEvent(
						new CustomEvent('productRevealed', {
							detail: { product: message.product, reasonings: message.reasonings }
						})
					);
					break;
				case 'productAdvanced':
					this.dispatchEvent(new CustomEvent('productAdvanced', { detail: message.product }));
					break;
			}
		} catch (error) {
			console.error('Error parsing game message:', error);
		}
	}

	sendMessage(message: GameClientMessage) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
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

	onClose(): void {
		// Override in subclasses if needed
	}
}
