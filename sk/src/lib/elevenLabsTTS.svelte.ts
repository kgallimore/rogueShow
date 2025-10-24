import type { WebsocketProxyMessage } from '$lib/types';
import { BaseWebsocketClient } from './baseWebsocketClient.svelte';

export class ElevenLabsTTS extends BaseWebsocketClient {
	talking = $state(false);
	audioPlaying = $state(false);
	audioChunks: ArrayBuffer[] = [];
	connected = $state(false);
	errorMessage = $state('');
	textInput = $state('');
	enableDeepBoomyEffect = $state(false); // Toggle for voice effect

	constructor() {
		super({ speak: { type: 'elevenLabs' } });
	}

	async handleMessage(event: MessageEvent<unknown>) {
		if (typeof event.data === 'string') {
			const msg = JSON.parse(event.data);

			if (msg.type === 'Open') {
				// Connection opened
			} else if (msg.type === 'Error') {
				this.errorMessage += 'WebSocket error occurred: ' + JSON.stringify(msg);
			} else if (msg.type === 'Close') {
				this.connected = false;
			} else if (msg.isFinal === true) {
				const concatenatedBuffer = await concatenateChunks(this.audioChunks);
				const correctedHeader = correctWavHeader(new Uint8Array(concatenatedBuffer));
				// All data received, now combine chunks and play audio
				// Ensure the data is backed by a plain ArrayBuffer (not a SharedArrayBuffer or other ArrayBufferLike)
				const uint8 = new Uint8Array(correctedHeader.length);
				uint8.set(correctedHeader);
				const blob = new Blob([uint8.buffer], { type: 'audio/wav' });

				if (window.MediaSource) {
					const audioContext = new AudioContext();

					const reader = new FileReader();
					reader.onload = async () => {
						const arrayBuffer = reader.result;
						if (!(arrayBuffer instanceof ArrayBuffer)) {
							console.error('Failed to read audio data as ArrayBuffer');
							return;
						}

						audioContext.decodeAudioData(arrayBuffer, async (buffer) => {
							// Apply deep boomy effect if enabled

							const source = audioContext.createBufferSource();
							source.buffer = buffer;
							source.connect(audioContext.destination);
							source.start();

							this.audioPlaying = true;

							source.onended = () => {
								// Clear the buffer
								this.audioChunks = [];
								this.audioPlaying = false;
							};
						});
					};
					reader.readAsArrayBuffer(blob);
				} else {
					console.error('Audio is NOT supported');
				}

				// Clear the buffer
				this.audioChunks = [];
			}
		}

		if (event.data instanceof ArrayBuffer) {
			// Incoming audio binary data
			this.audioChunks.push(event.data);
		}
	}

	sendTTSMessage(text: string) {
		if (this.socket && this.connected) {
			const sendMessage: WebsocketProxyMessage = {
				speak: text
			};
			this.socket.send(JSON.stringify(sendMessage));
		} else {
			this.errorMessage = 'WebSocket is not connected.';
		}
	}

	onClose() {}
}

function correctWavHeader(view: Uint8Array) {
	// Create a new buffer to ensure we're working with a clean ArrayBuffer
	const buffer = new ArrayBuffer(view.length);
	const newView = new Uint8Array(buffer);
	newView.set(view);

	const dataView = new DataView(buffer);

	// Verify we have at least a minimal WAV header (44 bytes)
	if (newView.length < 44) {
		console.error('Buffer too small for WAV header:', newView.length);
		return newView;
	}

	// Verify this is actually a WAV file
	const riff = String.fromCharCode(newView[0], newView[1], newView[2], newView[3]);
	const wave = String.fromCharCode(newView[8], newView[9], newView[10], newView[11]);
	if (riff !== 'RIFF' || wave !== 'WAVE') {
		console.error('Not a valid WAV file. RIFF:', riff, 'WAVE:', wave);
		return newView;
	}

	// Correct file size (total size - 8 bytes)
	dataView.setUint32(4, newView.length - 8, true);

	// Correct fmt chunk
	const sampleRate = dataView.getUint32(24, true);
	const numChannels = dataView.getUint16(22, true);
	const bitsPerSample = dataView.getUint16(34, true);

	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	dataView.setUint32(28, byteRate, true);

	const blockAlign = (numChannels * bitsPerSample) / 8;
	dataView.setUint16(32, blockAlign, true);

	// Find and correct data chunk size
	let dataChunkSize = 0;
	for (let i = 36; i < newView.length - 8; i++) {
		if (
			newView[i] === 0x64 &&
			newView[i + 1] === 0x61 &&
			newView[i + 2] === 0x74 &&
			newView[i + 3] === 0x61
		) {
			dataChunkSize = newView.length - i - 8;
			dataView.setUint32(i + 4, dataChunkSize, true);
			break;
		}
	}

	return newView;
}

async function concatenateChunks(chunks: ArrayBuffer[]) {
	const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}
	return result.buffer;
}
