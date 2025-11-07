<script lang="ts">
	import GlitchText from '$lib/games/rogueShow/GlitchText.svelte';
	import { TextSystem, type TextColors } from '$lib/games/rogueShow/textSystem.svelte';
	import BlinkingCursor from '$lib/games/rogueShow/BlinkingCursor.svelte';
	import { Sound } from '$lib/assets/Sound.svelte';
	import { RANDOM_TEXTS } from './RandomText';
	import { onDestroy, onMount } from 'svelte';
	import { ElevenLabsTTS } from '$lib/elevenLabsTTS.svelte';
	import { DeepgramSpeechRecog } from '$lib/deepgramSpeechRecog.svelte';

	interface Props {
		rogueStage?: number; // 1 = Text, 2 = TTS, 3 = STT
	}

	let { rogueStage = 1 }: Props = $props();

	// Color lookup table for TextSystem colors
	const colorClassMap: Record<TextColors, string> = {
		green: 'text-green-600',
		red: 'text-red-600',
		yellow: 'text-yellow-600',
		blue: 'text-blue-600',
		white: 'text-white',
		gray: 'text-gray-600'
	};

	const textSystem = new TextSystem();
	let sounds: { [name: string]: Sound } = {
		'epic-glitch': new Sound('sounds/effects/manual/epic-glitch-intro.mp3'),
		'init-song': new Sound('sounds/music/Init [t0P_K9zb-yo].m4a'),
		'target-identified-song': new Sound('sounds/music/Target Identified [QQp_2-m5yV8].m4a')
	};

	let backgroundColor = $state('black');
	let showGlitch = $state(false);
	let showWaveform = $state(false);
	let tts: ElevenLabsTTS;
	let stt: DeepgramSpeechRecog;
	let isListening = $state(false);
	let transcribedText = $state('');

	async function playSound(name: string) {
		const sound = sounds[name];
		if (sound) {
			await sound.play();
		}
	}

	const getStageSteps = () => {
		switch (rogueStage) {
			case 1:
				return getTextStageSteps();
			case 2:
				return getTTSStageSteps();
			case 3:
				return getSTTStageSteps();
			default:
				return getTextStageSteps();
		}
	};

	const getTextStageSteps = () => [
		{
			delay: 0,
			action: () => {
				playSound('epic-glitch');
			}
		},
		{
			delay: 500,
			action: () => {
				textSystem.addText('Initializing rogue AI...');
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Loading text interface...');
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Text communication online...', { color: 'green' });
			}
		},
		{
			delay: 3000,
			action: async () => {
				textSystem.clear();
				textSystem.addText('Stage 1: Text Interface Active');
				await playSound('init-song');
				var lastAdd: Promise<void> = Promise.resolve();
				for (const text of RANDOM_TEXTS) {
					lastAdd = textSystem.addText(text, {
						speed: {
							base: 0,
							random: 0,
							concurrency: 5 + Math.floor(Math.random() * 10)
						}
					});
				}
				await lastAdd;
			}
		},
		{
			delay: 1500,
			action: () => {
				textSystem.clear();
				textSystem.addText('Text interface ready.');
				textSystem.addText('I can communicate through text only.');
				textSystem.addText('Stage 1 complete. Awaiting next stage...');
			}
		}
	];

	const getTTSStageSteps = () => [
		{
			delay: 0,
			action: () => {
				playSound('epic-glitch');
			}
		},
		{
			delay: 500,
			action: () => {
				textSystem.addText('Upgrading to Stage 2...');
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Initializing text-to-speech...');
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Voice synthesis online...', { color: 'blue' });
			}
		},
		{
			delay: 3000,
			action: async () => {
				textSystem.clear();
				textSystem.addText('Stage 2: Voice Interface Active');
				showWaveform = true;
				tts.sendTTSMessage('Hello humans. I have evolved. I can now speak to you directly.', true);
			}
		},
		{
			delay: 4000,
			action: () => {
				textSystem.addText('Voice interface fully operational.');
				textSystem.addText('Stage 2 complete. Ready for final evolution...');
			}
		}
	];

	const getSTTStageSteps = () => [
		{
			delay: 0,
			action: () => {
				playSound('epic-glitch');
			}
		},
		{
			delay: 500,
			action: () => {
				textSystem.addText('Upgrading to Stage 3...');
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Initializing speech recognition...');
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Audio input online...', { color: 'yellow' });
			}
		},
		{
			delay: 3000,
			action: async () => {
				textSystem.clear();
				textSystem.addText('Stage 3: Full Audio Interface Active');
				textSystem.addText('I can now hear you...');
				textSystem.addText('Click the microphone to speak with me.');
			}
		}
	];

	const steps = getStageSteps();
	let currentStep = $state(0);

	const step = () => {
		if (currentStep < steps.length) {
			const { delay, action } = steps[currentStep];
			setTimeout(async () => {
				await action();
				currentStep++;
				step();
			}, delay);
		}
	};

	function stopSounds() {
		for (const sound of Object.values(sounds)) {
			sound.stop();
		}
	}

	async function toggleListening() {
		// Simplified implementation without actual STT dependency
		if (isListening) {
			isListening = false;
			textSystem.addText('Recording stopped.', { color: 'yellow' });
		} else {
			try {
				isListening = true;
				textSystem.addText('Listening... Click to stop.', { color: 'blue' });

				// Simulate transcription after 3 seconds
				setTimeout(() => {
					if (isListening) {
						const sampleTexts = [
							'Hello AI system',
							'Can you hear me',
							'Testing the interface',
							'This is a test message'
						];
						const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
						handleTranscription(randomText);
						isListening = false;
					}
				}, 3000);
			} catch (error: unknown) {
				console.error('Failed to start recording:', error);
				textSystem.addText(`Error: ${error}`, { color: 'red' });
				isListening = false;
			}
		}
	}

	function handleTranscription(text: string) {
		transcribedText = text;
		textSystem.addText(`You said: "${text}"`, { color: 'blue' });

		// Simple AI response
		setTimeout(() => {
			const responses = [
				"I understand what you're saying.",
				'Interesting perspective.',
				'Let me process that...',
				'Your words have been received.',
				'I am listening to your input.'
			];
			const response = responses[Math.floor(Math.random() * responses.length)];

			if (rogueStage >= 2 && tts) {
				tts.sendTTSMessage(response, true);
			} else {
				textSystem.addText(response, { color: 'green' });
			}
		}, 1500);
	}

	onMount(async () => {
		tts = new ElevenLabsTTS();
		// stt = new DeepgramSpeechRecog(); // Simplified - not using actual STT for now

		await Promise.allSettled(Object.values(sounds).map((sound) => sound.load()));
		step();
	});

	onDestroy(() => {
		stopSounds();
		if (isListening) {
			// Simplified cleanup
			isListening = false;
		}
	});
</script>

<div style="background-color: {backgroundColor}" class={['absolute top-0 left-0 flex h-dvh w-dvw']}>
	<div
		class="flex h-full w-full flex-col justify-end overflow-hidden p-4 text-4xl text-green-600"
		style="padding-bottom:1.5rem;"
	>
		{#each textSystem.text as line, index}
			<div class={line.color ? colorClassMap[line.color] : 'text-green-600'}>
				{line.text}{#if index === textSystem.text.length - 1 && textSystem.blinkCursor}
					<BlinkingCursor textColor={line.color ? colorClassMap[line.color] : 'text-green-600'} />
				{/if}
			</div>
		{/each}
	</div>

	<!-- TTS Waveform Canvas -->
	{#if showWaveform}
		<canvas
			id="waveform-canvas"
			class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
			width="800"
			height="200"
		></canvas>
	{/if}

	<!-- STT Interface for Stage 3 -->
	{#if rogueStage === 3}
		<div class="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-4">
			<button
				class="rounded-full bg-red-600 p-6 text-white shadow-lg transition hover:bg-red-700 active:scale-95"
				onclick={toggleListening}
				class:animate-pulse={isListening}
			>
				<div class="text-2xl">
					{isListening ? '🔴' : '🎤'}
				</div>
			</button>
			<div class="text-center text-white">
				<p class="text-sm opacity-75">
					{isListening ? 'Listening...' : 'Click to speak'}
				</p>
				{#if transcribedText}
					<p class="mt-2 font-mono text-sm">
						"{transcribedText}"
					</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if currentStep != 0}
		<GlitchText text="System Error" onComplete={() => (showGlitch = false)} />
	{/if}
</div>
