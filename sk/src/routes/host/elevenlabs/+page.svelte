<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { ElevenLabsTTS } from '$lib/elevenLabsTTS.svelte';

	let { data }: PageProps = $props();
	let tts: ElevenLabsTTS | null = $state(null);
	let textInput: string = $state('The rough soldier thought about the quiet queue outside the city, where a young knight coughed through the night, sewing a tough, though beautiful, coat for his friend.');

	onMount(() => {
		tts = new ElevenLabsTTS();
	});
	onDestroy(() => {
		if (tts) {
			tts.close();
		}
	});
	async function sendTTS() {
		for(const word of textInput.split(" ")) {
			tts?.sendTTSMessage(word + " ");
			await new Promise((resolve) => setTimeout(resolve, 300)); // slight delay between words
		}
		await new Promise((resolve) => setTimeout(resolve, 300)); // slight delay between words
		tts?.sendTTSEnd();
	}
</script>
{#if tts}
<button class="cursor-pointer disabled:cursor-not-allowed" onclick={sendTTS} disabled={tts.talking || tts.audioPlaying || !tts.connected}
	>Start Eleven Labs TTS</button
>
<input type="text" bind:value={textInput} placeholder="Enter text to speak" />
<br />
{#if tts.talking}
	<p>Talking...</p>
{/if}
{#if tts.audioPlaying}
	<p>Audio is playing...</p>
{/if}
{/if}
