export class DeepgramSpeechRecog extends EventTarget {
	ws: WebSocket | null = null;
	audioContext: AudioContext | null = null;
	mediaStream: MediaStream | null = null;
	workletNode: AudioWorkletNode | null = null;
	sourceNode: MediaStreamAudioSourceNode | null = null;
	isStreaming: boolean = $state(false);
	transcriptions: string[] = $state(['']);
	inTurn: boolean = false;

	connect() {
		this.ws = new WebSocket('ws://localhost:24678');

		this.ws.onopen = () => {
			console.log('Connected to Deepgram');
		};

		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			this.handleTranscription(data);
		};

		this.ws.onclose = () => {
			console.log('Disconnected from Deepgram');
			this.stop();
		};

		this.ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};
	}

	// Start streaming audio from microphone
	async startStreaming() {
		if (this.isStreaming) return;

		// Get microphone stream
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				sampleRate: 16000,
				channelCount: 1,
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false
			}
		});

		this.isStreaming = true;
		this.mediaStream = stream;

		// Create audio context at 16kHz
		this.audioContext = new (window.AudioContext ||
			// @ts-expect-error WebkitAudioContext is not in the types yet
			window.webkitAudioContext)({
			sampleRate: 16000
		});

		// Load AudioWorklet module
		await this.audioContext.audioWorklet.addModule('/audio-processor.js');

		// Create source and worklet nodes
		this.sourceNode = this.audioContext.createMediaStreamSource(stream);
		this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');

		// Handle audio data from worklet
		// The audio-processor sends Int16Array.buffer (ArrayBuffer) containing PCM audio data
		this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
			if (this.isStreaming && this.ws && this.ws.readyState === WebSocket.OPEN) {
				// Send PCM audio data directly as binary (not JSON)
				this.ws.send(event.data);
			}
		};

		// Connect nodes
		this.sourceNode.connect(this.workletNode);
		this.workletNode.connect(this.audioContext.destination);
	}

	// Stop streaming
	stop() {
		this.isStreaming = false;

		if (this.workletNode) {
			this.workletNode.disconnect();
			this.workletNode.port.onmessage = null;
			this.workletNode = null;
		}

		if (this.sourceNode) {
			this.sourceNode.disconnect();
			this.sourceNode = null;
		}

		if (this.audioContext && this.audioContext.state !== 'closed') {
			this.audioContext.close();
			this.audioContext = null;
		}

		if (this.mediaStream) {
			this.mediaStream.getTracks().forEach((track) => track.stop());
			this.mediaStream = null;
		}
	}

	// Disconnect WebSocket
	disconnect() {
		if (this.ws) {
			this.stop();
			this.ws.close();
			this.ws = null;
		}
	}

	// Handle transcription messages
	handleTranscription(data: {
		type: string;
		transcript: string;
		event: 'StartOfTurn' | 'Update' | 'EndOfTurn';
	}) {
		if (data.type === 'TurnInfo') {
			const transcript = data.transcript;
			const event = data.event;
			if (!transcript) return;

			// Process transcript based on event type
			if (event === 'StartOfTurn' || event === 'EndOfTurn') {
				this.inTurn = event === 'StartOfTurn';
				this.transcriptions[this.transcriptions.length - 1] = transcript;
				if (event === 'EndOfTurn') {
					// Emit an event or call a callback here if needed
					this.dispatchEvent(new CustomEvent('transcriptionEnd', { detail: { transcript } }));
					this.transcriptions.push(''); // Prepare for next turn
				}
			} else if (event === 'Update' && this.inTurn) {
				this.transcriptions[this.transcriptions.length - 1] = transcript;
			}
		}
	}
}
