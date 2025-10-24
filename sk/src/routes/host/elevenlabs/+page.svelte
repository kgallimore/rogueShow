<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { ElevenLabsTTS } from '$lib/elevenLabsTTS.svelte';

	let { data }: PageProps = $props();
	let tts: ElevenLabsTTS | null = $state(null);

	onMount(() => {
		tts = new ElevenLabsTTS();
		tts.initializeTTS();
	});
	onDestroy(() => {
		if (tts) {
			tts.close();
		}
	});
</script>
{#if tts}
<button class="cursor-pointer" onclick={tts.sendTTSMessage} disabled={tts.talking || tts.audioPlaying}
	>Start Eleven Labs TTS</button
>
<input type="text" bind:value={tts.textInput} placeholder="Enter text to speak" />
<input type="checkbox" bind:checked={tts.enableDeepBoomyEffect} /> Deep Boomy Effect
<br />
{#if tts.talking}
	<p>Talking...</p>
{/if}
{#if tts.audioPlaying}
	<p>Audio is playing...</p>
{/if}
{/if}
