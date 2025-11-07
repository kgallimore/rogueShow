<script lang="ts">
	import { showStore, type ShowMode, type RogueStage } from '$lib/stores/showStore.svelte';
	import { getPocketBase } from '$lib/pocketbase/client.svelte';
	import type { ReesesProductsResponse, TiersResponse } from '$lib/pocketbase/types';

	interface Props {
		products: ReesesProductsResponse[];
		tiers: TiersResponse[];
	}

	let { products, tiers }: Props = $props();

	let pb = getPocketBase();
	let selectedTier: string | null = $state(null);
	let loading = $state(false);

	const {
		currentProduct,
		mode,
		rogueStage,
		interactionEnabled,
		frictionEnabled,
		advanceToNextProduct,
		revealProductTier,
		transitionToRogueMode,
		advanceRogueStage,
		startInterstitialMinigame,
		toggleFriction,
		setInteractionEnabled
	} = showStore;

	const handleAdvance = async () => {
		if (loading || !currentProduct) return;
		loading = true;
		try {
			await advanceToNextProduct();
		} finally {
			loading = false;
		}
	};

	const handleReveal = async () => {
		if (loading || !currentProduct || !selectedTier) return;
		loading = true;
		try {
			await revealProductTier(currentProduct.id, selectedTier);
			selectedTier = null;
		} finally {
			loading = false;
		}
	};

	const handleRogueTransition = async () => {
		if (loading) return;
		loading = true;
		try {
			await transitionToRogueMode();
		} finally {
			loading = false;
		}
	};

	const handleAdvanceRogueStage = async () => {
		if (loading) return;
		loading = true;
		try {
			await advanceRogueStage();
		} finally {
			loading = false;
		}
	};

	const handleStartMinigame = async () => {
		if (loading) return;
		loading = true;
		try {
			const quirks = [
				"Avoids using the letter 'e'",
				'Only speaks in questions',
				'Rhymes every sentence',
				'Uses pirate vocabulary',
				'Speaks like Shakespeare',
				"Only uses words starting with 'A'"
			];
			const randomQuirk = quirks[Math.floor(Math.random() * quirks.length)];
			await startInterstitialMinigame(randomQuirk, 'text');
		} finally {
			loading = false;
		}
	};

	const handleToggleFriction = async () => {
		if (loading) return;
		loading = true;
		try {
			await toggleFriction();
		} finally {
			loading = false;
		}
	};

	const handleToggleInteraction = async (enabled: boolean) => {
		if (loading) return;
		loading = true;
		try {
			await setInteractionEnabled(enabled);
		} finally {
			loading = false;
		}
	};
</script>

<div class="space-y-6 rounded-xl bg-white p-6 shadow-lg">
	<h2 class="mb-4 text-2xl font-bold text-gray-800">Host Controls</h2>

	<!-- Mode Status -->
	<div class="rounded-lg bg-gray-50 p-4">
		<h3 class="mb-2 text-lg font-semibold">
			Current Mode: <span class="text-orange-600">{mode}</span>
		</h3>
		{#if mode === 'rogue'}
			<p class="text-sm text-gray-600">Rogue Stage: {rogueStage}/3</p>
		{/if}
	</div>

	<!-- Tier List Controls -->
	{#if mode === 'tierlist'}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Tier List Controls</h3>

			<!-- Current Product Display -->
			{#if currentProduct}
				<div class="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
					<p class="mb-2 font-medium">Current Product:</p>
					<p class="text-lg font-bold text-orange-800">{currentProduct.name}</p>
				</div>
			{:else}
				<div class="rounded-lg bg-gray-50 p-4">
					<p class="text-gray-500">No current product selected</p>
				</div>
			{/if}

			<!-- Tier Selection for Reveal -->
			{#if currentProduct}
				<div class="space-y-2">
					<div class="font-medium">Select Tier to Reveal:</div>
					<div class="grid grid-cols-3 gap-2">
						{#each tiers as tier (tier.id)}
							<button
								type="button"
								class="rounded-lg border-2 px-3 py-2 font-bold transition-all
									{selectedTier === tier.id
									? 'border-orange-400 bg-orange-100 text-orange-800'
									: 'border-gray-200 hover:border-gray-300'}"
								onclick={() => (selectedTier = tier.id)}
							>
								{tier.Rank}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-3">
				<button
					type="button"
					class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
					disabled={loading || !currentProduct}
					onclick={handleAdvance}
				>
					{loading ? 'Loading...' : 'Next Product'}
				</button>

				<button
					type="button"
					class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
					disabled={loading || !currentProduct || !selectedTier}
					onclick={handleReveal}
				>
					{loading ? 'Loading...' : 'Reveal Tier'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Rogue Mode Controls -->
	{#if mode === 'tierlist'}
		<div class="space-y-4 border-t pt-4">
			<h3 class="text-lg font-semibold">Mode Transition</h3>
			<button
				type="button"
				class="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
				disabled={loading}
				onclick={handleRogueTransition}
			>
				{loading ? 'Loading...' : 'Activate Rogue Mode'}
			</button>
		</div>
	{/if}

	{#if mode === 'rogue'}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Rogue Controls</h3>

			{#if rogueStage < 3}
				<button
					type="button"
					class="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
					disabled={loading}
					onclick={handleAdvanceRogueStage}
				>
					{loading ? 'Loading...' : `Advance to Stage ${rogueStage + 1}`}
				</button>
			{:else}
				<button
					type="button"
					class="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
					disabled={loading}
					onclick={handleStartMinigame}
				>
					{loading ? 'Loading...' : 'Start Interstitial Minigame'}
				</button>
			{/if}
		</div>
	{/if}

	{#if mode === 'interstitial'}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold">Interstitial Mode</h3>
			<p class="text-sm text-gray-600">
				Minigame is active. Players can submit responses and guesses.
			</p>
		</div>
	{/if}

	<!-- Settings -->
	<div class="space-y-4 border-t pt-4">
		<h3 class="text-lg font-semibold">Settings</h3>

		<div class="flex items-center justify-between">
			<div class="font-medium">Allow Audience Interaction</div>
			<button
				type="button"
				class="rounded-lg px-3 py-1 text-sm font-medium transition-colors
					{interactionEnabled
					? 'bg-green-100 text-green-800 hover:bg-green-200'
					: 'bg-red-100 text-red-800 hover:bg-red-200'}"
				onclick={() => handleToggleInteraction(!interactionEnabled)}
			>
				{interactionEnabled ? 'Enabled' : 'Disabled'}
			</button>
		</div>

		<div class="flex items-center justify-between">
			<div class="font-medium">Friction Events</div>
			<button
				type="button"
				class="rounded-lg px-3 py-1 text-sm font-medium transition-colors
					{frictionEnabled
					? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
					: 'bg-gray-100 text-gray-800 hover:bg-gray-200'}"
				onclick={handleToggleFriction}
			>
				{frictionEnabled ? 'Enabled' : 'Disabled'}
			</button>
		</div>
	</div>
</div>
