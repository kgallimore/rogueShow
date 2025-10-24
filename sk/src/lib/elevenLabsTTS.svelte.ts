import type { WebsocketProxyMessage } from '$lib/types';
import { applyDeepBoomyEffect } from '$lib/audioProcess';

export class ElevenLabsTTS {
	talking = $state(false);
	audioPlaying = $state(false);
	socket: WebSocket | null = null;
	audioChunks: Blob[] = [];
	connected = $state(false);
	errorMessage = $state('');
	textInput = $state('');
	enableDeepBoomyEffect = $state(false); // Toggle for voice effect
	initializeTTS() {
		if (!this.socket) {
			this.socket = new WebSocket(`ws://localhost:24678`);
		}
		this.socket.addEventListener('open', () => {
			this.connected = true;
		});
		this.socket.addEventListener('message', async (event) => {
			console.log('Incoming event:', event);

			if (typeof event.data === 'string') {
				console.log('Incoming text data:', event.data);

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
						console.log('MP4 audio is supported');
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
								let finalBuffer = buffer;
								if (this.enableDeepBoomyEffect) {
									try {
										finalBuffer = await applyDeepBoomyEffect(buffer);
										console.log('Deep boomy effect applied');
									} catch (error) {
										console.error('Error applying voice effect:', error);
										// Fall back to original buffer on error
									}
								}

								const source = audioContext.createBufferSource();
								source.buffer = finalBuffer;
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
						console.error('MP4 audio is NOT supported');
					}

					// Clear the buffer
					this.audioChunks = [];
				}
			}

			if (event.data instanceof Blob) {
				// Incoming audio blob data
				const blob = event.data;

				// Push each blob into the array
				this.audioChunks.push(blob);
			}
		});

		this.socket.addEventListener('close', () => {
			this.connected = false;
		});

		this.socket.addEventListener('error', (error) => {
			this.errorMessage = 'WebSocket error occurred: ' + JSON.stringify(error);
		});
	}

	sendTTSMessage() {
		if (this.socket && this.connected) {
			if (this.textInput.trim() === '') {
				this.errorMessage = 'Please enter text to speak.';
				return;
			}
			const sendMessage: WebsocketProxyMessage = {
				speak: {
					text: this.textInput,
					elevenLabs: {
						voiceId: 'goT3UYdM9bhm0n2lmKQx'
					}
				}
			};
			this.socket.send(JSON.stringify(sendMessage));
		} else {
			this.errorMessage = 'WebSocket is not connected.';
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
}

function correctWavHeader(view: Uint8Array) {
	const dataView = new DataView(view.buffer);

	// Correct file size (total size - 8 bytes)
	dataView.setUint32(4, view.length - 8, true);

	// Correct fmt chunk
	const fmtLength = dataView.getUint32(16, true);
	const sampleRate = dataView.getUint32(24, true);
	const numChannels = dataView.getUint16(22, true);
	const bitsPerSample = dataView.getUint16(34, true);

	console.log('WAV Header Info:');
	console.log('Format chunk length:', fmtLength);
	console.log('Sample rate:', sampleRate);
	console.log('Number of channels:', numChannels);
	console.log('Bits per sample:', bitsPerSample);

	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	dataView.setUint32(28, byteRate, true);

	const blockAlign = (numChannels * bitsPerSample) / 8;
	dataView.setUint16(32, blockAlign, true);

	// Find and correct data chunk size
	let dataChunkSize = 0;
	for (let i = 36; i < view.length - 8; i++) {
		if (view[i] === 0x64 && view[i + 1] === 0x61 && view[i + 2] === 0x74 && view[i + 3] === 0x61) {
			dataChunkSize = view.length - i - 8;
			dataView.setUint32(i + 4, dataChunkSize, true);
			break;
		}
	}

	console.log('Corrected data chunk size:', dataChunkSize);

	return new Uint8Array(dataView.buffer);
}

async function concatenateChunks(chunks: Blob[]) {
	const totalLength = chunks.reduce((acc, chunk) => acc + chunk.size, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		const buffer = await chunk.arrayBuffer();
		result.set(new Uint8Array(buffer), offset);
		offset += buffer.byteLength;
	}
	return result.buffer;
}
