<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { ElevenLabsTTS } from '$lib/elevenLabsTTS.svelte';

	let { data }: PageProps = $props();
	let tts: ElevenLabsTTS | null = $state(null);
	let textInput: string = $state('Hello, this is a test of Eleven Labs text to speech.');

	onMount(() => {
		tts = new ElevenLabsTTS();
	});
	onDestroy(() => {
		if (tts) {
			tts.close();
		}
	});
	async function sendTTS() {
		tts?.sendTTSMessage(textInput);
	}
</script>
{#if tts}
<button class="cursor-pointer disabled:cursor-not-allowed" onclick={sendTTS} disabled={tts.talking || tts.audioPlaying || !tts.connected}
	>Start Eleven Labs TTS</button
>
<input type="text" bind:value={textInput} placeholder="Enter text to speak" />
<input type="checkbox" bind:checked={tts.enableDeepBoomyEffect} /> Deep Boomy Effect
<br />
{#if tts.talking}
	<p>Talking...</p>
{/if}
{#if tts.audioPlaying}
	<p>Audio is playing...</p>
{/if}
{/if}
