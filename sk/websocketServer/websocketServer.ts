import type { WebSocketServer as WSServer } from 'ws';
import type { WebSocketInitialMessage } from '$lib/types';
import type { ViteDevServer } from 'vite';

import {
	ElevenLabsTTSSocketHandler,
	DeepgramTTSSocketHandler,
	DeepgramTranscriptionSocketHandler,
	type BaseWebSocketHandler
} from './websocketProxyClasses';

export function setupWebSocketServer(wss: WSServer, server: ViteDevServer['httpServer']) {
	wss.on('connection', (ws) => {
		let messageHandler: BaseWebSocketHandler | null = null;
		ws.on('message', async (message) => {
			if (!messageHandler) {
				// Determine handler type based on first message
				try {
					const msgText = typeof message === 'string' ? message : message.toString();
					const msgData = JSON.parse(msgText) as WebSocketInitialMessage;
					console.log('Initial message data:', msgData);
					if (msgData.speak) {
						if (msgData.speak.type === 'elevenLabs') {
							messageHandler = new ElevenLabsTTSSocketHandler(
								msgData.speak.voiceId ?? 'goT3UYdM9bhm0n2lmKQx',
								ws
							);
						} else if (msgData.speak.type === 'deepgram') {
							messageHandler = new DeepgramTTSSocketHandler(ws);
						}
					} else if (msgData.transcribe) {
						messageHandler = new DeepgramTranscriptionSocketHandler(ws);
					} else {
						ws.close();
						return;
					}
				} catch (e) {
					console.error('Failed to parse initial message:', e);
					ws.close();
				}
				return;
			}
			if (messageHandler) {
				messageHandler.handleMessage(message);
				return;
			}
		});

		ws.on('close', () => {
			messageHandler?.close();
		});
	});
	server?.on('close', () => {
		wss.close();
	});
}
