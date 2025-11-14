import type WebSocket from 'ws';
import type { GameClientMessage } from '../src/lib/games/types';
import { BaseWebSocketHandler } from './websocketProxyClasses';
import { getGameStateManager } from '../src/lib/games/gameStateManager';

export class GameWebSocketHandler extends BaseWebSocketHandler {
	private role: 'host' | 'audience' | null = null;
	private username: string | null = null;

	constructor(clientSocket: WebSocket) {
		super(clientSocket);
	}

	handleMessage(message: WebSocket.RawData) {
		try {
			const data = JSON.parse(message.toString()) as GameClientMessage;

			// First message must be join
			if (data.type === 'join') {
				this.role = data.role;
				this.username = data.username;
				const gameStateManager = getGameStateManager();
				gameStateManager.addClient(this.clientSocket, data.role, data.username);
				return;
			}

			// Must be joined before other messages
			if (!this.role || !this.username) {
				this.sendClient({ type: 'error', message: 'Must join first' });
				return;
			}

			// Forward to game state manager
			const gameStateManager = getGameStateManager();
			gameStateManager.handleMessage(this.clientSocket, data);
		} catch (error) {
			console.error('Error handling game message:', error);
			this.sendClient({ type: 'error', message: 'Invalid message format' });
		}
	}

	close() {
		if (this.role && this.username) {
			const gameStateManager = getGameStateManager();
			gameStateManager.removeClient(this.clientSocket);
		}
	}
}
