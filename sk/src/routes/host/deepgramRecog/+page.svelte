<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
    import type { PageProps } from './$types';
	import {DeepgramSpeechRecog} from '$lib/deepgramSpeechRecog.svelte';

    let { data }: PageProps = $props();
	// let ws: WebSocket | null;
	// let audioContext: AudioContext | null;
	// let mediaStream: MediaStream | null;
	// let workletNode: AudioWorkletNode | null;
	// let sourceNode: MediaStreamAudioSourceNode | null;
	let isStreaming: boolean = $state(false);
    // let inTurn: boolean = false;
	let speechRecog: DeepgramSpeechRecog | null = $state(null);
	

	function connect() {
		speechRecog = new DeepgramSpeechRecog();
	}

	function disconnect() {
		speechRecog?.stop();
		speechRecog?.close();
		speechRecog = null;
	}

	function startStreaming() {
		speechRecog?.startStreaming();
		isStreaming = true;
	}

	function stop(){
		speechRecog?.stop();
		isStreaming = false;
	}
	onMount(() => {
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

{#each speechRecog?.transcriptions as transcription}
    <div>{transcription}</div>
{/each}
