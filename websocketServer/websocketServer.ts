import type { WebSocketServer as WSServer } from 'ws';
import type { WebSocketInitialMessage } from '../src/lib/types';
import type { ViteDevServer } from 'vite';

import {
	ElevenLabsTTSSocketHandler,
	DeepgramTTSSocketHandler,
	DeepgramTranscriptionSocketHandler,
	type BaseWebSocketHandler
} from './websocketProxyClasses';
import { GameWebSocketHandler } from './gameWebSocketHandler';
import { getGameStateManager } from '../src/lib/games/gameStateManager';

// Export the game state manager for access from other modules
export function getSharedGameStateManager() {
	return getGameStateManager();
}

export function setupWebSocketServer(wss: WSServer, server: ViteDevServer['httpServer']) {
	const connections = new Set<BaseWebSocketHandler>();

	wss.on('connection', (ws) => {
		let messageHandler: BaseWebSocketHandler | null = null;
		ws.on('message', async (message) => {
			if (!messageHandler) {
				// Determine handler type based on first message
				try {
					const msgText = typeof message === 'string' ? message : message.toString();
					const msgData = JSON.parse(msgText) as WebSocketInitialMessage;
					if (msgData.game) {
						messageHandler = new GameWebSocketHandler(ws);
						// Send join message to handler
						messageHandler.handleMessage(
							Buffer.from(
								JSON.stringify({
									type: 'join',
									role: msgData.game.role,
									username: msgData.game.username
								})
							)
						);
					} else if (msgData.speak) {
						if (msgData.speak.type === 'elevenLabs') {
							messageHandler = new ElevenLabsTTSSocketHandler(
								msgData.speak.voiceId ?? 'XEC4nrEbSXR7mdELOxaY',
								ws
							);
						} else if (msgData.speak.type === 'deepgram') {
							messageHandler = new DeepgramTTSSocketHandler(ws);
						}
					} else if (msgData.transcribe) {
						messageHandler = new DeepgramTranscriptionSocketHandler(ws);
					} else {
						console.error('Unknown initial message type, closing connection.');
						ws.close();
						return;
					}
					// Track active connections
					if (messageHandler) {
						connections.add(messageHandler);
					}
				} catch (e) {
					console.error('Failed to parse initial message:', e);
					ws.close();
				}
				return;
			}
			if (messageHandler) {
				console.log('Received message:', message.toString());
				messageHandler.handleMessage(message);
				return;
			}
		});

		ws.on('close', () => {
			if (messageHandler) {
				messageHandler.close();
				connections.delete(messageHandler);
			}
		});
	});

	// Clean up all connections when server closes
	server?.on('close', () => {
		console.log('HTTP server closing, cleaning up WebSocket connections...');
		connections.forEach((handler) => handler.close());
		connections.clear();
		wss.close();
	});

	// Also handle WebSocket server close event
	wss.on('close', () => {
		console.log('WebSocket server closed, cleaning up connections...');
		connections.forEach((handler) => handler.close());
		connections.clear();
	});
}
