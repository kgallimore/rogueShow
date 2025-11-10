<script lang="ts">
	import type { PageProps } from './$types';
	import { DeepgramSpeechRecog } from '$lib/deepgramSpeechRecog.svelte';
	import { ElevenLabsTTS } from '$lib/elevenLabsTTS.svelte';
	import { OpenAiChat } from '$lib/openaiChat.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { data }: PageProps = $props();
	let speechRecog: DeepgramSpeechRecog | null = $state(null);
	let tts: ElevenLabsTTS | null = $state(null);
	let openAiChat: OpenAiChat | null = $state(null);
	let chatInputValue: string = $state('');
	let chatOutputs: { agent: string[]; standard: string[] } = $state({ agent: [], standard: [] });

	onMount(async () => {
		speechRecog = new DeepgramSpeechRecog();
		speechRecog.addEventListener('transcriptionEnd', (evt: Event) => {
			const event = evt as CustomEvent<{ transcript: string }>;
			const detail = event.detail;
			chat(detail.transcript);
		});
		tts = new ElevenLabsTTS();
		openAiChat = new OpenAiChat(data.key);
	});

	async function chat(message: string) {
		if (!openAiChat) return;
		const standard = await openAiChat.createChatCompletion(message);

		// Output both streamed standard response and streamed agent response simultaneously

		for await (const chunk of standard) {
			if (chunk.type === 'response.created') chatOutputs.standard.push('');
			else if (chunk.type === 'response.output_text.delta') {
				chatOutputs.standard[chatOutputs.standard.length - 1] += chunk.delta;
				tts?.sendTTSMessage(chunk.delta);
			} else if (chunk.type === 'response.completed') {
				tts?.sendTTSEnd();
			}
		}
	}

	$effect(() => {
		if (speechRecog) {
			speechRecog.mute = tts ? tts.talking || tts.audioPlaying : false;
		}
	});
	onDestroy(() => {
		speechRecog?.stop();
		tts?.close();
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
{#if openAiChat}
	<input type="text" bind:value={chatInputValue} placeholder="Type your message..." />
	<button onclick={() => chat(chatInputValue)}>Send Message</button>
{/if}

{#each chatOutputs.standard as output, index}
	<div>
		<h3>Standard Response {index + 1}:</h3>
		<p>{output}</p>
	</div>
{/each}
{#each chatOutputs.agent as output, index}
	<div>
		<h3>Agent Response {index + 1}:</h3>
		<p>{output}</p>
	</div>
{/each}
