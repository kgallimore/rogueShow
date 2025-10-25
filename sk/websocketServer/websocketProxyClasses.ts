import 'dotenv/config';
import { createClient, LiveTTSEvents, type SpeakLiveClient } from '@deepgram/sdk';
import type {
	DeepgramTranscription,
	WebsocketClientReceiveMessage,
	WebsocketProxyMessage
} from '$lib/types';
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

export abstract class BaseWebSocketHandler {
	private clientSocket: WebSocket;

	constructor(clientSocket: WebSocket) {
		this.clientSocket = clientSocket;
	}
	abstract handleMessage(message: WebSocket.RawData): void;

	sendClient(data: WebsocketClientReceiveMessage) {
		if (this.clientSocket.readyState === WebSocket.OPEN) {
			if (data instanceof ArrayBuffer || data instanceof Buffer || data instanceof Uint8Array) {
				this.clientSocket.send(data, { binary: true });
				return;
			}
			this.clientSocket.send(JSON.stringify(data));
		}
	}

	abstract close(): void;
}

export class ElevenLabsTTSSocketHandler extends BaseWebSocketHandler {
	elevenSocket: WebSocket | null = null;
	voiceId: string;
	textQueue: string = '';

	constructor(voiceId: string, clientSocket: WebSocket) {
		super(clientSocket);
		this.voiceId = voiceId;
	}

	handleMessage(message: WebSocket.RawData) {
		const data = JSON.parse(message.toString()) as WebsocketProxyMessage;
		if (data.speak !== undefined) {
			this.speakText(data.speak);
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
		const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=eleven_flash_v2_5&output_format=pcm_24000&sync_alignment=true`;
		if (!this.elevenSocket) {
			this.textQueue = text;
			this.elevenSocket = new WebSocket(url, {
				headers: { 'xi-api-key': `${ELEVENLABS_API_KEY}` }
			});

			this.elevenSocket.on('open', async () => {
				// First, send the configuration with proper BOS (Beginning of Stream) format
				this.elevenSocket!.send(
					JSON.stringify({
						text: ' ',
						voice_settings: {
							stability: 0.5,
							similarity_boost: 0.8,
							use_speaker_boost: false,
							speed: 1.2
						}
						// generator_config: {
						// 	chunk_length_schedule: [50, 100, 150, 250]
						// }
					})
				);
				// Then send the actual text
				this.elevenSocket!.send(JSON.stringify({ text: this.textQueue }));
			});
			this.elevenSocket.on('message', (event) => {
				let parsed: Record<string, unknown>;
				try {
					parsed = JSON.parse(event.toString()) as Record<string, unknown>;
				} catch {
					// If a non-JSON frame ever appears, ignore or forward as-is for debugging
					console.warn('Non-JSON ElevenLabs message frame');
					return;
				}

				// Forward metadata/messages as JSON so the client can react (e.g., isFinal)
				if (!('audio' in parsed)) {
					this.sendClient(parsed);
					return;
				}

				const audioField = parsed['audio'];
				if (typeof audioField !== 'string' || audioField.length === 0) {
					// Still forward the message to client as it might contain important metadata
					this.sendClient(parsed);
					return;
				}

				// Audio chunks arrive as base64 PCM; send directly without WAV header
				const audioBuffer = Buffer.from(audioField, 'base64');
				this.sendClient(audioBuffer);
			});
			this.elevenSocket.on('error', (error) => {
				console.error('ElevenLabs TTS WebSocket error:', error);
				this.sendClient({ type: 'Error', error: error.message });
			});
			this.elevenSocket.on('close', () => {
				this.elevenSocket = null;
			});
			// Extra visibility into handshake issues
			this.elevenSocket.on('unexpected-response', (_req, res) => {
				console.error('ElevenLabs unexpected response', res.statusCode, res.statusMessage);
			});
			return;
		}
		if (this.elevenSocket.readyState !== WebSocket.OPEN) {
			this.textQueue += text;
			return;
		}
		if (text === '') {
			this.elevenSocket.send(JSON.stringify({ text: ' ', flush: true }));
		}
		this.elevenSocket.send(JSON.stringify({ text }));
	}

	close() {
		if (this.elevenSocket) {
			this.elevenSocket.close();
			this.elevenSocket = null;
		}
	}
}

export class DeepgramTTSSocketHandler extends BaseWebSocketHandler {
	dgSpeakSocket: SpeakLiveClient | null = null;
	deepgram = createClient(DEEPGRAM_API_KEY);
	lastSent = Date.now() - 5000; // Current time minus 5 seconds

	constructor(clientSocket: WebSocket) {
		super(clientSocket);
	}
	handleMessage(message: WebSocket.RawData) {
		if (typeof message === 'string') {
			// Ignore non-binary messages
			this.speakText(message);
			return;
		}
	}

	speakText(text: string) {
		if (!this.dgSpeakSocket) {
			// Initialize Deepgram TTS socket here if needed
			return;
		}
		this.dgSpeakSocket.sendText(text);
	}

	connectDeepgram(model: string, text: string) {
		if (this.dgSpeakSocket) {
			return;
		}
		this.lastSent = Date.now() - 5000;
		this.dgSpeakSocket = this.deepgram.speak.live({
			model: model,
			encoding: 'linear16',
			sample_rate: 48000
		});

		// Set up event listeners
		this.dgSpeakSocket.on(LiveTTSEvents.Open, () => {
			// Send 'Open' message to client
			this.sendClient({ type: 'Open' });

			// Send the text to Deepgram TTS
			this.dgSpeakSocket!.sendText(text);
			this.dgSpeakSocket!.flush();
		});

		this.dgSpeakSocket.on(LiveTTSEvents.Audio, (data) => {
			if (this.lastSent < Date.now() - 3000) {
				this.sendClient(wavHeader);
				this.lastSent = Date.now();
			}

			// Send audio data to client
			this.sendClient(data);
		});

		this.dgSpeakSocket.on(LiveTTSEvents.Flushed, () => {
			// Send 'Flushed' message to client
			this.sendClient({ type: 'Flushed' });
		});

		this.dgSpeakSocket.on(LiveTTSEvents.Close, () => {
			// Send 'Close' message to client
			this.sendClient({ type: 'Close' });
			this.dgSpeakSocket = null;
		});

		this.dgSpeakSocket.on(LiveTTSEvents.Error, (error) => {
			console.error('Deepgram TTS WebSocket error:', error);
			// Send 'Error' message to client
			this.sendClient({ type: 'Error', error: error.message });
		});
	}

	close() {
		if (this.dgSpeakSocket) {
			this.dgSpeakSocket.requestClose();
			this.dgSpeakSocket = null;
		}
	}
}

export class DeepgramTranscriptionSocketHandler extends BaseWebSocketHandler {
	dgTransSocket: WebSocket | null = null;
	private isConnected = false;
	private audioQueue: WebSocket.RawData[] = [];

	constructor(clientSocket: WebSocket) {
		super(clientSocket);
	}

	handleMessage(message: WebSocket.RawData) {
		this.transcribeAudio(message);
	}

	connectDeepgram() {
		this.dgTransSocket = new WebSocket(
			`wss://api.deepgram.com/v2/listen?model=flux-general-en&sample_rate=16000&encoding=linear16&eot_threshold=0.8`,
			{
				headers: {
					Authorization: `Token ${DEEPGRAM_API_KEY}`
				}
			}
		);

		this.dgTransSocket.on('open', () => {
			this.isConnected = true;

			// Send any queued audio data
			while (this.audioQueue.length > 0) {
				const queuedAudio = this.audioQueue.shift();
				if (queuedAudio && this.dgTransSocket) {
					this.dgTransSocket.send(queuedAudio);
				}
			}
		});

		this.dgTransSocket.on('message', (dgMessage) => {
			// Convert data to string if it's binary
			const messageText = typeof dgMessage === 'string' ? dgMessage : dgMessage.toString('utf8');
			const parsed = JSON.parse(messageText) as DeepgramTranscription;
			if (parsed?.type === 'TurnInfo') this.sendClient({ transcription: parsed });
		});

		this.dgTransSocket.on('error', (error) => {
			console.error('Deepgram Transcription WebSocket error:', error);
			this.sendClient({ type: 'Error', error: error.message });
		});

		this.dgTransSocket.on('close', () => {
			this.isConnected = false;
			this.dgTransSocket = null;
		});
	}

	transcribeAudio(audioData: WebSocket.RawData) {
		if (!this.dgTransSocket) {
			this.connectDeepgram();
			console.error('Deepgram socket not initialized');
			return;
		}

		// If connected, send immediately; otherwise queue it
		if (this.isConnected && this.dgTransSocket.readyState === WebSocket.OPEN) {
			this.dgTransSocket.send(audioData);
		} else {
			this.audioQueue.push(audioData);
		}
	}

	close() {
		if (this.dgTransSocket) {
			this.dgTransSocket.close();
			this.dgTransSocket = null;
		}
		this.audioQueue = [];
		this.isConnected = false;
	}
}
