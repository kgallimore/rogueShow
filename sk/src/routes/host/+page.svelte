<script lang="ts">
    import type { PageProps } from './$types';
    import {DeepgramSpeechRecog} from '$lib/deepgramSpeechRecog.svelte';
    	import { ElevenLabsTTS } from '$lib/elevenLabsTTS.svelte';

	import { onMount, onDestroy } from 'svelte';

    let { data }: PageProps = $props();
    let speechRecog: DeepgramSpeechRecog | null = $state(null);
    	let tts: ElevenLabsTTS | null = $state(null);

    onMount(() => {
        speechRecog = new DeepgramSpeechRecog();
        speechRecog.addEventListener('transcriptionEnd', (evt: Event) => {
            const event = evt as CustomEvent<{detail: {transcript: string}}>;
            const detail = event.detail;
            console.log('Transcription event:', detail);
            // Handle transcription data here
        });
        speechRecog.connect();
        tts = new ElevenLabsTTS();

    });
    onDestroy(() => {
        speechRecog?.stop();
    });
</script>
{#if speechRecog}
    <button onclick={() => speechRecog?.startStreaming()} disabled={speechRecog.isStreaming}>
        Start Streaming
    </button>
    <button onclick={() => speechRecog?.stop()} disabled={!speechRecog.isStreaming}>
        Stop Streaming
    </button>
    {#each speechRecog.transcriptions as transcription, index}
        <p><strong>Turn {index + 1}:</strong> {transcription}</p>
    {/each}
{/if}
