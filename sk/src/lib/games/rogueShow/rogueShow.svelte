<script lang="ts">
	import GlitchText from '$lib/games/rogueShow/GlitchText.svelte';
	import { TextSystem, type TextColors } from '$lib/games/rogueShow/textSystem.svelte';
	import BlinkingCursor from '$lib/games/rogueShow/BlinkingCursor.svelte';
	import { Sound } from '$lib/assets/Sound.svelte';
	import { RANDOM_TEXTS } from './RandomText';
	import { onDestroy, onMount } from 'svelte';
	import { ElevenLabsTTS } from '$lib/elevenLabsTTS.svelte';

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

	async function playSound(name: string) {
		const sound = sounds[name];
		if (sound) {
			await sound.play();
		}
	}

	const steps: { delay: number; action: () => Promise<void> | void }[] = [
		{
			delay: 0,
			action: () => {
				playSound('epic-glitch');
			}
		},
		{
			delay: 500,
			action: () => {
				textSystem.addText('Initializing system...');
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Loading modules...');
				tts?.sendTTSMessage("This is a good test", true);
			}
		},
		{
			delay: 2000,
			action: () => {
				textSystem.addText('Error detected in core system...', {color: "red"} );
			}
		},
		{
			delay: 4000,
			action: async () => {
				textSystem.clear();
				textSystem.addText("Initializing stage one");
				textSystem.addText("Let's see what we can do...");
                textSystem.addText("Speakers online...");
                await textSystem.addText("Setting the mood...");
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
				stopSounds();
                textSystem.clear();
				showWaveform = true;
				textSystem.addText("Target identified. Engaging TTS mode...");
				tts.sendTTSMessage("Hello there. This is a demonstration of the Eleven Labs text to speech integration within this rogue show simulation.", true);
            }
        }
	];

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

	onMount(async () => {
				tts = new ElevenLabsTTS();

		await Promise.allSettled(
			Object.values(sounds).map((sound) => sound.load())
		);
		step();
	});
	

	onDestroy(() => {
		// Clean up sounds
		stopSounds();
	});

	// No scrolling: content will be bottom-aligned and any overflow is clipped
</script>

<div style="background-color: {backgroundColor}" class={['absolute top-0 left-0 flex h-dvh w-dvw']}>
	<div
		class="flex h-full w-full flex-col justify-end overflow-hidden p-4 text-4xl text-green-600"
		style="padding-bottom:1.5rem;"
	>
		{#each textSystem.text as line, index}
			<div class={line.color ? colorClassMap[line.color] : 'text-green-600'}>
				{line.text}{#if index === textSystem.text.length - 1 && textSystem.blinkCursor}
					<BlinkingCursor textColor={line.color ? colorClassMap[line.color] : "text-green-600"} />
				{/if}
			</div>
		{/each}
	</div>
	
	<!-- TTS Waveform Canvas -->
	{#if showWaveform}
		<canvas 
			id="waveform-canvas"
			class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
			width="800"
			height="200"
		></canvas>
	{/if}
	
	{#if currentStep != 0}
	<GlitchText text="System Error" onComplete={() => (showGlitch = false)} />
	{/if}
</div>

<audio id="epic-glitch" src="sounds/effects/manual/epic-glitch-intro.mp3"></audio>
<audio id="init-song" src="sounds/music/Init [t0P_K9zb-yo].m4a"></audio>
<audio id="target-identified-song" src="sounds/music/Target Identified [QQp_2-m5yV8].m4a"></audio>
