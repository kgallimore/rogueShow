<script lang="ts">
	import { onDestroy } from 'svelte';
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();
	let ws: WebSocket | null;
	let audioContext: AudioContext | null;
	let mediaStream: MediaStream | null;
	let workletNode: AudioWorkletNode | null;
	let sourceNode: MediaStreamAudioSourceNode | null;
	let isStreaming: boolean = $state(false);
    let transcriptions: string[] = $state([""]);
    let inTurn: boolean = false;

	function connect() {
		ws = new WebSocket("ws://localhost:24678");

		ws.onopen = () => {
			console.log('Connected to Deepgram');
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			handleTranscription(data);
		};

		ws.onclose = () => {
			console.log('Disconnected from Deepgram');
			stop();
		};

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};
	}

	// Start streaming audio from microphone
	async function startStreaming() {
		if (isStreaming) return;

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

		isStreaming = true;
		mediaStream = stream;

		// Create audio context at 16kHz
		audioContext = new (window.AudioContext || window.webkitAudioContext)({
			sampleRate: 16000
		});

		// Load AudioWorklet module
		await audioContext.audioWorklet.addModule('/audio-processor.js');

		// Create source and worklet nodes
		sourceNode = audioContext.createMediaStreamSource(stream);
		workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

		// Handle audio data from worklet
		// The audio-processor sends Int16Array.buffer (ArrayBuffer) containing PCM audio data
		workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
			if (isStreaming && ws && ws.readyState === WebSocket.OPEN) {
				// Send PCM audio data directly as binary (not JSON)
				ws.send(event.data);
			}
		};

		// Connect nodes
		sourceNode.connect(workletNode);
		workletNode.connect(audioContext.destination);
	}

	// Stop streaming
	function stop() {
		isStreaming = false;

		if (workletNode) {
			workletNode.disconnect();
			workletNode.port.onmessage = null;
			workletNode = null;
		}

		if (sourceNode) {
			sourceNode.disconnect();
			sourceNode = null;
		}

		if (audioContext && audioContext.state !== 'closed') {
			audioContext.close();
			audioContext = null;
		}

		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}
	}

	// Disconnect WebSocket
	function disconnect() {
		if (ws) {
			stop();
			ws.close();
			ws = null;
		}
	}

	// Handle transcription messages
	function handleTranscription(data: { type: string; transcript: string; event: "StartOfTurn" | "Update" | "EndOfTurn" }) {
		if (data.type === 'TurnInfo') {
			const transcript = data.transcript;
			const event = data.event;
            if(!transcript) return;

			// Process transcript based on event type
            if(event === "StartOfTurn" || event === "EndOfTurn"){
                inTurn = event === "StartOfTurn";
                transcriptions[transcriptions.length - 1] = transcript;
                if (event === "EndOfTurn") {
                    transcriptions.push(''); // Prepare for next turn
                }
            } else if(event === "Update" && inTurn){
                transcriptions[transcriptions.length - 1] = transcript;
            }
		}
	}
	$effect(() => {
        connect();
	});
    onDestroy(() => {
        disconnect();
    });

</script>
<button class="cursor-pointer" onclick={startStreaming} disabled={isStreaming}>
    Start Streaming
</button>

<button class="cursor-pointer" onclick={stop} disabled={!isStreaming}>
    Stop Streaming
</button>

{#each transcriptions as transcription}
    <div>{transcription}</div>
{/each}
