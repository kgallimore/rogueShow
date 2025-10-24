import type { WebSocketServer as WSServer } from 'ws';
import type { ViteDevServer } from 'vite';
import { createClient, LiveTTSEvents, type SpeakLiveClient } from '@deepgram/sdk';
import type {
	WebsocketClientReceiveMessage,
	WebsocketProxyMessage,
	WebSocketInitialMessage
} from '$lib/types';
import 'dotenv/config';
import WebSocket from 'ws';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const wavHeader = Buffer.from([
	0x52,
	0x49,
	0x46,
	0x46, // "RIFF"
	0x00,
	0x00,
	0x00,
	0x00, // Placeholder for file size
	0x57,
	0x41,
	0x56,
	0x45, // "WAVE"
	0x66,
	0x6d,
	0x74,
	0x20, // "fmt "
	0x10,
	0x00,
	0x00,
	0x00, // Chunk size (16)
	0x01,
	0x00, // Audio format (1 for PCM)
	0x01,
	0x00, // Number of channels (1)
	0x80,
	0xbb,
	0x00,
	0x00, // Sample rate (48000)
	0x00,
	0xee,
	0x02,
	0x00, // Byte rate (48000 * 2)
	0x02,
	0x00, // Block align (2)
	0x10,
	0x00, // Bits per sample (16)
	0x64,
	0x61,
	0x74,
	0x61, // "data"
	0x00,
	0x00,
	0x00,
	0x00 // Placeholder for data size
]);

export function setupWebSocketServer(wss: WSServer, server: ViteDevServer['httpServer']) {
	wss.on('connection', (ws) => {
		const deepgram = createClient(DEEPGRAM_API_KEY);

		let messageHandler: BaseWebSocketHandler | null = null;
		let lastSent = Date.now() - 5000; // Current time minus 5 seconds
		ws.on('message', async (message) => {
			if (!messageHandler) {
				// Determine handler type based on first message
				try {
					const msgText = typeof message === 'string' ? message : message.toString();
					const msgData = JSON.parse(msgText) as WebSocketInitialMessage;
					if (msgData.speak) {
						messageHandler = new ElevenLabsTTSSocketHandler(
							msgData.speak.voiceId ?? 'goT3UYdM9bhm0n2lmKQx',
							ws
						);
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
			try {
				// Try to parse as JSON first
				let data: WebsocketProxyMessage | null = null;
				let isBinaryAudio = false;

				if (typeof message === 'string') {
					try {
						data = JSON.parse(message) as WebsocketProxyMessage;
					} catch (e) {
						console.error('Failed to parse JSON message:', e);
						return;
					}
				} else {
					// Binary message - assume it's audio data for transcription
					isBinaryAudio = true;
				}

				// Handle binary audio for transcription
				if (isBinaryAudio || (data && data.transcribe)) {
					if (!dgTransSocket) {
						dgTransSocket = new WebSocket(
							`wss://api.deepgram.com/v2/listen?model=flux-general-en&sample_rate=16000&encoding=linear16&eot_threshold=0.8`,
							{
								headers: {
									Authorization: `Token ${DEEPGRAM_API_KEY}`
								}
							}
						);
						dgTransSocket.on('message', (dgMessage) => {
							// Convert data to string if it's binary
							const messageText =
								typeof dgMessage === 'string' ? dgMessage : dgMessage.toString('utf8');

							if (ws.readyState === WebSocket.OPEN) {
								// Send as text, not binary
								ws.send(messageText, { binary: false });
							}
						});
						dgTransSocket.on('open', () => {
							// Send the binary audio data
							if (isBinaryAudio) {
								dgTransSocket!.send(message);
							}
						});
					}
					if (dgTransSocket.readyState === WebSocket.OPEN) {
						// Send the binary audio data
						if (isBinaryAudio) {
							dgTransSocket.send(message);
						}
					}
					return;
				}

				// If we get here, data must be non-null (JSON message)
				if (!data) return;

				if (!data.speak) return;

				const text = data.speak.text;

				if (data.speak.deepgram) {
					const model = data.speak.deepgram.model || 'aura-2-thalia-en';
					// Check if we already have a Deepgram socket
					if (!dgSpeakSocket) {
						// Start the TTS connection
						dgSpeakSocket = deepgram.speak.live({
							model: model,
							encoding: 'linear16',
							sample_rate: 48000
						});

						// Set up event listeners
						dgSpeakSocket.on(LiveTTSEvents.Open, () => {
							// Send 'Open' message to client
							ws.send(JSON.stringify({ type: 'Open' }));

							// Send the text to Deepgram TTS
							dgSpeakSocket!.sendText(text);
							dgSpeakSocket!.flush();
						});

						dgSpeakSocket.on(LiveTTSEvents.Audio, (data) => {
							if (lastSent < Date.now() - 3000) {
								ws.send(wavHeader);
								lastSent = Date.now();
							}

							// Send audio data to client
							ws.send(data);
						});

						dgSpeakSocket.on(LiveTTSEvents.Flushed, () => {
							// Send 'Flushed' message to client
							ws.send(JSON.stringify({ type: 'Flushed' }));
						});

						dgSpeakSocket.on(LiveTTSEvents.Close, () => {
							// Send 'Close' message to client
							ws.send(JSON.stringify({ type: 'Close' }));
							dgSpeakSocket = null;
						});

						dgSpeakSocket.on(LiveTTSEvents.Error, (error) => {
							console.error('Deepgram TTS WebSocket error:', error);
							// Send 'Error' message to client
							ws.send(JSON.stringify({ type: 'Error', error: error.message }));
						});
					} else {
						// If the Deepgram socket already exists, send the text
						dgSpeakSocket.sendText(text);
						dgSpeakSocket.flush();
					}
				}
			} catch (error) {
				console.error('Error processing message:', error);
				ws.send(JSON.stringify({ type: 'Error', error: (error as Error).message }));
			}
		});

		ws.on('close', () => {
			if (dgSpeakSocket) {
				dgSpeakSocket.requestClose();
				dgSpeakSocket = null;
			}
		});

		server?.on('close', () => {
			wss.close();
		});
	});
}

abstract class BaseWebSocketHandler {
	clientSocket: WebSocket;

	constructor(clientSocket: WebSocket) {
		this.clientSocket = clientSocket;
	}
	abstract handleMessage(message: WebSocket.RawData): void;

	sendClient(data: WebsocketClientReceiveMessage) {
		if (this.clientSocket.readyState === WebSocket.OPEN) {
			if (data instanceof ArrayBuffer) {
				this.clientSocket.send(data);
				return;
			}
			this.clientSocket.send(JSON.stringify(data));
		}
	}
}

class ElevenLabsTTSSocketHandler extends BaseWebSocketHandler {
	elevenSocket: WebSocket | null = null;
	voiceId: string;

	constructor(voiceId: string, clientSocket: WebSocket) {
		super(clientSocket);
		this.voiceId = voiceId;
	}

	handleMessage(message: WebSocket.RawData) {
		const data = JSON.parse(message.toString());
		if (data.type === 'speak') {
			this.speakText(data.text);
		}
	}

	speakText(text: string) {
		if (this.elevenSocket && this.elevenSocket.readyState === WebSocket.OPEN) {
			this.elevenSocket.send(JSON.stringify({ text }));
			return;
		} else {
			this.connectElevenLabsTTS(text);
		}
	}

	connectElevenLabsTTS(text: string) {
		const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=eleven_flash_v2_5`;
		if (!this.elevenSocket) {
			console.log('Starting ElevenLabs TTS WebSocket');
			this.elevenSocket = new WebSocket(url, {
				headers: { 'xi-api-key': `${ELEVENLABS_API_KEY}` }
			});

			this.elevenSocket.on('open', async () => {
				console.log('ElevenLabs TTS WebSocket opened');
				this.elevenSocket!.send(
					JSON.stringify({
						voice_settings: {
							text,
							stability: 0.5,

							similarity_boost: 0.8,

							use_speaker_boost: false
						},
						generation_config: { chunk_length_schedule: [120, 160, 250, 290] }
					})
				);
			});
			this.elevenSocket.on('message', (event) => {
				const data = JSON.parse(event.toString());
				// Send the stringified data or handle based on message type
				if (data.audio) {
					// If it's audio data, convert base64 to Buffer
					const audioBuffer = Buffer.from(data.audio, 'base64');
					this.clientSocket?.send(audioBuffer);
				} else {
					// For other message types (metadata, etc.), send as JSON string
					this.clientSocket?.send(JSON.stringify(data));
				}
			});
			this.elevenSocket.on('error', (error) => {
				console.error('ElevenLabs TTS WebSocket error:', error);
				this.clientSocket?.send(JSON.stringify({ type: 'Error', error: error.message }));
			});
			this.elevenSocket.on('close', () => {
				console.log('ElevenLabs TTS WebSocket closed');
				this.elevenSocket = null;
			});
		}
	}
}

class DeepgramTTSSocketHandler extends BaseWebSocketHandler {
	dgSpeakSocket: SpeakLiveClient | null = null;
}

class DeepgramTranscriptionSocketHandler extends BaseWebSocketHandler {
	dgTransSocket: WebSocket | null = null;
	constructor(clientSocket: WebSocket) {
		super(clientSocket);
	}
	handleMessage(message: WebSocket.RawData) {
		if (typeof message === 'string') {
			// Ignore non-binary messages
			this.handleTextMessage(message);
			return;
		}
		this.transcribeAudio(message);
	}

	handleTextMessage(message: string) {
		// Handle any text-based commands if needed
		return;
	}

	transcribeAudio(audioData: WebSocket.RawData) {
		if (!this.dgTransSocket) {
			this.dgTransSocket = new WebSocket(
				`wss://api.deepgram.com/v2/listen?model=flux-general-en&sample_rate=16000&encoding=linear16&eot_threshold=0.8`,
				{
					headers: {
						Authorization: `Token ${DEEPGRAM_API_KEY}`
					}
				}
			);
		}
		this.dgTransSocket.on('message', (dgMessage) => {
			// Convert data to string if it's binary
			const messageText = typeof dgMessage === 'string' ? dgMessage : dgMessage.toString('utf8');

			if (this.clientSocket.readyState === WebSocket.OPEN) {
				this.sendClient({ transcription: JSON.parse(messageText).channel.alternatives[0] });
			}
		});
		this.dgTransSocket.on('open', () => {
			this.dgTransSocket!.send(audioData);
		});
	}
}
