import type { WebsocketProxyMessage } from '$lib/types';
import { BaseWebsocketClient } from './baseWebsocketClient.svelte';

export class ElevenLabsTTS extends BaseWebsocketClient {
	talking = $state(false);
	audioPlaying = $state(false);
	private audioChunks: ArrayBuffer[] = [];
	private analyser: AnalyserNode | null = null;
	private canvas: HTMLCanvasElement | null = null;
	connected = $state(false);
	errorMessage = $state('');
	textInput = $state('');
	private audioContext: AudioContext | null = null;
	private nextPlayTime = 0;
	private scheduledSources: AudioBufferSourceNode[] = [];
	private pcmChunks: ArrayBuffer[] = [];
	private minChunkSize = 24000 * 2 * 0.5; // 0.5 seconds of PCM at 24kHz, 16-bit
	private processingQueue: Promise<void> = Promise.resolve();
	private rafId: number | null = null;
	private isDrawing = false;

	constructor() {
		super({ speak: { type: 'elevenLabs' } });
	}

	setCanvas(canvas: HTMLCanvasElement | null) {
		this.canvas = canvas;
		// Start drawing loop immediately if we have a canvas (analyser can be set later)
		if (this.canvas && !this.isDrawing) {
			this.startDrawing();
		}
	}

	protected async handleMessage(event: MessageEvent<unknown>) {
		if (typeof event.data === 'string') {
			const msg = JSON.parse(event.data);

			if (msg.type === 'Open') {
				// Connection opened - initialize audio context
				if (!this.audioContext) {
					this.audioContext = new AudioContext();
					this.analyser = this.audioContext.createAnalyser();
					this.analyser.fftSize = 2048; // optional tuning
					this.analyser.smoothingTimeConstant = 0.8;
					this.analyser.connect(this.audioContext.destination);
					this.nextPlayTime = this.audioContext.currentTime;

					// Start drawing loop if we have a canvas
					if (this.canvas && !this.isDrawing) {
						this.startDrawing();
					}
				}
				this.pcmChunks = [];
			} else if (msg.type === 'Error') {
				this.errorMessage += 'WebSocket error occurred: ' + JSON.stringify(msg);
			} else if (msg.type === 'Close') {
				this.connected = false;
			} else if (msg.isFinal === true) {
				// Final message - flush any remaining PCM data
				// Wait for any pending processing to complete first
				this.processingQueue = this.processingQueue.then(async () => {
					if (this.pcmChunks.length > 0) {
						await this.flushPCMChunks();
					}

					// Set up cleanup when all scheduled audio finishes
					if (this.scheduledSources.length > 0) {
						const lastSource = this.scheduledSources[this.scheduledSources.length - 1];
						lastSource.onended = () => {
							this.audioPlaying = false;
							this.scheduledSources = [];
						};
					} else {
						this.audioPlaying = false;
					}
				});
			}
		}

		if (event.data instanceof ArrayBuffer) {
			// Incoming audio binary data - accumulate PCM chunks
			this.audioChunks.push(event.data);
			this.pcmChunks.push(event.data);

			// Calculate total PCM data size
			const totalPCMSize = this.pcmChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);

			// When we have enough data, flush it to playback
			// Use a queue to ensure sequential processing
			if (totalPCMSize >= this.minChunkSize) {
				this.processingQueue = this.processingQueue.then(() => this.flushPCMChunks());
			}
		}
	}

	private startDrawing() {
		console.log(
			'startDrawing called, isDrawing:',
			this.isDrawing,
			'canvas:',
			this.canvas,
			'analyser:',
			this.analyser
		);
		if (this.isDrawing) return; // Already drawing
		this.isDrawing = true;
		console.log('Starting draw loop');
		this.draw();
	}

	private stopDrawing() {
		this.isDrawing = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	private draw() {
		// Continue the animation loop first (before any early returns)
		if (this.isDrawing) {
			this.rafId = requestAnimationFrame(() => this.draw());
		}

		if (!this.canvas) {
			return;
		}

		const canvasCtx = this.canvas.getContext('2d');
		if (!canvasCtx) {
			return;
		}

		const WIDTH = this.canvas.width;
		const HEIGHT = this.canvas.height;
		if (WIDTH === 0 || HEIGHT === 0) {
			return;
		}

		// Background
		canvasCtx.fillStyle = 'rgb(200,200,200)';
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

		// If no analyser yet, just draw a flat line in the middle
		if (!this.analyser) {
			canvasCtx.lineWidth = 2;
			canvasCtx.strokeStyle = 'rgb(0,0,0)';
			canvasCtx.beginPath();
			canvasCtx.moveTo(0, HEIGHT / 2);
			canvasCtx.lineTo(WIDTH, HEIGHT / 2);
			canvasCtx.stroke();
			return;
		}

		const bufferLength = this.analyser.frequencyBinCount;
		if (bufferLength === 0) {
			return;
		}

		const dataArray = new Uint8Array(bufferLength);
		this.analyser.getByteTimeDomainData(dataArray);

		// Calculate peak amplitude (0 to 1 range)
		let peakAmplitude = 0;
		for (let i = 0; i < bufferLength; i++) {
			const amplitude = Math.abs((dataArray[i] - 128) / 128.0);
			peakAmplitude = Math.max(peakAmplitude, amplitude);
		}

		// Interpolate color from green (0,255,0) to red (255,0,0) based on peak amplitude
		const red = Math.round(peakAmplitude * 255);
		const green = Math.round((1 - peakAmplitude) * 255);

		canvasCtx.lineWidth = 2;
		canvasCtx.strokeStyle = `rgb(${red},${green},0)`;
		canvasCtx.beginPath();

		const sliceWidth = WIDTH / bufferLength;
		let x = 0;

		for (let i = 0; i < bufferLength; i++) {
			// Normalize to -1..1, then map to canvas y with center at HEIGHT/2
			const v = (dataArray[i] - 128) / 128.0; // -1..1
			const y = v * (HEIGHT / 2) + HEIGHT / 2;

			if (i === 0) {
				canvasCtx.moveTo(x, y);
			} else {
				canvasCtx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		canvasCtx.stroke();
	}

	private async flushPCMChunks() {
		if (this.pcmChunks.length === 0) return;

		// Concatenate all PCM chunks
		const totalSize = this.pcmChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
		const pcmData = new Uint8Array(totalSize);
		let offset = 0;
		for (const chunk of this.pcmChunks) {
			pcmData.set(new Uint8Array(chunk), offset);
			offset += chunk.byteLength;
		}

		// Create a WAV file from the PCM data
		const wavBuffer = this.createWavFile(pcmData, 24000, 1, 16);

		// Clear the buffer for next batch
		this.pcmChunks = [];

		// Play the audio
		await this.playAudioChunk(wavBuffer);
	}

	private createWavFile(
		pcmData: Uint8Array,
		sampleRate: number,
		channels: number,
		bitsPerSample: number
	): ArrayBuffer {
		const header = new ArrayBuffer(44);
		const view = new DataView(header);

		const byteRate = (sampleRate * channels * bitsPerSample) / 8;
		const blockAlign = (channels * bitsPerSample) / 8;

		// "RIFF" chunk descriptor
		view.setUint32(0, 0x52494646, false); // "RIFF"
		view.setUint32(4, 36 + pcmData.length, true); // File size - 8
		view.setUint32(8, 0x57415645, false); // "WAVE"

		// "fmt " sub-chunk
		view.setUint32(12, 0x666d7420, false); // "fmt "
		view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
		view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
		view.setUint16(22, channels, true); // NumChannels
		view.setUint32(24, sampleRate, true); // SampleRate
		view.setUint32(28, byteRate, true); // ByteRate
		view.setUint16(32, blockAlign, true); // BlockAlign
		view.setUint16(34, bitsPerSample, true); // BitsPerSample

		// "data" sub-chunk
		view.setUint32(36, 0x64617461, false); // "data"
		view.setUint32(40, pcmData.length, true); // Subchunk2Size

		// Combine header and PCM data
		const wavFile = new Uint8Array(44 + pcmData.length);
		wavFile.set(new Uint8Array(header), 0);
		wavFile.set(pcmData, 44);

		return wavFile.buffer;
	}

	private async playAudioChunk(chunk: ArrayBuffer) {
		// Initialize audio context and analyser if needed
		if (!this.audioContext) {
			this.audioContext = new AudioContext();
			this.nextPlayTime = this.audioContext.currentTime;
		}

		if (!this.analyser) {
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 2048;
			this.analyser.smoothingTimeConstant = 0.8;
			this.analyser.connect(this.audioContext.destination);

			// Start drawing if we have a canvas
			if (this.canvas && !this.isDrawing) {
				this.startDrawing();
			}
		}

		try {
			// Decode the audio chunk
			const audioBuffer = await this.audioContext.decodeAudioData(chunk.slice(0));

			// Create source
			const source = this.audioContext.createBufferSource();
			source.buffer = audioBuffer;

			// Connect to analyser for visualization (analyser is always available now)
			source.connect(this.analyser);

			// Schedule playback - ensure we never schedule in the past
			const playTime = Math.max(
				this.nextPlayTime,
				this.audioContext.currentTime + 0.01 // Small buffer to avoid glitches
			);
			source.start(playTime);

			// Update next play time
			this.nextPlayTime = playTime + audioBuffer.duration;

			// Track the source
			this.scheduledSources.push(source);

			// Mark as playing
			if (!this.audioPlaying) {
				this.audioPlaying = true;
			}

			// Cleanup old sources
			source.onended = () => {
				const index = this.scheduledSources.indexOf(source);
				if (index > -1) {
					this.scheduledSources.splice(index, 1);
				}
			};
		} catch (error) {
			console.error('Error decoding/playing audio chunk:', error);
		}
	}

	sendTTSMessage(text: string, end = false) {
		if (this.socket && this.connected) {
			const sendMessage: WebsocketProxyMessage = {
				speak: { text, flush: end }
			};
			this.socket.send(JSON.stringify(sendMessage));
		} else {
			this.errorMessage = 'WebSocket is not connected.';
		}
	}

	sendTTSEnd() {
		if (this.socket && this.connected) {
			const sendMessage: WebsocketProxyMessage = {
				speak: { text: '', flush: true }
			};
			this.socket.send(JSON.stringify(sendMessage));
		}
	}

	onClose() {
		this.stopDrawing();
	}
}
