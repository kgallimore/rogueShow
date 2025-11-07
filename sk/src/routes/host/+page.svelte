<script lang="ts">
	import { onMount } from 'svelte';

	import TierlisterHost from '$lib/games/tierlister/host.svelte';
	import RogueShow from '$lib/games/rogueShow/rogueShow.svelte';
	import InterstitialMinigame from '$lib/games/interstitial/interstitialMinigame.svelte';
	import { ShowController } from '$lib/components/ShowController.svelte';
	import { frictionSystem } from '$lib/components/FrictionSystem.svelte';

	let showController = $state<ShowController | null>(null);

	onMount(async () => {
		// Initialize ShowController only in browser context
		showController = new ShowController();
		
		// Initialize with default product sequence if no show exists
		if (!showController.currentShow && showController.products.length > 0) {
			const productSequence = showController.products.map((p) => p.id);
			await showController.createNewShow(productSequence);
		}
	});
</script>

<div class="min-h-screen bg-linear-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
	{#if !showController}
		<!-- Loading state -->
		<div class="flex items-center justify-center">
			<div class="text-2xl text-white">Loading Show Controller...</div>
		</div>
	{:else}
		<!-- Show Control Panel -->
		<div class="mx-auto max-w-6xl space-y-6">
			<!-- Header -->
			<header class="text-center">
				<h1 class="mb-2 text-4xl font-bold text-white">
					{showController.stageTitle}
				</h1>
			<div class="flex items-center justify-center gap-4 text-lg">
				<span class="rounded-full bg-white/10 px-4 py-2 text-white">
					Mode: <strong class="uppercase">{showController.mode}</strong>
				</span>
				<span class="rounded-full bg-white/10 px-4 py-2 text-white">
					Stage: <strong class="capitalize">{showController.stage}</strong>
				</span>
				<span
					class="rounded-full {showController.interactionEnabled
						? 'bg-green-500/20'
						: 'bg-red-500/20'} px-4 py-2 text-white"
				>
					{showController.interactionEnabled ? '🟢 Interactive' : '🔴 Locked'}
				</span>
				<span
					class="rounded-full {showController.frictionEnabled
						? 'bg-orange-500/20'
						: 'bg-gray-500/20'} px-4 py-2 text-white"
				>
					{showController.frictionEnabled ? '⚡ Friction Active' : '😌 Normal'}
				</span>
				{#if frictionSystem.isActive}
					<span class="animate-pulse rounded-full bg-red-500/20 px-4 py-2 text-white">
						🐛 {frictionSystem.currentSeverity} Friction Event
					</span>
				{/if}
			</div>
		</header>

		<!-- Control Buttons -->
		<div class="flex flex-wrap items-center justify-center gap-4">
			{#if showController!.mode === 'tierlist'}
				<button
					class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50"
					onclick={() => showController!.advanceStage()}
					disabled={!showController!.canAdvance}
				>
					⏭️ Advance
				</button>
			{/if}

			{#if showController!.mode === 'rogue'}
				<button
					class="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-purple-700"
					onclick={() => showController!.advanceRogueStage()}
				>
					🤖 Advance AI Stage ({showController!.currentShow?.rogueStage || 1}/3)
				</button>
			{/if}

			{#if showController!.mode === 'interstitial'}
				<button
					class="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-green-700"
					onclick={() => showController!.endInterstitialMinigame()}
				>
					🎮 End Mini-Game
				</button>
			{/if}

			{#if showController!.mode === 'tierlist' && showController!.stage === 'reveal'}
				<button
					class="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-red-700"
					onclick={() => showController!.transitionToRogueMode()}
				>
					🚀 Activate Rogue Mode
				</button>
			{/if}
		</div>

		<!-- Show Content -->
		<div class="rounded-2xl bg-black/20 p-6 backdrop-blur-sm">
			{#if showController!.mode === 'tierlist'}
				<TierlisterHost />
			{:else if showController!.mode === 'rogue'}
				<RogueShow rogueStage={showController!.currentShow?.rogueStage || 1} />
			{:else if showController!.mode === 'interstitial'}
				<InterstitialMinigame />
			{/if}
		</div>
	</div>
	{/if}
</div>
