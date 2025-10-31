<script lang="ts">
	import type { WebsocketProxyMessage } from '$lib/types';
	import type { PageProps } from './$types';
	import { correctWavHeader, concatenateChunks } from '$lib/helpers';
	import { onMount, onDestroy } from 'svelte';

	let { data }: PageProps = $props();
	let talking = $state(false);
	let audioPlaying = $state(false);
	let socket: WebSocket | null = null;
	let audioChunks: Blob[] = [];
	let connected = $state(false);
	let errorMessage = $state('');
	let textInput = $state('');
	function initializeTTS() {
		if (!socket) {
			socket = new WebSocket(`ws://localhost:24678`);
		}
		socket.addEventListener('open', () => {
			connected = true;
		});
		socket.addEventListener('message', async (event) => {
			if (typeof event.data === 'string') {
				let msg = JSON.parse(event.data);

				if (msg.type === 'Open') {
					// Connection opened
				} else if (msg.type === 'Error') {
					errorMessage += 'WebSocket error occurred: ' + JSON.stringify(msg);
				} else if (msg.type === 'Close') {
					connected = false;
				} else if (msg.type === 'Flushed') {
					const concatenatedBuffer = await concatenateChunks(audioChunks);
					const correctedHeader = correctWavHeader(new Uint8Array(concatenatedBuffer));
					// All data received, now combine chunks and play audio
					const blob = new Blob([correctedHeader], { type: 'audio/wav' });

					if (window.MediaSource) {
						const audioContext = new AudioContext();

						const reader = new FileReader();
						reader.onload = function () {
							const arrayBuffer = this.result;
							if (!(arrayBuffer instanceof ArrayBuffer)) {
								console.error('Failed to read audio data as ArrayBuffer');
								return;
							}

							audioContext.decodeAudioData(arrayBuffer, (buffer) => {
								const source = audioContext.createBufferSource();
								source.buffer = buffer;
								source.connect(audioContext.destination);
								source.start();

								audioPlaying = true;

								source.onended = () => {
									// Clear the buffer
									audioChunks = [];
									audioPlaying = false;
								};
							});
						};
						reader.readAsArrayBuffer(blob);
					} else {
						console.error('MP4 audio is NOT supported');
					}

					// Clear the buffer
					audioChunks = [];
				}
			}

			if (event.data instanceof Blob) {
				// Incoming audio blob data
				const blob = event.data;

				// Push each blob into the array
				audioChunks.push(blob);
			}
		});

		socket.addEventListener('close', () => {
			connected = false;
		});

		socket.addEventListener('error', (error) => {
			errorMessage = 'WebSocket error occurred: ' + JSON.stringify(error);
		});
	}

	function sendTTSMessage() {
		if (socket && connected) {
			if (textInput.trim() === '') {
				errorMessage = 'Please enter text to speak.';
				return;
			}
			const sendMessage: WebsocketProxyMessage = {
				speak: textInput
			};
			socket.send(JSON.stringify(sendMessage));
		} else {
			errorMessage = 'WebSocket is not connected.';
		}
	}
	onMount(() => {
		initializeTTS();
	});
	onDestroy(() => {
		if (socket) {
			if (socket.readyState === WebSocket.OPEN) {
				socket.close();
			}
			socket = null;
		}
	});
</script>

<button class="cursor-pointer" onclick={sendTTSMessage} disabled={talking || audioPlaying}
	>Start Deepgram TTS</button
>
<input type="text" bind:value={textInput} placeholder="Enter text to speak" />
{#if talking}
	<p>Talking...</p>
{/if}
{#if audioPlaying}
	<p>Audio is playing...</p>
{/if}
